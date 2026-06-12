// The residential tower: per-floor curtain-wall facades with GPU-instanced
// aluminium mullions, dark spandrels, slab fascias, glass balconies with
// planters and furniture, seeded AC condensers, a granite podium with a
// canopied entrance and warm lobby, and a roof with parapet, helipad and
// signage. Every floor registers with a FloorFader so the slice view can
// dissolve and lift floors smoothly.

import * as pc from "playcanvas";
import type { PublicFloor, PublicHome } from "@/lib/types";
import { TOWER, floorY } from "@/lib/layout";
import { makeMaterial, glassMaterial } from "./materials";
import { windowTexture } from "./textures";
import { FloorFader, modeOf } from "./slice";
import { buildFloorInterior, type FloorInterior } from "./interiors";
import { rnd, damp, type V3 } from "./builder";
import type { SceneContext } from "./context";
import type { SceneMode } from "./theme";

const W = TOWER.width;
const D = TOWER.depth;

export type FloorEntry = {
  data: PublicFloor;
  fader: FloorFader;
  root: pc.Entity;
  facade: pc.Entity;
  interiorRoot: pc.Entity;
  interior: FloorInterior | null;
  windowMats: pc.StandardMaterial[];
  windowFades: { mat: pc.StandardMaterial; base: number }[];
  height: number;
};

export class Tower {
  root: pc.Entity;
  floors: FloorEntry[] = [];
  selected: number | null = null;
  selectedHomeId: string | null = null;
  private roofGroup: pc.Entity;
  private roofMats: { mat: pc.StandardMaterial; base: number }[] = [];
  private roofFade = 1;
  private roofBaseY: number;
  private signLabel: ReturnType<SceneContext["labels"]["add"]> | null = null;
  onSelectHome: ((home: PublicHome) => void) | null = null;

  constructor(private ctx: SceneContext, floorsData: PublicFloor[]) {
    this.root = ctx.builder.group("tower", ctx.app.root);
    this.buildPodium();
    for (const floor of floorsData) this.buildFloor(floor);
    this.roofBaseY = floorY(Math.max(...floorsData.map((f) => f.number + (f.penthouse ? 2 : 1)), 2));
    this.roofGroup = this.buildRoof(this.roofBaseY);
    ctx.onUpdate((dt) => this.update(dt));
  }

  /* ------------------------------ podium -------------------------------- */

  private buildPodium() {
    const b = this.ctx.builder;
    const g = b.group("podium", this.root);
    const fz = (D + 2) / 2;

    const granite = makeMaterial(this.ctx.store, {
      color: "#cfc9bd",
      pbr: { asset: "granite_tile", tiling: [7, 1], normalScale: 0.7 },
    });
    b.box("podium-body", granite, {
      parent: g,
      p: [0, TOWER.podiumHeight / 2, 0],
      s: [W + 2, TOWER.podiumHeight, D + 2],
      cast: true,
    });

    // warm glass lobby front
    const lobby = makeMaterial(this.ctx.store, {
      color: "#1a2430",
      rough: 0.1,
      metal: 0.4,
      emissive: "#ffc684",
    });
    this.ctx.litMat(lobby, this.ctx.theme.windowGlow * 0.7, 0.12);
    b.box("lobby", lobby, { parent: g, p: [0, 0.34, fz + 0.012], s: [5.2, 0.58, 0.02] });
    const frame = makeMaterial(this.ctx.store, { color: "#3c424a", rough: 0.3, metal: 0.85 });
    for (const x of [-2.6, -0.9, 0.9, 2.6])
      b.box("lobby-mullion", frame, { parent: g, p: [x, 0.34, fz + 0.02], s: [0.06, 0.58, 0.04] });

    // entrance canopy on slim columns + metal trim
    const canopy = makeMaterial(this.ctx.store, { color: "#e8e3d8", rough: 0.45 });
    b.box("canopy", canopy, { parent: g, p: [0, 0.78, fz + 0.85], s: [5.6, 0.09, 1.9], cast: true });
    const trim = makeMaterial(this.ctx.store, { color: "#454a52", rough: 0.3, metal: 0.8 });
    b.box("canopy-trim", trim, { parent: g, p: [0, 0.815, fz + 0.85], s: [5.66, 0.045, 1.96] });
    for (const x of [-2.5, 2.5])
      b.ent("canopy-col", b.cylinder(10), frame, {
        parent: g,
        p: [x, 0.39, fz + 1.6],
        s: [0.1, 0.78, 0.1],
        cast: true,
      });
    // canopy downlights
    const down = makeMaterial(this.ctx.store, { color: "#ffffff", emissive: "#ffd9a0" });
    this.ctx.litMat(down, 2.4, 0.1);
    for (const x of [-1.8, 0, 1.8])
      b.box("downlight", down, { parent: g, p: [x, 0.732, fz + 0.85], s: [0.12, 0.012, 0.12] });

    // entrance steps
    const stone = makeMaterial(this.ctx.store, { color: "#cfc9bd", rough: 0.5 });
    for (let i = 0; i < 3; i++)
      b.box("step", stone, {
        parent: g,
        p: [0, 0.105 - i * 0.07, fz + 0.3 + i * 0.26],
        s: [6 - i * 0.4, 0.07, 0.5],
        cast: true,
      });
  }

