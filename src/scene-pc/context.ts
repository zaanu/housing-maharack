// Shared scene context threaded through all content modules: engine handles,
// the texture store, label layer, per-frame updaters, and the registry of
// mode-dependent emissive materials (lamps, signs, windows) that toggle
// between day and dusk/night intensities.

import * as pc from "playcanvas";
import type { Builder } from "./builder";
import type { TextureStore } from "./materials";
import type { LabelLayer } from "./labels";
import type { QualitySettings } from "./quality";
import { isLit, THEMES, type SceneMode, type Theme } from "./theme";

export type Updater = (dt: number, time: number) => void;

export type LitItem = {
  mat: pc.StandardMaterial;
  on: number;
  off: number;
};

/** Entities only shown after dark (halos, light cones, underwater glow). */
export type LitEntity = { entity: pc.Entity };

export class SceneContext {
  updaters = new Set<Updater>();
  litItems: LitItem[] = [];
  litEntities: pc.Entity[] = [];
  time = 0;
  mode: SceneMode = "dusk";
  /** camera world position, refreshed once per frame for billboards */
  cameraPos = new pc.Vec3(20, 15, 25);

  constructor(
    public app: pc.AppBase,
    public builder: Builder,
    public store: TextureStore,
    public labels: LabelLayer,
    public quality: QualitySettings
  ) {}

  get theme(): Theme {
    return THEMES[this.mode];
  }

  get lit(): boolean {
    return isLit(this.mode);
  }

  onUpdate(fn: Updater): void {
    this.updaters.add(fn);
  }

  /** Register an emissive material that brightens after dark. */
  litMat(mat: pc.StandardMaterial, on: number, off = 0.12): void {
    this.litItems.push({ mat, on, off });
    mat.emissiveIntensity = this.lit ? on : off;
    mat.update();
  }

  /** Register an entity that is only visible after dark. */
  litEnt(entity: pc.Entity): void {
    this.litEntities.push(entity);
    entity.enabled = this.lit;
  }

  applyMode(mode: SceneMode): void {
    this.mode = mode;
    const lit = this.lit;
    for (const item of this.litItems) {
      item.mat.emissiveIntensity = lit ? item.on : item.off;
      item.mat.update();
    }
    for (const e of this.litEntities) e.enabled = lit;
  }

  tick(dt: number): void {
    this.time += dt;
    for (const u of this.updaters) u(dt, this.time);
  }
}
