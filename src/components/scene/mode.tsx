"use client";

// Scene mode system: Day (the original bright archviz daylight — clear glass
// facade, no lit windows, lights off), Night (deep sky, moon and stars, most
// windows lit, every lamp glowing) and GTA (the vice-city golden hour).
// Components inside the Canvas read the active theme via useSceneMode().

import { createContext, useContext } from "react";
import * as THREE from "three";

export type SceneMode = "day" | "night" | "gta";

export type SceneTheme = {
  /** direction of the sun (or moon) for the sky shader + halo sprites */
  sunDir: THREE.Vector3;
  sky: { zenith: string; mid: string; horizon: string; bloom: number; core: number; sunTint: string };
  sun: { size: number; color: string; opacity: number; coreSize: number; coreColor: string; coreOpacity: number };
  stars: boolean;
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
};

export const THEMES: Record<SceneMode, SceneTheme> = {
  day: {
    sunDir: new THREE.Vector3(0.42, 0.6, 0.28).normalize(),
    sky: { zenith: "#2f6cb8", mid: "#7db4e0", horizon: "#dcebf5", bloom: 0.18, core: 0.8, sunTint: "#fff2c8" },
    sun: { size: 90, color: "#fff6d8", opacity: 0.55, coreSize: 40, coreColor: "#ffffff", coreOpacity: 0.9 },
    stars: false,
    cloudHi: "#ffffff",
    cloudLo: "#edf3f8",
    cloudOpacity: 0.95,
    fog: ["#dfeaf2", 85, 240],
    bg: "#dfeaf2",
    hemi: ["#cfe3f0", "#eadfca", 0.9],
    ambient: ["#ffe7c4", 0.25],
    key: { pos: [18, 28, 12], color: "#fff0db", intensity: 1.7 },
    fill: { color: "#e8f1f8", intensity: 0.3 },
    topIntensity: 0.25,
    litWindows: 0,
    windowGlow: 0,
    skylineA: "#a8b9c9",
    skylineB: "#97a9bc",
    skylineWindowOpacity: 0,
    land: "#8fae72",
  },
  night: {
    sunDir: new THREE.Vector3(-0.5, 0.55, -0.35).normalize(),
    sky: { zenith: "#04050d", mid: "#0d0f22", horizon: "#231d3a", bloom: 0.12, core: 0.55, sunTint: "#9fb0e8" },
    sun: { size: 60, color: "#cdd8ff", opacity: 0.5, coreSize: 28, coreColor: "#f0f4ff", coreOpacity: 0.95 },
    stars: true,
    cloudHi: "#2c2f4a",
    cloudLo: "#232639",
    cloudOpacity: 0.75,
    fog: ["#100e20", 60, 200],
    bg: "#070612",
    hemi: ["#39406e", "#0a0a14", 0.4],
    ambient: ["#b3bcff", 0.15],
    key: { pos: [-22, 28, -14], color: "#aebdf2", intensity: 0.5 },
    fill: { color: "#8a8fc0", intensity: 0.24 },
    topIntensity: 0.25,
    litWindows: 0.82,
    windowGlow: 1.05,
    skylineA: "#15112a",
    skylineB: "#100d20",
    skylineWindowOpacity: 1,
    land: "#0f1118",
  },
  gta: {
    sunDir: new THREE.Vector3(-0.6, 0.17, -0.42).normalize(),
    sky: { zenith: "#211a52", mid: "#b84785", horizon: "#ff8f5c", bloom: 0.55, core: 1.1, sunTint: "#ff8038" },
    sun: { size: 170, color: "#ff9a4d", opacity: 0.55, coreSize: 70, coreColor: "#ffe2b0", coreOpacity: 0.9 },
    stars: false,
    cloudHi: "#ffc9a4",
    cloudLo: "#f5a0c0",
    cloudOpacity: 0.92,
    fog: ["#c96f86", 70, 210],
    bg: "#241a3e",
    hemi: ["#ffb3bd", "#4a4060", 0.85],
    ambient: ["#ffe3d2", 0.42],
    key: { pos: [-28, 14, -19], color: "#ffa64d", intensity: 2.1 },
    fill: { color: "#ffc3a0", intensity: 1.05 },
    topIntensity: 0.5,
    litWindows: 0.55,
    windowGlow: 0.72,
    skylineA: "#3b2d52",
    skylineB: "#332747",
    skylineWindowOpacity: 0.8,
    land: "#3c4234",
  },
};

const ModeContext = createContext<SceneMode>("gta");
export const ModeProvider = ModeContext.Provider;

export function useSceneMode() {
  const mode = useContext(ModeContext);
  // `lit` — are the artificial lights on (lamps, headlights, neon, pool)?
  return { mode, theme: THEMES[mode], lit: mode !== "day" };
}
