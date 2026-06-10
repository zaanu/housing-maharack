"use client";

// Marina One-inspired luxury tower renderer for Vastu Heights.
// Darker reflective glass, anthracite frames, sky-garden terraces every 10 floors.

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { PublicFloor, PublicHome } from "@/lib/types";
import {
  VASTU_TOWER,
  vastuUnitRect,
  vastuHalfRect,
  vastuFloorY,
  SKY_GARDEN_FLOORS,
} from "@/lib/vastuLayout";
import { AVAILABILITY_COLOR } from "@/lib/layout";
import FlowInterior, { FlowPenthouseInterior } from "./FlowInterior";

type FloorMode = "normal" | "context" | "open" | "above";

const damp = THREE.MathUtils.damp;
const NOOP_RAYCAST = () => null;
const MESH_RAYCAST = THREE.Mesh.prototype.raycast;

function modeOf(n: number, selected: number | null): FloorMode {
  if (selected == null) return "normal";
  if (n === selected) return "open";
  return n < selected ? "context" : "above";
}

const TARGETS: Record<FloorMode, { glass: number; structure: number; lift: number }> = {
  normal:  { glass: 0.62, structure: 1,    lift: 0   },
  context: { glass: 0.18, structure: 0.4,  lift: 0   },
  open:    { glass: 0,    structure: 1,    lift: 0   },
  above:   { glass: 0,    structure: 0,    lift: 1.2 },
};

function bedroomsOf(h: PublicHome): number {
  const n = parseInt(h.configuration ?? "2", 10);
  return Number.isFinite(n) ? Math.min(n, 4) : 2;
}

function HomeLabel({ home, y, selected }: { home: PublicHome; y: number; selected: boolean }) {
  return (
    <Html position={[0, y, 0]} center distanceFactor={16} zIndexRange={[20, 0]}>
      <div
        className={`pointer-events-none select-none whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium shadow-md backdrop-blur ${
          selected ? "bg-[#2A2420] text-white" : "bg-white/90 text-slate-700"
        }`}
      >
        {home.label}
      </div>
    </Html>
  );
}

// A standard (4-unit) floor home
function VastuUnitHome({
  home, index, selected, onSelect,
}: {
  home: PublicHome; index: number; selected: boolean; onSelect: (h: PublicHome) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const rect = vastuUnitRect(index);
  const rim = AVAILABILITY_COLOR[home.availability] ?? "#cbd5e1";
  const sx: 1 | -1 = rect.x < 0 ? 1 : -1;
  const sz: 1 | -1 = rect.z > 0 ? 1 : -1;

  return (
    <group position={[rect.x, VASTU_TOWER.slabThickness, rect.z]}>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[rect.w - 0.14, 0.05, rect.d - 0.14]} />
        <meshStandardMaterial color={rim} emissive={rim}
          emissiveIntensity={selected ? 0.7 : hovered ? 0.4 : 0.1} />
      </mesh>
      <mesh position={[0, 0.055, 0]} receiveShadow>
        <boxGeometry args={[rect.w - 0.32, 0.03, rect.d - 0.32]} />
        <meshStandardMaterial color="#E0CBAA" roughness={0.9} />
      </mesh>
      <group position={[0, 0.07, 0]}>
        <FlowInterior
          bedrooms={bedroomsOf(home)} sx={sx} sz={sz}
          onSelect={() => onSelect(home)}
          onHoverChange={setHovered}
        />
      </group>
      <HomeLabel home={home} y={VASTU_TOWER.floorHeight * 0.9} selected={selected} />
    </group>
  );
}

