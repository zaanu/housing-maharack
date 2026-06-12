// Orbit camera with smoothed targets, touch support, preset viewpoints and
// the cinematic intro. All motion is exponentially damped so transitions are
// stable and free of sudden jumps; pitch/distance/target clamps keep the
// camera out of the ground and away from degenerate poses.

import * as pc from "playcanvas";
import { damp } from "./builder";

export type Pose = { tx: number; ty: number; tz: number; yaw: number; pitch: number; dist: number };

export const PRESETS: Record<string, Pose> = {
  aerial: { tx: 0, ty: 5.5, tz: 2, yaw: 41, pitch: 27, dist: 46 },
  pool: { tx: -13, ty: -0.5, tz: 9.5, yaw: 188, pitch: 26, dist: 11 },
  entrance: { tx: 0, ty: 1.2, tz: 5.5, yaw: 197, pitch: 9, dist: 13.5 },
  podium: { tx: 0, ty: 1.5, tz: 2, yaw: 150, pitch: 14, dist: 22 },
  tower: { tx: 0, ty: 7.5, tz: 0, yaw: 65, pitch: 12, dist: 34 },
};

const INTRO_START: Pose = { tx: 0, ty: 4.5, tz: 8, yaw: 183, pitch: 3, dist: 29 };

export class OrbitCamera {
  entity: pc.Entity;
  /** smoothed current pose */
  private cur: Pose = { ...INTRO_START };
  /** goal pose the camera eases toward */
  private goal: Pose = { ...INTRO_START };
  private minDist = 12.5;
  private maxDist = 95;
  private idleSpin = true;
  private introTimer: ReturnType<typeof setTimeout> | null = null;
  interacted = false;
  onInteract: (() => void) | null = null;

  private pointers = new Map<number, { x: number; y: number }>();
  private lastPinch = 0;
  private el: HTMLElement;
  private smoothing = 4.2;

  constructor(private app: pc.AppBase, canvas: HTMLCanvasElement) {
    this.el = canvas;
    this.entity = new pc.Entity("camera");
    this.entity.addComponent("camera", {
      fov: 42,
      nearClip: 0.35,
      farClip: 700,
      clearColor: new pc.Color(0.1, 0.1, 0.14),
    });
    app.root.addChild(this.entity);
    this.applyPose(this.cur);
    this.bind();
    // cinematic opening: street level at the gate, then rise to the aerial view
    this.introTimer = setTimeout(() => {
      if (!this.interacted) this.flyTo(PRESETS.aerial);
      this.introTimer = null;
    }, 2300);
  }

  get camera(): pc.CameraComponent {
    return this.entity.camera!;
  }

  private bind() {
    const el = this.el;
    el.addEventListener("pointerdown", this.onDown, { passive: false });
    el.addEventListener("pointermove", this.onMove, { passive: false });
    el.addEventListener("pointerup", this.onUp);
    el.addEventListener("pointercancel", this.onUp);
    el.addEventListener("wheel", this.onWheel, { passive: false });
    el.addEventListener("contextmenu", this.onCtx);
  }

  dispose() {
    const el = this.el;
    el.removeEventListener("pointerdown", this.onDown);
    el.removeEventListener("pointermove", this.onMove);
    el.removeEventListener("pointerup", this.onUp);
    el.removeEventListener("pointercancel", this.onUp);
    el.removeEventListener("wheel", this.onWheel);
    el.removeEventListener("contextmenu", this.onCtx);
    if (this.introTimer) clearTimeout(this.introTimer);
  }

  private markInteracted() {
    if (!this.interacted) {
      this.interacted = true;
      this.onInteract?.();
    }
    this.idleSpin = false;
  }

  private onCtx = (e: Event) => e.preventDefault();

