// The world beyond the wall: a public road with flowing traffic and a hero
// arrival car that tours the driveway, streetlights, a backlit project
// billboard, refined neighbour apartment blocks, a hazy horizon skyline
// with windows that light at night, drifting billboard clouds and birds.

import * as pc from "playcanvas";
import { makeMaterial, glassMaterial } from "./materials";
import { cloudTexture, skylineWindowTexture } from "./textures";
import { addWalker } from "./people";
import { buildCar, addHalo, type CarHandle } from "./vehicles";
import { rnd, damp, type V3 } from "./builder";
import type { SceneContext } from "./context";
import type { SceneMode } from "./theme";

const ROAD_Z = 35.2;

/** Catmull-Rom through XZ waypoints (y = 0). */
class PathCurve {
  private pts: pc.Vec3[];
  private samples: pc.Vec3[] = [];
  private lengths: number[] = [0];
  total = 0;

  constructor(points: [number, number][], divisions = 160) {
    this.pts = points.map(([x, z]) => new pc.Vec3(x, 0, z));
    let prev: pc.Vec3 | null = null;
    for (let i = 0; i <= divisions; i++) {
      const p = this.point(i / divisions);
      this.samples.push(p);
      if (prev) {
        this.total += p.distance(prev);
        this.lengths.push(this.total);
      }
      prev = p;
    }
  }

  private point(t: number): pc.Vec3 {
    const n = this.pts.length - 1;
    const seg = Math.min(Math.floor(t * n), n - 1);
    const u = t * n - seg;
    const p0 = this.pts[Math.max(0, seg - 1)];
    const p1 = this.pts[seg];
    const p2 = this.pts[seg + 1];
    const p3 = this.pts[Math.min(n, seg + 2)];
    const out = new pc.Vec3();
    for (const axis of ["x", "z"] as const) {
      const v0 = p0[axis];
      const v1 = p1[axis];
      const v2 = p2[axis];
      const v3 = p3[axis];
      out[axis] =
        0.5 *
        (2 * v1 +
          (-v0 + v2) * u +
          (2 * v0 - 5 * v1 + 4 * v2 - v3) * u * u +
          (-v0 + 3 * v1 - 3 * v2 + v3) * u * u * u);
    }
    return out;
  }

  /** position + heading at arc-length distance d */
  at(d: number): { p: pc.Vec3; yawDeg: number } {
    const dd = Math.max(0, Math.min(this.total, d));
    let lo = 0;
    let hi = this.lengths.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.lengths[mid] < dd) lo = mid + 1;
      else hi = mid;
    }
    const i = Math.max(1, lo);
    const l0 = this.lengths[i - 1];
    const l1 = this.lengths[i];
    const f = l1 > l0 ? (dd - l0) / (l1 - l0) : 0;
    const a = this.samples[i - 1];
    const b = this.samples[i];
    const p = new pc.Vec3().lerp(a, b, f);
    const yawDeg = (Math.atan2(-(b.z - a.z), b.x - a.x) * 180) / Math.PI;
    return { p, yawDeg };
  }
}

export class Environment {
  root: pc.Entity;
  private skylineWindowMats: pc.StandardMaterial[] = [];
  private cloudMats: pc.StandardMaterial[] = [];
  private skylineBoxMats: [pc.StandardMaterial, pc.StandardMaterial];
  private landMat: pc.StandardMaterial;

  constructor(private ctx: SceneContext) {
    const b = ctx.builder;
    this.root = b.group("environment", ctx.app.root);

    // land disc out to the horizon
    this.landMat = makeMaterial(ctx.store, {
      color: ctx.theme.land,
      rough: 1,
      pbr: { asset: "leafy_grass", tiling: [90, 90], arm: false, normalScale: 0.5 },
    });
    b.ent("land", b.cylinder(48), this.landMat, {
      parent: this.root,
      p: [0, -0.18, 0],
      s: [600, 0.2, 600],
    });

    this.skylineBoxMats = [
      makeMaterial(ctx.store, { color: ctx.theme.skylineA, fog: false }),
      makeMaterial(ctx.store, { color: ctx.theme.skylineB, fog: false }),
    ];
    this.buildSkyline();
    this.buildClouds();
    this.buildRoad();
    this.buildNeighbours();
    this.buildBirds();
  }

  /* ------------------------------ skyline ------------------------------- */

