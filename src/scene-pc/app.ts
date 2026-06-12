// SceneApp: boots the PlayCanvas engine (WebGPU with WebGL2 fallback),
// owns the post-processing pipeline, camera, lighting, tower, site and
// environment, routes picking to React callbacks, and applies quality and
// scene-mode changes at runtime.

import * as pc from "playcanvas";
import type { PublicFloor, PublicHome } from "@/lib/types";
import { TOWER, unitRect, penthouseRect, floorY } from "@/lib/layout";
import { Builder } from "./builder";
import { TextureStore, type Progress } from "./materials";
import { clearTextureCache } from "./textures";
import { clearPeopleCache } from "./people";
import { clearVehicleCache } from "./vehicles";
import { clearInteriorCache } from "./interiors";
import { LabelLayer } from "./labels";
import { SceneContext } from "./context";
import { LightingRig } from "./lighting";
import { OrbitCamera, PRESETS } from "./camera";
import { Tower } from "./tower";
import { Site } from "./site";
import { Environment } from "./environment";
import { screenRay, pickAABBs } from "./picking";
import { QUALITY, detectQuality, type Quality } from "./quality";
import type { SceneMode } from "./theme";
import { THEMES } from "./theme";

export type SceneCallbacks = {
  onReady: (info: { deviceType: string }) => void;
  onProgress: (p: Progress) => void;
  onSelectFloor: (floor: PublicFloor) => void;
  onSelectHome: (home: PublicHome) => void;
  onClearSelection: () => void;
  onFirstInteract?: () => void;
};

export class SceneApp {
  app!: pc.AppBase;
  ctx!: SceneContext;
  camera!: OrbitCamera;
  lighting!: LightingRig;
  tower: Tower | null = null;
  site: Site | null = null;
  env: Environment | null = null;
  cameraFrame: pc.CameraFrame | null = null;
  quality: Quality = "high";
  mode: SceneMode = "dusk";
  deviceType = "webgl2";
  fps = 60;

  private floorsData: PublicFloor[] = [];
  private canvas!: HTMLCanvasElement;
  private labels!: LabelLayer;
  private resizeObs: ResizeObserver | null = null;
  private hoverLabel: ReturnType<LabelLayer["add"]> | null = null;
  private hoveredZone: string | null = null;
  private downAt: { x: number; y: number; t: number } | null = null;
  private destroyed = false;
  private fpsAccum = 0;
  private fpsFrames = 0;

  static async create(
    canvas: HTMLCanvasElement,
    overlay: HTMLElement,
    floors: PublicFloor[],
    cb: SceneCallbacks,
    opts: { mode?: SceneMode; quality?: Quality; forceDevice?: string } = {}
  ): Promise<SceneApp> {
    const self = new SceneApp();
    self.canvas = canvas;
    self.floorsData = floors;
    self.mode = opts.mode ?? "dusk";
    self.quality = opts.quality ?? detectQuality();
    const q = QUALITY[self.quality];

    const deviceTypes = opts.forceDevice
      ? [opts.forceDevice]
      : [pc.DEVICETYPE_WEBGPU, pc.DEVICETYPE_WEBGL2];
    const device = await pc.createGraphicsDevice(canvas, {
      deviceTypes,
      antialias: false, // AA comes from TAA/MSAA in the CameraFrame pipeline
      powerPreference: "high-performance",
    });
    self.deviceType = device.deviceType;

    const app = new pc.AppBase(canvas);
    const options = new pc.AppOptions();
    options.graphicsDevice = device;
    options.componentSystems = [
      pc.RenderComponentSystem,
      pc.CameraComponentSystem,
      pc.LightComponentSystem,
    ];
    options.resourceHandlers = [pc.TextureHandler];
    app.init(options);
    app.setCanvasFillMode(pc.FILLMODE_NONE);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    self.app = app;

    device.maxPixelRatio = Math.min(window.devicePixelRatio || 1, q.maxPixelRatio);

    const builder = new Builder(device);
    const store = new TextureStore(device);
    store.onProgress = cb.onProgress;
    self.labels = new LabelLayer(overlay);
    self.ctx = new SceneContext(app, builder, store, self.labels, q);
    self.ctx.mode = self.mode;

    // lighting + camera + content
    // TEMP-DEBUG: ?skip=tower,site,env,fx bisects scene modules
    const skip = new Set(
      (typeof location !== "undefined"
        ? new URLSearchParams(location.search).get("skip") ?? ""
        : ""
      ).split(",")
    );
    self.lighting = new LightingRig(app, builder, q.shadowResolution);
    self.lighting.apply(self.mode);
    self.camera = new OrbitCamera(app, canvas);
    self.camera.onInteract = () => cb.onFirstInteract?.();
    if (!skip.has("tower")) {
      self.tower = new Tower(self.ctx, floors);
      self.tower.onSelectHome = (home) => cb.onSelectHome(home);
      self.tower.applyMode(self.mode);
    }
    if (!skip.has("site")) self.site = new Site(self.ctx);
    if (!skip.has("env")) {
      self.env = new Environment(self.ctx);
      self.env.applyMode(self.mode);
    }

    // post-processing
    self.setupCameraFrame();

    // shared amenity tooltip
    self.hoverLabel = self.labels.add("", 1.1);
    self.hoverLabel.setVisible(false);

    // main loop
    app.on("update", (dt: number) => {
      if (self.destroyed) return;
      self.ctx.cameraPos.copy(self.camera.entity.getPosition());
      self.ctx.tick(dt);
      self.camera.update(dt);
      self.lighting.update(self.ctx.cameraPos);
      self.labels.update(self.camera.camera, canvas);
      self.fpsAccum += dt;
      self.fpsFrames++;
      if (self.fpsAccum >= 1) {
        self.fps = self.fpsFrames / self.fpsAccum;
        self.fpsAccum = 0;
        self.fpsFrames = 0;
      }
    });

    self.bindPointer(cb);
    self.bindResize();
    app.start();
    self.resize();
    cb.onReady({ deviceType: self.deviceType });
    // test/debug handle (also used by the Playwright suite)
    (window as unknown as { __scene?: SceneApp }).__scene = self;
    return self;
  }

