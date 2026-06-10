"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { PublicFloor, PublicHome } from "@/lib/types";
import { TOWER, unitRect, penthouseRect, floorY, AVAILABILITY_COLOR } from "@/lib/layout";
import UnitInterior, { PenthouseInterior } from "./Interior";
import Site from "./Site";

type FloorMode = "normal" | "context" | "open" | "above";

const damp = THREE.MathUtils.damp;

// Faded-out floors must not intercept pointer events: THREE's raycaster
// ignores `visible`, so swap in a no-op raycast while a floor is sliced away.
const NOOP_RAYCAST = () => null;
const MESH_RAYCAST = THREE.Mesh.prototype.raycast;

function modeOf(floorNumber: number, selected: number | null): FloorMode {
  if (selected == null) return "normal";
  if (floorNumber === selected) return "open";
  return floorNumber < selected ? "context" : "above";
}

const TARGETS: Record<FloorMode, { glass: number; structure: number; lift: number }> = {
  normal: { glass: 0.55, structure: 1, lift: 0 },
  context: { glass: 0.22, structure: 0.45, lift: 0 },
  open: { glass: 0, structure: 1, lift: 0 },
  above: { glass: 0, structure: 0, lift: 1.1 },
};

function bedroomsOf(home: PublicHome): number {
  const n = home.configuration ? parseInt(home.configuration, 10) : NaN;
  return Number.isFinite(n) ? Math.min(n, 4) : 2;
}

function HomeLabel({
  home,
  y,
  selected,
}: {
  home: PublicHome;
  y: number;
  selected: boolean;
}) {
  return (
    <Html position={[0, y, 0]} center distanceFactor={14} zIndexRange={[20, 0]}>
      <div
        className={`pointer-events-none select-none whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium shadow-md backdrop-blur ${
          selected ? "bg-slate-900 text-white" : "bg-white/90 text-slate-800"
        }`}
      >
        {home.label}
      </div>
    </Html>
  );
}

