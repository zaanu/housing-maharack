// Scene mode themes for the PlayCanvas experience. Day (clear afternoon),
// Dusk (golden hour — the default hero look) and Night. Each mode pairs a
// bundled HDRI (image-based lighting) with a matched sun, fog and sky grade.

export type SceneMode = "day" | "dusk" | "night";

export type Vec3Tuple = [number, number, number];

export type Theme = {
  /** normalized direction TOWARD the sun/moon */
  sunDir: Vec3Tuple;
  sky: { zenith: string; mid: string; horizon: string; sunTint: string; bloom: number; core: number };
  sun: { size: number; color: string; opacity: number; coreSize: number; coreColor: string; coreOpacity: number };
  stars: boolean;
  hdri: string;
  envIntensity: number;
  cloudHi: string;
  cloudLo: string;
  cloudOpacity: number;
  fog: { color: string; start: number; end: number };
  ambient: string;
  key: { dir: Vec3Tuple; color: string; intensity: number; shadowIntensity: number };
  fill: { dir: Vec3Tuple; color: string; intensity: number };
  top: { color: string; intensity: number };
  litWindows: number;
  windowGlow: number;
  skylineA: string;
  skylineB: string;
  skylineWindows: number;
  land: string;
  lawnTint: string;
  grade: { tint: [number, number, number]; saturation: number; contrast: number; brightness: number };
  bloom: number;
};

export const THEMES: Record<SceneMode, Theme> = {
  day: {
    sunDir: [0.45, 0.62, 0.3],
    sky: { zenith: "#2e6cb4", mid: "#85b9e4", horizon: "#e3eef6", sunTint: "#fff2c8", bloom: 0.16, core: 0.7 },
    sun: { size: 60, color: "#fff6d8", opacity: 0.4, coreSize: 26, coreColor: "#ffffff", coreOpacity: 0.85 },
    stars: false,
    hdri: "/hdri/kloofendal_48d_partly_cloudy_puresky_1k.hdr",
    envIntensity: 1.0,
    cloudHi: "#ffffff",
    cloudLo: "#eef3f8",
    cloudOpacity: 0.85,
    fog: { color: "#dce9f2", start: 110, end: 330 },
    ambient: "#3a4046",
    key: { dir: [0.45, 0.52, 0.3], color: "#fff3dd", intensity: 3.4, shadowIntensity: 0.92 },
    fill: { dir: [0.5, 0.4, 0.65], color: "#dcebf8", intensity: 0.25 },
    top: { color: "#fff0e0", intensity: 0.15 },
    litWindows: 0,
    windowGlow: 0,
    skylineA: "#aebecc",
    skylineB: "#9dafc0",
    skylineWindows: 0,
    land: "#7e9c64",
    lawnTint: "#a9c29a",
    grade: { tint: [1, 1, 1], saturation: 1.02, contrast: 1.04, brightness: 1 },
    bloom: 0.012,
  },
  dusk: {
    sunDir: [-0.62, 0.15, -0.45],
    sky: { zenith: "#27375c", mid: "#a8707c", horizon: "#f3b178", sunTint: "#ff9c50", bloom: 0.42, core: 1.0 },
    sun: { size: 95, color: "#ff9d54", opacity: 0.45, coreSize: 42, coreColor: "#ffe3b8", coreOpacity: 0.9 },
    stars: false,
    hdri: "/hdri/venice_sunset_1k.hdr",
    envIntensity: 1.0,
    cloudHi: "#f6c8a4",
    cloudLo: "#c4929c",
    cloudOpacity: 0.8,
    fog: { color: "#bd8f7e", start: 95, end: 280 },
    ambient: "#4a3c38",
    key: { dir: [-0.62, 0.2, -0.45], color: "#ffb066", intensity: 3.0, shadowIntensity: 0.85 },
    fill: { dir: [0.55, 0.35, 0.6], color: "#ffd2ac", intensity: 0.55 },
    top: { color: "#fff0e0", intensity: 0.35 },
    litWindows: 0.45,
    windowGlow: 1.25,
    skylineA: "#937a82",
    skylineB: "#866e76",
    skylineWindows: 0.7,
    land: "#62704e",
    lawnTint: "#b9d3a4",
    grade: { tint: [1.07, 0.97, 0.9], saturation: 1.05, contrast: 1.05, brightness: 1.02 },
    bloom: 0.028,
  },
  night: {
    sunDir: [-0.5, 0.55, -0.35],
    sky: { zenith: "#04060f", mid: "#0c1226", horizon: "#1e2440", sunTint: "#9fb0e8", bloom: 0.12, core: 0.55 },
    sun: { size: 42, color: "#cdd8ff", opacity: 0.45, coreSize: 20, coreColor: "#f0f4ff", coreOpacity: 0.95 },
    stars: true,
    hdri: "/hdri/moonless_golf_1k.hdr",
    envIntensity: 0.4,
    cloudHi: "#272b45",
    cloudLo: "#1e2238",
    cloudOpacity: 0.6,
    fog: { color: "#0d1120", start: 75, end: 250 },
    ambient: "#2a3050",
    key: { dir: [-0.5, 0.55, -0.35], color: "#b6c6f4", intensity: 0.8, shadowIntensity: 0.9 },
    fill: { dir: [0.55, 0.35, 0.6], color: "#8a8fc0", intensity: 0.22 },
    top: { color: "#fff0e0", intensity: 0.22 },
    litWindows: 0.8,
    windowGlow: 2.6,
    skylineA: "#141228",
    skylineB: "#0f0d1f",
    skylineWindows: 1,
    land: "#161d14",
    lawnTint: "#b9d3a4",
    grade: { tint: [0.95, 0.98, 1.08], saturation: 1.0, contrast: 1.06, brightness: 1 },
    bloom: 0.042,
  },
};

/** Artificial lights (lamps, pool, signage) are on outside full daylight. */
export const isLit = (mode: SceneMode) => mode !== "day";