  /* --------------------------- post pipeline ---------------------------- */

  private setupCameraFrame() {
    const q = QUALITY[this.quality];
    this.cameraFrame?.destroy();
    const cf = new pc.CameraFrame(this.app, this.camera.camera);
    cf.rendering.toneMapping = pc.TONEMAP_ACES;
    cf.rendering.samples = q.taa ? 1 : 4;
    cf.rendering.sharpness = q.taa ? q.sharpness : 0;
    cf.rendering.renderTargetScale = q.renderTargetScale;
    cf.taa.enabled = q.taa;
    cf.taa.jitter = 0.85;
    cf.ssao.type = q.ssao ? pc.SSAOTYPE_LIGHTING : pc.SSAOTYPE_NONE;
    cf.ssao.intensity = 0.55;
    cf.ssao.radius = 18;
    cf.ssao.samples = q.ssaoSamples;
    cf.ssao.power = 4;
    cf.bloom.intensity = q.bloom ? THEMES[this.mode].bloom : 0;
    cf.bloom.blurLevel = 7;
    const grade = THEMES[this.mode].grade;
    cf.grading.enabled = true;
    cf.grading.tint = new pc.Color(grade.tint[0], grade.tint[1], grade.tint[2]);
    cf.grading.saturation = grade.saturation;
    cf.grading.contrast = grade.contrast;
    cf.grading.brightness = grade.brightness;
    cf.vignette.intensity = 0.5;
    cf.vignette.inner = 0.6;
    cf.vignette.outer = 1.7;
    cf.vignette.curvature = 0.8;
    cf.update();
    this.cameraFrame = cf;
  }

  /* ------------------------------ pointer ------------------------------- */

  private bindPointer(cb: SceneCallbacks) {
    const el = this.canvas;
    el.addEventListener("pointerdown", (e) => {
      this.downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    el.addEventListener("pointerup", (e) => {
      const d = this.downAt;
      this.downAt = null;
      if (!d) return;
      const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
      if (moved > 6 || performance.now() - d.t > 450) return;
      this.handleClick(e, cb);
    });
    el.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" || this.downAt) return;
      this.handleHover(e);
    });
  }