  /* ------------------------------ floors -------------------------------- */

  private buildFloor(floor: PublicFloor) {
    const ctx = this.ctx;
    const b = ctx.builder;
    const baseY = floorY(floor.number);
    const levels = floor.penthouse ? 2 : 1;
    const height = TOWER.floorHeight * levels;
    const bodyH = height - TOWER.slabThickness;

    const root = b.group(`floor-${floor.number}`, this.root, [0, baseY, 0]);
    const facade = b.group("facade", root);
    const interiorRoot = b.group("interior", root);
    interiorRoot.enabled = false;

    const fader = new FloorFader(floor.number, baseY, root, facade);

    // fading material helper: structure occludes, glass doesn't
    const structMat = (opts: Parameters<typeof makeMaterial>[1], base = 1) => {
      const m = makeMaterial(ctx.store, { ...opts, opacity: base, depthWrite: true });
      fader.registerStructure(m, base);
      return m;
    };

    // slab + fascia (always visible, even when open)
    const slab = structMat({ color: "#ece7dc", rough: 0.55 });
    b.box("slab", slab, {
      parent: root,
      p: [0, TOWER.slabThickness / 2, 0],
      s: [W + 0.5, TOWER.slabThickness, D + 0.5],
      cast: true,
    });
    const fascia = structMat({ color: "#454a52", rough: 0.35, metal: 0.8 });
    b.box("fascia", fascia, {
      parent: root,
      p: [0, TOWER.slabThickness / 2, 0],
      s: [W + 0.56, TOWER.slabThickness * 0.55, D + 0.56],
    });

    // glass body
    const glass = glassMaterial("#9dbecd", 0.5);
    fader.registerGlass(glass, 0.5);
    b.box("glass", glass, {
      parent: facade,
      p: [0, TOWER.slabThickness + bodyH / 2, 0],
      s: [W, bodyH, D],
    });

    // instanced mullion grid on all four faces
    const mullionMat = structMat({ color: "#7d838b", rough: 0.35, metal: 0.85 });
    const mullions: { p: V3; s: V3 }[] = [];
    const my = TOWER.slabThickness + bodyH / 2;
    for (let i = 0; i <= 15; i++) {
      const x = -W / 2 + (i * W) / 15;
      mullions.push({ p: [x, my, D / 2 + 0.015], s: [0.045, bodyH - 0.02, 0.045] });
      mullions.push({ p: [x, my, -D / 2 - 0.015], s: [0.045, bodyH - 0.02, 0.045] });
    }
    for (let i = 1; i < 9; i++) {
      const z = -D / 2 + (i * D) / 9;
      mullions.push({ p: [W / 2 + 0.015, my, z], s: [0.045, bodyH - 0.02, 0.045] });
      mullions.push({ p: [-W / 2 - 0.015, my, z], s: [0.045, bodyH - 0.02, 0.045] });
    }
    b.instanced("mullions", b.unitBox(), mullionMat, mullions, { parent: facade });

    // horizontal transom band
    const ty = TOWER.slabThickness + bodyH * 0.52;
    b.box("transom-f", mullionMat, { parent: facade, p: [0, ty, D / 2 + 0.015], s: [W, 0.04, 0.04] });
    b.box("transom-b", mullionMat, { parent: facade, p: [0, ty, -D / 2 - 0.015], s: [W, 0.04, 0.04] });
    b.box("transom-l", mullionMat, { parent: facade, p: [-W / 2 - 0.015, ty, 0], s: [0.04, 0.04, D] });
    b.box("transom-r", mullionMat, { parent: facade, p: [W / 2 + 0.015, ty, 0], s: [0.04, 0.04, D] });

    // spandrel band above the slab
    const spandrel = structMat({ color: "#2e3640", rough: 0.25, metal: 0.6 });
    b.box("spandrel", spandrel, {
      parent: facade,
      p: [0, TOWER.slabThickness + 0.09, 0],
      s: [W + 0.04, 0.17, D + 0.04],
    });

    // columns
    const colMat = structMat({ color: "#d9d4c8", rough: 0.55 });
    for (const x of [-W / 2 + 0.2, 0, W / 2 - 0.2])
      for (const z of [-D / 2 + 0.2, D / 2 - 0.2])
        b.box("col", colMat, { parent: facade, p: [x, TOWER.slabThickness + bodyH / 2, z], s: [0.28, bodyH, 0.28] });

    // penthouse mid band
    if (floor.penthouse) {
      const band = structMat({ color: "#e3ddd0", rough: 0.55 });
      b.box("pent-band", band, { parent: facade, p: [0, TOWER.floorHeight, 0], s: [W + 0.2, 0.12, D + 0.2] });
    }

    // lit windows: emissive planes just inside the glass
    const windowMats: pc.StandardMaterial[] = [];
    const windowFades: ReturnType<FloorFader["registerStructure"]>[] = [];
    const mkWindowPlane = (p: V3, rotY: number, w: number) => {
      const m = new pc.StandardMaterial();
      m.diffuse = new pc.Color(0.05, 0.08, 0.13);
      m.emissive = new pc.Color(1, 1, 1);
      m.opacity = 0.92;
      m.blendType = pc.BLEND_NORMAL;
      m.depthWrite = false;
      m.update();
      windowMats.push(m);
      windowFades.push(fader.registerStructure(m, 0.92));
      const e = b.ent("windows", b.quad(), m, {
        parent: facade,
        p,
        s: [w, bodyH - 0.12, 1],
      });
      e.setLocalEulerAngles(0, rotY, 0);
      return e;
    };
    const wy = TOWER.slabThickness + bodyH / 2;
    mkWindowPlane([0, wy, D / 2 - 0.06], 0, W - 0.5);
    mkWindowPlane([0, wy, -D / 2 + 0.06], 180, W - 0.5);
    mkWindowPlane([W / 2 - 0.06, wy, 0], 90, D - 0.5);
    mkWindowPlane([-W / 2 + 0.06, wy, 0], -90, D - 0.5);

    // balconies on the front face (not on penthouse levels)
    if (!floor.penthouse) {
      for (const x of [-4.2, 4.2])
        this.buildBalcony(facade, fader, x, D / 2, floor.number * 31 + (x > 0 ? 7 : 0));
    }

    // seeded AC condensers on the side faces
    for (let i = 0; i < 3; i++) {
      if (rnd(floor.number * 13, i) > 0.55) continue;
      const side = rnd(floor.number * 17, i) > 0.5 ? 1 : -1;
      const z = -D / 2 + 1.2 + rnd(floor.number * 19, i) * (D - 2.4);
      const acMat = structMat({ color: "#c9c9c4", rough: 0.6, metal: 0.3 });
      b.box("ac", acMat, {
        parent: facade,
        p: [side * (W / 2 + 0.1), TOWER.slabThickness + 0.28, z],
        s: [0.16, 0.3, 0.42],
        cast: true,
      });
      const grille = structMat({ color: "#8e8e89", rough: 0.5, metal: 0.4 });
      b.box("ac-grille", grille, {
        parent: facade,
        p: [side * (W / 2 + 0.1 + 0.085), TOWER.slabThickness + 0.28, z],
        s: [0.012, 0.24, 0.36],
      });
    }

    this.floors.push({
      data: floor,
      fader,
      root,
      facade,
      interiorRoot,
      interior: null,
      windowMats,
      windowFades,
      height,
    });
  }

