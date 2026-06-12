// The gated campus: textured lawn/plaza/driveway, a raised resort pool deck
// (the hero amenity — tiled basin, transparent rippling water, drifting
// caustics, underwater lights, loungers, umbrellas, planters and palms),
// gym, playground, compound wall, entrance gate with signage and guard,
// footpaths, parking and amenity hover zones.

import * as pc from "playcanvas";
import { makeMaterial, glassMaterial } from "./materials";
import { causticsTexture, glowTexture } from "./textures";
import { addWalker, addSitter, addLounging, addSwimmer, buildPerson } from "./people";
import { buildCar, addHalo } from "./vehicles";
import { rnd, type V3 } from "./builder";
import type { SceneContext } from "./context";

const KERB = "#cfccc0";
const WALLC = "#c3c9ce";
const PILLAR = "#9aa3ab";
const STEELD = "#46535f";
const TRUNK = "#5d4a35";
const PALM_TRUNK = "#7d654a";
const PLAY_RED = "#a35a4e";
const PLAY_YELLOW = "#bfa05a";
const PLAY_BLUE = "#4a6b8a";
const GLOW = "#ffd9a0";
const LEAFS = ["#466032", "#52713c", "#3d5a2e", "#5b7a42", "#4a6837"];

export type AmenityZone = { name: string; detail: string; aabb: pc.BoundingBox };

export class Site {
  root: pc.Entity;
  zones: AmenityZone[] = [];
  private palmCrowns: { e: pc.Entity; seed: number }[] = [];

  constructor(private ctx: SceneContext) {
    this.root = ctx.builder.group("site", ctx.app.root);
    // TEMP-DEBUG: ?siteskip=pool,gym,... bisects site sections
    const skip = new Set(
      (typeof location !== "undefined"
        ? new URLSearchParams(location.search).get("siteskip") ?? ""
        : ""
      ).split(",")
    );
    if (!skip.has("grounds")) this.buildGrounds();
    if (!skip.has("gate")) this.buildWallAndGate();
    if (!skip.has("pool")) this.buildPool([-13, 0.02, 10]);
    if (!skip.has("gym")) this.buildGym([-16, 0, -5]);
    if (!skip.has("playground")) this.buildPlayground([13, 0, 13]);
    if (!skip.has("landscaping")) this.buildLandscaping();
    if (!skip.has("parking")) this.buildParking();
    if (!skip.has("residents")) this.buildResidents();
    ctx.onUpdate((_dt, time) => {
      // palm crowns sway in the breeze
      for (const c of this.palmCrowns) {
        c.e.setLocalEulerAngles(
          Math.cos(time * 0.7 + c.seed * 1.3) * 2.3,
          0,
          Math.sin(time * 0.9 + c.seed * 2.1) * 2.9
        );
      }
    });
  }

  private zone(name: string, detail: string, center: V3, half: V3) {
    this.zones.push({
      name,
      detail,
      aabb: new pc.BoundingBox(new pc.Vec3(...center), new pc.Vec3(...half)),
    });
  }

  /* ------------------------------ grounds ------------------------------- */

  private buildGrounds() {
    const b = this.ctx.builder;
    const g = this.root;

    const lawn = makeMaterial(this.ctx.store, {
      color: "#a9c29a",
      rough: 1,
      pbr: { asset: "leafy_grass", tiling: [30, 30], arm: false, normalScale: 0.8 },
    });
    const lawnE = b.ent("lawn", b.cylinder(64), lawn, { parent: g, p: [0, -0.06, 0], s: [110, 0.12, 110] });
    lawnE.render!.meshInstances[0].castShadow = false;

    const plaza = makeMaterial(this.ctx.store, {
      color: "#ffffff",
      pbr: { asset: "granite_tile", tiling: [12, 12], normalScale: 0.8 },
    });
    b.ent("plaza", b.cylinder(48), plaza, { parent: g, p: [0, -0.044, 0], s: [28, 0.12, 28] });

    // driveway + parking pad
    const asphalt = (tiling: [number, number]) =>
      makeMaterial(this.ctx.store, {
        color: "#84878c",
        pbr: { asset: "clean_asphalt", tiling, normalScale: 0.7 },
      });
    b.box("drive-a", asphalt([1, 4]), { parent: g, p: [0, 0.018, 20], s: [3.4, 0.036, 12.5] });
    b.box("drive-b", asphalt([1, 2]), { parent: g, p: [0, 0.018, 29.4], s: [3.4, 0.036, 6.8] });
    b.box("parking", asphalt([1.2, 1.8]), { parent: g, p: [-6.2, 0.016, 21.5], s: [4.4, 0.032, 6.5] });

    // centre dashes, kerbs, crossing, bay lines
    const dash = makeMaterial(this.ctx.store, { color: "#e0ded6", rough: 0.7 });
    for (const z of [15.2, 17, 18.8, 20.6, 22.4, 24.2])
      b.box("dash", dash, { parent: g, p: [0, 0.04, z], s: [0.1, 0.012, 0.8] });
    const kerb = makeMaterial(this.ctx.store, { color: KERB, rough: 0.6 });
    b.box("kerb-l", kerb, { parent: g, p: [-1.86, 0.04, 20], s: [0.16, 0.07, 12.5] });
    b.box("kerb-r", kerb, { parent: g, p: [1.86, 0.04, 20], s: [0.16, 0.07, 12.5] });
    for (const x of [-1.2, -0.6, 0, 0.6, 1.2])
      b.box("crossing", dash, { parent: g, p: [x, 0.04, 27.3], s: [0.4, 0.01, 1.1] });
    for (const i of [-1, 0, 1])
      b.box("bay", dash, { parent: g, p: [-6.2, 0.038, 21.5 + i * 2.1], s: [4.2, 0.008, 0.06] });

    // footpaths to amenities
    const path = makeMaterial(this.ctx.store, {
      color: "#eee9dd",
      pbr: { asset: "granite_tile", tiling: [1.6, 3.2], normalScale: 0.8 },
    });
    const mkPath = (p: V3, w: number, l: number, ry: number) => {
      const e = b.box("path", path, { parent: g, p, s: [w, 0.024, l] });
      e.setLocalEulerAngles(0, ry, 0);
    };
    mkPath([-11.4, 0.012, 7.4], 1.3, 5.4, 37);
    mkPath([10.9, 0.012, 10.9], 1.3, 6.2, -45);
    mkPath([-12.4, 0.012, -2.6], 1.2, 4.6, 72);

    // arrival court: planters around the drop-off + bollard lights
    const planterStone = makeMaterial(this.ctx.store, { color: "#9b948a", rough: 0.7 });
    const hedgeMat = makeMaterial(this.ctx.store, { color: LEAFS[1], rough: 1 });
    for (const a of [-150, -110, -70, 110, 150]) {
      const rad = (a * Math.PI) / 180;
      const px = Math.sin(rad) * 10.4;
      const pz = 9 + Math.cos(rad) * 4.6;
      const pot = b.group("plaza-planter", g, [px, 0, pz]);
      b.ent("stone", b.cylinder(14), planterStone, { parent: pot, p: [0, 0.17, 0], s: [0.74, 0.34, 0.74], cast: true });
      b.ent("hedge", b.canopy(a), hedgeMat, { parent: pot, p: [0, 0.46, 0], s: [0.74, 0.5, 0.74], cast: true });
    }
    const bollardMat = makeMaterial(this.ctx.store, { color: "#3a3f46", rough: 0.4, metal: 0.6 });
    const bollardGlow = makeMaterial(this.ctx.store, { color: GLOW, emissive: GLOW });
    this.ctx.litMat(bollardGlow, 1.8, 0.1);
    for (const z of [8.2, 11.4, 14.6]) {
      for (const x of [-2.5, 2.5]) {
        b.ent("bollard", b.cylinder(8), bollardMat, { parent: g, p: [x, 0.21, z], s: [0.09, 0.42, 0.09], cast: true });
        b.ent("bollard-top", b.cylinder(8), bollardGlow, { parent: g, p: [x, 0.43, z], s: [0.075, 0.03, 0.075] });
      }
    }
  }