  private buildSkyline() {
    const b = this.ctx.builder;
    const g = b.group("skyline", this.root);
    const winTex = skylineWindowTexture(this.ctx.app.graphicsDevice);
    const t0: { p: V3; s: V3; rotY: number }[] = [];
    const t1: { p: V3; s: V3; rotY: number }[] = [];
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2 + rnd(11, i) * 0.1;
      const r = 195 + rnd(12, i) * 85;
      const cluster = rnd(13, i) > 0.78;
      const w = 4.5 + rnd(14, i) * 6;
      const h = cluster ? 24 + rnd(15, i) * 22 : 6 + rnd(16, i) * 13;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      (rnd(17, i) > 0.5 ? t0 : t1).push({ p: [x, h / 2, z], s: [w, h, w], rotY: rnd(18, i) * 46 });
      // lit-window shell, slightly larger, additive at night
      if (i % 2 === 0) {
        const m = new pc.StandardMaterial();
        m.useLighting = false;
        m.diffuse = new pc.Color(0, 0, 0);
        m.emissive = new pc.Color(1, 1, 1);
        m.emissiveMap = winTex;
        m.emissiveMapTiling = new pc.Vec2(Math.max(1, Math.round(w / 4)), Math.max(2, Math.round(h / 6)));
        m.opacity = 0.8;
        m.blendType = pc.BLEND_ADDITIVE;
        m.depthWrite = false;
        m.useFog = false;
        m.update();
        this.skylineWindowMats.push(m);
        b.box("skyline-win", m, { parent: g, p: [x, h / 2, z], s: [w + 0.3, h, w + 0.3], rot: [0, rnd(18, i) * 46, 0] });
      }
    }
    b.instanced("skyline-a", b.unitBox(), this.skylineBoxMats[0], t0, { parent: g });
    b.instanced("skyline-b", b.unitBox(), this.skylineBoxMats[1], t1, { parent: g });
  }

  /* ------------------------------- clouds ------------------------------- */

  private buildClouds() {
    const ctx = this.ctx;
    const b = ctx.builder;
    const g = b.group("clouds", this.root);
    const tex = cloudTexture(ctx.app.graphicsDevice);
    const count = ctx.quality.cloudCount;
    const sprites: pc.Entity[] = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rnd(5, i) * 0.8;
      const r = 160 + rnd(6, i) * 130;
      const m = new pc.StandardMaterial();
      m.useLighting = false;
      m.diffuse = new pc.Color(0, 0, 0);
      m.emissive = new pc.Color(1, 1, 1);
      m.emissiveMap = tex;
      m.opacity = 0.4 + rnd(11, i) * 0.5;
      m.opacityMap = tex;
      m.blendType = pc.BLEND_NORMAL;
      m.depthWrite = false;
      m.useFog = false;
      m.cull = pc.CULLFACE_NONE;
      m.update();
      this.cloudMats.push(m);
      const e = b.ent("cloud", b.quad(), m, {
        parent: g,
        p: [Math.cos(a) * r, 52 + rnd(7, i) * 75, Math.sin(a) * r],
        s: [(34 + rnd(8, i) * 56) * 1.6, (17 + rnd(9, i) * 22) * 1.2, 1],
        receive: false,
      });
      sprites.push(e);
    }
    ctx.onUpdate((dt) => {
      g.rotateLocal(0, dt * 0.16, 0);
      for (const s of sprites) s.lookAt(ctx.cameraPos);
    });
  }

  /* -------------------------------- road -------------------------------- */

  private buildRoad() {
    const ctx = this.ctx;
    const b = ctx.builder;
    const g = b.group("road", this.root);

    const asphalt = makeMaterial(ctx.store, {
      color: "#777a7f",
      pbr: { asset: "clean_asphalt", tiling: [36, 1], normalScale: 0.6 },
    });
    b.box("roadbed", asphalt, { parent: g, p: [0, -0.035, ROAD_Z], s: [240, 0.1, 6.6] });
    const dash = makeMaterial(ctx.store, { color: "#e8d77f", rough: 0.9 });
    for (let i = 0; i < 30; i++)
      b.box("dash", dash, { parent: g, p: [-116 + i * 8, 0.022, ROAD_Z], s: [2.2, 0.01, 0.12] });
    const kerbMat = makeMaterial(ctx.store, { color: "#b7b2a4", rough: 0.9 });
    for (const z of [ROAD_Z - 3.45, ROAD_Z + 3.45])
      b.box("kerb", kerbMat, { parent: g, p: [0, -0.02, z], s: [240, 0.09, 0.25] });
    const sidewalkMat = makeMaterial(ctx.store, { color: "#8d8779", rough: 1 });
    for (const z of [ROAD_Z - 4.2, ROAD_Z + 4.2])
      b.box("sidewalk", sidewalkMat, { parent: g, p: [0, -0.025, z], s: [240, 0.08, 1.3] });
    const zebra = makeMaterial(ctx.store, { color: "#ece9df", rough: 0.9 });
    for (const x of [-1.2, -0.6, 0, 0.6, 1.2])
      b.box("zebra", zebra, { parent: g, p: [x, 0.024, ROAD_Z], s: [0.4, 0.012, 6.0] });

    // flowing traffic
    const flows: { lane: number; dir: 1 | -1; speed: number; x0: number; color: string; kind: "sedan" | "suv" | "sports" }[] = [
      { lane: ROAD_Z - 1.7, dir: -1, speed: 7, x0: 0, color: "#3f8a85", kind: "sports" },
      { lane: ROAD_Z - 1.7, dir: -1, speed: 5.6, x0: 70, color: "#c2a45a", kind: "suv" },
      { lane: ROAD_Z - 1.7, dir: -1, speed: 6.1, x0: 140, color: "#e0e4e8", kind: "sedan" },
      { lane: ROAD_Z + 1.7, dir: 1, speed: 6.4, x0: 30, color: "#5e548f", kind: "sedan" },
      { lane: ROAD_Z + 1.7, dir: 1, speed: 8.2, x0: 100, color: "#b05038", kind: "sports" },
      { lane: ROAD_Z + 1.7, dir: 1, speed: 5.1, x0: 160, color: "#4d7ba6", kind: "suv" },
    ];
    for (const f of flows) {
      const car: CarHandle = buildCar(ctx, g, { color: f.color, kind: f.kind, ry: f.dir > 0 ? 0 : 180 });
      car.speed.value = f.speed;
      ctx.onUpdate((_dt, time) => {
        const range = 190;
        let x = f.x0 + f.dir * f.speed * time;
        x = ((((x + 95) % range) + range) % range) - 95;
        car.entity.setLocalPosition(x, 0, f.lane);
      });
    }

    // parked along the kerb
    buildCar(ctx, g, { p: [16, 0, ROAD_Z - 2.9], ry: 180, color: "#b5954a", kind: "sedan", lights: false });
    buildCar(ctx, g, { p: [-22, 0, ROAD_Z + 2.9], ry: 0, color: "#46896e", kind: "suv", lights: false });

    // hero arrival: street → barrier stop → driveway tour → exits west
    const curveIn = new PathCurve([
      [62, 33.4], [30, 33.4], [14, 33.3], [6.5, 32.6], [2.6, 30.8], [0.7, 28.6],
    ]);
    const curveTour = new PathCurve([
      [0.7, 28.6], [0.7, 24], [0.6, 19], [1.2, 15.4], [2.6, 12.9], [0, 11.3], [-2.6, 12.9],
      [-1.2, 15.4], [-0.6, 19], [-0.7, 24], [-0.8, 27.6], [-2.2, 31.2], [-5.5, 34.6],
      [-12, 36.4], [-30, 36.6], [-62, 36.6],
    ]);
    const hero = buildCar(ctx, g, { color: "#9e4a66", kind: "sports" });
    // boom barrier
    const barrier = b.group("barrier", g, [2.1, 0, 24.7]);
    b.box("post", makeMaterial(ctx.store, { color: "#46535f", rough: 0.6, metal: 0.4 }), {
      parent: barrier,
      p: [0, 0.28, 0],
      s: [0.14, 0.56, 0.14],
      cast: true,
    });
    const arm = b.group("arm", barrier, [-0.05, 0.5, 0]);
    const armW = makeMaterial(ctx.store, { color: "#f5f1e6", rough: 0.6 });
    const armR = makeMaterial(ctx.store, { color: "#a33d36", rough: 0.6, emissive: "#a33d36", emissiveIntensity: 0.4 });
    for (let i = 0; i < 4; i++)
      b.box("seg", i % 2 ? armR : armW, { parent: arm, p: [-0.45 - i * 0.9, 0, 0], s: [0.9, 0.07, 0.07], cast: true });
    const T_IN = 9;
    const T_WAIT = 2.4;
    const T_TOUR = 21;
    const TOTAL = T_IN + T_WAIT + T_TOUR + 1.2;
    let armAngle = 0;
    ctx.onUpdate((dt, time) => {
      const t = time % TOTAL;
      let res: { p: pc.Vec3; yawDeg: number };
      if (t < T_IN) {
        res = curveIn.at((t / T_IN) * curveIn.total);
        hero.speed.value = curveIn.total / T_IN;
      } else if (t < T_IN + T_WAIT) {
        res = curveIn.at(curveIn.total);
        hero.speed.value = 0;
      } else {
        const u = Math.min((t - T_IN - T_WAIT) / T_TOUR, 1);
        res = curveTour.at(u * curveTour.total);
        hero.speed.value = u >= 1 ? 0 : curveTour.total / T_TOUR;
      }
      hero.entity.setLocalPosition(res.p.x, 0, res.p.z);
      hero.entity.setLocalEulerAngles(0, res.yawDeg, 0);
      const near = Math.hypot(res.p.x, res.p.z - 24.7) < 6.5;
      armAngle = damp(armAngle, near ? -72 : 0, 4, dt);
      arm.setLocalEulerAngles(0, 0, armAngle);
    });

    // streetlights
    const poleMat = makeMaterial(ctx.store, { color: "#3c454e", rough: 0.5, metal: 0.5 });
    const lampHead = makeMaterial(ctx.store, { color: "#ffdf9e", emissive: "#ffd9a0" });
    ctx.litMat(lampHead, 2, 0.1);
    const mkStreetLight = (x: number, z: number, side: 1 | -1) => {
      const lg = b.group("streetlight", g, [x, 0, z]);
      b.ent("pole", b.cylinder(8), poleMat, { parent: lg, p: [0, 1.2, 0], s: [0.09, 2.4, 0.09], cast: true });
      b.box("head", lampHead, { parent: lg, p: [0, 2.42, side * 0.75], s: [0.3, 0.07, 0.16] });
      addHalo(ctx, lg, [0, 2.42, side * 0.75], 1.5, "#ffce8a", 0.45);
    };
    for (const x of [-36, -12, 12, 36]) mkStreetLight(x, ROAD_Z - 3.9, 1);
    for (const x of [-24, 0, 24, 48]) mkStreetLight(x, ROAD_Z + 3.9, -1);

    // project billboard
    const bb = b.group("billboard", g, [-44, 0, 44]);
    for (const x of [-2.6, 2.6])
      b.box("post", poleMat, { parent: bb, p: [x, 1.6, 0], s: [0.18, 3.2, 0.18], cast: true });
    b.box("board", makeMaterial(ctx.store, { color: "#171026", rough: 0.7 }), { parent: bb, p: [0, 4.6, 0], s: [7.4, 3.4, 0.25], cast: true });
    const neon = makeMaterial(ctx.store, { color: "#9e4a66", emissive: "#9e4a66" });
    ctx.litMat(neon, 1.6, 0.25);
    b.box("frame", neon, { parent: bb, p: [0, 4.6, -0.14], s: [7.5, 3.5, 0.03] });
    const bbLabel = ctx.labels.add(
      `<div style="text-align:center;white-space:nowrap">
        <p style="margin:0;font:900 18px/1.15 system-ui;letter-spacing:-0.01em;color:#fde9c8;text-shadow:0 2px 4px rgba(0,0,0,0.5)">MAHARACK HEIGHTS</p>
        <p style="margin:0;font:600 9px/1.6 system-ui;letter-spacing:0.35em;color:#e8a8bc">LIVE ABOVE IT ALL</p>
      </div>`,
      1.6
    );
    bbLabel.setWorld(-44, 4.6, 43.8);

    // sidewalk pedestrians
    addWalker(ctx, g, [
      [-30, ROAD_Z + 4.0], [30, ROAD_Z + 4.0], [30, ROAD_Z + 4.5], [-30, ROAD_Z + 4.5],
    ], { shirt: "#b5954a", pants: "#3a4660", speed: 0.6 });
    addWalker(ctx, g, [
      [22, ROAD_Z - 4.0], [-22, ROAD_Z - 4.0], [-22, ROAD_Z - 4.45], [22, ROAD_Z - 4.45],
    ], { shirt: "#3f8a85", pants: "#5a4a3a", skin: "#a8754f", speed: 0.5, offset: 20 });
  }

  /* --------------------------- neighbour blocks ------------------------- */

  private buildNeighbours() {
    const ctx = this.ctx;
    const b = ctx.builder;
    const g = b.group("neighbours", this.root);
    const winTex = skylineWindowTexture(ctx.app.graphicsDevice);
    const blocks: { p: V3; w: number; h: number; d: number; tone: string }[] = [
      { p: [-46, 0, 58], w: 12, h: 9, d: 10, tone: "#cfc8b8" },
      { p: [-20, 0, 62], w: 14, h: 13, d: 11, tone: "#c8c2b4" },
      { p: [14, 0, 60], w: 11, h: 7.5, d: 9, tone: "#d4cabb" },
      { p: [44, 0, 56], w: 13, h: 11, d: 10, tone: "#c4bfae" },
      { p: [-58, 0, 12], w: 11, h: 8, d: 12, tone: "#ccc5b6" },
      { p: [58, 0, 4], w: 12, h: 10, d: 11, tone: "#d0c9ba" },
      { p: [-54, 0, -28], w: 13, h: 12, d: 10, tone: "#c9c1b1" },
      { p: [54, 0, -32], w: 12, h: 9, d: 10, tone: "#d2cbbd" },
    ];
    for (const [i, blk] of blocks.entries()) {
      const bg = b.group("block", g, blk.p, rnd(91, i) * 24 - 12);
      const body = makeMaterial(ctx.store, { color: blk.tone, rough: 0.8 });
      b.box("body", body, { parent: bg, p: [0, blk.h / 2, 0], s: [blk.w, blk.h, blk.d], cast: true });
      // banded floors
      const band = makeMaterial(ctx.store, { color: "#9d968a", rough: 0.7 });
      const floors = Math.floor(blk.h / 1.4);
      for (let f = 1; f < floors; f++)
        b.box("band", band, { parent: bg, p: [0, f * 1.4, 0], s: [blk.w + 0.08, 0.1, blk.d + 0.08] });
      // night windows
      const m = new pc.StandardMaterial();
      m.useLighting = false;
      m.diffuse = new pc.Color(0, 0, 0);
      m.emissive = new pc.Color(1, 1, 1);
      m.emissiveMap = winTex;
      m.emissiveMapTiling = new pc.Vec2(Math.round(blk.w / 3), Math.round(blk.h / 2.4));
      m.opacity = 0.85;
      m.blendType = pc.BLEND_ADDITIVE;
      m.depthWrite = false;
      m.update();
      this.skylineWindowMats.push(m);
      b.box("windows", m, { parent: bg, p: [0, blk.h / 2, 0], s: [blk.w + 0.18, blk.h - 0.6, blk.d + 0.18] });
      // roof box
      b.box("roof-box", band, { parent: bg, p: [blk.w * 0.2, blk.h + 0.5, 0], s: [2.2, 1, 2], cast: true });
    }
  }

  /* -------------------------------- birds ------------------------------- */

  private buildBirds() {
    const ctx = this.ctx;
    const b = ctx.builder;
    const dark = makeMaterial(ctx.store, { color: "#231a30", fog: false });
    const specs = [
      { r: 34, h: 24, speed: 0.14, phase: 0 },
      { r: 40, h: 27, speed: 0.12, phase: 2.1 },
      { r: 32, h: 22, speed: 0.16, phase: 4.2 },
      { r: 44, h: 29, speed: 0.1, phase: 1.1 },
      { r: 37, h: 25, speed: 0.13, phase: 5.3 },
    ];
    for (const s of specs) {
      const bird = b.group("bird", this.root);
      bird.setLocalScale(0.6, 0.6, 0.6);
      b.box("body", dark, { parent: bird, s: [0.34, 0.05, 0.07] });
      const wl = b.group("wl", bird, [0, 0, 0.04]);
      b.box("wing", dark, { parent: wl, s: [0.13, 0.02, 0.4] });
      const wr = b.group("wr", bird, [0, 0, -0.04]);
      b.box("wing", dark, { parent: wr, s: [0.13, 0.02, 0.4] });
      ctx.onUpdate((_dt, time) => {
        const t = time * s.speed + s.phase;
        bird.setLocalPosition(Math.cos(t) * s.r, s.h + Math.sin(t * 2.3) * 1.4, Math.sin(t) * s.r);
        bird.setLocalEulerAngles(0, 270 - (t * 180) / Math.PI, 0);
        const flap = (Math.sin(time * 9 + s.phase) * 0.7 * 180) / Math.PI;
        wl.setLocalEulerAngles(flap, 0, 0);
        wr.setLocalEulerAngles(-flap, 0, 0);
      });
    }
  }

  /* ------------------------------ mode sync ----------------------------- */

  applyMode(mode: SceneMode) {
    const theme = this.ctx.theme;
    this.skylineBoxMats[0].diffuse = new pc.Color().fromString(theme.skylineA);
    this.skylineBoxMats[0].update();
    this.skylineBoxMats[1].diffuse = new pc.Color().fromString(theme.skylineB);
    this.skylineBoxMats[1].update();
    for (const m of this.skylineWindowMats) {
      m.opacity = 0.85 * theme.skylineWindows;
      m.emissiveIntensity = theme.skylineWindows > 0 ? 1.4 : 0;
      m.update();
    }
    for (const m of this.cloudMats) {
      m.emissive = new pc.Color().fromString(theme.cloudHi);
      m.update();
    }
    this.landMat.diffuse = new pc.Color().fromString(theme.land);
    this.landMat.update();
    void mode;
  }
}