  private buildBalcony(facade: pc.Entity, fader: FloorFader, x: number, z: number, seed: number) {
    const ctx = this.ctx;
    const b = ctx.builder;
    const BW = 4.6;
    const BD = 1.1;
    const g = b.group("balcony", facade, [x, TOWER.slabThickness, z]);

    const structMat = (opts: Parameters<typeof makeMaterial>[1], base = 1) => {
      const m = makeMaterial(ctx.store, { ...opts, opacity: base, depthWrite: base >= 1 });
      fader.registerStructure(m, base);
      return m;
    };

    const deck = structMat({ color: "#e6e1d6", rough: 0.6 });
    b.box("deck", deck, { parent: g, p: [0, 0.045, BD / 2], s: [BW, 0.09, BD], cast: true });

    // frameless glass railing + metal cap
    const railGlass = structMat({ color: "#b8d4e0", rough: 0.05, metal: 0.1 }, 0.28);
    b.box("rail-f", railGlass, { parent: g, p: [0, 0.33, BD - 0.03], s: [BW - 0.06, 0.46, 0.025] });
    for (const s of [-1, 1])
      b.box("rail-s", railGlass, { parent: g, p: [s * (BW / 2 - 0.03), 0.33, BD / 2 + 0.015], s: [0.025, 0.46, BD - 0.1] });
    const cap = structMat({ color: "#6a7077", rough: 0.3, metal: 0.85 });
    b.box("cap-f", cap, { parent: g, p: [0, 0.57, BD - 0.03], s: [BW, 0.035, 0.055] });
    for (const s of [-1, 1])
      b.box("cap-s", cap, { parent: g, p: [s * (BW / 2 - 0.03), 0.57, BD / 2 + 0.015], s: [0.035, 0.035, BD - 0.08] });

    // planter with hedge
    const planterX = rnd(seed, 3) > 0.5 ? BW / 2 - 0.55 : -BW / 2 + 0.55;
    const planter = structMat({ color: "#8d8678", rough: 0.85 });
    b.box("planter", planter, { parent: g, p: [planterX, 0.19, BD - 0.26], s: [0.85, 0.2, 0.26], cast: true });
    const hedge = structMat({ color: "#4d6b3a", rough: 1 });
    b.ent("hedge", b.canopy(seed), hedge, {
      parent: g,
      p: [planterX, 0.35, BD - 0.26],
      s: [0.64, 0.36, 0.5],
      cast: true,
    });

    // seeded furniture
    const hasTable = rnd(seed, 1) > 0.35;
    const hasLounger = !hasTable && rnd(seed, 2) > 0.4;
    if (hasTable) {
      const wood = structMat({ color: "#caa978", rough: 0.55 });
      const dark = structMat({ color: "#3a3e44", rough: 0.4, metal: 0.7 });
      const fx = -planterX * 0.6;
      b.ent("table", b.cylinder(12), wood, { parent: g, p: [fx, 0.29, BD - 0.45], s: [0.32, 0.02, 0.32], cast: true });
      b.ent("leg", b.cylinder(8), dark, { parent: g, p: [fx, 0.19, BD - 0.45], s: [0.04, 0.2, 0.04] });
      const chair = structMat({ color: "#5e554a", rough: 0.8 });
      for (const dx of [-0.3, 0.3])
        b.box("chair", chair, { parent: g, p: [fx + dx, 0.2, BD - 0.43], s: [0.17, 0.2, 0.17], cast: true });
    }
    if (hasLounger) {
      const fabric = structMat({ color: "#b9a98e", rough: 0.75 });
      const fx = -planterX * 0.55;
      b.box("lounger", fabric, { parent: g, p: [fx, 0.19, BD - 0.42], s: [0.62, 0.05, 0.24], cast: true });
      b.box("lounger-back", fabric, {
        parent: g,
        p: [fx - 0.25, 0.29, BD - 0.42],
        s: [0.26, 0.04, 0.24],
        rot: [0, 0, 37],
      });
    }

    // warm wall-washer on inhabited balconies after dark
    if (rnd(seed, 4) > 0.45) {
      const wash = new pc.StandardMaterial();
      wash.diffuse = new pc.Color(0.16, 0.13, 0.09);
      wash.emissive = new pc.Color(1, 0.75, 0.47);
      wash.opacity = 0.9;
      wash.blendType = pc.BLEND_NORMAL;
      wash.depthWrite = false;
      wash.update();
      fader.registerStructure(wash, 0.9);
      this.ctx.litMat(wash, this.ctx.theme.windowGlow * 0.5, 0);
      const e = this.ctx.builder.ent("wash", b.quad(), wash, { parent: g, p: [0, 0.42, 0.03], s: [BW - 0.5, 0.55, 1] });
      e.setLocalEulerAngles(0, 0, 0);
    }
  }