function UnitHome({
  home,
  index,
  selected,
  onSelect,
}: {
  home: PublicHome;
  index: number;
  selected: boolean;
  onSelect: (home: PublicHome) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const rect = unitRect(index);
  const rim = AVAILABILITY_COLOR[home.availability] ?? "#cbd5e1";
  const sx: 1 | -1 = rect.x < 0 ? 1 : -1; // canonical outer facade at -x
  const sz: 1 | -1 = rect.z > 0 ? 1 : -1; // canonical window front at +z

  return (
    <group position={[rect.x, TOWER.slabThickness, rect.z]}>
      {/* availability rim under the unit */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[rect.w - 0.12, 0.045, rect.d - 0.12]} />
        <meshStandardMaterial
          color={rim}
          emissive={rim}
          emissiveIntensity={selected ? 0.7 : hovered ? 0.4 : 0.12}
        />
      </mesh>
      {/* wood floor */}
      <mesh position={[0, 0.052, 0]} receiveShadow>
        <boxGeometry args={[rect.w - 0.3, 0.03, rect.d - 0.3]} />
        <meshStandardMaterial color="#d9b985" roughness={0.9} />
      </mesh>
      <group position={[0, 0.067, 0]}>
        <UnitInterior
          bedrooms={bedroomsOf(home)}
          sx={sx}
          sz={sz}
          onSelect={() => onSelect(home)}
          onHoverChange={setHovered}
        />
      </group>
      <HomeLabel home={home} y={1.15} selected={selected} />
    </group>
  );
}

function PenthouseHome({
  home,
  index,
  selected,
  onSelect,
}: {
  home: PublicHome;
  index: number;
  selected: boolean;
  onSelect: (home: PublicHome) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const rect = penthouseRect(index);
  const rim = AVAILABILITY_COLOR[home.availability] ?? "#cbd5e1";
  const sx: 1 | -1 = rect.x < 0 ? 1 : -1;

  return (
    <group position={[rect.x, TOWER.slabThickness, rect.z]}>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[rect.w - 0.12, 0.045, rect.d - 0.12]} />
        <meshStandardMaterial
          color={rim}
          emissive={rim}
          emissiveIntensity={selected ? 0.7 : hovered ? 0.4 : 0.12}
        />
      </mesh>
      <mesh position={[0, 0.052, 0]} receiveShadow>
        <boxGeometry args={[rect.w - 0.3, 0.03, rect.d - 0.3]} />
        <meshStandardMaterial color="#d9b985" roughness={0.95} />
      </mesh>
      <group position={[0, 0.067, 0]}>
        <PenthouseInterior sx={sx} onSelect={() => onSelect(home)} onHoverChange={setHovered} />
      </group>
      <HomeLabel home={home} y={2.45} selected={selected} />
    </group>
  );
}

function FloorBlock({
  floor,
  selectedFloorNumber,
  selectedHomeId,
  onSelectFloor,
  onSelectHome,
}: {
  floor: PublicFloor;
  selectedFloorNumber: number | null;
  selectedHomeId: string | null;
  onSelectFloor: (floor: PublicFloor) => void;
  onSelectHome: (home: PublicHome) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const glassMat = useRef<THREE.MeshStandardMaterial>(null);
  const structureMat = useRef<THREE.MeshStandardMaterial>(null);
  const baseY = floorY(floor.number);
  const mode = modeOf(floor.number, selectedFloorNumber);
  const open = mode === "open";
  const levels = floor.penthouse ? 2 : 1;
  const height = TOWER.floorHeight * levels;

  useFrame((_, delta) => {
    const t = TARGETS[mode];
    const g = groupRef.current;
    if (glassMat.current) {
      glassMat.current.opacity = damp(glassMat.current.opacity, t.glass, 6, delta);
    }
    if (structureMat.current) {
      structureMat.current.opacity = damp(structureMat.current.opacity, t.structure, 6, delta);
    }
    if (g) {
      g.position.y = damp(g.position.y, baseY + t.lift, 6, delta);
      const visible =
        (glassMat.current?.opacity ?? 1) > 0.03 || (structureMat.current?.opacity ?? 1) > 0.03;
      g.visible = visible;
    }
  });

  const bodyH = height - TOWER.slabThickness;
  const columns = useMemo(() => {
    const xs = [-TOWER.width / 2 + 0.2, 0, TOWER.width / 2 - 0.2];
    const zs = [-TOWER.depth / 2 + 0.2, TOWER.depth / 2 - 0.2];
    const out: [number, number][] = [];
    for (const x of xs) for (const z of zs) out.push([x, z]);
    return out;
  }, []);

  return (
    <group ref={groupRef} position={[0, baseY, 0]}>
      {/* slab */}
      <mesh
        position={[0, TOWER.slabThickness / 2, 0]}
        castShadow
        receiveShadow
        raycast={mode === "above" ? NOOP_RAYCAST : MESH_RAYCAST}
        onClick={(e) => {
          e.stopPropagation();
          onSelectFloor(floor);
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <boxGeometry args={[TOWER.width + 0.5, TOWER.slabThickness, TOWER.depth + 0.5]} />
        <meshStandardMaterial ref={structureMat} color="#ece7dc" roughness={0.8} transparent />
      </mesh>

      {!open && (
        <>
          {/* glass body */}
          <mesh
            position={[0, TOWER.slabThickness + bodyH / 2, 0]}
            raycast={mode === "above" ? NOOP_RAYCAST : MESH_RAYCAST}
            onClick={(e) => {
              e.stopPropagation();
              onSelectFloor(floor);
            }}
            onPointerOver={() => (document.body.style.cursor = "pointer")}
            onPointerOut={() => (document.body.style.cursor = "auto")}
          >
            <boxGeometry args={[TOWER.width, bodyH, TOWER.depth]} />
            <meshStandardMaterial
              ref={glassMat}
              color="#7fb4cf"
              roughness={0.12}
              metalness={0.2}
              transparent
              opacity={0.55}
              depthWrite={false}
            />
          </mesh>
          {/* columns */}
          {columns.map(([x, z], i) => (
            <mesh key={i} position={[x, TOWER.slabThickness + bodyH / 2, z]}>
              <boxGeometry args={[0.28, bodyH, 0.28]} />
              <meshStandardMaterial color="#d8d2c4" roughness={0.7} transparent opacity={1} />
            </mesh>
          ))}
          {/* mid slab band for the two-storey penthouse shell */}
          {floor.penthouse && (
            <mesh position={[0, TOWER.floorHeight, 0]}>
              <boxGeometry args={[TOWER.width + 0.2, 0.12, TOWER.depth + 0.2]} />
              <meshStandardMaterial color="#e3ddd0" roughness={0.8} transparent opacity={1} />
            </mesh>
          )}
          {/* balcony ledges on the front face */}
          {[-4.2, 4.2].map((x) => (
            <mesh key={x} position={[x, TOWER.slabThickness + 0.16, TOWER.depth / 2 + 0.35]}>
              <boxGeometry args={[4.6, 0.1, 0.7]} />
              <meshStandardMaterial color="#e3ddd0" roughness={0.8} transparent opacity={1} />
            </mesh>
          ))}
        </>
      )}

      {open && (
        <group>
          {/* shared floor deck */}
          <mesh position={[0, TOWER.slabThickness + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[TOWER.width, TOWER.depth]} />
            <meshStandardMaterial color="#dcd6c9" roughness={0.9} />
          </mesh>
          {floor.homes.map((home, i) =>
            floor.penthouse ? (
              <PenthouseHome
                key={home.id}
                home={home}
                index={i}
                selected={home.id === selectedHomeId}
                onSelect={onSelectHome}
              />
            ) : (
              <UnitHome
                key={home.id}
                home={home}
                index={i}
                selected={home.id === selectedHomeId}
                onSelect={onSelectHome}
              />
            )
          )}
        </group>
      )}
    </group>
  );
}

function Roof({ baseFloorNumber, sliced }: { baseFloorNumber: number; sliced: boolean }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const baseY = floorY(baseFloorNumber);

  useFrame((_, delta) => {
    const target = sliced ? 0 : 1;
    if (mat.current) mat.current.opacity = damp(mat.current.opacity, target, 6, delta);
    if (groupRef.current) {
      groupRef.current.position.y = damp(groupRef.current.position.y, baseY + (sliced ? 1.4 : 0), 6, delta);
      groupRef.current.visible = (mat.current?.opacity ?? 1) > 0.03;
    }
  });

  return (
    <group ref={groupRef} position={[0, baseY, 0]}>
      <mesh position={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[TOWER.width + 0.5, 0.24, TOWER.depth + 0.5]} />
        <meshStandardMaterial ref={mat} color="#e3ddd0" roughness={0.8} transparent />
      </mesh>
      <mesh position={[-5, 0.65, -2.5]}>
        <boxGeometry args={[2.4, 0.9, 2]} />
        <meshStandardMaterial color="#cfc8ba" roughness={0.8} transparent opacity={1} />
      </mesh>
      <mesh position={[4.5, 0.5, 2]}>
        <cylinderGeometry args={[0.8, 0.8, 0.7, 20]} />
        <meshStandardMaterial color="#c5beb0" roughness={0.8} transparent opacity={1} />
      </mesh>
    </group>
  );
}

export default function Tower({
  floors,
  selectedFloorNumber,
  selectedHomeId,
  onSelectFloor,
  onSelectHome,
}: {
  floors: PublicFloor[];
  selectedFloorNumber: number | null;
  selectedHomeId: string | null;
  onSelectFloor: (floor: PublicFloor) => void;
  onSelectHome: (home: PublicHome) => void;
}) {
  const roofBase = Math.max(...floors.map((f) => f.number + (f.penthouse ? 2 : 1)), 2);
  return (
    <group>
      {/* lawn */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[55, 64]} />
        <meshStandardMaterial color="#8fb878" roughness={1} />
      </mesh>
      {/* paved plaza around the tower */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[14, 48]} />
        <meshStandardMaterial color="#cfc9ba" roughness={1} />
      </mesh>
      <Site />
      {/* podium */}
      <mesh position={[0, TOWER.podiumHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[TOWER.width + 2, TOWER.podiumHeight, TOWER.depth + 2]} />
        <meshStandardMaterial color="#b9b2a2" roughness={0.85} />
      </mesh>

      {floors.map((floor) => (
        <FloorBlock
          key={floor.id}
          floor={floor}
          selectedFloorNumber={selectedFloorNumber}
          selectedHomeId={selectedHomeId}
          onSelectFloor={onSelectFloor}
          onSelectHome={onSelectHome}
        />
      ))}
      <Roof baseFloorNumber={roofBase} sliced={selectedFloorNumber != null} />
    </group>
  );
}
