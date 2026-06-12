// DOM label overlay: tracks world anchors and positions absolutely-placed
// HTML nodes over the canvas each frame (home labels, amenity tooltips, the
// rooftop sign). Labels scale gently with distance and hide when their
// anchor is behind the camera or its floor has been sliced away.

import * as pc from "playcanvas";

export type LabelHandle = {
  el: HTMLDivElement;
  setVisible(v: boolean): void;
  setWorld(x: number, y: number, z: number): void;
  destroy(): void;
};

type Entry = {
  el: HTMLDivElement;
  world: pc.Vec3;
  visible: boolean;
  baseScale: number;
};

export class LabelLayer {
  private container: HTMLDivElement;
  private entries = new Set<Entry>();
  private tmp = new pc.Vec3();

  constructor(parent: HTMLElement) {
    this.container = document.createElement("div");
    this.container.style.cssText =
      "position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:10;";
    parent.appendChild(this.container);
  }

  add(html: string, baseScale = 1): LabelHandle {
    const el = document.createElement("div");
    el.style.cssText =
      "position:absolute;left:0;top:0;will-change:transform;pointer-events:none;visibility:hidden;";
    el.innerHTML = html;
    this.container.appendChild(el);
    const entry: Entry = { el, world: new pc.Vec3(), visible: true, baseScale };
    this.entries.add(entry);
    return {
      el,
      setVisible: (v) => {
        entry.visible = v;
        if (!v) el.style.visibility = "hidden";
      },
      setWorld: (x, y, z) => entry.world.set(x, y, z),
      destroy: () => {
        this.entries.delete(entry);
        el.remove();
      },
    };
  }

  update(camera: pc.CameraComponent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const camPos = camera.entity.getPosition();
    const camFwd = camera.entity.forward;
    for (const e of this.entries) {
      if (!e.visible) continue;
      // behind-camera test
      this.tmp.sub2(e.world, camPos);
      const dist = this.tmp.length();
      if (this.tmp.dot(camFwd) < 0.05 || dist < 0.5) {
        e.el.style.visibility = "hidden";
        continue;
      }
      camera.worldToScreen(e.world, this.tmp);
      const x = (this.tmp.x / (canvas.clientWidth || rect.width)) * rect.width;
      const y = (this.tmp.y / (canvas.clientHeight || rect.height)) * rect.height;
      if (x < -80 || y < -40 || x > rect.width + 80 || y > rect.height + 40) {
        e.el.style.visibility = "hidden";
        continue;
      }
      const scale = Math.max(0.55, Math.min(1.25, (14 / dist) * e.baseScale));
      e.el.style.visibility = "visible";
      e.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%,-50%) scale(${scale.toFixed(3)})`;
    }
  }

  destroy() {
    this.container.remove();
    this.entries.clear();
  }
}
