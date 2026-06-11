"use client";

// Cheap "bloom" without postprocessing: a shared radial-gradient sprite
// texture used for light halos, plus an additive light cone for lamps and
// headlights. Both are fog-free so lights punch through the dusk haze.

import * as THREE from "three";

let tex: THREE.CanvasTexture | null = null;

export function glowTexture(): THREE.CanvasTexture {
  if (!tex) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.3, "rgba(255,255,255,0.5)");
    grad.addColorStop(0.65, "rgba(255,255,255,0.12)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    tex = new THREE.CanvasTexture(c);
  }
  return tex;
}

export function Halo({
  p,
  size = 1,
  color = "#ffd9a0",
  opacity = 0.7,
}: {
  p: [number, number, number];
  size?: number;
  color?: string;
  opacity?: number;
}) {
  return (
    <sprite position={p} scale={[size, size, 1]}>
      <spriteMaterial
        map={glowTexture()}
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        fog={false}
      />
    </sprite>
  );
}

/** Downward cone of lamplight; apex sits at `p` (the bulb). */
export function LightCone({
  p,
  h = 1.6,
  r = 0.7,
  color = "#ffd9a0",
  opacity = 0.09,
}: {
  p: [number, number, number];
  h?: number;
  r?: number;
  color?: string;
  opacity?: number;
}) {
  return (
    <mesh position={[p[0], p[1] - h / 2, p[2]]}>
      <coneGeometry args={[r, h, 16, 1, true]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
