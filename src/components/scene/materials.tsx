"use client";

// PBR texture plumbing for the photoreal upgrade. Textures are CC0 assets
// from Poly Haven bundled under /public/textures. Each asset ships three
// maps: diff (albedo), nor_gl (normal) and arm (R=AO, G=roughness, B=metal —
// the glTF convention, which maps 1:1 onto three.js material slots).
//
// useTexture suspends, so components that call usePBRMaps must live inside
// a <Suspense> boundary; configured texture sets are cached module-wide so
// repeated call sites share a single GPU upload.

import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

export type PBRMapProps = {
  map?: THREE.Texture;
  normalMap: THREE.Texture;
  normalScale: THREE.Vector2;
  aoMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
  metalnessMap?: THREE.Texture;
  roughness: number;
  metalness: number;
};

const cache = new Map<string, PBRMapProps>();

export function usePBRMaps(
  asset: string,
  repeat: [number, number] = [1, 1],
  opts: { arm?: boolean; diff?: boolean; normalScale?: number; rotation?: number } = {}
): PBRMapProps {
  const withArm = opts.arm !== false;
  const withDiff = opts.diff !== false;
  const ns = opts.normalScale ?? 1;
  const rot = opts.rotation ?? 0;
  const urls = [
    ...(withDiff ? [`/textures/${asset}_diff_1k.jpg`] : []),
    `/textures/${asset}_nor_gl_1k.jpg`,
    ...(withArm ? [`/textures/${asset}_arm_1k.jpg`] : []),
  ];
  const loaded = useTexture(urls) as THREE.Texture[];
  const gl = useThree((s) => s.gl);

  return useMemo(() => {
    const key = `${asset}|${repeat[0]}x${repeat[1]}|${ns}|${rot}|${withArm}|${withDiff}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
    const conf = (t: THREE.Texture, srgb: boolean) => {
      const c = t.clone();
      c.wrapS = c.wrapT = THREE.RepeatWrapping;
      c.repeat.set(repeat[0], repeat[1]);
      c.rotation = rot;
      c.anisotropy = aniso;
      if (srgb) c.colorSpace = THREE.SRGBColorSpace;
      c.needsUpdate = true;
      return c;
    };
    let i = 0;
    const props: PBRMapProps = {
      ...(withDiff ? { map: conf(loaded[i++], true) } : {}),
      normalMap: conf(loaded[i++], false),
      normalScale: new THREE.Vector2(ns, ns),
      roughness: 1,
      metalness: withArm ? 1 : 0,
    };
    if (withArm) {
      const arm = conf(loaded[i], false);
      props.aoMap = arm;
      props.roughnessMap = arm;
      props.metalnessMap = arm;
    }
    cache.set(key, props);
    return props;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, loaded, repeat[0], repeat[1], ns, rot, withArm, withDiff, gl]);
}

/** Scrolling water normal map (the classic three.js examples asset). */
export function useWaterNormals(repeat: [number, number] = [3, 3]): THREE.Texture {
  const tex = useTexture("/textures/waternormals.jpg") as THREE.Texture;
  return useMemo(() => {
    const c = tex.clone();
    c.wrapS = c.wrapT = THREE.RepeatWrapping;
    c.repeat.set(repeat[0], repeat[1]);
    c.needsUpdate = true;
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tex, repeat[0], repeat[1]]);
}

/** Soft caustic light-web texture, generated once on a canvas. */
let causticsTex: THREE.CanvasTexture | null = null;
export function causticsTexture(): THREE.CanvasTexture {
  if (!causticsTex) {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d")!;
    g.fillStyle = "#000";
    g.fillRect(0, 0, size, size);
    const rnd = (i: number) => {
      const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
      return v - Math.floor(v);
    };
    g.strokeStyle = "rgba(255,255,255,0.5)";
    g.shadowColor = "rgba(255,255,255,0.9)";
    g.shadowBlur = 4;
    // draw a wobbly cell web; duplicate strokes shifted by ±size so it tiles
    for (let i = 0; i < 90; i++) {
      const x = rnd(i) * size;
      const y = rnd(i + 100) * size;
      const r = 14 + rnd(i + 200) * 30;
      const a0 = rnd(i + 300) * Math.PI * 2;
      const a1 = a0 + 1.5 + rnd(i + 400) * 3;
      g.lineWidth = 1 + rnd(i + 500) * 2;
      for (const dx of [-size, 0, size])
        for (const dy of [-size, 0, size]) {
          g.beginPath();
          g.arc(x + dx, y + dy, r, a0, a1);
          g.stroke();
        }
    }
    causticsTex = new THREE.CanvasTexture(c);
    causticsTex.wrapS = causticsTex.wrapT = THREE.RepeatWrapping;
  }
  return causticsTex;
}
