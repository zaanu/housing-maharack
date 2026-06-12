// Lazy dollhouse interiors, constructed the first time a floor is opened
// (Phase-4 asset loading). Each home gets oak plank flooring, an emissive
// availability rim, perimeter walls with window gaps, room partitions and a
// furnished layout seeded by its unit letter + configuration. Click targets
// and DOM labels are registered per home.

import * as pc from "playcanvas";
import type { PublicFloor, PublicHome } from "@/lib/types";
import { TOWER, unitRect, penthouseRect, floorY, AVAILABILITY_COLOR } from "@/lib/layout";
import { makeMaterial } from "./materials";
import { rnd, type V3 } from "./builder";
import type { SceneContext } from "./context";
import type { SceneMode } from "./theme";
import type { LabelHandle } from "./labels";

export type HomeTarget = { home: PublicHome; aabb: pc.BoundingBox };

export type FloorInterior = {
  setVisible(v: boolean): void;
  setSelectedHome(id: string | null): void;
  applyMode(mode: SceneMode): void;
  targets: HomeTarget[];
};

const cache = new Map<string, pc.StandardMaterial>();

export function clearInteriorCache() {
  cache.clear();
}

function bedroomsOf(home: PublicHome): number {
  const n = home.configuration ? parseInt(home.configuration, 10) : NaN;
  return Number.isFinite(n) ? Math.min(n, 4) : 2;
}

export function buildFloorInterior(
  ctx: SceneContext,
  parent: pc.Entity,
  floor: PublicFloor,
  onSelect: (home: PublicHome) => void
): FloorInterior {
  const b = ctx.builder;
  const baseY = floorY(floor.number);
  const mat = (key: string, opts: Parameters<typeof makeMaterial>[1]) => {
    let m = cache.get(key);
    if (!m) {
      m = makeMaterial(ctx.store, opts);
      cache.set(key, m);
    }
    return m;
  };

  // shared deck
  const deck = mat("deck", { color: "#dcd6c9", rough: 0.9 });
  b.box("deck", deck, { parent, p: [0, TOWER.slabThickness + 0.005, 0], s: [TOWER.width, 0.02, TOWER.depth] });

  const targets: HomeTarget[] = [];
  const labels: { handle: LabelHandle; home: PublicHome }[] = [];
  const rims: { mat: pc.StandardMaterial; home: PublicHome }[] = [];

  floor.homes.forEach((home, i) => {
    const rect = floor.penthouse ? penthouseRect(i) : unitRect(i);
    const seed = floor.number * 53 + i * 17;
    const g = b.group(`home-${home.id}`, parent, [rect.x, TOWER.slabThickness, rect.z]);

    // availability rim (selection highlight)
    const rimColor = AVAILABILITY_COLOR[home.availability] ?? "#cbd5e1";
    const rim = makeMaterial(ctx.store, { color: rimColor, emissive: rimColor, emissiveIntensity: 0.12 });
    rims.push({ mat: rim, home });
    b.box("rim", rim, { parent: g, p: [0, 0.02, 0], s: [rect.w - 0.12, 0.045, rect.d - 0.12] });

    // oak plank floor
    const planks = mat(`planks-${Math.round(rect.w)}`, {
      color: "#e8d4ae",
      pbr: { asset: "brown_planks_09", tiling: [rect.w / 2.4, rect.d / 2.4], normalScale: 0.6 },
    });
    b.box("floor", planks, { parent: g, p: [0, 0.052, 0], s: [rect.w - 0.3, 0.03, rect.d - 0.3] });

    const F = b.group("furnish", g, [0, 0.067, 0]);
    if (floor.penthouse) buildPenthouseUnit(ctx, F, rect.w, rect.d, seed, mat);
    else buildUnit(ctx, F, rect.w, rect.d, bedroomsOf(home), seed, mat, rect.x < 0 ? 1 : -1, rect.z > 0 ? 1 : -1);

    // pick target + label
    targets.push({
      home,
      aabb: new pc.BoundingBox(
        new pc.Vec3(rect.x, baseY + TOWER.slabThickness + 0.45, rect.z),
        new pc.Vec3(rect.w / 2 - 0.06, 0.45, rect.d / 2 - 0.06)
      ),
    });
    const handle = ctx.labels.add(labelHTML(home.label, false), 1);
    handle.setWorld(rect.x, baseY + (floor.penthouse ? 2.45 : 1.15), rect.z);
    labels.push({ handle, home });
  });

  let selected: string | null = null;
  return {
    targets,
    setVisible(v: boolean) {
      for (const l of labels) l.handle.setVisible(v);
    },
    setSelectedHome(id: string | null) {
      if (selected === id) return;
      selected = id;
      for (const r of rims) {
        r.mat.emissiveIntensity = r.home.id === id ? 0.7 : 0.12;
        r.mat.update();
      }
      for (const l of labels) {
        l.handle.el.innerHTML = labelHTML(l.home.label, l.home.id === id);
      }
    },
    applyMode() {
      /* interiors read the global lighting; nothing extra needed */
    },
  };

  function labelHTML(text: string, sel: boolean): string {
    const bg = sel ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.92)";
    const fg = sel ? "#fff" : "#1e293b";
    return `<div style="padding:4px 10px;border-radius:999px;background:${bg};color:${fg};font:600 11px/1.2 system-ui;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25)">${text}</div>`;
  }

  // expose for picking by the scene app
}