  /* ------------------------------- roof --------------------------------- */

  private buildRoof(baseY: number): pc.Entity {
    const ctx = this.ctx;
    const b = ctx.builder;
    const g = b.group("roof", this.root, [0, baseY, 0]);

    const mk = (opts: Parameters<typeof makeMaterial>[1], base = 1) => {
      const m = makeMaterial(ctx.store, { ...opts, opacity: base, depthWrite: true });
      this.roofMats.push({ mat: m, base });
      return m;
    };

    const deck = mk({ color: "#ddd8cb", rough: 0.8 });
    b.box("roof-deck", deck, { parent: g, p: [0, 0.12, 0], s: [W + 0.5, 0.24, D + 0.5], cast: true });
    const parapet = mk({ color: "#d3cec1", rough: 0.6 });
    b.box("parapet-f", parapet, { parent: g, p: [0, 0.38, D / 2 + 0.2], s: [W + 0.5, 0.28, 0.12], cast: true });
    b.box("parapet-b", parapet, { parent: g, p: [0, 0.38, -D / 2 - 0.2], s: [W + 0.5, 0.28, 0.12], cast: true });
    b.box("parapet-l", parapet, { parent: g, p: [-W / 2 - 0.2, 0.38, 0], s: [0.12, 0.28, D + 0.5], cast: true });
    b.box("parapet-r", parapet, { parent: g, p: [W / 2 + 0.2, 0.38, 0], s: [0.12, 0.28, D + 0.5], cast: true });

    // plant rooms + tank
    const plant = mk({ color: "#c9c3b5", rough: 0.7 });
    b.box("plant-room", plant, { parent: g, p: [-5, 0.65, -2.5], s: [2.4, 0.9, 2], cast: true });
    const tank = mk({ color: "#b3ada0", rough: 0.55, metal: 0.35 });
    b.ent("tank", b.cylinder(20), tank, { parent: g, p: [4.5, 0.5, 2], s: [1.6, 0.7, 1.6], cast: true });

    // helipad
    const padMat = mk({ color: "#2e3338", rough: 0.9 });
    const heliG = b.group("helipad", g, [0.3, 0.24, -1.3]);
    b.ent("pad", b.cylinder(28), padMat, { parent: heliG, p: [0, 0.09, 0], s: [5.1, 0.18, 5.1], cast: true });
    const mark = mk({ color: "#f4f1e8", rough: 0.8 });
    b.box("H-l", mark, { parent: heliG, p: [-0.5, 0.19, 0], s: [0.2, 0.012, 1.5] });
    b.box("H-r", mark, { parent: heliG, p: [0.5, 0.19, 0], s: [0.2, 0.012, 1.5] });
    b.box("H-c", mark, { parent: heliG, p: [0, 0.19, 0], s: [0.8, 0.012, 0.2] });
    // rim lights
    const rimA = makeMaterial(ctx.store, { color: "#37e668", emissive: "#37e668" });
    const rimB = makeMaterial(ctx.store, { color: "#ffd24d", emissive: "#ffd24d" });
    ctx.litMat(rimA, 2, 0.25);
    ctx.litMat(rimB, 2, 0.25);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      b.ent("rim", b.sphere(8), i % 2 ? rimA : rimB, {
        parent: heliG,
        p: [Math.cos(a) * 2.35, 0.22, Math.sin(a) * 2.35],
        s: [0.1, 0.1, 0.1],
      });
    }
    // helicopter
    const heli = b.group("heli", heliG, [0.1, 0.18, 0], -28);
    heli.setLocalScale(1.55, 1.55, 1.55);
    const fus = mk({ color: "#1d2733", rough: 0.3, metal: 0.6 });
    const skid = mk({ color: "#46535f", rough: 0.5, metal: 0.4 });
    const accent = mk({ color: "#7c1f3e", rough: 0.35 });
    const canopyG = mk({ color: "#8fd0e8", rough: 0.08, metal: 0.3 });
    const dark = mk({ color: "#23282e", rough: 0.6 });
    for (const z of [-0.32, 0.32]) b.box("skid", skid, { parent: heli, p: [0, 0.08, z], s: [1.5, 0.05, 0.06] });
    b.box("fuselage", fus, { parent: heli, p: [0.1, 0.45, 0], s: [1.5, 0.55, 0.66], cast: true });
    b.box("canopy", canopyG, { parent: heli, p: [0.78, 0.48, 0], s: [0.3, 0.4, 0.6] });
    b.box("belly", accent, { parent: heli, p: [0.1, 0.32, 0], s: [1.52, 0.08, 0.68] });
    b.box("boom", fus, { parent: heli, p: [-1.05, 0.55, 0], s: [1.1, 0.14, 0.14] });
    b.box("fin", accent, { parent: heli, p: [-1.55, 0.75, 0], s: [0.24, 0.4, 0.06] });
    const rotor = b.group("rotor", heli, [0.1, 0.78, 0]);
    b.ent("hub", b.cylinder(10), skid, { parent: rotor, s: [0.12, 0.1, 0.12] });
    b.box("blade1", dark, { parent: rotor, p: [0, 0.04, 0], s: [2.6, 0.02, 0.12] });
    const blade2 = b.box("blade2", dark, { parent: rotor, p: [0, 0.04, 0], s: [2.6, 0.02, 0.12] });
    blade2.setLocalEulerAngles(0, 90, 0);
    const tailRotor = b.box("tail-rotor", dark, { parent: heli, p: [-1.55, 0.55, 0.05], s: [0.5, 0.06, 0.02] });
    let rotorA = 0;
    ctx.onUpdate((dt) => {
      if (!g.enabled) return;
      rotorA += dt * 126;
      rotor.setLocalEulerAngles(0, rotorA, 0);
      tailRotor.setLocalEulerAngles(rotorA * 1.8, 0, 0);
    });
    // beacon
    const beacon = makeMaterial(ctx.store, { color: "#ff2d2d", emissive: "#ff2d2d" });
    b.ent("beacon", b.sphere(10), beacon, { parent: g, p: [-5, 1.35, -2.5], s: [0.18, 0.18, 0.18] });
    ctx.onUpdate((_dt, time) => {
      if (!g.enabled) return;
      beacon.emissiveIntensity = this.ctx.lit ? 1 + Math.max(0, Math.sin(time * 2.4)) * 3 : 0.35;
      beacon.update();
    });

