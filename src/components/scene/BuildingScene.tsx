"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import type CameraControlsImpl from "camera-controls";
import type { PublicFloor, PublicHome } from "@/lib/types";
import { floorY } from "@/lib/layout";
import Tower from "./Tower";

function CameraRig({ selectedFloorNumber }: { selectedFloorNumber: number | null }) {
  const controls = useRef<CameraControlsImpl | null>(null);
  const interacted = useRef(false);

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
    if (selectedFloorNumber == null) {
      // full exterior view
      c.setLookAt(21, 16, 23, 0, 7.5, 0, true);
    } else {
      // slightly tilted top-down view of the selected floor
      const y = floorY(selectedFloorNumber);
      c.setLookAt(9.5, y + 11.5, 10.5, 0, y + 0.2, 0, true);
    }
  }, [selectedFloorNumber]);

  useFrame((_, delta) => {
    // gentle idle rotation in the exterior view until the user takes over
    if (!interacted.current && selectedFloorNumber == null && controls.current) {
      controls.current.azimuthAngle += delta * 0.06;
    }
  });

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={7}
      maxDistance={60}
      maxPolarAngle={Math.PI / 2 - 0.04}
      smoothTime={0.5}
    />
  );
}

export default function BuildingScene({
  floors,
  selectedFloorNumber,
  selectedHomeId,
  onSelectFloor,
  onSelectHome,
  onClearSelection,
  onReady,
}: {
  floors: PublicFloor[];
  selectedFloorNumber: number | null;
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
        selectedFloorNumber={selectedFloorNumber}
        selectedHomeId={selectedHomeId}
        onSelectFloor={onSelectFloor}
        onSelectHome={onSelectHome}
      />
      <CameraRig selectedFloorNumber={selectedFloorNumber} />
    </Canvas>
  );
}
