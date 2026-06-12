"use client";

// Scene mode system: Day (clear afternoon daylight), Dusk (golden hour — the
// default "hero" look) and Night (deep sky, lit windows, glowing lamps).
// Each mode pairs a bundled HDRI (image-based lighting for PBR reflections)
// with a matched sun, fog and sky grade. Components inside the Canvas read
// the active theme via useSceneMode().

import { createContext, useContext } from "react";
import * as THREE from "three";

export type SceneMode = "day" | "dusk" | "night";

export type SceneTheme = {
  /** direction of the sun (or moon) for the sky shader + halo sprites */
  sunDir: THREE.Vector3;
  sky: { zenith: string; mid: string; horizon: string; bloom: number; core: number; sunTint: string };
  sun: { size: number; color: string; opacity: number; coreSize: number; coreColor: string; coreOpacity: number };
  stars: boolean;
  /** bundled equirectangular HDRI used for image-based lighting */
  hdri: string;
  envIntensity: number;
  cloudHi: string;
  cloudLo: string;
  cloudOpacity: number;
  fog: [string, number, number];
  bg: string;
  hemi: [string, string, number];
  ambient: [string, number];
  key: { pos: [number, number, number]; color: string; intensity: number };
  fill: { color: string; intensity: number };
  topIntensity: number;
  /** probability a tower window is lit; 0 hides the window layer entirely */
  litWindows: number;
  windowGlow: number;
  skylineA: string;
  skylineB: string;
  skylineWindowOpacity: number;
  land: string;
  /** post-processing bloom strength for this mode */
  bloomIntensity: number;
};

export const THEMES: Record<SceneMode, SceneTheme> = {
  day: {
    sunDir: new THREE.Vector3(0.45, 0.62, 0.3).normalize(),
    sky: { zenith: "#2e6cb4", mid: "#85b9e4", horizon: "#e3eef6", bloom: 0.16, core: 0.7, sunTint: "#fff2c8" },
    sun: { size: 80, color: "#fff6d8", opacity: 0.4, coreSize: 34, coreColor: "#ffffff", coreOpacity: 0.85 },
    stars: false,
    hdri: "/hdri/kloofendal_48d_partly_cloudy_puresky_1k.hdr",
    envIntensity: 1.0,
    cloudHi: "#ffffff",
    cloudLo: "#eef3f8",
    cloudOpacity: 0.85,
    fog: ["#dce9f2", 110, 330],
    bg: "#dce9f2",
    hemi: ["#cfe3f0", "#d9d2bd", 0.45],
    ambient: ["#fff3e0", 0.12],
    key: { pos: [26, 36, 18], color: "#fff3dd", intensity: 3.2 },
    fill: { color: "#dcebf8", intensity: 0.35 },
    topIntensity: 0.2,
    litWindows: 0,
    windowGlow: 0,
    skylineA: "#aebecc",
    skylineB: "#9dafc0",
    skylineWindowOpacity: 0,
    land: "#7e9c64",
    bloomIntensity: 0.12,
  },
  dusk: {
    sunDir: new THREE.Vector3(-0.62, 0.15, -0.45).normalize(),
    sky: { zenith: "#27375c", mid: "#a8707c", horizon: "#f3b178", bloom: 0.42, core: 1.0, sunTint: "#ff9c50" },
    sun: { size: 130, color: "#ff9d54", opacity: 0.45, coreSize: 55, coreColor: "#ffe3b8", coreOpacity: 0.9 },
    stars: false,
    hdri: "/hdri/venice_sunset_1k.hdr",
    envIntensity: 1.0,
    cloudHi: "#f6c8a4",
    cloudLo: "#c4929c",
    cloudOpacity: 0.8,
    fog: ["#bd8f7e", 95, 280],
    bg: "#2c2440",
    hemi: ["#e8b39a", "#4f4a44", 0.62],
    ambient: ["#ffdcc2", 0.18],
    key: { pos: [-32, 12, -22], color: "#ffae5e", intensity: 2.7 },
    fill: { color: "#ffd2ac", intensity: 0.55 },
    topIntensity: 0.35,
    litWindows: 0.45,
    windowGlow: 1.6,
    skylineA: "#937a82",
    skylineB: "#866e76",
    skylineWindowOpacity: 0.7,
    land: "#62704e",
    bloomIntensity: 0.35,
  },
  night: {
    sunDir: new THREE.Vector3(-0.5, 0.55, -0.35).normalize(),
    sky: { zenith: "#04060f", mid: "#0c1226", horizon: "#1e2440", bloom: 0.12, core: 0.55, sunTint: "#9fb0e8" },
    sun: { size: 55, color: "#cdd8ff", opacity: 0.45, coreSize: 26, coreColor: "#f0f4ff", coreOpacity: 0.95 },
    stars: true,
    hdri: "/hdri/moonless_golf_1k.hdr",
    envIntensity: 0.4,
    cloudHi: "#272b45",
    cloudLo: "#1e2238",
    cloudOpacity: 0.6,
    fog: ["#0d1120", 75, 250],
    bg: "#060812",
    hemi: ["#36406e", "#0d0e1a", 0.45],
    ambient: ["#b3bcff", 0.1],
    key: { pos: [-26, 32, -18], color: "#b6c6f4", intensity: 0.75 },
    fill: { color: "#8a8fc0", intensity: 0.22 },
    topIntensity: 0.22,
    litWindows: 0.8,
    windowGlow: 2.4,
    skylineA: "#141228",
    skylineB: "#0f0d1f",
    skylineWindowOpacity: 1,
    land: "#161d14",
    bloomIntensity: 0.55,
  },
};

const ModeContext = createContext<SceneMode>("dusk");
export const ModeProvider = ModeContext.Provider;

export function useSceneMode() {
  const mode = useContext(ModeContext);
  // `lit` — are the artificial lights on (lamps, headlights, neon, pool)?
  return { mode, theme: THEMES[mode], lit: mode !== "day" };
}
