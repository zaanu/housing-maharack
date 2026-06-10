"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import type CameraControlsImpl from "camera-controls";
import type { PublicFloor, PublicHome } from "@/lib/types";
import { floorY, penthouseRect, unitRect } from "@/lib/layout";
import Tower from "./Tower";

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

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const onStart = () => (interacted.current = true);
    c.addEventListener("controlstart", onStart);
    return () => c.removeEventListener("controlstart", onStart);
  }, []);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    if (n == null) {
      // full exterior view
      c.setLookAt(21 * zoomOut, 16 * zoomOut, 23 * zoomOut, 0, 7.5, 0, true);
      return;
    }
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
      minDistance={3.5}
      maxDistance={60}
      maxPolarAngle={Math.PI / 2 - 0.04}
      smoothTime={0.5}
    />
  );
}

export default function BuildingScene({
  floors,
  selectedFloor,
  selectedHomeId,
  onSelectFloor,
  onSelectHome,
  onClearSelection,
  onReady,
}: {
  floors: PublicFloor[];
  selectedFloor: PublicFloor | null;
  selectedHomeId: string | null;
  onSelectFloor: (floor: PublicFloor) => void;
  onSelectHome: (home: PublicHome) => void;
  onClearSelection: () => void;
  onReady: () => void;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [21, 16, 23], fov: 45 }}
      onCreated={onReady}
      onPointerMissed={onClearSelection}
      className="touch-none"
    >
      <color attach="background" args={["#dfeaf2"]} />
      <fog attach="fog" args={["#dfeaf2", 75, 150]} />
      <hemisphereLight args={["#cfe3f0", "#e8e2d4", 0.85]} />
      <directionalLight
        position={[18, 28, 12]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <Tower
        floors={floors}
        selectedFloorNumber={selectedFloor?.number ?? null}
        selectedHomeId={selectedHomeId}
        onSelectFloor={onSelectFloor}
        onSelectHome={onSelectHome}
      />
      <CameraRig selectedFloor={selectedFloor} selectedHomeId={selectedHomeId} />
    </Canvas>
  );
}
