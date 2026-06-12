// Procedural vehicles: sedan / SUV / sports bodies with metallic paint,
// tinted glass, spinning wheels and headlights that come on after dark.
// Wheel spin is driven by a shared per-car speed handle so kerbside cars
// stay still while traffic flows.

import * as pc from "playcanvas";
import { makeMaterial } from "./materials";
import { glowTexture } from "./textures";
import type { SceneContext } from "./context";
import type { V3 } from "./builder";

export type CarKind = "sedan" | "suv" | "sports";

const TYRE = "#15181c";
const GLASSC = "#1d2733";
export const WHEEL_R = 0.15;

const carMatCache = new Map<string, pc.StandardMaterial>();

export function clearVehicleCache() {
  carMatCache.clear();
}
function paint(ctx: SceneContext, color: string, rough = 0.32, metal = 0.45): pc.StandardMaterial {
  const key = `${color}|${rough}|${metal}`;
  let m = carMatCache.get(key);
  if (!m) {
    m = makeMaterial(ctx.store, { color, rough, metal });
    carMatCache.set(key, m);
  }
  return m;
}

export function addHalo(
  ctx: SceneContext,
  parent: pc.Entity,
  p: V3,
  size: number,
  color: string,
  opacity: number,
  litOnly = true
): pc.Entity {
  const b = ctx.builder;
  const glow = glowTexture(ctx.app.graphicsDevice);
  const m = new pc.StandardMaterial();
  m.useLighting = false;
  m.diffuse = new pc.Color(0, 0, 0);
  m.emissive = pc.Color.WHITE.clone();
  const n = parseInt(color.slice(1), 16);
  m.emissive.set(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
  m.emissiveMap = glow;
  m.opacity = opacity;
  m.opacityMap = glow;
  m.blendType = pc.BLEND_ADDITIVE;
  m.depthWrite = false;
  m.cull = pc.CULLFACE_NONE;
  m.update();
  const e = b.ent("halo", b.quad(), m, { parent, p, s: [size, size, 1], receive: false });
  // billboard toward camera
  ctx.onUpdate(() => {
    if (e.enabled) e.lookAt(ctx.cameraPos);
  });
  if (litOnly) ctx.litEnt(e);
  return e;
}

export type CarHandle = {
  entity: pc.Entity;
  speed: { value: number };
};

export function buildCar(
  ctx: SceneContext,
  parent: pc.Entity,
  o: { p?: V3; ry?: number; color: string; kind?: CarKind; lights?: boolean }
): CarHandle {
  const b = ctx.builder;
  const kind = o.kind ?? "sedan";
  const sporty = kind === "sports";
  const tall = kind === "suv";
  const bodyY = sporty ? 0.27 : 0.33;
  const bodyH = sporty ? 0.2 : 0.26;
  const cabinH = tall ? 0.32 : sporty ? 0.17 : 0.22;
  const cabinY = bodyY + bodyH / 2 + cabinH / 2 - 0.02;

  const root = b.group("car", parent, o.p, o.ry ?? 0);
  const body = paint(ctx, o.color);
  const glass = paint(ctx, GLASSC, 0.32, 0.1);
  const trim = paint(ctx, "#23282e", 0.32, 0.2);

  b.box("body", body, { parent: root, p: [0, bodyY, 0], s: [1.78, bodyH, 0.84], cast: true });
  b.box("hood", body, { parent: root, p: [0.74, bodyY + bodyH / 2 - 0.02, 0], s: [0.32, 0.08, 0.8] });
  b.box("boot", body, { parent: root, p: [-0.78, bodyY + bodyH / 2 - 0.02, 0], s: [0.24, 0.08, 0.8] });
  b.box("cabin", glass, { parent: root, p: [-0.08, cabinY, 0], s: [sporty ? 0.7 : 0.78, cabinH, 0.72], cast: true });
  b.box("roof", body, { parent: root, p: [-0.08, cabinY + cabinH / 2 + 0.015, 0], s: [sporty ? 0.74 : 0.82, 0.04, 0.76] });
  b.box("windshield", glass, {
    parent: root,
    p: [0.4, cabinY - 0.02, 0],
    s: [0.34, cabinH, 0.7],
    rot: [0, 0, sporty ? -43 : -31.5],
  });
  b.box("rear", glass, {
    parent: root,
    p: [-0.55, cabinY - 0.02, 0],
    s: [0.3, cabinH, 0.7],
    rot: [0, 0, sporty ? 40 : 28.6],
  });
  b.box("bumperF", trim, { parent: root, p: [0.9, 0.26, 0], s: [0.05, 0.1, 0.7] });
  b.box("bumperR", trim, { parent: root, p: [-0.9, 0.26, 0], s: [0.05, 0.1, 0.7] });
  if (tall) {
    b.box("railL", trim, { parent: root, p: [-0.05, cabinY + cabinH / 2 + 0.06, 0.3], s: [0.7, 0.03, 0.04] });
    b.box("railR", trim, { parent: root, p: [-0.05, cabinY + cabinH / 2 + 0.06, -0.3], s: [0.7, 0.03, 0.04] });
  }
  if (sporty) {
    b.box("wing", body, { parent: root, p: [-0.85, 0.5, 0], s: [0.16, 0.035, 0.74] });
    b.box("wingL", trim, { parent: root, p: [-0.85, 0.44, 0.3], s: [0.05, 0.09, 0.05] });
    b.box("wingR", trim, { parent: root, p: [-0.85, 0.44, -0.3], s: [0.05, 0.09, 0.05] });
  }

  // lights — emissive boxes that brighten after dark
  const head = makeMaterial(ctx.store, { color: "#fff3c4", rough: 0.4, emissive: "#fff3c4" });
  const tail = makeMaterial(ctx.store, { color: "#ff3b30", rough: 0.4, emissive: "#ff3b30" });
  if (o.lights !== false) {
    ctx.litMat(head, 2.2, 0.4);
    ctx.litMat(tail, 1.6, 0.5);
  } else {
    head.emissiveIntensity = 0.25;
    tail.emissiveIntensity = 0.25;
    head.update();
    tail.update();
  }
  b.box("hlL", head, { parent: root, p: [0.9, 0.38, 0.26], s: [0.04, 0.06, 0.14] });
  b.box("hlR", head, { parent: root, p: [0.9, 0.38, -0.26], s: [0.04, 0.06, 0.14] });
  b.box("tlL", tail, { parent: root, p: [-0.9, 0.38, 0.26], s: [0.03, 0.05, 0.13] });
  b.box("tlR", tail, { parent: root, p: [-0.9, 0.38, -0.26], s: [0.03, 0.05, 0.13] });

  // wheels with spin
  const tyre = paint(ctx, TYRE, 0.9, 0);
  const hub = paint(ctx, "#cdd2d8", 0.25, 0.8);
  const speed = { value: 0 };
  const spinners: pc.Entity[] = [];
  for (const [x, z] of [
    [0.55, 0.43],
    [-0.55, 0.43],
    [0.55, -0.43],
    [-0.55, -0.43],
  ] as [number, number][]) {
    const mount = b.group("wheel", root, [x, WHEEL_R, z]);
    mount.setLocalEulerAngles(90, 0, 0);
    const spin = b.group("spin", mount);
    b.ent("tyre", b.cylinder(16), tyre, { parent: spin, s: [WHEEL_R * 2, 0.12, WHEEL_R * 2], cast: true });
    b.ent("hubA", b.cylinder(12), hub, { parent: spin, p: [0, 0.065, 0], s: [WHEEL_R * 1.04, 0.012, WHEEL_R * 1.04] });
    b.ent("hubB", b.cylinder(12), hub, { parent: spin, p: [0, -0.065, 0], s: [WHEEL_R * 1.04, 0.012, WHEEL_R * 1.04] });
    spinners.push(spin);
  }
  let angle = 0;
  ctx.onUpdate((dt) => {
    if (speed.value === 0 || !root.enabled) return;
    angle -= ((speed.value * dt) / WHEEL_R / Math.PI) * 180;
    for (const s of spinners) s.setLocalEulerAngles(0, angle, 0);
  });

  return { entity: root, speed };
}
