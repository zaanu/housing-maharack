// Procedural canvas textures: sky domes, glow sprites, caustics, clouds,
// lit-window patterns. Everything is generated once per key and cached, then
// uploaded as a PlayCanvas texture. No custom shaders are needed anywhere in
// the scene, which keeps WebGPU and WebGL2 rendering identical.

import * as pc from "playcanvas";
import type { Theme } from "./theme";

const texCache = new Map<string, pc.Texture>();

export function canvasTexture(
  device: pc.GraphicsDevice,
  key: string,
  width: number,
  height: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
  opts: { srgb?: boolean; repeat?: boolean; mipmaps?: boolean } = {}
): pc.Texture {
  const cached = texCache.get(key);
  if (cached) return cached;
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  draw(c.getContext("2d")!, width, height);
  const tex = new pc.Texture(device, {
    width,
    height,
    format: opts.srgb === false ? pc.PIXELFORMAT_RGBA8 : pc.PIXELFORMAT_SRGBA8,
    mipmaps: opts.mipmaps !== false,
    addressU: opts.repeat ? pc.ADDRESS_REPEAT : pc.ADDRESS_CLAMP_TO_EDGE,
    addressV: opts.repeat ? pc.ADDRESS_REPEAT : pc.ADDRESS_CLAMP_TO_EDGE,
    anisotropy: 4,
    levels: [c],
  });
  tex.upload();
  texCache.set(key, tex);
  return tex;
}

export function clearTextureCache() {
  texCache.forEach((t) => t.destroy());
  texCache.clear();
}

const rnd = (seed: number, i: number) => {
  const v = Math.sin(seed * 37.13 + i * 13.7) * 43758.5453;
  return v - Math.floor(v);
};

