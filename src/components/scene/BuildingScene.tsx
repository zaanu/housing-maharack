"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CameraControls, Environment } from "@react-three/drei";
import type CameraControlsImpl from "camera-controls";
import type { PublicFloor, PublicHome } from "@/lib/types";
import { floorY, penthouseRect, unitRect } from "@/lib/layout";
import Tower from "./Tower";
import Atmosphere from "./Atmosphere";
import Traffic from "./Traffic";
import Effects from "./Effects";
import { ModeProvider, THEMES, type SceneMode } from "./mode";

function CameraRig({
  selectedFloor,
  selectedHomeId,
}: {
  selectedFloor: PublicFloor | null;
  selectedHomeId: string | null;
}) {
  const controls = useRef<CameraControlsImpl | null>(null);
  const interacted = useRef(false);
  const aspect = useThree((s) => s.viewport.aspect);
  // portrait screens need more distance so the whole floor/building fits
  const zoomOut = aspect < 0.9 ? 1.55 : 1;

  const n = selectedFloor?.number ?? null;
  const pent = !!selectedFloor?.penthouse;
  const idx =
    selectedFloor && selectedHomeId
      ? selectedFloor.homes.findIndex((h) => h.id === selectedHomeId)
      : -1;
  const focus = idx >= 0 ? (pent ? penthouseRect(idx) : unitRect(idx)) : null;

  const intro = useRef(true);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const onStart = () => {
      interacted.current = true;
      intro.current = false;
    };
    c.addEventListener("controlstart", onStart);
    // cinematic opening: street level at the main gate, then rise to the aerial view
    c.setLookAt(1.5, 1.7, 36, 0, 4.5, 0, false);
    const t = setTimeout(() => {
      if (intro.current && c) {
        c.setLookAt(27 * zoomOut, 21 * zoomOut, 31 * zoomOut, 0, 5.5, 2, true);
      }
      intro.current = false;
    }, 2200);
    return () => {
      clearTimeout(t);
      c.removeEventListener("controlstart", onStart);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    // in the exterior view the orbit target sits inside the tower — keep the
    // camera outside the facade (inside a box every face is backface-culled)
    c.minDistance = n == null ? 12.5 : 6;
    if (n == null) {
      // full exterior view (skip during the intro sweep)
      if (!intro.current) c.setLookAt(27 * zoomOut, 21 * zoomOut, 31 * zoomOut, 0, 5.5, 2, true);
      return;
    }
    intro.current = false;
    const y = floorY(n);
    if (pent) {
      // the duplex section is wide — portrait screens need much more distance
      const pf = aspect < 0.9 ? 2.3 : 1;
      if (focus) {
        // frontal duplex section of one penthouse
        c.setLookAt(
          focus.x * 0.85 + (focus.x < 0 ? -1.2 : 1.2),
          y + 2.9 + 1.4 * (pf - 1),
          10.5 * (aspect < 0.9 ? 1.8 : 1),
          focus.x * 0.85,
          y + 1.05,
          0.4,
          true
        );
      } else {
        // both penthouses, dollhouse section view
        c.setLookAt(4.5, y + 3.4 + 2.2 * (pf - 1), 16.5 * pf, 0, y + 1.15, 0, true);
      }
      return;
    }
    if (focus) {
      // dive toward the selected home, still tilted enough to read the rooms
      const ox = focus.x < 0 ? -3.1 : 3.1;
      const oz = focus.z < 0 ? -4.4 : 4.4;
      c.setLookAt(
        focus.x + ox * zoomOut,
        y + 4.6 * zoomOut,
        focus.z + oz * zoomOut,
        focus.x,
        y + 0.25,
        focus.z,
        true
      );
    } else {
      // slightly tilted top-down view of the selected floor
      c.setLookAt(9.5 * zoomOut, y + 11.5 * zoomOut, 10.5 * zoomOut, 0, y + 0.2, 0, true);
    }
  }, [n, pent, focus?.x, focus?.z, zoomOut, aspect]);

  useFrame((_, delta) => {
    // gentle idle rotation in the exterior view until the user takes over
    if (!interacted.current && n == null && controls.current) {
      controls.current.azimuthAngle += delta * 0.06;
    }
  });

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={6}
      maxDistance={95}
      dollySpeed={0.35}
      maxPolarAngle={Math.PI / 2 - 0.04}
      smoothTime={0.5}
    />
  );
}

export default function BuildingScene({
  floors,
  selectedFloor,
  selectedHomeId,
  mode,
  onSelectFloor,
  onSelectHome,
  onClearSelection,
  onReady,
}: {
  floors: PublicFloor[];
  selectedFloor: PublicFloor | null;
  selectedHomeId: string | null;
  mode: SceneMode;
  onSelectFloor: (floor: PublicFloor) => void;
  onSelectHome: (home: PublicHome) => void;
  onClearSelection: () => void;
  onReady: () => void;
}) {
  const theme = THEMES[mode];
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      camera={{ position: [21, 16, 23], fov: 42 }}
      onCreated={onReady}
      onPointerMissed={onClearSelection}
      className="touch-none"
    >
      {/* the Canvas hosts its own React tree — provide the mode inside it */}
      <ModeProvider value={mode}>
        <color attach="background" args={[theme.bg]} />
        <fog attach="fog" args={theme.fog} />
        {/* image-based lighting from the bundled HDRI matched to the mode;
            the visible sky stays the procedural dome in Atmosphere */}
        <Suspense fallback={null}>
          <Environment files={theme.hdri} environmentIntensity={theme.envIntensity} />
        </Suspense>
        <hemisphereLight args={theme.hemi} />
        <ambientLight intensity={theme.ambient[1]} color={theme.ambient[0]} />
        <directionalLight
          position={theme.key.pos}
          color={theme.key.color}
          intensity={theme.key.intensity}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-radius={5}
          shadow-bias={-0.00015}
          shadow-normalBias={0.02}
          shadow-camera-left={-45}
          shadow-camera-right={45}
          shadow-camera-top={45}
          shadow-camera-bottom={-45}
        />
        <directionalLight position={[26, 20, 30]} color={theme.fill.color} intensity={theme.fill.intensity} />
        {/* soft top light so opened floors and interiors stay readable */}
        <directionalLight position={[5, 60, 8]} color="#fff0e0" intensity={theme.topIntensity} />
        <Atmosphere />
        <Traffic />
        <Tower
          floors={floors}
          selectedFloorNumber={selectedFloor?.number ?? null}
          selectedHomeId={selectedHomeId}
          onSelectFloor={onSelectFloor}
          onSelectHome={onSelectHome}
        />
        <CameraRig selectedFloor={selectedFloor} selectedHomeId={selectedHomeId} />
        <Effects />
      </ModeProvider>
    </Canvas>
  );
}
