// Ray-vs-AABB picking. All interactive volumes in the scene are boxes
// (floors, homes on the open floor, amenity zones), so a screen ray against
// a list of bounding boxes is exact, allocation-light and works identically
// on WebGPU and WebGL2 with zero extra render passes.

import * as pc from "playcanvas";

export type PickResult<T> = { item: T; distance: number };

const near = new pc.Vec3();
const far = new pc.Vec3();
const dir = new pc.Vec3();
const hitPoint = new pc.Vec3();

export function screenRay(camera: pc.CameraComponent, x: number, y: number): pc.Ray {
  camera.screenToWorld(x, y, camera.nearClip + 0.001, near);
  camera.screenToWorld(x, y, camera.farClip * 0.6, far);
  dir.sub2(far, near).normalize();
  return new pc.Ray(near.clone(), dir.clone());
}

export function pickAABBs<T>(
  ray: pc.Ray,
  items: { item: T; aabb: pc.BoundingBox }[]
): PickResult<T> | null {
  let best: PickResult<T> | null = null;
  for (const { item, aabb } of items) {
    if (aabb.intersectsRay(ray, hitPoint)) {
      const d = hitPoint.distance(ray.origin);
      if (!best || d < best.distance) best = { item, distance: d };
    }
  }
  return best;
}