/** Soft radial glow sprite shared by halos, lamps and the sun. */
export function glowTexture(device: pc.GraphicsDevice): pc.Texture {
  return canvasTexture(device, "glow", 128, 128, (g) => {
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.3, "rgba(255,255,255,0.5)");
    grad.addColorStop(0.65, "rgba(255,255,255,0.12)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  });
}

/** Tileable caustic light web for the pool floor. */
export function causticsTexture(device: pc.GraphicsDevice): pc.Texture {
  return canvasTexture(
    device,
    "caustics",
    256,
    256,
    (g, size) => {
      g.fillStyle = "#000";
      g.fillRect(0, 0, size, size);
      g.strokeStyle = "rgba(255,255,255,0.5)";
      g.shadowColor = "rgba(255,255,255,0.9)";
      g.shadowBlur = 4;
      for (let i = 0; i < 90; i++) {
        const x = rnd(i, 1) * size;
        const y = rnd(i, 101) * size;
        const r = 14 + rnd(i, 201) * 30;
        const a0 = rnd(i, 301) * Math.PI * 2;
        const a1 = a0 + 1.5 + rnd(i, 401) * 3;
        g.lineWidth = 1 + rnd(i, 501) * 2;
        for (const dx of [-size, 0, size])
          for (const dy of [-size, 0, size]) {
            g.beginPath();
            g.arc(x + dx, y + dy, r, a0, a1);
            g.stroke();
          }
      }
    },
    { repeat: true }
  );
}

/** Soft cumulus puff: overlapping radial blobs with a flat base. */
export function cloudTexture(device: pc.GraphicsDevice): pc.Texture {
  return canvasTexture(device, "cloud", 256, 128, (g, w, h) => {
    for (let i = 0; i < 26; i++) {
      const x = w * (0.16 + rnd(71, i) * 0.68);
      const y = h * (0.62 - rnd(72, i) * rnd(73, i) * 0.38);
      const r = 14 + rnd(74, i) * 26;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      const a = 0.1 + rnd(75, i) * 0.13;
      grad.addColorStop(0, `rgba(255,255,255,${a})`);
      grad.addColorStop(0.7, `rgba(255,255,255,${a * 0.45})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    }
  });
}

/** Equirect sky with gradient, horizon haze and a painted sun glow. */
export function skyTexture(device: pc.GraphicsDevice, mode: string, theme: Theme): pc.Texture {
  return canvasTexture(device, `sky-${mode}`, 1024, 512, (g, w, h) => {
    const horizonY = h * 0.5; // dome equator
    const grad = g.createLinearGradient(0, 0, 0, horizonY);
    grad.addColorStop(0, theme.sky.zenith);
    grad.addColorStop(0.62, theme.sky.mid);
    grad.addColorStop(1, theme.sky.horizon);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, horizonY + 1);
    // below the horizon mirror the horizon colour so nothing reads as void
    const grad2 = g.createLinearGradient(0, horizonY, 0, h);
    grad2.addColorStop(0, theme.sky.horizon);
    grad2.addColorStop(1, theme.sky.mid);
    g.fillStyle = grad2;
    g.fillRect(0, horizonY, w, h - horizonY);

    // sun glow: place by azimuth (u) and elevation (v)
    const [sx, sy, sz] = theme.sunDir;
    const az = Math.atan2(sz, sx); // -PI..PI
    const el = Math.asin(Math.max(-1, Math.min(1, sy))); // -PI/2..PI/2
    const u = ((az + Math.PI) / (2 * Math.PI)) * w;
    const v = (0.5 - el / Math.PI) * h;
    const R = h * (0.5 + theme.sky.bloom);
    for (const xo of [-w, 0, w]) {
      const halo = g.createRadialGradient(u + xo, v, 0, u + xo, v, R);
      halo.addColorStop(0, hexWithAlpha(theme.sky.sunTint, 0.55 * theme.sky.bloom + 0.18));
      halo.addColorStop(0.4, hexWithAlpha(theme.sky.sunTint, 0.22 * theme.sky.bloom));
      halo.addColorStop(1, hexWithAlpha(theme.sky.sunTint, 0));
      g.fillStyle = halo;
      g.fillRect(0, 0, w, h);
      // horizon haze band brightening toward the sun azimuth
      const band = g.createRadialGradient(u + xo, horizonY, 0, u + xo, horizonY, w * 0.45);
      band.addColorStop(0, hexWithAlpha(theme.sky.sunTint, 0.3 * theme.sky.bloom));
      band.addColorStop(1, hexWithAlpha(theme.sky.sunTint, 0));
      g.fillStyle = band;
      g.fillRect(0, horizonY - h * 0.12, w, h * 0.24);
    }
    // stars
    if (theme.stars) {
      g.fillStyle = "rgba(205,211,255,0.9)";
      for (let i = 0; i < 420; i++) {
        const x = rnd(31, i) * w;
        const y = rnd(32, i) * horizonY * 0.92;
        const s = 0.5 + rnd(33, i) * 1.1;
        g.globalAlpha = 0.3 + rnd(34, i) * 0.7;
        g.fillRect(x, y, s, s);
      }
      g.globalAlpha = 1;
    }
  });
}

/** Warm/cool lit-window pattern, unique per floor seed. */
export function windowTexture(
  device: pc.GraphicsDevice,
  seed: number,
  rows: number,
  prob: number
): pc.Texture {
  return canvasTexture(device, `win-${seed}-${rows}-${prob.toFixed(2)}`, 256, 64 * rows, (g) => {
    g.fillStyle = "#000000";
    g.fillRect(0, 0, 256, 64 * rows);
    const cols = 10;
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < cols; i++) {
        const k = r * cols + i;
        if (rnd(seed, k) >= prob) continue;
        const warm = rnd(seed, 100 + k) > 0.2;
        const x = i * 25.6 + 5;
        const y = r * 64 + 16;
        const grad = g.createLinearGradient(0, y, 0, y + 32);
        if (warm) {
          grad.addColorStop(0, "#ffe8c0");
          grad.addColorStop(1, "#ff9e42");
        } else {
          grad.addColorStop(0, "#cfe8f8");
          grad.addColorStop(1, "#6fa8cc");
        }
        g.fillStyle = grad;
        g.globalAlpha = 0.65 + rnd(seed, 200 + k) * 0.35;
        g.fillRect(x, y, 15, 32);
        g.globalAlpha = 1;
      }
    }
  });
}

/** Generic skyline window grid, tiled per distant building face. */
export function skylineWindowTexture(device: pc.GraphicsDevice): pc.Texture {
  return canvasTexture(
    device,
    "skyline-win",
    128,
    128,
    (g) => {
      g.fillStyle = "#000";
      g.fillRect(0, 0, 128, 128);
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 6; c++) {
          if (rnd(7, r * 6 + c) > 0.42) continue;
          g.fillStyle = rnd(8, r * 6 + c) > 0.3 ? "#ffc06a" : "#9fc4e8";
          g.globalAlpha = 0.5 + rnd(9, r * 6 + c) * 0.5;
          g.fillRect(c * 21 + 6, r * 16 + 5, 9, 7);
          g.globalAlpha = 1;
        }
      }
    },
    { repeat: true }
  );
}

function hexWithAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}