  /* --------------------------- wall + gate ------------------------------ */

  private buildWallAndGate() {
    const ctx = this.ctx;
    const b = ctx.builder;
    const g = this.root;
    const wallMat = makeMaterial(ctx.store, { color: WALLC, rough: 0.75 });
    const copingMat = makeMaterial(ctx.store, { color: "#aab2b8", rough: 0.55 });
    const pillarMat = makeMaterial(ctx.store, { color: PILLAR, rough: 0.7 });

    const walls: { p: V3; s: V3 }[] = [
      { p: [-13.35, 0.28, 26], s: [21.3, 0.56, 0.18] },
      { p: [13.35, 0.28, 26], s: [21.3, 0.56, 0.18] },
      { p: [0, 0.28, -18], s: [48, 0.56, 0.18] },
      { p: [-24, 0.28, 4], s: [0.18, 0.56, 44] },
      { p: [24, 0.28, 4], s: [0.18, 0.56, 44] },
    ];
    for (const w of walls) {
      b.box("wall", wallMat, { parent: g, p: w.p, s: w.s, cast: true });
      b.box("coping", copingMat, {
        parent: g,
        p: [w.p[0], 0.575, w.p[2]],
        s: [w.s[0] === 0.18 ? 0.26 : w.s[0], 0.05, w.s[2] === 0.18 ? 0.26 : w.s[2]],
      });
    }
    const posts: { p: V3; s: V3 }[] = [];
    for (let x = -24; x <= 24; x += 4) {
      posts.push({ p: [x, 0.36, 26], s: [0.3, 0.72, 0.3] });
      posts.push({ p: [x, 0.36, -18], s: [0.3, 0.72, 0.3] });
    }
    for (let z = -14; z <= 22; z += 4) {
      posts.push({ p: [-24, 0.36, z], s: [0.3, 0.72, 0.3] });
      posts.push({ p: [24, 0.36, z], s: [0.3, 0.72, 0.3] });
    }
    b.instanced("wall-posts", b.unitBox(), pillarMat, posts.map((q) => ({ p: q.p, s: q.s })), {
      parent: g,
      cast: true,
    });

    // gate
    const gate = b.group("gate", g, [0, 0, 26]);
    b.box("gp-l", pillarMat, { parent: gate, p: [-2.3, 0.85, 0], s: [0.55, 1.7, 0.55], cast: true });
    b.box("gp-r", pillarMat, { parent: gate, p: [2.3, 0.85, 0], s: [0.55, 1.7, 0.55], cast: true });
    b.box("gc-l", copingMat, { parent: gate, p: [-2.3, 1.74, 0], s: [0.68, 0.1, 0.68] });
    b.box("gc-r", copingMat, { parent: gate, p: [2.3, 1.74, 0], s: [0.68, 0.1, 0.68] });
    const lantern = makeMaterial(ctx.store, { color: GLOW, emissive: GLOW });
    ctx.litMat(lantern, 2, 0.12);
    b.box("lantern-l", lantern, { parent: gate, p: [-2.3, 1.85, 0], s: [0.16, 0.12, 0.16] });
    b.box("lantern-r", lantern, { parent: gate, p: [2.3, 1.85, 0], s: [0.16, 0.12, 0.16] });
    addHalo(ctx, gate, [-2.3, 1.85, 0], 1.0, "#ffce8a", 0.5);
    addHalo(ctx, gate, [2.3, 1.85, 0], 1.0, "#ffce8a", 0.5);
    const steel = makeMaterial(ctx.store, { color: STEELD, rough: 0.4, metal: 0.6 });
    b.box("beam", steel, { parent: gate, p: [0, 1.98, 0], s: [5.3, 0.38, 0.42], cast: true });
    const sign = makeMaterial(ctx.store, { color: "#ffb454", emissive: "#ffb454" });
    ctx.litMat(sign, 1.3, 0.15);
    b.box("sign", sign, { parent: gate, p: [0, 1.98, 0.22], s: [4.6, 0.26, 0.02] });
    const signLabel = ctx.labels.add(
      `<p style="margin:0;font:700 11px/1 system-ui;letter-spacing:0.25em;color:#fde9c8;text-shadow:0 1px 2px rgba(0,0,0,0.5);white-space:nowrap">MAHARACK HEIGHTS</p>`,
      1.1
    );
    signLabel.setWorld(0, 1.98, 26.3);

    // swing gates + guard cabin
    const panel = makeMaterial(ctx.store, { color: "#5b6a78", rough: 0.35, metal: 0.7 });
    const gateL = b.group("gate-l", gate, [-1.95, 0, 0], -72);
    b.box("leaf", steel, { parent: gateL, p: [0.85, 0.6, 0], s: [1.7, 1.1, 0.06] });
    b.box("inner", panel, { parent: gateL, p: [0.85, 0.62, 0.04], s: [1.5, 0.9, 0.02] });
    const gateR = b.group("gate-r", gate, [1.95, 0, 0], 72);
    b.box("leaf", steel, { parent: gateR, p: [-0.85, 0.6, 0], s: [1.7, 1.1, 0.06] });
    b.box("inner", panel, { parent: gateR, p: [-0.85, 0.62, 0.04], s: [1.5, 0.9, 0.02] });

    const cabin = b.group("cabin", gate, [3.8, 0, -0.7]);
    b.box("body", makeMaterial(ctx.store, { color: "#e3ddcc", rough: 0.7 }), {
      parent: cabin,
      p: [0, 0.48, 0],
      s: [1.1, 0.96, 1.0],
      cast: true,
    });
    b.box("glass", makeMaterial(ctx.store, { color: "#3d4a57", rough: 0.15, metal: 0.2 }), {
      parent: cabin,
      p: [0, 0.62, 0.51],
      s: [0.7, 0.4, 0.02],
    });
    b.box("roof", steel, { parent: cabin, p: [0, 1.0, 0], s: [1.3, 0.08, 1.2] });
    const cabinGlow = makeMaterial(ctx.store, { color: "#ffd9a0", emissive: "#ffd9a0" });
    ctx.litMat(cabinGlow, 1.4, 0.1);
    b.box("light", cabinGlow, { parent: gate, p: [3.8, 0.62, -0.18], s: [0.62, 0.32, 0.01] });

    const guard = buildPerson(ctx, gate, { shirt: "#2e3f55", pants: "#1f2a38" });
    guard.root.setLocalPosition(2.9, 0, -1.3);
    guard.root.setLocalEulerAngles(0, 180, 0);

    this.zone("Main Entrance Gate", "24×7 security · guard cabin", [0, 1.2, 26.2], [3, 1.2, 1.1]);
  }

