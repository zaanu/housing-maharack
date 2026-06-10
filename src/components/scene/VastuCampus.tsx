"use client";

// Vastu Heights campus — 4 towers around a sacred Brahmasthan courtyard.
// NE = Ishan (residential), SE = Agni (commercial),
// SW = Nairutya (residential), NW = Vayu (commercial).

import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CameraControls, Html } from "@react-three/drei";
import type CameraControlsImpl from "camera-controls";
import * as THREE from "three";
import type { PublicFloor, PublicHome } from "@/lib/types";
import type { VastuBuilding } from "@/lib/vastuTypes";
import { VASTU_POSITIONS, vastuFloorY, vastuHalfRect, vastuUnitRect, VASTU_TOWER } from "@/lib/vastuLayout";
import VastuTower from "./VastuTower";

// ── Brahmasthan courtyard ────────────────────────────────────────────────────

function Brahmasthan() {
  // Sacred 9×9 Vastu Purusha Mandala at the centre
  const R = 18; // radius of the courtyard

  const rings = [R * 0.15, R * 0.35, R * 0.55, R * 0.8];
  return (
    <group>
      {/* main courtyard ground — light warm stone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[R, 64]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.85} />
      </mesh>
      {/* concentric mandala rings */}
      {rings.map((r, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
          <ringGeometry args={[r - 0.08, r, 64]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#c8bfb0" : "#d8d0c0"} roughness={0.8} />
        </mesh>
      ))}
      {/* 8 radial lines (cardinal + inter-cardinal) */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return (
          <mesh key={`r${i}`} rotation={[-Math.PI / 2, 0, a]} position={[0, 0.005, 0]}>
            <planeGeometry args={[0.08, R * 1.6]} />
            <meshStandardMaterial color="#b8b0a0" roughness={0.8} />
          </mesh>
        );
      })}
      {/* centre brahma point — raised circular platform */}
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[2.2, 2.5, 0.12, 32]} />
        <meshStandardMaterial color="#d8c8a8" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.13, 0]}>
        <cylinderGeometry args={[1.6, 1.6, 0.04, 32]} />
        <meshStandardMaterial color="#c8b888" roughness={0.5} metalness={0.1} />
      </mesh>
      {/* sacred flame — warm glowing cone */}
      <mesh position={[0, 0.22, 0]}>
        <coneGeometry args={[0.18, 0.42, 12]} />
        <meshStandardMaterial color="#ffb840" emissive="#ff8000" emissiveIntensity={1.2} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0.54, 0]}>
        <coneGeometry args={[0.09, 0.25, 10]} />
        <meshStandardMaterial color="#ffdc80" emissive="#ffcc40" emissiveIntensity={1.8} transparent opacity={0.75} />
      </mesh>

      {/* Ishan (NE) — water feature */}
      <group position={[R * 0.62, 0, -R * 0.62]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[3, 32]} />
          <meshStandardMaterial color="#5a9ab8" roughness={0.1} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.12, 0.16, 0.5, 12]} />
          <meshStandardMaterial color="#d8d0c0" roughness={0.7} />
        </mesh>
        {/* water ripple ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[1.2, 1.35, 32]} />
          <meshStandardMaterial color="#7ab8d4" roughness={0.1} transparent opacity={0.7} />
        </mesh>
      </group>

      {/* Directional labels (compass points) */}
      {([
        [0, 0, -R + 1, "N", "#8A7060"],
        [0, 0, R - 1, "S", "#8A7060"],
        [-R + 1, 0, 0, "W", "#8A7060"],
        [R - 1, 0, 0, "E", "#8A7060"],
      ] as Array<[number, number, number, string, string]>).map(([x, y, z, label, color]) => (
        <Html key={label} position={[x, y + 0.3, z]} center distanceFactor={20}>
          <div className="pointer-events-none select-none text-[10px] font-bold uppercase tracking-widest"
               style={{ color }}>{label}</div>
        </Html>
      ))}

      {/* Linking pathways between towers and Brahmasthan */}
      {([
        [0, R, 0, Math.PI / 4, 4],        // N
        [0, R, 0, -Math.PI / 4, 4],       // E
        [0, R, 0, Math.PI * 3 / 4, 4],    // W
        [0, R, 0, Math.PI * 5 / 4, 4],    // S
      ] as Array<[number, number, number, number, number]>).map(([, r, , a, w], i) => (
        <mesh key={`path${i}`} rotation={[-Math.PI / 2, 0, a]} position={[Math.sin(a) * r * 0.5, 0.002, Math.cos(a) * r * 0.5]}>
          <planeGeometry args={[w * 0.5, r * 0.6]} />
          <meshStandardMaterial color="#d8d0c0" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ── Diagonal paths to towers ─────────────────────────────────────────────────

function CampusPaths() {
  // Diagonal paths from Brahmasthan to each tower
  const DIRS = [
    { a: -Math.PI / 4,  p: [24, 0, -24] as [number,number,number] },  // NE
    { a:  Math.PI / 4,  p: [24, 0,  24] as [number,number,number] },  // SE
    { a:  Math.PI * 3/4, p: [-24, 0, 24] as [number,number,number] }, // SW
    { a: -Math.PI * 3/4, p: [-24, 0, -24] as [number,number,number] },// NW
  ];
  return (
    <group>
      {DIRS.map(({ a, p }, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, a]} position={[p[0] / 2, 0.002, p[2] / 2]}>
          <planeGeometry args={[2.5, 30]} />
          <meshStandardMaterial color="#d0c8b8" roughness={0.9} />
        </mesh>
      ))}
      {/* Outer ring road connecting all 4 towers */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <ringGeometry args={[38, 41, 64]} />
        <meshStandardMaterial color="#ccc4b4" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ── Campus lawn and ground ────────────────────────────────────────────────────

function CampusGround() {
  return (
    <group>
      {/* main lawn */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[110, 80]} />
        <meshStandardMaterial color="#7a9e68" roughness={1} />
      </mesh>
      {/* paved campus zone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <circleGeometry args={[55, 64]} />
        <meshStandardMaterial color="#c8bfb0" roughness={0.95} />
      </mesh>
      {/* landscaped clusters between towers */}
      {([
        [18, 0, 0], [-18, 0, 0], [0, 0, 18], [0, 0, -18],
      ] as [number,number,number][]).map((p, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[p[0], 0.006, p[2]]}>
          <circleGeometry args={[5, 24]} />
          <meshStandardMaterial color="#88a870" roughness={1} />
        </mesh>
      ))}
      {/* decorative planters at tower bases */}
      {Object.values(VASTU_POSITIONS).flatMap((pos, ti) =>
        [-5, 5].map((dx, i) => (
          <mesh key={`planter-${ti}-${i}`} position={[pos[0] + dx, 0.2, pos[2]]}>
            <cylinderGeometry args={[0.6, 0.5, 0.4, 12]} />
            <meshStandardMaterial color="#b8a898" roughness={0.9} />
          </mesh>
        ))
      )}
      {/* trees */}
      {([
        [12, 0, -5], [-12, 0, -5], [12, 0, 5], [-12, 0, 5],
        [5, 0, -12], [-5, 0, -12], [5, 0, 12], [-5, 0, 12],
        [20, 0, -20], [-20, 0, -20], [20, 0, 20], [-20, 0, 20],
      ] as [number,number,number][]).map((p, i) => (
        <group key={`tree${i}`} position={p}>
          <mesh position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.12, 0.18, 2.2, 8]} />
            <meshStandardMaterial color="#8a7050" roughness={0.9} />
          </mesh>
          <mesh position={[0, 2.5, 0]}>
            <sphereGeometry args={[0.9 + (i % 3) * 0.2, 9, 8]} />
            <meshStandardMaterial color="#5a8a40" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Tower label chips (floating above non-selected towers) ───────────────────

function TowerLabel({
  building,
  position,
  isSelected,
  onClick,
}: {
  building: VastuBuilding;
  position: [number, number, number];
  isSelected: boolean;
  onClick: () => void;
}) {
  const roofH = vastuFloorY(66) + 1;
  return (
    <Html
      position={[position[0], roofH, position[2]]}
      center distanceFactor={28} zIndexRange={[10, 0]}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-lg backdrop-blur transition-all ${
          isSelected
            ? "bg-[#2A2420] text-white shadow-[#2A2420]/30"
            : "bg-white/90 text-slate-700 hover:bg-[#2A2420] hover:text-white"
        }`}
      >
        {building.towerName}
        <span className={`ml-1.5 text-[9px] font-normal ${isSelected ? "text-amber-300" : "text-slate-500"}`}>
          {building.vastuElement}
        </span>
      </button>
    </Html>
  );
}

// ── Camera rig ────────────────────────────────────────────────────────────────

function VastuCameraRig({
  selectedBuilding,
  selectedFloor,
  selectedHomeId,
}: {
  selectedBuilding: VastuBuilding | null;
  selectedFloor: PublicFloor | null;
  selectedHomeId: string | null;
}) {
  const controls = useRef<CameraControlsImpl | null>(null);
  const interacted = useRef(false);
  const intro = useRef(true);
  const aspect = useThree((s) => s.viewport.aspect);
  const zoomOut = aspect < 0.9 ? 1.6 : 1;

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const onStart = () => { interacted.current = true; intro.current = false; };
    c.addEventListener("controlstart", onStart);
    // opening sweep: high aerial view of the full campus
    c.setLookAt(2, 5, 80, 0, 18, 0, false);
    const t = setTimeout(() => {
      if (intro.current && c) c.setLookAt(85 * zoomOut, 60 * zoomOut, 75 * zoomOut, 0, 25, 0, true);
      intro.current = false;
    }, 2200);
    return () => { clearTimeout(t); c.removeEventListener("controlstart", onStart); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    intro.current = false;

    if (!selectedBuilding) {
      // show all 4 towers
      c.minDistance = 20;
      if (!intro.current) c.setLookAt(85 * zoomOut, 60 * zoomOut, 75 * zoomOut, 0, 25, 0, true);
      return;
    }

    const [bx, , bz] = VASTU_POSITIONS[selectedBuilding.buildingId];
    c.minDistance = 8;

    if (!selectedFloor) {
      // zoom to selected tower exterior
      const dist = 50 * zoomOut;
      c.setLookAt(bx + dist * 0.55, 35 * zoomOut, bz + dist * 0.55, bx, 22, bz, true);
      return;
    }

    const n = selectedFloor.number;
    const pent = !!selectedFloor.penthouse;
    const idx = selectedFloor && selectedHomeId
      ? selectedFloor.homes.findIndex((h) => h.id === selectedHomeId)
      : -1;
    const focus = idx >= 0
      ? pent ? vastuHalfRect(idx) : vastuUnitRect(idx)
      : null;
    const y = vastuFloorY(n);

    if (pent && focus) {
      c.setLookAt(
        bx + focus.x * 0.85 + (focus.x < 0 ? -1.5 : 1.5),
        bz + y + 3.2, bz + 12,
        bx + focus.x * 0.85, y + 1.2, bz + 0.6,
        true
      );
    } else if (focus) {
      c.setLookAt(
        bx + focus.x + (focus.x < 0 ? -3.5 : 3.5) * zoomOut,
        y + 5 * zoomOut,
        bz + focus.z + (focus.z < 0 ? -4.8 : 4.8) * zoomOut,
        bx + focus.x, y + 0.3, bz + focus.z,
        true
      );
    } else {
      // top-down floor view
      c.setLookAt(
        bx + 11 * zoomOut, y + 13 * zoomOut, bz + 11 * zoomOut,
        bx, y + 0.2, bz,
        true
      );
    }
  }, [
    selectedBuilding?.buildingId,
    selectedFloor?.number,
    selectedHomeId,
    zoomOut,
    aspect,
  ]);

  useFrame((_, delta) => {
    if (!interacted.current && !selectedBuilding && controls.current) {
      controls.current.azimuthAngle += delta * 0.04;
    }
  });

  return (
    <CameraControls ref={controls} makeDefault
      minDistance={8} maxDistance={200}
      dollySpeed={0.35} maxPolarAngle={Math.PI / 2 - 0.04} smoothTime={0.5}
    />
  );
}

// ── Main campus scene ────────────────────────────────────────────────────────

export default function VastuCampus({
  buildings,
  selectedBuildingId,
  selectedFloor,
  selectedHomeId,
  onSelectBuilding,
  onSelectFloor,
  onSelectHome,
  onClearSelection,
  onReady,
}: {
  buildings: VastuBuilding[];
  selectedBuildingId: string | null;
  selectedFloor: PublicFloor | null;
  selectedHomeId: string | null;
  onSelectBuilding: (id: string) => void;
  onSelectFloor: (floor: PublicFloor) => void;
  onSelectHome: (home: PublicHome) => void;
  onClearSelection: () => void;
  onReady: () => void;
}) {
  const selectedBuilding = buildings.find((b) => b.buildingId === selectedBuildingId) ?? null;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [75, 55, 70], fov: 45 }}
      onCreated={onReady}
      onPointerMissed={onClearSelection}
      className="touch-none"
    >
      <color attach="background" args={["#dfeaf2"]} />
      <fog attach="fog" args={["#dfeaf2", 130, 280]} />
      <hemisphereLight args={["#d0e5f5", "#e8ddc8", 0.85]} />
      <ambientLight intensity={0.18} color="#ffe8c8" />
      <directionalLight
        position={[35, 55, 25]}
        color="#fff4e0"
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-radius={8}
        shadow-bias={-0.0002}
        shadow-camera-left={-90}
        shadow-camera-right={90}
        shadow-camera-top={90}
        shadow-camera-bottom={-90}
      />
      {/* subtle fill from opposite side */}
      <directionalLight position={[-20, 30, -20]} color="#c8e0f0" intensity={0.4} />

      <CampusGround />
      <CampusPaths />
      <Brahmasthan />

      {buildings.map((building) => {
        const pos = VASTU_POSITIONS[building.buildingId];
        const isActive = building.buildingId === selectedBuildingId;
        return (
          <group key={building.buildingId} position={pos}>
            <VastuTower
              floors={building.floors}
              selectedFloorNumber={isActive ? (selectedFloor?.number ?? null) : null}
              selectedHomeId={isActive ? selectedHomeId : null}
              onSelectFloor={onSelectFloor}
              onSelectHome={onSelectHome}
            />
            <TowerLabel
              building={building}
              position={pos}
              isSelected={isActive}
              onClick={() => onSelectBuilding(building.buildingId)}
            />
          </group>
        );
      })}

      <VastuCameraRig
        selectedBuilding={selectedBuilding}
        selectedFloor={selectedFloor}
        selectedHomeId={selectedHomeId}
      />
    </Canvas>
  );
}