/* ------------------------------ unit layout ------------------------------ */

type MatFn = (key: string, opts: Parameters<typeof makeMaterial>[1]) => pc.StandardMaterial;

/**
 * 2–4 BHK unit. sx/sz flip the canonical layout so each quadrant's living
 * room faces its outer facade. Walls are dollhouse height (0.62) so rooms
 * stay readable from the slice camera.
 */
function buildUnit(
  ctx: SceneContext,
  parent: pc.Entity,
  w: number,
  d: number,
  bedrooms: number,
  seed: number,
  mat: MatFn,
  sx: 1 | -1,
  sz: 1 | -1
) {
  const b = ctx.builder;
  const WALL_H = 0.62;
  const wall = mat("wall", { color: "#f1ece2", rough: 0.9 });
  const wallAccent = mat("wall-accent", { color: "#d8cdbb", rough: 0.9 });

  const wx = (v: number) => v * sx;
  const wz = (v: number) => v * sz;
  const box = (
    name: string,
    m: pc.StandardMaterial,
    p: V3,
    s: V3,
    cast = false,
    rotY = 0
  ) => b.box(name, m, { parent, p: [wx(p[0]), p[1], wz(p[2])], s, cast, rot: [0, rotY * sx * sz, 0] });

  // perimeter walls with window gaps on outer faces
  const hw = w / 2 - 0.08;
  const hd = d / 2 - 0.08;
  // outer long wall (front, window wall): three segments
  for (const t of [-0.78, 0, 0.78])
    box("win-pillar", wall, [hw * t, WALL_H / 2, hd], [w * 0.16, WALL_H, 0.05]);
  box("win-sill", wallAccent, [0, 0.1, hd], [w - 0.2, 0.2, 0.05]);
  // outer side wall: two segments
  for (const t of [-0.62, 0.62]) box("side-seg", wall, [hw, WALL_H / 2, hd * t], [0.05, WALL_H, d * 0.34]);
  // corridor-side walls (solid, with door gap)
  box("back-wall-a", wall, [-hw * 0.4, WALL_H / 2, -hd], [w * 0.6, WALL_H, 0.05]);
  box("back-wall-b", wall, [hw * 0.82, WALL_H / 2, -hd], [w * 0.34, WALL_H, 0.05]);
  box("inner-side", wall, [-hw, WALL_H / 2, -hd * 0.5], [0.05, WALL_H, d * 0.46]);

  // living room (front outer corner)
  const sofa = mat("sofa", { color: "#8a9aa8", rough: 0.95 });
  const sofaDark = mat("sofa-d", { color: "#5d6c7a", rough: 0.95 });
  box("sofa-base", sofa, [-w * 0.18, 0.07, d * 0.3], [0.95, 0.14, 0.34], true);
  box("sofa-back", sofaDark, [-w * 0.18, 0.17, d * 0.3 + 0.15], [0.95, 0.18, 0.08]);
  box("sofa-l", sofa, [-w * 0.18 - 0.42, 0.1, d * 0.22], [0.3, 0.18, 0.5], false, 0);
  const woodDark = mat("wood-dark", { color: "#6b4f33", rough: 0.6 });
  box("coffee", woodDark, [-w * 0.18, 0.085, d * 0.12], [0.46, 0.05, 0.26], true);
  const rug = mat(`rug-${seed % 3}`, { color: ["#a9b4a0", "#b9a08a", "#9aa4b4"][seed % 3], rough: 1 });
  box("rug", rug, [-w * 0.18, 0.005, d * 0.18], [1.3, 0.012, 0.85]);
  const tv = mat("tv", { color: "#10141a", rough: 0.3, metal: 0.4 });
  box("tv-unit", woodDark, [-w * 0.18, 0.07, -d * 0.02], [0.85, 0.12, 0.18], true);
  box("tv", tv, [-w * 0.18, 0.26, -d * 0.0], [0.6, 0.3, 0.035]);

  // kitchen along corridor wall
  const counter = mat("counter", { color: "#cfd6da", rough: 0.35, metal: 0.15 });
  const cabinet = mat("cabinet", { color: "#7a6a55", rough: 0.7 });
  box("kitchen-run", cabinet, [w * 0.22, 0.1, -d * 0.38], [1.2, 0.2, 0.3], true);
  box("kitchen-top", counter, [w * 0.22, 0.215, -d * 0.38], [1.24, 0.035, 0.34]);
  box("fridge", mat("fridge", { color: "#b9c0c6", rough: 0.3, metal: 0.6 }), [w * 0.4, 0.18, -d * 0.38], [0.26, 0.36, 0.28], true);
  // dining
  box("dining", woodDark, [w * 0.12, 0.12, -d * 0.08], [0.5, 0.04, 0.34], true);
  box("dining-leg", woodDark, [w * 0.12, 0.05, -d * 0.08], [0.06, 0.12, 0.06]);
  for (const [cx, cz] of [
    [-0.3, 0],
    [0.3, 0],
    [0, -0.24],
    [0, 0.24],
  ])
    box("chair", sofaDark, [w * 0.12 + cx, 0.08, -d * 0.08 + cz], [0.13, 0.16, 0.13]);

  // bedrooms along the inner half
  const bedCount = Math.max(1, Math.min(bedrooms, 3));
  const bedBase = mat("bed-base", { color: "#9a8265", rough: 0.8 });
  const mattress = mat("mattress", { color: "#f4efe3", rough: 0.95 });
  const duvets = ["#7e8fa8", "#a8917e", "#8aa089"];
  for (let k = 0; k < bedCount; k++) {
    const bx = w * (0.3 - k * 0.27);
    const bz = d * 0.32;
    const duvet = mat(`duvet-${k}`, { color: duvets[(seed + k) % 3], rough: 0.95 });
    box(`bed-${k}`, bedBase, [bx, 0.06, bz], [0.52, 0.1, 0.78], true);
    box(`mattress-${k}`, mattress, [bx, 0.125, bz], [0.48, 0.05, 0.74]);
    box(`duvet-${k}`, duvet, [bx, 0.15, bz + 0.12], [0.49, 0.035, 0.5]);
    box(`pillow-${k}`, mattress, [bx, 0.16, bz - 0.28], [0.4, 0.045, 0.14]);
    box(`wardrobe-${k}`, cabinet, [bx + 0.36, 0.21, bz + 0.1], [0.14, 0.42, 0.55], true);
    // partition wall between bedrooms
    if (k < bedCount - 1)
      box(`partition-${k}`, wall, [bx - w * 0.135, WALL_H / 2, d * 0.26], [0.04, WALL_H, d * 0.42]);
  }
  // partition separating bedrooms strip from living
  box("hall-wall", wall, [w * 0.04, WALL_H / 2, d * 0.12], [0.04, WALL_H, d * 0.3]);

  // bathroom pod near corridor
  const tile = mat("bath", { color: "#dde6ea", rough: 0.25 });
  box("bath-pod", tile, [-w * 0.36, 0.16, -d * 0.34], [0.5, 0.32, 0.42], true);

  // plant
  const pot = mat("pot", { color: "#8d8678", rough: 0.8 });
  const leaf = mat("leaf", { color: "#4d6b3a", rough: 1 });
  b.ent("pot", b.cylinder(10), pot, { parent, p: [wx(-w * 0.42), 0.08, wz(d * 0.4)], s: [0.12, 0.16, 0.12] });
  b.ent("plant", b.canopy(seed), leaf, { parent, p: [wx(-w * 0.42), 0.24, wz(d * 0.4)], s: [0.24, 0.26, 0.24] });
}