    // rooftop sign
    const signG = b.group("sign", g, [0, 0.85, 4.6]);
    for (const x of [-3.1, 3.1]) b.box("post", skid, { parent: signG, p: [x, -0.3, -0.1], s: [0.08, 0.85, 0.08] });
    b.box("board", mk({ color: "#16121f", rough: 0.7 }), { parent: signG, p: [0, 0, 0], s: [6.6, 0.7, 0.14] });
    const glow = makeMaterial(ctx.store, { color: "#ffb454", emissive: "#ffb454" });
    ctx.litMat(glow, 1.6, 0.15);
    b.box("glow", glow, { parent: signG, p: [0, 0, 0.08], s: [6.3, 0.44, 0.02] });
    this.signLabel = ctx.labels.add(
      `<p style="margin:0;font:900 13px/1 system-ui;letter-spacing:0.3em;color:#3a1d08;white-space:nowrap">MAHARACK</p>`,
      1.3
    );
    this.signLabel.setWorld(0, baseY + 0.85, 4.72);
    return g;
  }

  /* ----------------------------- selection ------------------------------ */

  setSelection(floorNumber: number | null, homeId: string | null) {
    this.selected = floorNumber;
    this.selectedHomeId = homeId;
    for (const f of this.floors) {
      f.fader.mode = modeOf(f.data.number, floorNumber);
      const open = f.fader.mode === "open";
      if (open && !f.interior) {
        // Phase-4 lazy build: interiors are constructed on first open
        f.interior = buildFloorInterior(this.ctx, f.interiorRoot, f.data, (home) => {
          this.onSelectHome?.(home);
        });
      }
      if (f.interior) {
        f.interior.setVisible(open);
        f.interior.setSelectedHome(homeId);
      }
      f.interiorRoot.enabled = open;
    }
  }

  applyMode(mode: SceneMode) {
    const theme = this.ctx.theme;
    for (const f of this.floors) {
      const show = theme.litWindows > 0;
      const levels = f.data.penthouse ? 2 : 1;
      for (const m of f.windowMats) {
        if (show) {
          m.emissiveMap = windowTexture(
            this.ctx.app.graphicsDevice,
            f.data.number * 7 + 3,
            levels,
            theme.litWindows
          );
          m.emissiveIntensity = theme.windowGlow;
        } else {
          m.emissiveMap = null;
          m.emissiveIntensity = 0;
        }
        m.update();
      }
      // in daylight the window layer disappears entirely (clear curtain wall)
      for (const fade of f.windowFades) fade.base = show ? 0.92 : 0;
      f.fader.dirty();
      f.interior?.applyMode(mode);
    }
  }

  private update(dt: number) {
    for (const f of this.floors) f.fader.update(dt);
    // roof: fades and lifts away while a floor is selected
    const target = this.selected == null ? 1 : 0;
    const prev = this.roofFade;
    this.roofFade = damp(this.roofFade, target, 6, dt);
    if (Math.abs(this.roofFade - prev) > 0.0005) {
      for (const r of this.roofMats) {
        r.mat.opacity = r.base * this.roofFade;
        r.mat.blendType = pc.BLEND_NORMAL;
        r.mat.depthWrite = this.roofFade > 0.7;
        r.mat.update();
      }
    }
    this.roofGroup.setLocalPosition(0, this.roofBaseY + (1 - this.roofFade) * 1.4, 0);
    const vis = this.roofFade > 0.04;
    if (this.roofGroup.enabled !== vis) this.roofGroup.enabled = vis;
    this.signLabel?.setVisible(vis);
  }

  /** World-space AABB per floor for picking (accounts for lift). */
  floorAABB(f: FloorEntry): pc.BoundingBox {
    const c = new pc.Vec3(0, f.fader.baseY + f.fader.lift + f.height / 2, 0);
    const h = new pc.Vec3((W + 0.6) / 2, f.height / 2, (D + 0.6) / 2);
    return new pc.BoundingBox(c, h);
  }
}