  /* ----------------------------- resort pool ---------------------------- */

  private buildPool(at: V3) {
    const ctx = this.ctx;
    const b = ctx.builder;
    const g = b.group("pool", this.root, at);

    const PW = 9.4; // basin long axis (x)
    const PD = 4.1;
    const DECK_W = 12.6;
    const DECK_D = 7.4;
    const DECK_H = 0.55; // raised platform — the basin sits above grade
    const WATER_Y = DECK_H - 0.1;
    const FLOOR_Y = 0.1;

    // deck strips around the basin (uniform plank scale per strip)
    const deckMat = (tw: number, td: number) =>
      makeMaterial(ctx.store, {
        color: "#d8c8a2",
        pbr: { asset: "brown_planks_09", tiling: [tw * 0.42, td * 0.42], normalScale: 0.7 },
      });
    const nsW = DECK_W;
    const nsD = (DECK_D - PD) / 2;
    const ewW = (DECK_W - PW) / 2;
    b.box("deck-n", deckMat(nsW, nsD), { parent: g, p: [0, DECK_H / 2, -(PD + nsD) / 2], s: [nsW, DECK_H, nsD], cast: true });
    b.box("deck-s", deckMat(nsW, nsD), { parent: g, p: [0, DECK_H / 2, (PD + nsD) / 2], s: [nsW, DECK_H, nsD], cast: true });
    b.box("deck-e", deckMat(ewW, PD), { parent: g, p: [(PW + ewW) / 2, DECK_H / 2, 0], s: [ewW, DECK_H, PD], cast: true });
    b.box("deck-w", deckMat(ewW, PD), { parent: g, p: [-(PW + ewW) / 2, DECK_H / 2, 0], s: [ewW, DECK_H, PD], cast: true });

    // steps up to the deck on the plaza side
    const stone = makeMaterial(ctx.store, { color: "#ece7da", rough: 0.4 });
    for (let i = 0; i < 3; i++)
      b.box("pool-step", stone, {
        parent: g,
        p: [3.2, DECK_H - 0.09 - i * 0.18, DECK_D / 2 + 0.26 + i * 0.3],
        s: [2.6, 0.18, 0.34],
        cast: true,
      });

    // tiled basin: clean chlorine-blue with tile relief from the normal map
    const tile = makeMaterial(ctx.store, {
      color: "#bfe2ec",
      rough: 0.3,
      pbr: { asset: "blue_floor_tiles_01", tiling: [8, 3.6], diff: false, arm: false, normalScale: 0.7 },
    });
    const tileWall = makeMaterial(ctx.store, {
      color: "#a8d4e2",
      rough: 0.3,
      pbr: { asset: "blue_floor_tiles_01", tiling: [8, 0.6], diff: false, arm: false, normalScale: 0.7 },
    });
    b.box("basin-floor", tile, { parent: g, p: [0, FLOOR_Y / 2, 0], s: [PW, FLOOR_Y, PD] });
    b.box("basin-n", tileWall, { parent: g, p: [0, DECK_H / 2, -PD / 2 - 0.04], s: [PW + 0.16, DECK_H, 0.08] });
    b.box("basin-s", tileWall, { parent: g, p: [0, DECK_H / 2, PD / 2 + 0.04], s: [PW + 0.16, DECK_H, 0.08] });
    b.box("basin-e", tileWall, { parent: g, p: [PW / 2 + 0.04, DECK_H / 2, 0], s: [0.08, DECK_H, PD] });
    b.box("basin-w", tileWall, { parent: g, p: [-PW / 2 - 0.04, DECK_H / 2, 0], s: [0.08, DECK_H, PD] });

    // caustic light webs dancing on the basin floor
    const caustics = causticsTexture(ctx.app.graphicsDevice);
    const mkCaustic = (y: number, opacity: number, tiling: [number, number]) => {
      const m = new pc.StandardMaterial();
      m.useLighting = false;
      m.diffuse = new pc.Color(0, 0, 0);
      m.emissive = new pc.Color(1, 1, 1);
      m.emissiveMap = caustics;
      m.emissiveMapTiling = new pc.Vec2(...tiling);
      m.opacity = opacity;
      m.blendType = pc.BLEND_ADDITIVE;
      m.depthWrite = false;
      m.update();
      const e = b.ent("caustics", b.plane(), m, { parent: g, p: [0, y, 0], s: [PW, 1, PD], receive: false });
      return { m, e };
    };
    const c1 = mkCaustic(FLOOR_Y + 0.012, 0.24, [2, 0.95]);
    const c2 = mkCaustic(FLOOR_Y + 0.024, 0.17, [1.6, 0.8]);
    ctx.onUpdate((dt) => {
      c1.m.emissiveMapOffset.x += dt * 0.022;
      c1.m.emissiveMapOffset.y += dt * 0.013;
      c2.m.emissiveMapOffset.x -= dt * 0.017;
      c2.m.emissiveMapOffset.y -= dt * 0.01;
      c1.m.update();
      c2.m.update();
    });

    // depth read: the west half of the basin shades toward deep blue
    const deepTint = makeMaterial(ctx.store, { color: "#0d3a52", opacity: 0.35 });
    b.box("deep-tint", deepTint, { parent: g, p: [-PW / 4, FLOOR_Y + 0.006, 0], s: [PW / 2, 0.004, PD] });

    // underwater lights
    const uw = makeMaterial(ctx.store, { color: "#dffaff", emissive: "#9fe8ff" });
    ctx.litMat(uw, 3.2, 0);
    for (const x of [-3.2, 0, 3.2])
      for (const s of [-1, 1])
        b.box("uw-light", uw, { parent: g, p: [x, DECK_H / 2 - 0.06, s * (PD / 2 - 0.06)], s: [0.18, 0.18, 0.02] });

    // transparent rippling water with sky reflections
    const water = new pc.StandardMaterial();
    water.diffuse = new pc.Color(0.13, 0.44, 0.58);
    water.gloss = 0.97;
    water.useMetalness = true;
    water.metalness = 0.5;
    water.opacity = 0.62;
    water.blendType = pc.BLEND_NORMAL;
    water.depthWrite = false;
    water.emissive = new pc.Color(0.12, 0.43, 0.55);
    water.emissiveIntensity = 0.1;
    void ctx.store.image("/textures/waternormals.jpg", false).then((tex) => {
      water.normalMap = tex;
      water.normalMapTiling = new pc.Vec2(3.4, 1.6);
      water.bumpiness = 0.85;
      water.update();
    });
    water.update();
    ctx.litMat(water, 0.16, 0.06);
    b.ent("water", b.plane(), water, { parent: g, p: [0, WATER_Y, 0], s: [PW, 1, PD], receive: false });
    ctx.onUpdate((dt) => {
      water.normalMapOffset.x += dt * 0.02;
      water.normalMapOffset.y += dt * 0.012;
      water.update();
    });

    // coping + drainage groove + wet sheen
    b.box("coping-n", stone, { parent: g, p: [0, DECK_H + 0.02, -PD / 2 - 0.1], s: [PW + 0.44, 0.05, 0.22] });
    b.box("coping-s", stone, { parent: g, p: [0, DECK_H + 0.02, PD / 2 + 0.1], s: [PW + 0.44, 0.05, 0.22] });
    b.box("coping-e", stone, { parent: g, p: [PW / 2 + 0.1, DECK_H + 0.02, 0], s: [0.22, 0.05, PD + 0.44] });
    b.box("coping-w", stone, { parent: g, p: [-PW / 2 - 0.1, DECK_H + 0.02, 0], s: [0.22, 0.05, PD + 0.44] });
    const groove = makeMaterial(ctx.store, { color: "#6e695e", rough: 0.6 });
    b.box("groove-n", groove, { parent: g, p: [0, DECK_H + 0.008, -PD / 2 - 0.26], s: [PW + 0.5, 0.014, 0.05] });
    b.box("groove-s", groove, { parent: g, p: [0, DECK_H + 0.008, PD / 2 + 0.26], s: [PW + 0.5, 0.014, 0.05] });
    const wet = makeMaterial(ctx.store, { color: "#3d3a32", rough: 0.08, opacity: 0.22 });
    b.box("wet-n", wet, { parent: g, p: [0, DECK_H + 0.004, -PD / 2 - 0.5], s: [PW + 1.2, 0.006, 0.5] });
    b.box("wet-s", wet, { parent: g, p: [0, DECK_H + 0.004, PD / 2 + 0.5], s: [PW + 1.2, 0.006, 0.5] });

    // submerged corner steps + chrome ladder
    const stepTile = makeMaterial(ctx.store, { color: "#cfe9f0", rough: 0.4 });
    for (let i = 0; i < 3; i++)
      b.box("sub-step", stepTile, {
        parent: g,
        p: [PW / 2 - 0.55, FLOOR_Y + ((DECK_H - FLOOR_Y) / 3) * (i + 0.5), PD / 2 - 0.45 - i * 0.3],
        s: [1.1, ((DECK_H - FLOOR_Y) / 3) * (i + 1), 0.3],
      });
    const chrome = makeMaterial(ctx.store, { color: "#d4d9dd", rough: 0.12, metal: 1 });
    const ladder = b.group("ladder", g, [-PW / 2 + 0.35, DECK_H, -PD / 2 + 0.6]);
    for (const z of [-0.12, 0.12])
      b.ent("rail", b.cylinder(8), chrome, { parent: ladder, p: [0, -0.1, z], s: [0.028, 0.62, 0.028] });
    for (const y of [-0.3, -0.14, 0.02])
      b.ent("rung", b.cylinder(8), chrome, {
        parent: ladder,
        p: [0, y, 0],
        s: [0.024, 0.24, 0.024],
        rot: [90, 0, 0],
      });

    // loungers + furniture on the deck
    const deckY = DECK_H;
    const lounger = (p: V3, ry: number, c: string, towel?: string) => {
      const lg = b.group("lounger", g, p, ry);
      const slat = makeMaterial(ctx.store, { color: "#e3dccb", rough: 0.55 });
      const cushion = makeMaterial(ctx.store, { color: c, rough: 0.95 });
      b.box("base", slat, { parent: lg, p: [0, 0.13, 0], s: [0.72, 0.035, 0.27], cast: true });
      b.box("back", slat, { parent: lg, p: [-0.29, 0.26, 0], s: [0.31, 0.035, 0.27], rot: [0, 0, 40] });
      b.box("cushion", cushion, { parent: lg, p: [0.04, 0.155, 0], s: [0.56, 0.035, 0.23] });
      b.box("cushion-b", cushion, { parent: lg, p: [-0.275, 0.272, 0], s: [0.26, 0.035, 0.23], rot: [0, 0, 40] });
      if (towel)
        b.box("towel", makeMaterial(ctx.store, { color: towel, rough: 1 }), {
          parent: lg,
          p: [0.1, 0.178, 0.02],
          s: [0.3, 0.012, 0.19],
        });
      for (const [lx, lz] of [
        [-0.25, 0.1],
        [0.25, 0.1],
        [-0.25, -0.1],
        [0.25, -0.1],
      ])
        b.box("leg", chrome, { parent: lg, p: [lx, 0.055, lz], s: [0.035, 0.11, 0.035] });
    };
    lounger([-2.6, deckY, 2.6], 90, "#b97249", "#e8e2d2");
    lounger([-1.5, deckY, 2.6], 90, "#85936f");
    lounger([1.6, deckY, 2.6], 90, "#b97249", "#5b8fa8");
    lounger([2.7, deckY, 2.6], 90, "#5b8fa8");
    addLounging(this.ctx, g, [-2.6, deckY + 0.17, 2.6], -1.5, "#a83a5e");
    addLounging(this.ctx, g, [2.7, deckY + 0.17, 2.6], -1.5, "#2e6bb0", "#a8754f");

    const sideTable = (p: V3) => {
      const t = b.group("side-table", g, p);
      b.ent("top", b.cylinder(14), makeMaterial(ctx.store, { color: "#e3dccb", rough: 0.5 }), {
        parent: t,
        p: [0, 0.17, 0],
        s: [0.24, 0.02, 0.24],
        cast: true,
      });
      b.ent("leg", b.cylinder(8), chrome, { parent: t, p: [0, 0.08, 0], s: [0.035, 0.16, 0.035] });
    };
    sideTable([-2.05, deckY, 2.6]);
    sideTable([2.15, deckY, 2.6]);

    const umbrella = (p: V3, c: string) => {
      const u = b.group("umbrella", g, p);
      b.ent("base", b.cylinder(12), makeMaterial(ctx.store, { color: "#8d8678", rough: 0.7 }), {
        parent: u,
        p: [0, 0.035, 0],
        s: [0.3, 0.07, 0.3],
      });
      b.ent("pole", b.cylinder(8), makeMaterial(ctx.store, { color: "#d9d2c2", rough: 0.5 }), {
        parent: u,
        p: [0, 0.6, 0],
        s: [0.04, 1.15, 0.04],
        cast: true,
      });
      b.ent("canopy", b.cone(12), makeMaterial(ctx.store, { color: c, rough: 0.9, cull: pc.CULLFACE_NONE }), {
        parent: u,
        p: [0, 1.13, 0],
        s: [1.32, 0.26, 1.32],
        cast: true,
      });
    };
    umbrella([-2.0, deckY, 2.95], "#e4dcc8");
    umbrella([2.15, deckY, 2.95], "#41597a");

    // swimmers
    addSwimmer(this.ctx, g, [0, WATER_Y - 0.015, -0.77], 3.6);
    addSwimmer(this.ctx, g, [0.4, WATER_Y - 0.015, 0.77], 3.2, 2.4);

    // potted plants at deck corners + flanking palms
    for (const [px, pz] of [
      [-5.6, 2.9],
      [5.6, 2.9],
      [-5.6, -2.9],
      [5.6, -2.9],
    ] as [number, number][]) {
      const pot = b.group("pot", g, [px, deckY, pz]);
      b.ent("planter", b.cylinder(12), makeMaterial(ctx.store, { color: "#8d8678", rough: 0.8 }), {
        parent: pot,
        p: [0, 0.14, 0],
        s: [0.32, 0.28, 0.32],
        cast: true,
      });
      b.ent("plant", b.canopy(px * 7 + pz), makeMaterial(ctx.store, { color: LEAFS[1], rough: 1 }), {
        parent: pot,
        p: [0, 0.42, 0],
        s: [0.42, 0.4, 0.42],
        cast: true,
      });
    }
    this.palm(g, [-6.4, 0, -2.6], 1.9, 51);
    this.palm(g, [6.5, 0, -2.4], 2.1, 52);

    // raised kids' splash pool on the deck
    const kids = b.group("kids-pool", g, [4.6, deckY, 2.5]);
    b.ent("ring", b.cylinder(28), makeMaterial(ctx.store, { color: "#cfe2e8", rough: 0.5 }), {
      parent: kids,
      p: [0, 0.06, 0],
      s: [2.0, 0.12, 2.0],
    });
    b.ent("kids-floor", b.cylinder(24), tile, { parent: kids, p: [0, 0.121, 0], s: [1.84, 0.002, 1.84] });
    const kw = glassMaterial("#2a7d9e", 0.5);
    b.ent("kids-water", b.cylinder(24), kw, { parent: kids, p: [0, 0.155, 0], s: [1.84, 0.002, 1.84] });

    this.zone("Resort Pool", "heated lap pool · sun deck · kids' splash pool", [at[0], 0.8, at[2]], [6.4, 0.9, 3.8]);
  }