/** Penthouse duplex: double-height living, stair block, master suite. */
function buildPenthouseUnit(ctx: SceneContext, parent: pc.Entity, w: number, d: number, seed: number, mat: MatFn) {
  const b = ctx.builder;
  const WALL_H = 0.62;
  const wall = mat("wall", { color: "#f1ece2", rough: 0.9 });
  const box = (name: string, m: pc.StandardMaterial, p: V3, s: V3, cast = false) =>
    b.box(name, m, { parent, p, s, cast });

  const hw = w / 2 - 0.08;
  const hd = d / 2 - 0.08;
  for (const t of [-0.7, 0, 0.7]) box("win", wall, [hw * t, WALL_H / 2, hd], [w * 0.18, WALL_H, 0.05]);
  for (const t of [-0.7, 0, 0.7]) box("win-b", wall, [hw * t, WALL_H / 2, -hd], [w * 0.18, WALL_H, 0.05]);
  for (const t of [-0.6, 0.6]) box("side", wall, [hw, WALL_H / 2, hd * t], [0.05, WALL_H, d * 0.36]);
  for (const t of [-0.6, 0.6]) box("side-b", wall, [-hw, WALL_H / 2, hd * t], [0.05, WALL_H, d * 0.36]);

  // grand sofa arrangement
  const velvet = mat("velvet", { color: "#6e5a74", rough: 0.95 });
  const marble = mat("marble", { color: "#e8e4dc", rough: 0.15 });
  const woodDark = mat("wood-dark", { color: "#6b4f33", rough: 0.6 });
  box("sofa-a", velvet, [-w * 0.18, 0.09, d * 0.22], [1.3, 0.18, 0.4], true);
  box("sofa-b", velvet, [-w * 0.18 - 0.5, 0.09, d * 0.02], [0.4, 0.18, 0.8], true);
  box("coffee", marble, [-w * 0.18, 0.1, d * 0.04], [0.6, 0.06, 0.36], true);
  box("rug", mat("rug-p", { color: "#b3a18c", rough: 1 }), [-w * 0.16, 0.006, d * 0.1], [1.9, 0.012, 1.2]);

  // staircase to the upper level
  const step = mat("step", { color: "#cdbfa6", rough: 0.5 });
  for (let i = 0; i < 7; i++)
    box(`stair-${i}`, step, [w * 0.34, 0.06 + i * 0.135, -d * 0.05 + i * 0.13], [0.6, 0.06, 0.14], true);

  // dining + kitchen island
  box("dining", woodDark, [w * 0.05, 0.13, -d * 0.3], [0.9, 0.05, 0.4], true);
  box("island", marble, [-w * 0.28, 0.12, -d * 0.32], [0.8, 0.24, 0.32], true);

  // master bed
  const mattress = mat("mattress", { color: "#f4efe3", rough: 0.95 });
  box("bed", mat("bed-p", { color: "#7e6a50", rough: 0.8 }), [w * 0.26, 0.07, d * 0.3], [0.7, 0.12, 0.95], true);
  box("mattress-p", mattress, [w * 0.26, 0.15, d * 0.3], [0.66, 0.06, 0.9]);
  box("duvet-p", mat("duvet-p", { color: "#8595ab", rough: 0.95 }), [w * 0.26, 0.18, d * 0.3 + 0.16], [0.67, 0.04, 0.6]);

  // plants
  const pot = mat("pot", { color: "#8d8678", rough: 0.8 });
  const leaf = mat("leaf", { color: "#4d6b3a", rough: 1 });
  for (const [px, pz] of [
    [-w * 0.42, d * 0.42],
    [w * 0.42, -d * 0.4],
  ]) {
    b.ent("pot", b.cylinder(10), pot, { parent, p: [px, 0.08, pz], s: [0.14, 0.18, 0.14] });
    b.ent("plant", b.canopy(seed + px), leaf, { parent, p: [px, 0.28, pz], s: [0.3, 0.3, 0.3] });
  }
}