  private onDown = (e: PointerEvent) => {
    this.el.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.lastPinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  private onMove = (e: PointerEvent) => {
    const prev = this.pointers.get(e.pointerId);
    if (!prev) return;
    e.preventDefault();
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (Math.abs(dx) + Math.abs(dy) > 0.5) this.markInteracted();

    if (this.pointers.size === 1) {
      if (e.buttons === 2 || e.buttons === 4) this.pan(dx, dy);
      else this.orbit(dx, dy);
    } else if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const pinch = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.lastPinch > 0) this.zoomBy(this.lastPinch / Math.max(1, pinch));
      this.lastPinch = pinch;
      this.pan(dx * 0.5, dy * 0.5);
    }
  };

  private onUp = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    this.lastPinch = 0;
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.markInteracted();
    this.zoomBy(Math.exp(Math.sign(e.deltaY) * 0.16));
  };

  private orbit(dx: number, dy: number) {
    this.goal.yaw -= dx * 0.25;
    this.goal.pitch = pc.math.clamp(this.goal.pitch + dy * 0.18, 3, 86);
  }

  private pan(dx: number, dy: number) {
    const scale = this.cur.dist * 0.0016;
    const yawRad = (this.cur.yaw * Math.PI) / 180;
    const rx = Math.cos(yawRad);
    const rz = -Math.sin(yawRad);
    // screen-right and screen-forward (projected onto the ground)
    this.goal.tx += (-dx * rx + dy * -rz) * scale;
    this.goal.tz += (-dx * rz + dy * rx) * scale;
    const r = Math.hypot(this.goal.tx, this.goal.tz);
    if (r > 42) {
      this.goal.tx *= 42 / r;
      this.goal.tz *= 42 / r;
    }
  }

  private zoomBy(factor: number) {
    this.goal.dist = pc.math.clamp(this.goal.dist * factor, this.minDist, this.maxDist);
  }

  /** Smaller orbit radius is allowed while inspecting an open floor. */
  setCloseRange(close: boolean) {
    this.minDist = close ? 5.5 : 12.5;
    this.goal.dist = pc.math.clamp(this.goal.dist, this.minDist, this.maxDist);
  }

  flyTo(pose: Pose, instant = false) {
    // unwrap yaw so the flight takes the short way around
    let yaw = pose.yaw;
    while (yaw - this.cur.yaw > 180) yaw -= 360;
    while (yaw - this.cur.yaw < -180) yaw += 360;
    this.goal = { ...pose, yaw };
    this.idleSpin = false;
    if (instant) {
      this.cur = { ...pose, yaw };
      this.applyPose(this.cur);
    }
  }

  preset(name: keyof typeof PRESETS) {
    this.markInteracted();
    this.flyTo(PRESETS[name]);
  }

  reset() {
    this.markInteracted();
    this.flyTo(PRESETS.aerial);
  }

  resumeIdle() {
    if (!this.interacted) this.idleSpin = true;
  }

  update(dt: number) {
    if (this.idleSpin && this.interacted === false) this.goal.yaw += dt * 2.6;
    const k = this.smoothing;
    this.cur.yaw = damp(this.cur.yaw, this.goal.yaw, k, dt);
    this.cur.pitch = damp(this.cur.pitch, this.goal.pitch, k, dt);
    this.cur.dist = damp(this.cur.dist, this.goal.dist, k, dt);
    this.cur.tx = damp(this.cur.tx, this.goal.tx, k, dt);
    this.cur.ty = damp(this.cur.ty, this.goal.ty, k, dt);
    this.cur.tz = damp(this.cur.tz, this.goal.tz, k, dt);
    this.applyPose(this.cur);
  }

  private applyPose(p: Pose) {
    const yaw = (p.yaw * Math.PI) / 180;
    const pitch = (p.pitch * Math.PI) / 180;
    const cx = p.tx + p.dist * Math.cos(pitch) * Math.sin(yaw);
    const cy = Math.max(0.6, p.ty + p.dist * Math.sin(pitch));
    const cz = p.tz + p.dist * Math.cos(pitch) * Math.cos(yaw);
    this.entity.setPosition(cx, cy, cz);
    this.entity.lookAt(p.tx, p.ty, p.tz);
  }

  /** Pose helpers for slice-view framing (ported from the R3F camera rig). */
  poseForFloor(y: number, portrait: boolean): Pose {
    const f = portrait ? 1.55 : 1;
    return { tx: 0, ty: y + 0.2, tz: 0, yaw: 42, pitch: 52, dist: 17.5 * f };
  }

  poseForHome(x: number, z: number, y: number, portrait: boolean): Pose {
    const f = portrait ? 1.5 : 1;
    const yaw = (Math.atan2(x === 0 ? 0.01 : x, z === 0 ? 0.01 : z) * 180) / Math.PI;
    return { tx: x, ty: y + 0.25, tz: z, yaw, pitch: 38, dist: 7.6 * f };
  }

  poseForPenthouse(x: number | null, y: number, portrait: boolean): Pose {
    const f = portrait ? 2.0 : 1;
    if (x === null) return { tx: 0, ty: y + 1.15, tz: 0, yaw: 14, pitch: 16, dist: 17 * f };
    return { tx: x * 0.85, ty: y + 1.05, tz: 0.4, yaw: x < 0 ? -8 : 8, pitch: 13, dist: 11.5 * f };
  }

  worldPos(): pc.Vec3 {
    return this.entity.getPosition();
  }
}
