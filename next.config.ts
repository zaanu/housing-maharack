import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // PlayCanvas's `development` export condition resolves to its debug build,
  // whose per-draw WebGPU validation makes the dev scene unusably slow.
  // Always load the release build; engine errors still reach the console.
  turbopack: {
    resolveAlias: {
      playcanvas: "playcanvas/build/playcanvas.mjs",
    },
  },
};

export default nextConfig;
