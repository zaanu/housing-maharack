// Lighting rig: directional sun with soft shadows, fill/top lights, HDRI
// image-based lighting (prefiltered at runtime per mode), linear fog, and a
// procedural sky dome + sun halo. Mode switches crossfade by swapping the
// generated assets; HDRIs are cached after first prefilter.

import * as pc from "playcanvas";
import { THEMES, type SceneMode, type Theme } from "./theme";
import type { QualitySettings } from "./quality";
import { skyTexture, glowTexture } from "./textures";
import { color } from "./materials";
import type { Builder } from "./builder";

export class LightingRig {
  sun: pc.Entity;
  fill: pc.Entity;
  top: pc.Entity;
  private skyDome: pc.Entity;
  private skyMat: pc.StandardMaterial;
  private halo: pc.Entity;
  private haloCore: pc.Entity;
  private haloMats: pc.StandardMaterial[] = [];
  private envAtlases = new Map<string, Promise<pc.Texture | null>>();
  private envPending: string | null = null;
  private destroyed = false;
  mode: SceneMode = "dusk";

  constructor(
    private app: pc.AppBase,
    private builder: Builder,
    quality: QualitySettings
  ) {
    const theme = THEMES[this.mode];

    this.sun = new pc.Entity("sun");
    this.sun.addComponent("light", {
      type: "directional",
      castShadows: true,
      shadowBias: 0.18,
      normalOffsetBias: 0.06,
      penumbraSize: 12,
      cascadeDistribution: 0.7,
      intensity: theme.key.intensity,
    });
    this.applyShadowTier(quality);
    app.root.addChild(this.sun);

    this.fill = new pc.Entity("fill");
    this.fill.addComponent("light", { type: "directional", castShadows: false, intensity: 0.4 });
    app.root.addChild(this.fill);

    // identity orientation already shines straight down (lights emit along -Y)
    this.top = new pc.Entity("top");
    this.top.addComponent("light", { type: "directional", castShadows: false, intensity: 0.25 });
    app.root.addChild(this.top);

    // sky dome: inverted sphere with an emissive equirect canvas texture
    this.skyMat = new pc.StandardMaterial();
    this.skyMat.useLighting = false;
    this.skyMat.diffuse = new pc.Color(0, 0, 0);
    this.skyMat.emissive = new pc.Color(1, 1, 1);
    this.skyMat.cull = pc.CULLFACE_FRONT;
    this.skyMat.depthWrite = false;
    this.skyMat.useFog = false;
    this.skyMat.update();
    this.skyDome = builder.ent("sky", builder.sphere(48), this.skyMat, {
      parent: app.root,
      p: [0, 0, 0],
      s: [760, 760, 760],
      receive: false,
    });
    const mi = this.skyDome.render!.meshInstances[0];
    mi.cull = false; // always visible

    // sun/moon halo sprites (additive billboards)
    const glow = glowTexture(app.graphicsDevice);
    const haloMat = (intensity: number) => {
      const m = new pc.StandardMaterial();
      m.useLighting = false;
      m.diffuse = new pc.Color(0, 0, 0);
      m.emissive = new pc.Color(1, 1, 1);
      m.emissiveMap = glow;
      m.emissiveIntensity = intensity;
      m.opacity = 0.5;
      m.opacityMap = glow;
      m.blendType = pc.BLEND_ADDITIVE;
      m.depthWrite = false;
      m.useFog = false;
      m.cull = pc.CULLFACE_NONE;
      m.update();
      this.haloMats.push(m);
      return m;
    };
    this.halo = builder.ent("sun-halo", builder.quad(), haloMat(1), {
      parent: app.root,
      receive: false,
    });
    this.haloCore = builder.ent("sun-core", builder.quad(), haloMat(2), {
      parent: app.root,
      receive: false,
    });

    this.apply(this.mode);
  }

