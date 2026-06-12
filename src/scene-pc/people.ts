// Residents at human scale: walkers following waypoint loops with a walk
// cycle, people on benches, loungers by the pool, swimmers doing laps.
// Figures are intentionally simple silhouettes — they read as people for
// scale without pulling focus from the architecture.

import * as pc from "playcanvas";
import { makeMaterial } from "./materials";
import type { SceneContext } from "./context";
import type { V3 } from "./builder";

export const SKIN = ["#cfa180", "#a8754f", "#8a5a3b", "#e0b08c"];
const PANTS = ["#3a4660", "#5a4a3a", "#2e3b35", "#6b3a4a"];

type PersonOpts = {
  shirt: string;
  pants?: string;
  skin?: string;
  scale?: number;
};

const matCache = new Map<string, pc.StandardMaterial>();

export function clearPeopleCache() {
  matCache.clear();
}

function flat(ctx: SceneContext, color: string, rough = 0.9): pc.StandardMaterial {
  const key = `${color}|${rough}`;
  let m = matCache.get(key);
  if (!m) {
    m = makeMaterial(ctx.store, { color, rough });
    matCache.set(key, m);
  }
  return m;
}

export type PersonRig = {
  root: pc.Entity;
  limbs: pc.Entity[]; // legL, legR, armL, armR (pivot groups)
  body: pc.Entity;
};

/** Body with forward = +x; limbs pivot at the hip/shoulder. */
export function buildPerson(ctx: SceneContext, parent: pc.Entity, o: PersonOpts): PersonRig {
  const b = ctx.builder;
  const scale = o.scale ?? 1;
  const pants = o.pants ?? PANTS[0];
  const skin = o.skin ?? SKIN[0];
  const root = b.group("person", parent);
  root.setLocalScale(scale, scale, scale);
  const body = b.group("body", root);

  const limb = (p: V3, len: number, w: number, c: string) => {
    const pivot = b.group("limb", body, p);
    b.box("seg", flat(ctx, c), { parent: pivot, p: [0, -len / 2, 0], s: [w, len, w], cast: true });
    return pivot;
  };
  const limbs = [
    limb([0, 0.24, 0.05], 0.24, 0.055, pants),
    limb([0, 0.24, -0.05], 0.24, 0.055, pants),
    limb([0, 0.44, 0.105], 0.2, 0.042, o.shirt),
    limb([0, 0.44, -0.105], 0.2, 0.042, o.shirt),
  ];
  b.box("torso", flat(ctx, o.shirt, 0.85), { parent: body, p: [0, 0.345, 0], s: [0.1, 0.21, 0.16], cast: true });
  b.ent("head", b.sphere(10), flat(ctx, skin), { parent: body, p: [0, 0.52, 0], s: [0.104, 0.104, 0.104], cast: true });
  b.ent("hair", b.sphere(10), flat(ctx, "#2c2118", 1), { parent: body, p: [-0.005, 0.55, 0], s: [0.1, 0.1, 0.1] });
  return { root, limbs, body };
}

/** Walks a closed loop of XZ waypoints at `speed` units/s. */
export function addWalker(
  ctx: SceneContext,
  parent: pc.Entity,
  path: [number, number][],
  o: PersonOpts & { speed?: number; offset?: number }
): void {
  const speed = o.speed ?? 0.55;
  const offset = o.offset ?? 0;
  const rig = buildPerson(ctx, parent, o);
  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < path.length; i++) {
    const [x1, z1] = path[i];
    const [x2, z2] = path[(i + 1) % path.length];
    const l = Math.hypot(x2 - x1, z2 - z1);
    lengths.push(l);
    total += l;
  }
  const swing = speed * 7.5;
  ctx.onUpdate((_dt, time) => {
    if (!rig.root.enabled) return;
    let d = (((time * speed + offset) % total) + total) % total;
    let i = 0;
    while (d > lengths[i]) {
      d -= lengths[i];
      i = (i + 1) % path.length;
    }
    const [x1, z1] = path[i];
    const [x2, z2] = path[(i + 1) % path.length];
    const f = lengths[i] > 0 ? d / lengths[i] : 0;
    rig.root.setLocalPosition(x1 + (x2 - x1) * f, 0, z1 + (z2 - z1) * f);
    rig.root.setLocalEulerAngles(0, (Math.atan2(-(z2 - z1), x2 - x1) * 180) / Math.PI, 0);
    const t = time * swing + offset;
    const a = (Math.sin(t) * 0.55 * 180) / Math.PI;
    rig.limbs[0].setLocalEulerAngles(0, 0, a);
    rig.limbs[1].setLocalEulerAngles(0, 0, -a);
    rig.limbs[2].setLocalEulerAngles(0, 0, -a * 0.8);
    rig.limbs[3].setLocalEulerAngles(0, 0, a * 0.8);
    rig.body.setLocalPosition(0, Math.abs(Math.cos(t)) * 0.012, 0);
  });
}

