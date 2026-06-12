// Slice-view animation controller. Each floor registers fade sets (glass
// materials, structure materials, its entity for lift). Every frame the
// controller damps opacity and lift toward the targets implied by the
// current selection: floors above the selected one fade out and lift away,
// floors below dim to context, the selected floor opens.

import * as pc from "playcanvas";
import { damp } from "./builder";

export type FloorMode = "normal" | "context" | "open" | "above";

const TARGETS: Record<FloorMode, { glass: number; structure: number; lift: number }> = {
  normal: { glass: 0.5, structure: 1, lift: 0 },
  context: { glass: 0.16, structure: 0.42, lift: 0 },
  open: { glass: 0, structure: 1, lift: 0 },
  above: { glass: 0, structure: 0, lift: 1.1 },
};

export type FadeMat = { mat: pc.StandardMaterial; base: number };

export class FloorFader {
  glassMats: FadeMat[] = [];
  structureMats: FadeMat[] = [];
  glassFade = 0.5 / 0.5;
  structFade = 1;
  lift = 0;
  mode: FloorMode = "normal";
  visibleNow = true;
  /** invoked when the faded-ness changes enough to toggle entity visibility */
  constructor(
    public number: number,
    public baseY: number,
    public entity: pc.Entity,
    public facade: pc.Entity | null
  ) {}

  registerGlass(mat: pc.StandardMaterial, base: number): FadeMat {
    const f = { mat, base };
    this.glassMats.push(f);
    return f;
  }

  registerStructure(mat: pc.StandardMaterial, base: number): FadeMat {
    const f = { mat, base };
    this.structureMats.push(f);
    return f;
  }

  private force = false;

  /** force re-apply on the next frame (after a base-opacity change) */
  dirty() {
    this.force = true;
  }

  update(dt: number): void {
    const t = TARGETS[this.mode];
    const gTarget = t.glass / 0.5; // normalized: 1 == default glass opacity
    const prevG = this.glassFade;
    const prevS = this.structFade;
    this.glassFade = damp(this.glassFade, gTarget, 6, dt);
    this.structFade = damp(this.structFade, t.structure, 6, dt);
    this.lift = damp(this.lift, t.lift, 6, dt);
    // snap when close: ends the per-frame material.update burst sooner
    if (Math.abs(this.glassFade - gTarget) < 0.012) this.glassFade = gTarget;
    if (Math.abs(this.structFade - t.structure) < 0.012) this.structFade = t.structure;
    if (Math.abs(this.lift - t.lift) < 0.01) this.lift = t.lift;

    if (Math.abs(this.glassFade - prevG) > 0.0004) {
      for (const f of this.glassMats) {
        f.mat.opacity = f.base * this.glassFade;
        f.mat.update();
      }
    }
    if (this.force || Math.abs(this.structFade - prevS) > 0.0004) {
      this.force = false;
      for (const f of this.structureMats) {
        const o = f.base * this.structFade;
        f.mat.opacity = o;
        // opaque materials ignore opacity — swap blend mode while fading
        const wantBlend = o < 0.995 ? pc.BLEND_NORMAL : f.base < 1 ? pc.BLEND_NORMAL : pc.BLEND_NONE;
        if (f.mat.blendType !== wantBlend) f.mat.blendType = wantBlend;
        f.mat.update();
      }
    }
    this.entity.setLocalPosition(0, this.baseY + this.lift, 0);

    const visible = this.structFade > 0.03 || this.glassFade > 0.06;
    if (visible !== this.visibleNow) {
      this.visibleNow = visible;
      this.entity.enabled = visible;
    }
    // the facade group hides while the floor is open so interiors show
    if (this.facade) {
      const facadeOn = this.mode !== "open";
      if (this.facade.enabled !== facadeOn) this.facade.enabled = facadeOn;
    }
  }
}

export function modeOf(floorNumber: number, selected: number | null): FloorMode {
  if (selected == null) return "normal";
  if (floorNumber === selected) return "open";
  return floorNumber < selected ? "context" : "above";
}