// A signature/crown (2-unit) floor home — wider
function VastuHalfHome({
  home, index, selected, onSelect,
}: {
  home: PublicHome; index: number; selected: boolean; onSelect: (h: PublicHome) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const rect = vastuHalfRect(index);
  const rim = AVAILABILITY_COLOR[home.availability] ?? "#cbd5e1";
  const sx: 1 | -1 = rect.x < 0 ? 1 : -1;

  return (
    <group position={[rect.x, VASTU_TOWER.slabThickness, rect.z]}>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[rect.w - 0.14, 0.05, rect.d - 0.14]} />
        <meshStandardMaterial color={rim} emissive={rim}
          emissiveIntensity={selected ? 0.7 : hovered ? 0.4 : 0.1} />
      </mesh>
      <mesh position={[0, 0.055, 0]} receiveShadow>
        <boxGeometry args={[rect.w - 0.32, 0.03, rect.d - 0.32]} />
        <meshStandardMaterial color="#E0CBAA" roughness={0.9} />
      </mesh>
      <group position={[0, 0.07, 0]}>
        {floor?.penthouse
          ? <FlowPenthouseInterior sx={sx} onSelect={() => onSelect(home)} onHoverChange={setHovered} />
          : <FlowInterior bedrooms={4} sx={sx} sz={1} onSelect={() => onSelect(home)} onHoverChange={setHovered} />
        }
      </group>
      <HomeLabel home={home} y={VASTU_TOWER.floorHeight * 0.9} selected={selected} />
    </group>
  );
}

// Reference to outer floor for penthouse detection — injected via FloorBlock
let floor: PublicFloor | undefined;