/** Seated on a bench/lounger edge, legs bent forward. */
export function addSitter(
  ctx: SceneContext,
  parent: pc.Entity,
  p: V3,
  ry: number,
  shirt: string,
  skin = SKIN[1]
): void {
  const b = ctx.builder;
  const g = b.group("sitter", parent, p, (ry * 180) / Math.PI);
  b.box("torso", flat(ctx, shirt, 0.85), { parent: g, p: [0, 0.07, 0], s: [0.1, 0.2, 0.16], cast: true });
  for (const z of [0.05, -0.05]) {
    b.box("thigh", flat(ctx, PANTS[2]), { parent: g, p: [0.08, -0.01, z], s: [0.16, 0.05, 0.055] });
    b.box("shin", flat(ctx, PANTS[2]), { parent: g, p: [0.15, -0.09, z], s: [0.05, 0.14, 0.055] });
  }
  b.ent("head", b.sphere(10), flat(ctx, skin), { parent: g, p: [0, 0.24, 0], s: [0.104, 0.104, 0.104], cast: true });
  b.ent("hair", b.sphere(10), flat(ctx, "#3a2a1d", 1), { parent: g, p: [-0.005, 0.27, 0], s: [0.1, 0.1, 0.1] });
}

/** Lying flat on a pool lounger. */
export function addLounging(
  ctx: SceneContext,
  parent: pc.Entity,
  p: V3,
  ry: number,
  suit: string,
  skin = SKIN[3]
): void {
  const b = ctx.builder;
  const g = b.group("lounging", parent, p, (ry * 180) / Math.PI);
  b.box("body", flat(ctx, suit), { parent: g, p: [0.02, 0.03, 0], s: [0.34, 0.06, 0.14] });
  b.box("legs", flat(ctx, skin), { parent: g, p: [0.28, 0.025, 0], s: [0.2, 0.045, 0.12] });
  b.ent("head", b.sphere(10), flat(ctx, skin), { parent: g, p: [-0.17, 0.06, 0], s: [0.1, 0.1, 0.1] });
}

/** Slow freestyle laps along x inside the pool. */
export function addSwimmer(
  ctx: SceneContext,
  parent: pc.Entity,
  p: V3,
  range = 2.6,
  phase = 0
): void {
  const b = ctx.builder;
  const g = b.group("swimmer", parent, p);
  const skin = SKIN[2];
  b.box("body", flat(ctx, skin), { parent: g, p: [0, 0, 0], s: [0.3, 0.05, 0.14] });
  b.ent("head", b.sphere(10), flat(ctx, skin), { parent: g, p: [0.2, 0.03, 0], s: [0.1, 0.1, 0.1] });
  const armL = b.group("armL", g, [0.08, 0.02, 0.1]);
  b.box("a", flat(ctx, skin), { parent: armL, s: [0.16, 0.03, 0.04] });
  const armR = b.group("armR", g, [0.08, 0.02, -0.1]);
  b.box("a", flat(ctx, skin), { parent: armR, s: [0.16, 0.03, 0.04] });
  ctx.onUpdate((_dt, time) => {
    if (!g.enabled) return;
    const t = time * 0.5 + phase;
    const dir = Math.sin(t) >= 0 ? 1 : -1;
    g.setLocalPosition(
      p[0] + Math.sin(t) * range,
      p[1] + Math.sin(time * 2.2) * 0.008,
      p[2]
    );
    g.setLocalEulerAngles(0, dir > 0 ? 0 : 180, 0);
    const stroke = time * 4;
    armL.setLocalEulerAngles(0, 0, ((Math.sin(stroke) * 0.9 - 0.4) * 180) / Math.PI);
    armR.setLocalEulerAngles(0, 0, ((Math.sin(stroke + Math.PI) * 0.9 - 0.4) * 180) / Math.PI);
  });
}