  /* -------------------------------- gym --------------------------------- */

  private buildGym(at: V3) {
    const ctx = this.ctx;
    const b = ctx.builder;
    const g = b.group("gym", this.root, at);
    const base = makeMaterial(ctx.store, { color: "#d4cfc1", rough: 0.6 });
    b.box("slab", base, { parent: g, p: [0, 0.05, 0], s: [6.2, 0.1, 4.4], cast: true });
    const glass = glassMaterial("#bcdcea", 0.22);
    b.box("glass-n", glass, { parent: g, p: [0, 0.65, -2.1], s: [6.0, 1.1, 0.05] });
    b.box("glass-w", glass, { parent: g, p: [-2.95, 0.65, 0], s: [0.05, 1.1, 4.2] });
    b.box("glass-e", glass, { parent: g, p: [2.95, 0.65, 0], s: [0.05, 1.1, 4.2] });
    b.box("glass-s1", glass, { parent: g, p: [-2.0, 0.65, 2.1], s: [2.0, 1.1, 0.05] });
    b.box("glass-s2", glass, { parent: g, p: [2.0, 0.65, 2.1], s: [2.0, 1.1, 0.05] });
    const frame = makeMaterial(ctx.store, { color: "#3c424a", rough: 0.3, metal: 0.85 });
    for (const x of [-2.95, -1, 1, 2.95])
      b.box("mullion", frame, { parent: g, p: [x, 0.65, -2.08], s: [0.05, 1.1, 0.05] });
    b.box("roof", makeMaterial(ctx.store, { color: "#ece8dd", rough: 0.5 }), {
      parent: g,
      p: [0, 1.26, 0],
      s: [6.6, 0.12, 4.8],
      cast: true,
    });
    const fasc = makeMaterial(ctx.store, { color: "#454a52", rough: 0.3, metal: 0.8 });
    b.box("fascia-f", fasc, { parent: g, p: [0, 1.2, 2.42], s: [6.6, 0.18, 0.06] });
    b.box("fascia-b", fasc, { parent: g, p: [0, 1.2, -2.42], s: [6.6, 0.18, 0.06] });
    // equipment: treadmills + rack + bench
    const dark = makeMaterial(ctx.store, { color: "#2b3138", rough: 0.5 });
    const steel = makeMaterial(ctx.store, { color: STEELD, rough: 0.35, metal: 0.7 });
    for (const x of [-2.0, -1.1, -0.2]) {
      const t = b.group("treadmill", g, [x, 0.1, -1.3], 90);
      b.box("base", dark, { parent: t, p: [0, 0.06, 0], s: [0.8, 0.06, 0.34] });
      b.box("belt", makeMaterial(ctx.store, { color: "#454f59", rough: 0.7 }), { parent: t, p: [0, 0.09, 0], s: [0.66, 0.015, 0.26] });
      b.box("column", steel, { parent: t, p: [0.36, 0.32, 0], s: [0.05, 0.5, 0.3], rot: [0, 0, -9] });
      b.box("console", dark, { parent: t, p: [0.42, 0.58, 0], s: [0.06, 0.16, 0.34], rot: [0, 0, -17] });
    }
    const bench = b.group("bench-press", g, [1.6, 0.1, -1.2]);
    b.box("pad", makeMaterial(ctx.store, { color: "#7c2f2f", rough: 0.7 }), { parent: bench, p: [0, 0.16, 0], s: [0.7, 0.06, 0.24] });
    b.box("bar", makeMaterial(ctx.store, { color: "#aab3ba", rough: 0.2, metal: 0.9 }), { parent: bench, p: [0, 0.46, 0], s: [0.025, 0.025, 0.9] });
    const rack = b.group("rack", g, [2.4, 0.1, 0.9]);
    b.box("frame", steel, { parent: rack, p: [0, 0.2, 0], s: [0.24, 0.4, 1.2] });

    this.zone("Residents' Gym", "Cardio deck · free weights · yoga corner", [at[0], 0.8, at[2]], [3.4, 0.8, 2.5]);
  }

