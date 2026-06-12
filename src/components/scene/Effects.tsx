"use client";

// Cinematic post-processing: N8AO ground-truth ambient occlusion, HDR bloom
// (only emitters brighter than 1 bloom — lamps, lit windows, sun glints),
// ACES filmic tone mapping, a gentle vignette and SMAA so edges stay clean
// even though the composer bypasses canvas MSAA.

import { EffectComposer, N8AO, Bloom, ToneMapping, Vignette, SMAA } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useSceneMode } from "./mode";

export default function Effects() {
  const { theme } = useSceneMode();
  return (
    <EffectComposer multisampling={0} stencilBuffer={false}>
      <N8AO halfRes quality="performance" intensity={2.6} aoRadius={1.4} distanceFalloff={1} color="#06080f" />
      <Bloom mipmapBlur intensity={theme.bloomIntensity} luminanceThreshold={1.0} luminanceSmoothing={0.2} levels={7} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette eskil={false} offset={0.16} darkness={0.5} />
      <SMAA />
    </EffectComposer>
  );
}