  /** Tiered sun shadows: filter quality, distance and cascades per device class. */
  applyShadowTier(q: QualitySettings) {
    const light = this.sun.light!;
    light.shadowResolution = q.shadowResolution;
    light.shadowDistance = q.shadowDistance;
    light.shadowType = q.shadowTier === 2 ? pc.SHADOW_PCF5_32F : pc.SHADOW_PCF3_16F;
    light.numCascades = q.shadowTier === 0 ? 1 : 2;
  }

  /** Lazily prefilter the HDRI for a mode and set it as the env atlas.
   * The cache stores promises so concurrent calls share one prefilter. */
  private async loadEnv(theme: Theme) {
    const url = theme.hdri;
    this.envPending = url;
    let pending = this.envAtlases.get(url);
    if (!pending) {
      pending = new Promise<pc.Texture | null>((resolve) => {
        this.app.assets.loadFromUrl(url, "texture", (err, a) => {
          if (err || !a || this.destroyed) return resolve(null);
          const src = a.resource as pc.Texture;
          const lighting = pc.EnvLighting.generateLightingSource(src, { size: 128 });
          const atlas = pc.EnvLighting.generateAtlas(lighting, { size: 512 });
          lighting.destroy();
          resolve(atlas);
        });
      });
      this.envAtlases.set(url, pending);
    }
    const atlas = await pending;
    // only apply if the mode hasn't changed while we loaded
    if (atlas && !this.destroyed && this.envPending === url) {
      this.app.scene.envAtlas = atlas;
      this.app.scene.skyboxIntensity = theme.envIntensity;
    }
  }

  dispose() {
    this.destroyed = true;
  }

  apply(mode: SceneMode) {
    this.mode = mode;
    const theme = THEMES[mode];
    const scene = this.app.scene;

    scene.ambientLight = color(theme.ambient);
    scene.fog.type = pc.FOG_LINEAR;
    scene.fog.color = color(theme.fog.color);
    scene.fog.start = theme.fog.start;
    scene.fog.end = theme.fog.end;

    const aim = (e: pc.Entity, d: [number, number, number]) => {
      // PlayCanvas directional lights emit along the entity's NEGATIVE Y.
      // lookAt points -Z at the target; rotating +90° about local X then
      // maps -Y onto that direction.
      e.setPosition(d[0] * 50, d[1] * 50, d[2] * 50);
      e.lookAt(0, 0, 0);
      e.rotateLocal(90, 0, 0);
    };
    aim(this.sun, theme.key.dir);
    this.sun.light!.color = color(theme.key.color);
    this.sun.light!.intensity = theme.key.intensity;
    this.sun.light!.shadowIntensity = theme.key.shadowIntensity;
    aim(this.fill, theme.fill.dir);
    this.fill.light!.color = color(theme.fill.color);
    this.fill.light!.intensity = theme.fill.intensity;
    this.top.light!.color = color(theme.top.color);
    this.top.light!.intensity = theme.top.intensity;

    this.skyMat.emissiveMap = skyTexture(this.app.graphicsDevice, mode, theme);
    this.skyMat.update();

    // halos toward the sun
    const s = theme.sunDir;
    const r = 700;
    this.halo.setPosition(s[0] * r, s[1] * r, s[2] * r);
    this.halo.setLocalScale(theme.sun.size * 2.2, theme.sun.size * 2.2, 1);
    this.haloCore.setPosition(s[0] * r * 0.99, s[1] * r * 0.99, s[2] * r * 0.99);
    this.haloCore.setLocalScale(theme.sun.coreSize * 2.2, theme.sun.coreSize * 2.2, 1);
    this.haloMats[0].emissive = color(theme.sun.color);
    this.haloMats[0].opacity = theme.sun.opacity;
    this.haloMats[0].update();
    this.haloMats[1].emissive = color(theme.sun.coreColor);
    this.haloMats[1].opacity = theme.sun.coreOpacity;
    this.haloMats[1].update();

    void this.loadEnv(theme);
  }

  /** Billboard the halos toward the camera each frame. */
  update(cameraPos: pc.Vec3) {
    this.halo.lookAt(cameraPos);
    this.haloCore.lookAt(cameraPos);
  }
}