  /* ----------------------------- playground ----------------------------- */

  private buildPlayground(at: V3) {
    const ctx = this.ctx;
    const b = ctx.builder;
    const g = b.group("playground", this.root, at);
    b.ent("pad", b.cylinder(40), makeMaterial(ctx.store, { color: "#566b7e", rough: 1 }), {
      parent: g,
      p: [0, 0.015, 0],
      s: [8.8, 0.03, 8.8],
    });
    const sand = makeMaterial(ctx.store, {
      color: "#d3b181",
      rough: 1,
      pbr: { asset: "playground_sand", tiling: [3, 3], arm: false, normalScale: 0.8 },
    });
    b.ent("sand", b.cylinder(30), sand, { parent: g, p: [1.4, 0.026, 1.0], s: [3.2, 0.022, 3.2] });

    const red = makeMaterial(ctx.store, { color: PLAY_RED, rough: 0.7 });
    const yellow = makeMaterial(ctx.store, { color: PLAY_YELLOW, rough: 0.7 });
    const blue = makeMaterial(ctx.store, { color: PLAY_BLUE, rough: 0.7 });

    // tower + slide
    const fort = b.group("fort", g, [-1.6, 0, -1.3]);
    for (const [x, z] of [
      [-0.35, -0.35],
      [0.35, -0.35],
      [-0.35, 0.35],
      [0.35, 0.35],
    ])
      b.box("post", red, { parent: fort, p: [x, 0.35, z], s: [0.07, 0.7, 0.07], cast: true });
    b.box("platform", yellow, { parent: fort, p: [0, 0.72, 0], s: [0.85, 0.06, 0.85], cast: true });
    b.ent("roof", b.cone(4), blue, { parent: fort, p: [0, 1.05, 0], s: [1.24, 0.5, 1.24], cast: true });
    b.box("slide", yellow, { parent: fort, p: [0.95, 0.42, 0.2], s: [1.5, 0.04, 0.4], rot: [0, 0, -29], cast: true });
    b.box("slide-end", yellow, { parent: fort, p: [1.62, 0.08, 0.2], s: [0.5, 0.05, 0.44] });

    // swings (animated)
    const sw = b.group("swing", g, [1.6, 0, -1.6]);
    for (const [x, tilt] of [
      [-1.0, 11],
      [-0.8, -11],
      [1.0, 11],
      [0.8, -11],
    ])
      b.box("leg", red, { parent: sw, p: [x, 0.45, 0], s: [0.06, 0.95, 0.06], rot: [0, 0, tilt], cast: true });
    b.box("bar", yellow, { parent: sw, p: [0, 0.92, 0], s: [2.0, 0.06, 0.06] });
    const grey = makeMaterial(ctx.store, { color: "#888888", rough: 0.4, metal: 0.6 });
    const seats: pc.Entity[] = [];
    for (const [sx, phase] of [
      [-0.35, 0],
      [0.35, 1.9],
    ]) {
      const pivot = b.group("seat-pivot", sw, [sx, 0.92, 0]);
      b.box("rope-l", grey, { parent: pivot, p: [-0.12, -0.36, 0], s: [0.02, 0.72, 0.02] });
      b.box("rope-r", grey, { parent: pivot, p: [0.12, -0.36, 0], s: [0.02, 0.72, 0.02] });
      b.box("seat", yellow, { parent: pivot, p: [0, -0.72, 0], s: [0.3, 0.04, 0.14] });
      pivot.tags.add(`phase:${phase}`);
      seats.push(pivot);
    }
    ctx.onUpdate((_dt, time) => {
      seats.forEach((s, i) => {
        const phase = i === 0 ? 0 : 1.9;
        const amp = i === 0 ? 31 : 17;
        s.setLocalEulerAngles(Math.sin(time * 1.7 + phase) * amp, 0, 0);
      });
    });

    // merry-go-round + seesaw + spring rider
    const mg = b.group("merry", g, [-0.6, 0, 1.7]);
    b.ent("disc", b.cylinder(18), yellow, { parent: mg, p: [0, 0.12, 0], s: [1.1, 0.06, 1.1], cast: true });
    b.box("pole", red, { parent: mg, p: [0, 0.3, 0], s: [0.05, 0.35, 0.05] });
    const ss = b.group("seesaw", g, [2.3, 0, 1.2]);
    b.box("fulcrum", red, { parent: ss, p: [0, 0.16, 0], s: [0.12, 0.32, 0.2] });
    b.box("beam", yellow, { parent: ss, p: [0, 0.32, 0], s: [1.8, 0.05, 0.22], rot: [0, 0, 10], cast: true });

    // kids chasing around the court
    const loop: [number, number][] = [
      [3.6, 0],
      [2.5, 2.5],
      [0, 3.6],
      [-2.5, 2.5],
      [-3.6, 0],
      [-2.5, -2.5],
      [0, -3.6],
      [2.5, -2.5],
    ];
    addWalker(ctx, g, loop, { shirt: PLAY_BLUE, pants: PLAY_RED, scale: 0.62, speed: 1.25 });
    addWalker(ctx, g, loop, { shirt: PLAY_YELLOW, pants: "#2e6bb0", skin: "#a8754f", scale: 0.58, speed: 1.25, offset: 3 });

    this.zone("Children's Playground", "55' × 55' · rubber-padded play court", [at[0], 0.7, at[2]], [4.5, 0.7, 4.5]);
  }

