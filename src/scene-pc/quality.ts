// Quality presets and device auto-detection. Each preset trades shadow
// resolution, post-processing features and render scale. The user can
// override the auto-selected tier from the UI at runtime.

export type Quality = "ultra" | "high" | "balanced" | "performance";

export type QualitySettings = {
  maxPixelRatio: number;
  shadowResolution: number;
  /** shadow filter tier: 2 = PCF5/32F + 2 cascades, 1 = PCF3/16F, 0 = PCF3/16F + 1 cascade */
  shadowTier: 0 | 1 | 2;
  shadowDistance: number;
  ssao: boolean;
  ssaoSamples: number;
  taa: boolean;
  /** MSAA samples when TAA is off */
  msaa: number;
  bloom: boolean;
  renderTargetScale: number;
  sharpness: number;
  cloudCount: number;
  /** build-time vegetation density (fronds, canopy lobes, blooms) */
  fullVegetation: boolean;
};

export const QUALITY: Record<Quality, QualitySettings> = {
  ultra: {
    maxPixelRatio: 2,
    shadowResolution: 4096,
    shadowTier: 2,
    shadowDistance: 160,
    ssao: true,
    ssaoSamples: 16,
    taa: true,
    msaa: 1,
    bloom: true,
    renderTargetScale: 1,
    sharpness: 0.5,
    cloudCount: 14,
    fullVegetation: true,
  },
  high: {
    maxPixelRatio: 2,
    shadowResolution: 2048,
    shadowTier: 2,
    shadowDistance: 160,
    ssao: true,
    ssaoSamples: 10,
    taa: true,
    msaa: 1,
    bloom: true,
    renderTargetScale: 1,
    sharpness: 0.5,
    cloudCount: 12,
    fullVegetation: true,
  },
  balanced: {
    maxPixelRatio: 1.5,
    shadowResolution: 2048,
    shadowTier: 1,
    shadowDistance: 110,
    ssao: true,
    ssaoSamples: 6,
    taa: false,
    msaa: 2,
    bloom: true,
    renderTargetScale: 1,
    sharpness: 0,
    cloudCount: 9,
    fullVegetation: false,
  },
  performance: {
    maxPixelRatio: 1,
    shadowResolution: 1024,
    shadowTier: 0,
    shadowDistance: 70,
    ssao: false,
    ssaoSamples: 4,
    taa: false,
    msaa: 1,
    bloom: false,
    renderTargetScale: 0.85,
    sharpness: 0,
    cloudCount: 6,
    fullVegetation: false,
  },
};

export function detectQuality(): Quality {
  if (typeof navigator === "undefined") return "high";
  const ua = navigator.userAgent;
  const iPadDesktopUA = /Mac/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || iPadDesktopUA;
  const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  if (mobile) {
    const tablet =
      /iPad|Tablet/i.test(ua) || iPadDesktopUA || (mobile && Math.min(screen.width, screen.height) > 700);
    if (tablet) return "balanced";
    return mem >= 6 && cores >= 6 ? "balanced" : "performance";
  }
  if (mem >= 8 && cores >= 10) return "ultra";
  return "high";
}