  private canvasXY(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private handleClick(e: PointerEvent, cb: SceneCallbacks) {
    const { x, y } = this.canvasXY(e);
    const ray = screenRay(this.camera.camera, x, y);
    const tower = this.tower;
    if (!tower) return;
    // homes on the open floor take priority
    const open = tower.floors.find((f) => f.fader.mode === "open");
    if (open?.interior) {
      const hit = pickAABBs(
        ray,
        open.interior.targets.map((t) => ({ item: t.home, aabb: t.aabb }))
      );
      if (hit) {
        cb.onSelectHome(hit.item);
        return;
      }
    }
    // then whole floors (skip faded-away floors)
    const floorHit = pickAABBs(
      ray,
      tower.floors
        .filter((f) => f.fader.mode === "normal" || f.fader.mode === "context")
        .map((f) => ({ item: f, aabb: tower.floorAABB(f) }))
    );
    if (floorHit) {
      cb.onSelectFloor(floorHit.item.data);
      return;
    }
    cb.onClearSelection();
  }

  private handleHover(e: PointerEvent) {
    const { x, y } = this.canvasXY(e);
    const ray = screenRay(this.camera.camera, x, y);
    const tower = this.tower;
    const site = this.site;
    if (!tower || !site) return;
    // cursor feedback over floors
    const floorHit = pickAABBs(
      ray,
      tower.floors
        .filter((f) => f.fader.mode === "normal" || f.fader.mode === "context")
        .map((f) => ({ item: f, aabb: tower.floorAABB(f) }))
    );
    // amenity tooltips (only when no floor is in front)
    const zoneHit = pickAABBs(
      ray,
      site.zones.map((z) => ({ item: z, aabb: z.aabb }))
    );
    const showZone = zoneHit && (!floorHit || zoneHit.distance < floorHit.distance);
    this.canvas.style.cursor = floorHit || showZone ? "pointer" : "default";
    if (showZone && zoneHit) {
      if (this.hoveredZone !== zoneHit.item.name) {
        this.hoveredZone = zoneHit.item.name;
        const c = zoneHit.item.aabb.center;
        const top = zoneHit.item.aabb.halfExtents.y;
        this.hoverLabel!.el.innerHTML = `<div style="text-align:center;background:rgba(15,23,42,0.92);border-radius:12px;padding:6px 12px;box-shadow:0 4px 14px rgba(0,0,0,0.35)">
          <p style="margin:0;font:600 12px/1.3 system-ui;color:#fff;white-space:nowrap">${zoneHit.item.name}</p>
          <p style="margin:0;font:400 10px/1.4 system-ui;color:#cbd5e1;white-space:nowrap">${zoneHit.item.detail}</p>
        </div>`;
        this.hoverLabel!.setWorld(c.x, c.y + top + 0.6, c.z);
        this.hoverLabel!.setVisible(true);
      }
    } else if (this.hoveredZone) {
      this.hoveredZone = null;
      this.hoverLabel!.setVisible(false);
    }
  }

  /* ------------------------------ public API ---------------------------- */

  setSelection(floor: PublicFloor | null, homeId: string | null) {
    this.tower?.setSelection(floor?.number ?? null, homeId);
    this.camera.setCloseRange(floor != null);
    // neutral fill so open-floor interiors stay readable in any mode
    this.lighting.top.light!.intensity = floor != null ? 0.55 : THEMES[this.mode].top.intensity;
    const portrait = this.canvas.clientHeight > this.canvas.clientWidth * 1.1;
    if (floor == null) {
      if (this.camera.interacted) this.camera.flyTo(PRESETS.aerial);
      return;
    }
    const y = floorY(floor.number);
    if (homeId) {
      const idx = floor.homes.findIndex((h) => h.id === homeId);
      if (idx >= 0) {
        if (floor.penthouse) {
          const rect = penthouseRect(idx);
          this.camera.flyTo(this.camera.poseForPenthouse(rect.x, y, portrait));
        } else {
          const rect = unitRect(idx);
          this.camera.flyTo(this.camera.poseForHome(rect.x, rect.z, y, portrait));
        }
        // cinematic close-up: subtle DOF on ultra tier
        this.setDof(true);
        return;
      }
    }
    this.setDof(false);
    if (floor.penthouse) this.camera.flyTo(this.camera.poseForPenthouse(null, y, portrait));
    else this.camera.flyTo(this.camera.poseForFloor(y, portrait));
  }

  private setDof(on: boolean) {
    const cf = this.cameraFrame;
    if (!cf) return;
    const enable = on && this.quality === "ultra";
    if (cf.dof.enabled !== enable) {
      cf.dof.enabled = enable;
      cf.dof.focusDistance = 8;
      cf.dof.focusRange = 9;
      cf.dof.blurRadius = 2.4;
      cf.dof.nearBlur = false;
      cf.update();
    }
  }

  setMode(mode: SceneMode) {
    this.mode = mode;
    this.ctx.applyMode(mode);
    this.lighting.apply(mode);
    this.tower?.applyMode(mode);
    this.env?.applyMode(mode);
    if (this.cameraFrame) {
      this.cameraFrame.bloom.intensity = QUALITY[this.quality].bloom ? THEMES[mode].bloom : 0;
      const grade = THEMES[mode].grade;
      this.cameraFrame.grading.tint = new pc.Color(grade.tint[0], grade.tint[1], grade.tint[2]);
      this.cameraFrame.grading.saturation = grade.saturation;
      this.cameraFrame.grading.contrast = grade.contrast;
      this.cameraFrame.grading.brightness = grade.brightness;
      this.cameraFrame.update();
    }
  }

  setQuality(q: Quality) {
    if (q === this.quality) return;
    this.quality = q;
    const s = QUALITY[q];
    this.ctx.quality = s;
    this.app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, s.maxPixelRatio);
    const light = this.lighting.sun.light!;
    light.shadowResolution = s.shadowResolution;
    this.setupCameraFrame();
    this.resize();
  }

  preset(name: keyof typeof PRESETS) {
    this.camera.preset(name);
  }

  resetCamera() {
    this.camera.reset();
  }

  private bindResize() {
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(this.canvas.parentElement ?? this.canvas);
    window.addEventListener("orientationchange", this.onOrient);
  }

  private onOrient = () => setTimeout(() => this.resize(), 120);

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (w > 0 && h > 0) this.app.resizeCanvas(w, h);
  }

  destroy() {
    this.destroyed = true;
    this.resizeObs?.disconnect();
    window.removeEventListener("orientationchange", this.onOrient);
    this.camera.dispose();
    this.labels.destroy();
    this.cameraFrame?.destroy();
    this.app.destroy();
    // module-level caches hold materials bound to the destroyed device
    clearTextureCache();
    clearPeopleCache();
    clearVehicleCache();
    clearInteriorCache();
  }
}