  /* ----------------------------- landscaping ---------------------------- */

  private palm(parent: pc.Entity, p: V3, h: number, seed: number) {
    const ctx = this.ctx;
    const b = ctx.builder;
    const g = b.group("palm", parent, p, rnd(seed, 9) * 360);
    const trunkMat = makeMaterial(ctx.store, { color: PALM_TRUNK, rough: 1 });
    const segs = 6;
    const bend = 0.07 + rnd(seed, 0) * 0.05;
    for (let i = 0; i < segs; i++) {
      b.ent("trunk", b.cylinder(10), trunkMat, {
        parent: g,
        p: [bend * i * i * 0.16, (i + 0.5) * (h / segs), 0],
        s: [(0.075 - i * 0.004) * 2, h / segs + 0.04, (0.075 - i * 0.004) * 2],
        rot: [0, 0, (-bend * i * 0.9 * 180) / Math.PI],
        cast: true,
      });
    }
    const topX = bend * segs * segs * 0.155;
    const crown = b.group("crown", g, [topX, h + 0.04, 0]);
    const leafA = makeMaterial(ctx.store, { color: LEAFS[2], rough: 1 });
    const leafB = makeMaterial(ctx.store, { color: LEAFS[4], rough: 1 });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * 360 + rnd(seed, i) * 28;
      const frond = b.group("frond", crown, undefined, -a);
      const mat = i % 2 ? leafA : leafB;
      b.box("f1", mat, { parent: frond, p: [0.3, 0.05, 0], s: [0.55, 0.025, 0.15], rot: [0, 0, -14], cast: true });
      b.box("f2", mat, { parent: frond, p: [0.72, 0, 0], s: [0.45, 0.02, 0.11], rot: [0, 0, -37] });
      b.box("f3", mat, { parent: frond, p: [1.0, -0.16, 0], s: [0.3, 0.016, 0.07], rot: [0, 0, -57] });
    }
    b.ent("crown-core", b.sphere(10), makeMaterial(ctx.store, { color: LEAFS[0], rough: 1 }), {
      parent: crown,
      s: [0.18, 0.18, 0.18],
    });
    this.palmCrowns.push({ e: crown, seed });
  }

  private tree(parent: pc.Entity, p: V3, scale: number, seed: number) {
    const ctx = this.ctx;
    const b = ctx.builder;
    const h = (1.15 + rnd(seed, 0) * 0.5) * scale;
    const g = b.group("tree", parent, p, rnd(seed, 60) * 180);
    const trunkMat = makeMaterial(ctx.store, { color: TRUNK, rough: 1 });
    b.ent("trunk", b.cylinder(10), trunkMat, {
      parent: g,
      p: [0, h / 2, 0],
      s: [0.17 * scale, h, 0.17 * scale],
      cast: true,
    });
    const main = makeMaterial(ctx.store, { color: LEAFS[1], rough: 1 });
    b.ent("canopy", b.canopy(seed * 3 + 1), main, {
      parent: g,
      p: [0, h + 0.2 * scale, 0],
      s: [0.92 * scale, 0.92 * scale, 0.92 * scale],
      cast: true,
    });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + rnd(seed, i + 2) * 1.2;
      const r = (0.3 + rnd(seed, i + 10) * 0.22) * scale * 2;
      const c = LEAFS[Math.floor(rnd(seed, i + 50) * LEAFS.length)];
      b.ent("puff", b.canopy(seed * 5 + i), makeMaterial(ctx.store, { color: c, rough: 1 }), {
        parent: g,
        p: [
          Math.cos(a) * (0.22 + rnd(seed, i + 20) * 0.2) * scale,
          h + (rnd(seed, i + 30) - 0.15) * 0.45 * scale,
          Math.sin(a) * (0.22 + rnd(seed, i + 40) * 0.2) * scale,
        ],
        s: [r, r, r],
        cast: true,
      });
    }
  }

  private shrub(parent: pc.Entity, p: V3, flower: string, seed: number) {
    const b = this.ctx.builder;
    const g = b.group("shrub", parent, p);
    b.ent("bush", b.canopy(seed * 7), makeMaterial(this.ctx.store, { color: LEAFS[0], rough: 1 }), {
      parent: g,
      p: [0, 0.16, 0],
      s: [0.46, 0.46, 0.46],
      cast: true,
    });
    const bloom = makeMaterial(this.ctx.store, { color: flower, rough: 0.9 });
    for (let i = 0; i < 5; i++)
      b.ent("bloom", b.sphere(8), bloom, {
        parent: g,
        p: [(rnd(seed, i) - 0.5) * 0.36, 0.16 + rnd(seed, i + 5) * 0.18, (rnd(seed, i + 9) - 0.5) * 0.3],
        s: [0.09 + rnd(seed, i + 13) * 0.1, 0.09, 0.09],
      });
  }

  private lamp(parent: pc.Entity, p: V3) {
    const ctx = this.ctx;
    const b = ctx.builder;
    const g = b.group("lamp", parent, p);
    const pole = makeMaterial(ctx.store, { color: "#2e3338", rough: 0.4, metal: 0.7 });
    b.ent("pole", b.cylinder(10), pole, { parent: g, p: [0, 0.55, 0], s: [0.054, 1.1, 0.054], cast: true });
    b.box("head", pole, { parent: g, p: [0.18, 1.16, 0], s: [0.22, 0.04, 0.1] });
    const led = makeMaterial(ctx.store, { color: GLOW, emissive: GLOW });
    ctx.litMat(led, 2.6, 0.1);
    b.box("led", led, { parent: g, p: [0.18, 1.135, 0], s: [0.18, 0.008, 0.07] });
    addHalo(ctx, g, [0.18, 1.12, 0], 1.2, "#ffce8a", 0.5);
    this.lightPool(g, [0.18, 0.02, 0], 2.6);
  }

  /** Soft warm pool of light on the ground beneath a lamp (after dark). */
  lightPool(parent: pc.Entity, p: V3, size: number) {
    const b = this.ctx.builder;
    const m = new pc.StandardMaterial();
    m.useLighting = false;
    m.diffuse = new pc.Color(0, 0, 0);
    m.emissive = new pc.Color(1, 0.78, 0.5);
    m.emissiveIntensity = 0.55;
    m.emissiveMap = glowTexture(this.ctx.app.graphicsDevice);
    m.opacity = 0.3;
    m.opacityMap = glowTexture(this.ctx.app.graphicsDevice);
    m.blendType = pc.BLEND_ADDITIVE;
    m.depthWrite = false;
    m.update();
    const e = b.ent("light-pool", b.plane(), m, { parent, p, s: [size, 1, size], receive: false });
    this.ctx.litEnt(e);
    return e;
  }

  private bench(parent: pc.Entity, p: V3, ry: number) {
    const b = this.ctx.builder;
    const g = b.group("bench", parent, p, ry);
    const wood = makeMaterial(this.ctx.store, { color: "#9a7b52", rough: 0.6 });
    const metal = makeMaterial(this.ctx.store, { color: "#33383d", rough: 0.35, metal: 0.8 });
    for (const dz of [-0.09, 0, 0.09]) b.box("slat", wood, { parent: g, p: [0, 0.18, dz], s: [0.8, 0.035, 0.075] });
    b.box("back", wood, { parent: g, p: [0, 0.36, -0.14], s: [0.8, 0.16, 0.035], rot: [-12, 0, 0] });
    b.box("leg-l", metal, { parent: g, p: [-0.32, 0.09, 0], s: [0.05, 0.18, 0.26] });
    b.box("leg-r", metal, { parent: g, p: [0.32, 0.09, 0], s: [0.05, 0.18, 0.26] });
  }

  private buildLandscaping() {
    const g = this.root;
    // TEMP-DEBUG: ?landskip=palms,trees,shrubs,lamps,benches
    const skip = new Set(
      (typeof location !== "undefined"
        ? new URLSearchParams(location.search).get("landskip") ?? ""
        : ""
      ).split(",")
    );
    const palms: [number, number][] = skip.has("palms") ? [] : [
      [-4.8, 16], [4.8, 16], [-9.4, 19.5], [4.8, 19.5], [-9.4, 23.6], [4.8, 23],
      [9.5, 13.5], [17, 16.2], [17.5, 10], [-20, 22], [20, 23],
      [-7.6, 12.5], [-19.5, 14.5], [-7, 8],
    ];
    const palmN = typeof location !== "undefined" ? Number(new URLSearchParams(location.search).get("palms") ?? palms.length) : palms.length;
    palms.slice(0, palmN).forEach(([x, z], i) => this.palm(g, [x, 0, z], 1.7 + ((i * 7) % 5) * 0.14, i + 1));
    const trees: [number, number][] = skip.has("trees") ? [] : [
      [-21, -14], [21, -14], [-15, 18.5], [-12, -15.5], [12, -15.5], [18, -10],
      [-21, 2], [21, 6], [16, -2], [-20.5, -7], [8, -14], [-4, -15],
    ];
    trees.forEach(([x, z], i) => this.tree(g, [x, 0, z], 1 + ((i * 3) % 4) * 0.18, i + 21));
    const shrubs: [number, number, string][] = skip.has("shrubs") ? [] : [
      [-21.5, 24.8, "#b55ba6"], [-17.5, 24.8, "#e7e0d3"], [-13.5, 24.8, "#b55ba6"],
      [-9.5, 24.8, "#c98448"], [-5.5, 24.8, "#e7e0d3"], [5.5, 24.8, "#b55ba6"],
      [9.5, 24.8, "#e7e0d3"], [13.5, 24.8, "#b55ba6"], [17.5, 24.8, "#c98448"],
      [21.5, 24.8, "#e7e0d3"], [-23.2, 12, "#b55ba6"], [-23.2, 2, "#e7e0d3"],
      [23.2, 6, "#b55ba6"], [23.2, -4, "#c98448"], [8.3, 9.3, "#b55ba6"], [18, 13.4, "#e7e0d3"],
    ];
    shrubs.forEach(([x, z, c], i) => this.shrub(g, [x, 0, z], c, i + 41));
    if (!skip.has("lamps"))
    for (const [x, z] of [
      [-2.6, 16.5], [2.6, 16.5], [-2.6, 20.5], [2.6, 20.5], [-2.6, 24.5], [2.6, 24.5],
    ] as [number, number][])
      this.lamp(g, [x, 0, z]);
    this.bench(g, [9.0, 0, 11.4], 46);
    this.bench(g, [17.6, 0, 13.6], -52);
    this.bench(g, [-7.5, 0, 5.5], 126);

    this.zone("Landscaped Garden", "Native trees · flowering shrubs", [14, 0.4, -8], [6, 0.5, 5]);
  }

  /* --------------------------- parking + people ------------------------- */

  private buildParking() {
    buildCar(this.ctx, this.root, { p: [-6.2, 0, 22.6], color: "#8e3552", kind: "sedan", lights: false });
    buildCar(this.ctx, this.root, { p: [-6.2, 0, 20.4], color: "#2f7a70", kind: "suv", lights: false });
    buildCar(this.ctx, this.root, { p: [-6.2, 0, 18.3], color: "#c9893a", kind: "sports", lights: false });
    this.zone("Visitor Parking", "6 covered bays", [-6.2, 0.6, 21.5], [2.3, 0.6, 3.3]);
  }

  private buildResidents() {
    const g = this.root;
    addSitter(this.ctx, g, [9.14, 0.2, 11.26], 0.8 - Math.PI / 2, "#b97249");
    addSitter(this.ctx, g, [8.86, 0.2, 11.54], 0.8 - Math.PI / 2, "#85936f", "#e0b08c");
    addSitter(this.ctx, g, [-7.5, 0.2, 5.5], 2.2 - Math.PI / 2, "#6b5ac9");
    const ring: [number, number][] = [
      [12.5, 0], [8.8, 8.8], [0, 12.5], [-7, 8], [-12.5, 0], [-8.8, -8.8], [0, -12.5], [8.8, -8.8],
    ];
    addWalker(this.ctx, g, ring, { shirt: "#c96a52", pants: "#3a4660", speed: 0.5 });
    addWalker(this.ctx, g, ring, { shirt: "#d9af34", pants: "#6b3a4a", skin: "#8a5a3b", speed: 0.52, offset: 38 });
    addWalker(
      this.ctx,
      g,
      [
        [20, -2], [19, 13], [14, 20], [4, 22], [-8, 20], [-16, 17], [-21, 8], [-21, -4],
        [-14, -12], [0, -15], [12, -13], [20, -8],
      ],
      { shirt: "#3ea8a2", pants: "#2e3b35", skin: "#a8754f", speed: 1.6 }
    );
  }
}
