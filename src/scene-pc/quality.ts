// Quality presets and device auto-detection. Each preset trades shadow
// resolution, post-processing features and render scale. The user can
// override the auto-selected tier from the UI at runtime.

export type Quality = "ultra" | "high" | "balanced" | "performance";

export type QualitySettings = {
  maxPixelRatio: number;
  shadowResolution: number;
  ssao: boolean;
  ssaoSamples: number;
  taa: boolean;
  bloom: boolean;
  renderTargetScale: number;
  sharpness: number;
  cloudCount: number;
  detailDistance: number; // LOD: max distance for small detail visibility
};

export const QUALITY: Record<Quality, QualitySettings> = {
  ultra: {
    maxPixelRatio: 2,
    shadowResolution: 4096,
    ssao: true,
    ssaoSamples: 16,
    taa: true,
    bloom: true,
    renderTargetScale: 1,
    sharpness: 0.5,
    cloudCount: 14,
    detailDistance: 120,
  },
  high: {
    maxPixelRatio: 2,
    shadowResolution: 2048,
    ssao: true,
    ssaoSamples: 10,
    taa: true,
    bloom: true,
    renderTargetScale: 1,
    sharpness: 0.5,
    cloudCount: 12,
    detailDistance: 90,
  },
  balanced: {
    maxPixelRatio: 1.5,
    shadowResolution: 2048,
    ssao: true,
    ssaoSamples: 6,
    taa: false,
    bloom: true,
    renderTargetScale: 1,
    sharpness: 0,
    cloudCount: 9,
    detailDistance: 60,
  },
  performance: {
    maxPixelRatio: 1,
    shadowResolution: 1024,
    ssao: false,
    ssaoSamples: 4,
    taa: false,
    bloom: true,
    renderTargetScale: 0.85,
    sharpness: 0,
    cloudCount: 6,
    detailDistance: 40,
  },
};

export function detectQuality(): Quality {
  if (typeof navigator === "undefined") return "high";
  const ua = navigator.userAgent;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  if (mobile) {
    const tablet = /iPad|Tablet/i.test(ua) || (mobile && Math.min(screen.width, screen.height) > 700);
    if (tablet) return "balanced";
    return mem >= 6 && cores >= 6 ? "balanced" : "performance";
  }
  if (mem >= 8 && cores >= 10) return "ultra";
  return "high";
}