// Sky garden terrace plants (Marina One green heart)
function SkyGardenAccents({ floorH }: { floorH: number }) {
  const hw = VASTU_TOWER.width / 2;
  const hd = VASTU_TOWER.depth / 2;
  const plants = [
    [-hw + 0.4, hd + 0.7], [hw - 0.4, hd + 0.7],
    [-hw + 0.4, -hd - 0.7], [hw - 0.4, -hd - 0.7],
    [0, hd + 0.9], [0, -hd - 0.9],
  ];
  return (
    <group>
      {/* setback balconies on all 4 sides */}
      {([1, -1] as const).map((side, i) => (
        <mesh key={`s${i}`} position={[0, floorH * 0.12, side * (hd + 0.55)]}>
          <boxGeometry args={[VASTU_TOWER.width + 0.6, 0.12, 1.1]} />
          <meshStandardMaterial color="#ddd8cc" roughness={0.8} />
        </mesh>
      ))}
      {([1, -1] as const).map((side, i) => (
        <mesh key={`e${i}`} position={[side * (hw + 0.55), floorH * 0.12, 0]}>
          <boxGeometry args={[1.1, 0.12, VASTU_TOWER.depth + 0.6]} />
          <meshStandardMaterial color="#ddd8cc" roughness={0.8} />
        </mesh>
      ))}
      {/* shrub spheres */}
      {plants.map(([px, pz], i) => (
        <mesh key={i} position={[px, floorH * 0.25, pz]}>
          <sphereGeometry args={[0.3 + (i % 3) * 0.08, 8, 7]} />
          <meshStandardMaterial color="#5a8a4a" roughness={1} />
        </mesh>
      ))}
      {/* planter pots */}
      {plants.slice(0, 4).map(([px, pz], i) => (
        <mesh key={`pot${i}`} position={[px, floorH * 0.08, pz]}>
          <cylinderGeometry args={[0.22, 0.18, 0.16, 10]} />
          <meshStandardMaterial color="#b8a898" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function FloorBlock({
  f,
  selectedFloorNumber,
  selectedHomeId,
  onSelectFloor,
  onSelectHome,
}: {
  f: PublicFloor;
  selectedFloorNumber: number | null;
  selectedHomeId: string | null;
  onSelectFloor: (f: PublicFloor) => void;
  onSelectHome: (h: PublicHome) => void;
}) {
  // inject for VastuHalfHome
  floor = f;

  const groupRef = useRef<THREE.Group>(null);
  const glassMat = useRef<THREE.MeshStandardMaterial>(null);
  const structureMat = useRef<THREE.MeshStandardMaterial>(null);
  const baseY = vastuFloorY(f.number);
  const mode = modeOf(f.number, selectedFloorNumber);
  const open = mode === "open";
  const levels = f.penthouse ? 2 : 1;
  const floorH = VASTU_TOWER.floorHeight * levels;
  const isGardenFloor = SKY_GARDEN_FLOORS.has(f.number);
  // Subtle taper: top floors are 4% narrower (Marina One silhouette)
  const taper = 1 - (f.number / 65) * 0.04;
  const bodyH = floorH - VASTU_TOWER.slabThickness;

  useFrame((_, delta) => {
    const t = TARGETS[mode];
    if (glassMat.current) glassMat.current.opacity = damp(glassMat.current.opacity, t.glass, 6, delta);
    if (structureMat.current) structureMat.current.opacity = damp(structureMat.current.opacity, t.structure, 6, delta);
    if (groupRef.current) {
      groupRef.current.position.y = damp(groupRef.current.position.y, baseY + t.lift, 6, delta);
      const vis = (glassMat.current?.opacity ?? 1) > 0.03 || (structureMat.current?.opacity ?? 1) > 0.03;
      groupRef.current.visible = vis;
    }
  });

  const columns = useMemo(() => {
    const hw = VASTU_TOWER.width / 2;
    const hd = VASTU_TOWER.depth / 2;
    const xs = [-hw + 0.25, 0, hw - 0.25];
    const zs = [-hd + 0.25, hd - 0.25];
    const out: [number, number][] = [];
    for (const x of xs) for (const z of zs) out.push([x, z]);
    return out;
  }, []);

  // 2 homes for signature/crown zones, 4 for others
  const useHalfLayout = f.homes.length <= 2;

  return (
    <group ref={groupRef} position={[0, baseY, 0]}>
      {/* slab */}
      <mesh
        position={[0, VASTU_TOWER.slabThickness / 2, 0]}
        scale={[taper, 1, taper]}
        castShadow receiveShadow
        raycast={mode === "above" ? NOOP_RAYCAST : MESH_RAYCAST}
        onClick={(e) => { e.stopPropagation(); onSelectFloor(f); }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <boxGeometry args={[VASTU_TOWER.width + 0.55, VASTU_TOWER.slabThickness, VASTU_TOWER.depth + 0.55]} />
        <meshStandardMaterial ref={structureMat} color="#e8e2d5" roughness={0.75} transparent />
      </mesh>

      {!open && (
        <>
          {/* Marina One glass — deep reflective blue-grey */}
          <mesh
            position={[0, VASTU_TOWER.slabThickness + bodyH / 2, 0]}
            scale={[taper, 1, taper]}
            raycast={mode === "above" ? NOOP_RAYCAST : MESH_RAYCAST}
            onClick={(e) => { e.stopPropagation(); onSelectFloor(f); }}
            onPointerOver={() => (document.body.style.cursor = "pointer")}
            onPointerOut={() => (document.body.style.cursor = "auto")}
          >
            <boxGeometry args={[VASTU_TOWER.width, bodyH, VASTU_TOWER.depth]} />
            <meshStandardMaterial
              ref={glassMat}
              color="#4a7a9b"
              roughness={0.06}
              metalness={0.42}
              transparent
              opacity={0.62}
              depthWrite={false}
            />
          </mesh>
          {/* dark anthracite frame columns */}
          {columns.map(([x, z], i) => (
            <mesh key={i} position={[x * taper, VASTU_TOWER.slabThickness + bodyH / 2, z * taper]}>
              <boxGeometry args={[0.22, bodyH, 0.22]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.55} transparent opacity={1} />
            </mesh>
          ))}
          {/* horizontal spandrel bands every 5 floors */}
          {f.number % 5 === 0 && (
            <mesh position={[0, VASTU_TOWER.slabThickness + bodyH * 0.5, 0]} scale={[taper * 1.004, 1, taper * 1.004]}>
              <boxGeometry args={[VASTU_TOWER.width + 0.08, 0.06, VASTU_TOWER.depth + 0.08]} />
              <meshStandardMaterial color="#1e2830" roughness={0.4} metalness={0.3} transparent opacity={1} />
            </mesh>
          )}
          {/* sky garden terraces */}
          {isGardenFloor && <SkyGardenAccents floorH={floorH} />}
        </>
      )}

      {open && (
        <group>
          <mesh position={[0, VASTU_TOWER.slabThickness + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[VASTU_TOWER.width, VASTU_TOWER.depth]} />
            <meshStandardMaterial color="#E0CBAA" roughness={0.88} />
          </mesh>
          {f.homes.map((home, i) =>
            useHalfLayout ? (
              <VastuHalfHome
                key={home.id} home={home} index={i}
                selected={home.id === selectedHomeId}
                onSelect={onSelectHome}
              />
            ) : (
              <VastuUnitHome
                key={home.id} home={home} index={i}
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

function VastuRoof({ baseFloorNumber, sliced }: { baseFloorNumber: number; sliced: boolean }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const baseY = vastuFloorY(baseFloorNumber);

  useFrame((_, delta) => {
    const target = sliced ? 0 : 1;
    if (mat.current) mat.current.opacity = damp(mat.current.opacity, target, 6, delta);
    if (groupRef.current) {
      groupRef.current.position.y = damp(groupRef.current.position.y, baseY + (sliced ? 1.5 : 0), 6, delta);
      groupRef.current.visible = (mat.current?.opacity ?? 1) > 0.03;
    }
  });

  const taper = 1 - 0.04; // top taper value

  return (
    <group ref={groupRef} position={[0, baseY, 0]}>
      {/* crown slab */}
      <mesh position={[0, 0.14, 0]} scale={[taper, 1, taper]} castShadow>
        <boxGeometry args={[VASTU_TOWER.width + 0.55, 0.28, VASTU_TOWER.depth + 0.55]} />
        <meshStandardMaterial ref={mat} color="#ddd8cc" roughness={0.75} transparent />
      </mesh>
      {/* helipad circle */}
      <mesh position={[0, 0.29, 0]} scale={[taper, 1, taper]}>
        <cylinderGeometry args={[4, 4, 0.06, 32]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.6} transparent opacity={1} />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[3.5, 3.5, 0.02, 32]} />
        <meshStandardMaterial color="#c8b030" roughness={0.5} transparent opacity={1} />
      </mesh>
      {/* HVAC boxes */}
      {[[-4, -3], [4, 3], [-3, 4]].map(([x, z], i) => (
        <mesh key={i} position={[x * taper, 0.55, z * taper]}>
          <boxGeometry args={[1.8, 0.8, 1.4]} />
          <meshStandardMaterial color="#c0bab0" roughness={0.7} transparent opacity={1} />
        </mesh>
      ))}
    </group>
  );
}

export default function VastuTower({
  floors,
  selectedFloorNumber,
  selectedHomeId,
  onSelectFloor,
  onSelectHome,
}: {
  floors: PublicFloor[];
  selectedFloorNumber: number | null;
  selectedHomeId: string | null;
  onSelectFloor: (f: PublicFloor) => void;
  onSelectHome: (h: PublicHome) => void;
}) {
  const roofBase = Math.max(...floors.map((f) => f.number + (f.penthouse ? 2 : 1)), 2);
  return (
    <group>
      {/* podium */}
      <mesh position={[0, VASTU_TOWER.podiumHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[VASTU_TOWER.width + 3, VASTU_TOWER.podiumHeight, VASTU_TOWER.depth + 3]} />
        <meshStandardMaterial color="#c8c0b0" roughness={0.8} />
      </mesh>
      {/* podium canopy edge */}
      <mesh position={[0, VASTU_TOWER.podiumHeight + 0.04, 0]}>
        <boxGeometry args={[VASTU_TOWER.width + 3.2, 0.08, VASTU_TOWER.depth + 3.2]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.5} />
      </mesh>

      {floors.map((f) => (
        <FloorBlock
          key={f.id} f={f}
          selectedFloorNumber={selectedFloorNumber}
          selectedHomeId={selectedHomeId}
          onSelectFloor={onSelectFloor}
          onSelectHome={onSelectHome}
        />
      ))}
      <VastuRoof baseFloorNumber={roofBase} sliced={selectedFloorNumber != null} />
    </group>
  );
}
