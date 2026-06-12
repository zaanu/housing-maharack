"use client";

// React host for the PlayCanvas experience. Owns the canvas + label overlay,
// boots SceneApp once, and syncs props (selection, mode, quality) into the
// engine. Exposes an imperative controller (camera presets, reset,
// fullscreen) to the surrounding UI via onController.

import { useEffect, useRef, useState } from "react";
import type { PublicFloor, PublicHome } from "@/lib/types";
import type { SceneApp } from "@/scene-pc/app";
import type { SceneMode } from "@/scene-pc/theme";
import type { Quality } from "@/scene-pc/quality";

export type SceneController = {
  preset: (name: "aerial" | "pool" | "entrance" | "podium" | "tower") => void;
  reset: () => void;
  deviceType: () => string;
  fps: () => number;
};

// Boot/destroy operations are serialized through this chain so StrictMode's
// dev double-mount can never run two engine boots against the same canvas.
let bootChain: Promise<unknown> = Promise.resolve();

export default function PlayCanvasScene({
  floors,
  selectedFloor,
  selectedHomeId,
  mode,
  quality,
  onSelectFloor,
  onSelectHome,
  onClearSelection,
  onReady,
  onProgress,
  onController,
  onBootError,
}: {
  floors: PublicFloor[];
  selectedFloor: PublicFloor | null;
  selectedHomeId: string | null;
  mode: SceneMode;
  quality: Quality | "auto";
  onSelectFloor: (floor: PublicFloor) => void;
  onSelectHome: (home: PublicHome) => void;
  onClearSelection: () => void;
  onReady: (info: { deviceType: string }) => void;
  onProgress: (loaded: number, total: number) => void;
  onController: (c: SceneController) => void;
  onBootError: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<SceneApp | null>(null);
  const [booted, setBooted] = useState(false);

  // callbacks live in refs so the engine never holds stale closures
  const cbRef = useRef({ onSelectFloor, onSelectHome, onClearSelection, onReady, onProgress, onBootError });
  cbRef.current = { onSelectFloor, onSelectHome, onClearSelection, onReady, onProgress, onBootError };

  useEffect(() => {
    // Boot and destroy are serialized through a module-level promise chain:
    // React StrictMode double-mounts effects in dev, and two engine boots
    // racing on the same canvas would corrupt the GPU context.
    let cancelled = false;
    bootChain = bootChain
      .then(async () => {
        if (cancelled || appRef.current || !canvasRef.current || !hostRef.current) return;
        const { SceneApp } = await import("@/scene-pc/app");
        const params = new URLSearchParams(location.search);
        const forceDevice = params.get("gfx") === "webgl2" ? "webgl2" : undefined;
        const instance = await SceneApp.create(
          canvasRef.current,
          hostRef.current,
          floors,
          {
            onReady: (info) => cbRef.current.onReady(info),
            onProgress: (p) => cbRef.current.onProgress(p.loaded, p.total),
            onSelectFloor: (f) => cbRef.current.onSelectFloor(f),
            onSelectHome: (h) => cbRef.current.onSelectHome(h),
            onClearSelection: () => cbRef.current.onClearSelection(),
          },
          { mode, quality: quality === "auto" ? undefined : quality, forceDevice }
        );
        if (cancelled) {
          instance.destroy();
          return;
        }
        appRef.current = instance;
        setBooted(true);
        onController({
          preset: (name) => appRef.current?.preset(name),
          reset: () => appRef.current?.resetCamera(),
          deviceType: () => appRef.current?.deviceType ?? "unknown",
          fps: () => appRef.current?.fps ?? 0,
        });
      })
      .catch((err) => {
        console.error("PlayCanvas boot failed", err);
        cbRef.current.onBootError();
      });
    return () => {
      cancelled = true;
      bootChain = bootChain.then(() => {
        appRef.current?.destroy();
        appRef.current = null;
      });
    };
    // boot exactly once per mount — props sync via the effects below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (booted) appRef.current?.setSelection(selectedFloor, selectedHomeId);
  }, [booted, selectedFloor, selectedHomeId]);

  useEffect(() => {
    if (booted) appRef.current?.setMode(mode);
  }, [booted, mode]);

  useEffect(() => {
    if (booted && quality !== "auto") appRef.current?.setQuality(quality);
  }, [booted, quality]);

  return (
    <div ref={hostRef} className="relative h-full w-full overflow-hidden">
      <canvas ref={canvasRef} className="block h-full w-full touch-none" />
    </div>
  );
}
