"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, Suspense } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { PublicFloor, PublicHome } from "@/lib/types";
import { TOWER, unitRect, penthouseRect, floorY, AVAILABILITY_COLOR } from "@/lib/layout";
import UnitInterior, { PenthouseInterior } from "./Interior";
import Site from "./Site";
import { usePBRMaps } from "./materials";
import { useSceneMode } from "./mode";

type FloorMode = "normal" | "context" | "open" | "above";

const damp = THREE.MathUtils.damp;

const wrnd = (seed: number, i: number) => {
  const v = Math.sin(seed * 37.13 + i * 13.7) * 43758.5453;
  return v - Math.floor(v);
};

/** Warm/cool lit-window pattern, unique per floor, drawn once to a canvas.
 * `prob` is the share of windows that are lit; because the same seeded
 * threshold is used, windows lit at dusk stay lit at night. */
function windowTexture(seed: number, rows: number, prob: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64 * rows;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000000";
  g.fillRect(0, 0, c.width, c.height);
  const cols = 10;
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < cols; i++) {
      const k = r * cols + i;
      if (wrnd(seed, k) >= prob) continue;
      const warm = wrnd(seed, 100 + k) > 0.2;
      // vertical gradient per window so it reads as a lit room, not a decal
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
      g.globalAlpha = 0.65 + wrnd(seed, 200 + k) * 0.35;
      g.fillRect(x, y, 15, 32);
      g.globalAlpha = 1;
    }
  }
  return new THREE.CanvasTexture(c);
}

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
  normal: { glass: 0.5, structure: 1, lift: 0 },
  context: { glass: 0.18, structure: 0.45, lift: 0 },
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

/** Oak-plank unit flooring; falls back to flat colour while maps stream. */
function PlankFloor({ w, d }: { w: number; d: number }) {
  const maps = usePBRMaps("brown_planks_09", [w / 2.4, d / 2.4], { normalScale: 0.6 });
  return (
    <mesh position={[0, 0.052, 0]} receiveShadow>
      <boxGeometry args={[w, 0.03, d]} />
      <meshStandardMaterial {...maps} color="#e8d4ae" />
    </mesh>
  );
}

function UnitFloorSlab({ w, d }: { w: number; d: number }) {
  return (
    <Suspense
      fallback={
        <mesh position={[0, 0.052, 0]} receiveShadow>
          <boxGeometry args={[w, 0.03, d]} />
          <meshStandardMaterial color="#d9b985" roughness={0.9} />
        </mesh>
      }
    >
      <PlankFloor w={w} d={d} />
    </Suspense>
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
      <UnitFloorSlab w={rect.w - 0.3} d={rect.d - 0.3} />
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
      <UnitFloorSlab w={rect.w - 0.3} d={rect.d - 0.3} />
      <group position={[0, 0.067, 0]}>
        <PenthouseInterior sx={sx} onSelect={() => onSelect(home)} onHoverChange={setHovered} />
      </group>
      <HomeLabel home={home} y={2.45} selected={selected} />
    </group>
  );
}

/** Balcony with glass railing, planter and (seeded) outdoor furniture. */
function Balcony({
  x,
  z,
  seed,
  reg,
  regGlass,
  lit,
  glow,
}: {
  x: number;
  z: number;
  seed: number;
  reg: (m: THREE.MeshStandardMaterial | null) => void;
  regGlass: (m: THREE.MeshStandardMaterial | null) => void;
  lit: boolean;
  glow: number;
}) {
  const W = 4.6;
  const D = 1.1;
  const hasTable = wrnd(seed, 1) > 0.35;
  const hasLounger = !hasTable && wrnd(seed, 2) > 0.4;
  const planterX = wrnd(seed, 3) > 0.5 ? W / 2 - 0.55 : -W / 2 + 0.55;
  const isLit = lit && wrnd(seed, 4) > 0.45;
  return (
    <group position={[x, TOWER.slabThickness, z]} raycast={NOOP_RAYCAST}>
      {/* deck slab */}
      <mesh position={[0, 0.045, D / 2]} castShadow receiveShadow raycast={NOOP_RAYCAST}>
        <boxGeometry args={[W, 0.09, D]} />
        <meshStandardMaterial ref={reg} color="#e6e1d6" roughness={0.6} transparent />
      </mesh>
      {/* frameless glass railing: front + sides, metal cap rail */}
      <mesh position={[0, 0.33, D - 0.03]} raycast={NOOP_RAYCAST}>
        <boxGeometry args={[W - 0.06, 0.46, 0.025]} />
        <meshStandardMaterial ref={regGlass} color="#b8d4e0" roughness={0.05} metalness={0.1} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (W / 2 - 0.03), 0.33, D / 2 + 0.015]} raycast={NOOP_RAYCAST}>
          <boxGeometry args={[0.025, 0.46, D - 0.1]} />
          <meshStandardMaterial ref={regGlass} color="#b8d4e0" roughness={0.05} metalness={0.1} transparent opacity={0.28} depthWrite={false} />
        </mesh>
      ))}
      <mesh position={[0, 0.57, D - 0.03]} raycast={NOOP_RAYCAST}>
        <boxGeometry args={[W, 0.035, 0.055]} />
        <meshStandardMaterial ref={reg} color="#6a7077" roughness={0.3} metalness={0.85} transparent />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (W / 2 - 0.03), 0.57, D / 2 + 0.015]} raycast={NOOP_RAYCAST}>
          <boxGeometry args={[0.035, 0.035, D - 0.08]} />
          <meshStandardMaterial ref={reg} color="#6a7077" roughness={0.3} metalness={0.85} transparent />
        </mesh>
      ))}
      {/* planter with hedge */}
      <group position={[planterX, 0.09, D - 0.26]}>
        <mesh position={[0, 0.1, 0]} castShadow raycast={NOOP_RAYCAST}>
          <boxGeometry args={[0.85, 0.2, 0.26]} />
          <meshStandardMaterial ref={reg} color="#8d8678" roughness={0.85} transparent />
        </mesh>
        <mesh position={[0, 0.26, 0]} scale={[1, 0.55, 0.8]} castShadow raycast={NOOP_RAYCAST}>
          <sphereGeometry args={[0.32, 10, 8]} />
          <meshStandardMaterial ref={reg} color="#4d6b3a" roughness={1} transparent />
        </mesh>
      </group>
      {/* outdoor furniture, varied per balcony */}
      {hasTable && (
        <group position={[-planterX * 0.6, 0.09, D - 0.45]}>
          <mesh position={[0, 0.2, 0]} raycast={NOOP_RAYCAST} castShadow>
            <cylinderGeometry args={[0.16, 0.16, 0.02, 12]} />
            <meshStandardMaterial ref={reg} color="#caa978" roughness={0.55} transparent />
          </mesh>
          <mesh position={[0, 0.1, 0]} raycast={NOOP_RAYCAST}>
            <cylinderGeometry args={[0.02, 0.025, 0.2, 8]} />
            <meshStandardMaterial ref={reg} color="#3a3e44" roughness={0.4} metalness={0.7} transparent />
          </mesh>
          {[-0.3, 0.3].map((dx) => (
            <mesh key={dx} position={[dx, 0.11, 0.02]} raycast={NOOP_RAYCAST} castShadow>
              <boxGeometry args={[0.17, 0.2, 0.17]} />
              <meshStandardMaterial ref={reg} color="#5e554a" roughness={0.8} transparent />
            </mesh>
          ))}
        </group>
      )}
      {hasLounger && (
        <group position={[-planterX * 0.55, 0.09, D - 0.42]} rotation={[0, wrnd(seed, 7) * 0.7 - 0.35, 0]}>
          <mesh position={[0, 0.1, 0]} raycast={NOOP_RAYCAST} castShadow>
            <boxGeometry args={[0.62, 0.05, 0.24]} />
            <meshStandardMaterial ref={reg} color="#b9a98e" roughness={0.75} transparent />
          </mesh>
          <mesh position={[-0.25, 0.2, 0]} rotation={[0, 0, 0.65]} raycast={NOOP_RAYCAST}>
            <boxGeometry args={[0.26, 0.04, 0.24]} />
            <meshStandardMaterial ref={reg} color="#b9a98e" roughness={0.75} transparent />
          </mesh>
        </group>
      )}
      {/* warm wall-washer on inhabited balconies after dark */}
      {isLit && (
        <mesh position={[0, 0.42, 0.03]} raycast={NOOP_RAYCAST}>
          <planeGeometry args={[W - 0.5, 0.55]} />
          <meshStandardMaterial
            ref={reg}
            color="#2a2018"
            emissive="#ffbe78"
            emissiveIntensity={glow * 0.5}
            transparent
            depthWrite={false}
          />
        </mesh>
      )}
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
  const glassMat = useRef<THREE.MeshPhysicalMaterial>(null);
  const structureMat = useRef<THREE.MeshStandardMaterial>(null);
  const baseY = floorY(floor.number);
  const mode = modeOf(floor.number, selectedFloorNumber);
  const open = mode === "open";
  const levels = floor.penthouse ? 2 : 1;
  const height = TOWER.floorHeight * levels;

  const bodyH = height - TOWER.slabThickness;
  const levels2 = floor.penthouse ? 2 : 1;
  const { theme, lit } = useSceneMode();
  const showWindows = theme.litWindows > 0;

  // every fading facade material registers here; opacity = fade × base
  const fadeMats = useRef<THREE.MeshStandardMaterial[]>([]);
  const fade = useRef(1);
  const reg = (m: THREE.MeshStandardMaterial | null) => {
    if (m && !fadeMats.current.includes(m)) {
      if (m.userData.base === undefined) m.userData.base = m.opacity;
      fadeMats.current.push(m);
    }
  };
  // railing glass fades with the structure but keeps its own low base opacity
  const regGlass = reg;

  const windowsMat = useMemo(() => {
    if (theme.litWindows === 0) return null;
    const tex = windowTexture(floor.number * 7 + 3, levels2, theme.litWindows);
    return new THREE.MeshStandardMaterial({
      color: "#0c1521",
      emissive: "#ffffff",
      emissiveMap: tex,
      emissiveIntensity: theme.windowGlow,
      roughness: 0.4,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
  }, [floor.number, levels2, theme.litWindows, theme.windowGlow]);
  useEffect(() => {
    return () => {
      if (windowsMat) {
        windowsMat.emissiveMap?.dispose();
        windowsMat.dispose();
      }
    };
  }, [windowsMat]);

  useFrame((_, delta) => {
    const t = TARGETS[mode];
    const g = groupRef.current;
    if (glassMat.current) {
      glassMat.current.opacity = damp(glassMat.current.opacity, t.glass, 6, delta);
    }
    fade.current = damp(fade.current, t.structure, 6, delta);
    if (structureMat.current) structureMat.current.opacity = fade.current;
    for (const m of fadeMats.current) m.opacity = fade.current * (m.userData.base as number);
    if (windowsMat) windowsMat.opacity = fade.current * 0.92;
    if (g) {
      g.position.y = damp(g.position.y, baseY + t.lift, 6, delta);
      g.visible = (glassMat.current?.opacity ?? 1) > 0.03 || fade.current > 0.03;
    }
  });

  const columns = useMemo(() => {
    const xs = [-TOWER.width / 2 + 0.2, 0, TOWER.width / 2 - 0.2];
    const zs = [-TOWER.depth / 2 + 0.2, TOWER.depth / 2 - 0.2];
    const out: [number, number][] = [];
    for (const x of xs) for (const z of zs) out.push([x, z]);
    return out;
  }, []);

  // curtain-wall mullion grid: vertical aluminium bars on all four faces
  const mullionRef = useRef<THREE.InstancedMesh>(null);
  const mullions = useMemo(() => {
    const out: [number, number, number][] = [];
    const y = TOWER.slabThickness + bodyH / 2;
    const hw = TOWER.width / 2;
    const hd = TOWER.depth / 2;
    for (let i = 0; i <= 15; i++) {
      const x = -hw + (i * TOWER.width) / 15;
      out.push([x, y, hd + 0.015], [x, y, -hd - 0.015]);
    }
    for (let i = 1; i < 9; i++) {
      const z = -hd + (i * TOWER.depth) / 9;
      out.push([hw + 0.015, y, z], [-hw - 0.015, y, z]);
    }
    return out;
  }, [bodyH]);
  useLayoutEffect(() => {
    const mesh = mullionRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    mullions.forEach((p, i) => {
      m.setPosition(p[0], p[1], p[2]);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [mullions]);

  // seeded AC condenser units on the side faces
  const acUnits = useMemo(() => {
    const out: { x: number; z: number }[] = [];
    for (let i = 0; i < 3; i++) {
      if (wrnd(floor.number * 13, i) > 0.55) continue;
      const side = wrnd(floor.number * 17, i) > 0.5 ? 1 : -1;
      out.push({ x: side * (TOWER.width / 2 + 0.1), z: -TOWER.depth / 2 + 1.2 + wrnd(floor.number * 19, i) * (TOWER.depth - 2.4) });
    }
    return out;
  }, [floor.number]);

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
        <meshStandardMaterial ref={structureMat} color="#ece7dc" roughness={0.55} transparent />
      </mesh>
      {/* dark metal fascia wrapping the slab edge */}
      <mesh position={[0, TOWER.slabThickness / 2, 0]} raycast={NOOP_RAYCAST}>
        <boxGeometry args={[TOWER.width + 0.56, TOWER.slabThickness * 0.55, TOWER.depth + 0.56]} />
        <meshStandardMaterial ref={reg} color="#454a52" roughness={0.35} metalness={0.8} transparent />
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
            <meshPhysicalMaterial
              ref={glassMat}
              color="#9dbecd"
              roughness={0.06}
              metalness={0.1}
              clearcoat={1}
              clearcoatRoughness={0.06}
              envMapIntensity={1.5}
              transparent
              opacity={0.5}
              depthWrite={false}
            />
          </mesh>
          {/* aluminium mullion grid */}
          <instancedMesh ref={mullionRef} args={[undefined, undefined, mullions.length]} raycast={NOOP_RAYCAST}>
            <boxGeometry args={[0.045, bodyH - 0.02, 0.045]} />
            <meshStandardMaterial ref={reg} color="#7d838b" roughness={0.35} metalness={0.85} transparent />
          </instancedMesh>
          {/* horizontal transom band at mid-height */}
          {[
            [0, TOWER.depth / 2 + 0.015, TOWER.width, 0.045] as const,
            [0, -TOWER.depth / 2 - 0.015, TOWER.width, 0.045] as const,
          ].map(([x, z, w], i) => (
            <mesh key={i} position={[x, TOWER.slabThickness + bodyH * 0.52, z]} raycast={NOOP_RAYCAST}>
              <boxGeometry args={[w, 0.04, 0.04]} />
              <meshStandardMaterial ref={reg} color="#7d838b" roughness={0.35} metalness={0.85} transparent />
            </mesh>
          ))}
          {[1, -1].map((s) => (
            <mesh
              key={s}
              position={[s * (TOWER.width / 2 + 0.015), TOWER.slabThickness + bodyH * 0.52, 0]}
              raycast={NOOP_RAYCAST}
            >
              <boxGeometry args={[0.04, 0.04, TOWER.depth]} />
              <meshStandardMaterial ref={reg} color="#7d838b" roughness={0.35} metalness={0.85} transparent />
            </mesh>
          ))}
          {/* spandrel band above the slab */}
          <mesh position={[0, TOWER.slabThickness + 0.09, 0]} raycast={NOOP_RAYCAST}>
            <boxGeometry args={[TOWER.width + 0.04, 0.17, TOWER.depth + 0.04]} />
            <meshStandardMaterial ref={reg} color="#2e3640" roughness={0.25} metalness={0.6} transparent />
          </mesh>
          {/* lit windows glowing through the facade — hidden in day mode so
              the clear-glass curtain wall shows as specced */}
          {showWindows && windowsMat && (
            <>
              <mesh position={[0, TOWER.slabThickness + bodyH / 2, TOWER.depth / 2 - 0.06]} material={windowsMat} raycast={NOOP_RAYCAST}>
                <planeGeometry args={[TOWER.width - 0.5, bodyH - 0.12]} />
              </mesh>
              <mesh
                position={[0, TOWER.slabThickness + bodyH / 2, -TOWER.depth / 2 + 0.06]}
                rotation={[0, Math.PI, 0]}
                material={windowsMat}
                raycast={NOOP_RAYCAST}
              >
                <planeGeometry args={[TOWER.width - 0.5, bodyH - 0.12]} />
              </mesh>
              <mesh
                position={[TOWER.width / 2 - 0.06, TOWER.slabThickness + bodyH / 2, 0]}
                rotation={[0, Math.PI / 2, 0]}
                material={windowsMat}
                raycast={NOOP_RAYCAST}
              >
                <planeGeometry args={[TOWER.depth - 0.5, bodyH - 0.12]} />
              </mesh>
              <mesh
                position={[-TOWER.width / 2 + 0.06, TOWER.slabThickness + bodyH / 2, 0]}
                rotation={[0, -Math.PI / 2, 0]}
                material={windowsMat}
                raycast={NOOP_RAYCAST}
              >
                <planeGeometry args={[TOWER.depth - 0.5, bodyH - 0.12]} />
              </mesh>
            </>
          )}
          {/* columns */}
          {columns.map(([x, z], i) => (
            <mesh key={i} position={[x, TOWER.slabThickness + bodyH / 2, z]} raycast={NOOP_RAYCAST}>
              <boxGeometry args={[0.28, bodyH, 0.28]} />
              <meshStandardMaterial ref={reg} color="#d9d4c8" roughness={0.55} transparent />
            </mesh>
          ))}
          {/* mid slab band for the two-storey penthouse shell */}
          {floor.penthouse && (
            <mesh position={[0, TOWER.floorHeight, 0]} raycast={NOOP_RAYCAST}>
              <boxGeometry args={[TOWER.width + 0.2, 0.12, TOWER.depth + 0.2]} />
              <meshStandardMaterial ref={reg} color="#e3ddd0" roughness={0.55} transparent />
            </mesh>
          )}
          {/* balconies on the front face */}
          {!floor.penthouse &&
            [-4.2, 4.2].map((x) => (
              <Balcony
                key={x}
                x={x}
                z={TOWER.depth / 2}
                seed={floor.number * 31 + (x > 0 ? 7 : 0)}
                reg={reg}
                regGlass={regGlass}
                lit={lit}
                glow={theme.windowGlow}
              />
            ))}
          {/* AC condensers tucked against the side faces */}
          {acUnits.map((u, i) => (
            <group key={i} position={[u.x, TOWER.slabThickness + 0.28, u.z]}>
              <mesh raycast={NOOP_RAYCAST} castShadow>
                <boxGeometry args={[0.16, 0.3, 0.42]} />
                <meshStandardMaterial ref={reg} color="#c9c9c4" roughness={0.6} metalness={0.3} transparent />
              </mesh>
              <mesh position={[u.x > 0 ? 0.085 : -0.085, 0, 0]} raycast={NOOP_RAYCAST}>
                <boxGeometry args={[0.012, 0.24, 0.36]} />
                <meshStandardMaterial ref={reg} color="#8e8e89" roughness={0.5} metalness={0.4} transparent />
              </mesh>
            </group>
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

/** Rooftop helipad with rim lights and a parked helicopter idling its rotor. */
function Helipad({ p }: { p: [number, number, number] }) {
  const { lit } = useSceneMode();
  const rotor = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (rotor.current) rotor.current.rotation.y += delta * 2.2;
    if (tail.current) tail.current.rotation.x += delta * 4;
  });
  return (
    <group position={p}>
      {/* pad */}
      <mesh position={[0, 0.09, 0]} castShadow>
        <cylinderGeometry args={[2.5, 2.6, 0.18, 28]} />
        <meshStandardMaterial color="#2e3338" roughness={0.9} transparent opacity={1} />
      </mesh>
      <mesh position={[0, 0.185, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.05, 2.25, 28]} />
        <meshStandardMaterial color="#f4f1e8" roughness={0.8} transparent opacity={1} />
      </mesh>
      {/* H marking */}
      {([[-0.5, 0.18, 1.5], [0.5, 0.18, 1.5]] as [number, number, number][]).map(([x, h, l], i) => (
        <mesh key={i} position={[x, 0.19, 0]}>
          <boxGeometry args={[0.2, 0.012, l]} />
          <meshStandardMaterial color="#f4f1e8" roughness={0.8} transparent opacity={1} />
        </mesh>
      ))}
      <mesh position={[0, 0.19, 0]}>
        <boxGeometry args={[0.8, 0.012, 0.2]} />
        <meshStandardMaterial color="#f4f1e8" roughness={0.8} transparent opacity={1} />
      </mesh>
      {/* rim lights */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 2.35, 0.22, Math.sin(a) * 2.35]}>
            <sphereGeometry args={[0.05, 8, 6]} />
            <meshStandardMaterial
              color={i % 2 ? "#37e668" : "#ffd24d"}
              emissive={i % 2 ? "#37e668" : "#ffd24d"}
              emissiveIntensity={lit ? 2 : 0.25}
              transparent
              opacity={1}
            />
          </mesh>
        );
      })}
      {/* helicopter idling on the pad */}
      <group position={[0.1, 0.18, 0]} rotation={[0, -0.5, 0]}>
        {/* skids */}
        {[-0.32, 0.32].map((z) => (
          <mesh key={z} position={[0, 0.08, z]}>
            <boxGeometry args={[1.5, 0.05, 0.06]} />
            <meshStandardMaterial color="#46535f" roughness={0.5} metalness={0.4} transparent opacity={1} />
          </mesh>
        ))}
        {/* fuselage + canopy + tail boom + fin */}
        <mesh position={[0.1, 0.45, 0]} castShadow>
          <boxGeometry args={[1.5, 0.55, 0.66]} />
          <meshStandardMaterial color="#1d2733" roughness={0.3} metalness={0.6} transparent opacity={1} />
        </mesh>
        <mesh position={[0.78, 0.48, 0]}>
          <boxGeometry args={[0.3, 0.4, 0.6]} />
          <meshStandardMaterial color="#8fd0e8" roughness={0.08} metalness={0.3} transparent opacity={1} />
        </mesh>
        <mesh position={[0.1, 0.32, 0]}>
          <boxGeometry args={[1.52, 0.08, 0.68]} />
          <meshStandardMaterial color="#7c1f3e" roughness={0.35} transparent opacity={1} />
        </mesh>
        <mesh position={[-1.05, 0.55, 0]}>
          <boxGeometry args={[1.1, 0.14, 0.14]} />
          <meshStandardMaterial color="#1d2733" roughness={0.3} metalness={0.6} transparent opacity={1} />
        </mesh>
        <mesh position={[-1.55, 0.75, 0]}>
          <boxGeometry args={[0.24, 0.4, 0.06]} />
          <meshStandardMaterial color="#7c1f3e" roughness={0.35} transparent opacity={1} />
        </mesh>
        {/* main rotor (idling) + tail rotor */}
        <group ref={rotor} position={[0.1, 0.78, 0]}>
          <mesh>
            <cylinderGeometry args={[0.06, 0.06, 0.1, 10]} />
            <meshStandardMaterial color="#46535f" roughness={0.5} transparent opacity={1} />
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[2.6, 0.02, 0.12]} />
            <meshStandardMaterial color="#23282e" roughness={0.6} transparent opacity={1} />
          </mesh>
          <mesh position={[0, 0.04, 0]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[2.6, 0.02, 0.12]} />
            <meshStandardMaterial color="#23282e" roughness={0.6} transparent opacity={1} />
          </mesh>
        </group>
        <mesh ref={tail} position={[-1.55, 0.55, 0.05]}>
          <boxGeometry args={[0.5, 0.06, 0.02]} />
          <meshStandardMaterial color="#23282e" roughness={0.6} transparent opacity={1} />
        </mesh>
        {/* anti-collision blink shares the pad lights' rhythm via lit */}
        <mesh position={[0.1, 0.86, 0]}>
          <sphereGeometry args={[0.04, 8, 6]} />
          <meshStandardMaterial color="#ff2d2d" emissive="#ff2d2d" emissiveIntensity={lit ? 1.6 : 0.3} transparent opacity={1} />
        </mesh>
      </group>
    </group>
  );
}

function Roof({ baseFloorNumber, sliced }: { baseFloorNumber: number; sliced: boolean }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const parapetMat = useRef<THREE.MeshStandardMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const beacon = useRef<THREE.MeshStandardMaterial>(null);
  const baseY = floorY(baseFloorNumber);
  const { lit } = useSceneMode();

  useFrame(({ clock }, delta) => {
    const target = sliced ? 0 : 1;
    if (mat.current) mat.current.opacity = damp(mat.current.opacity, target, 6, delta);
    if (parapetMat.current) parapetMat.current.opacity = mat.current?.opacity ?? 1;
    if (groupRef.current) {
      groupRef.current.position.y = damp(groupRef.current.position.y, baseY + (sliced ? 1.4 : 0), 6, delta);
      groupRef.current.visible = (mat.current?.opacity ?? 1) > 0.03;
    }
    // slow aviation-beacon pulse (steady and faint in daylight)
    if (beacon.current) {
      beacon.current.emissiveIntensity = lit ? 1 + Math.max(0, Math.sin(clock.elapsedTime * 2.4)) * 3 : 0.35;
    }
  });

  return (
    <group ref={groupRef} position={[0, baseY, 0]}>
      <mesh position={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[TOWER.width + 0.5, 0.24, TOWER.depth + 0.5]} />
        <meshStandardMaterial ref={mat} color="#ddd8cb" roughness={0.8} transparent />
      </mesh>
      {/* parapet wall around the roof edge */}
      {([
        [0, TOWER.depth / 2 + 0.2, TOWER.width + 0.5, 0.12] as const,
        [0, -TOWER.depth / 2 - 0.2, TOWER.width + 0.5, 0.12] as const,
      ]).map(([x, z, w], i) => (
        <mesh key={i} position={[x, 0.38, z]} castShadow>
          <boxGeometry args={[w, 0.28, 0.12]} />
          <meshStandardMaterial ref={i === 0 ? parapetMat : undefined} color="#d3cec1" roughness={0.6} transparent opacity={1} />
        </mesh>
      ))}
      {[1, -1].map((s) => (
        <mesh key={s} position={[s * (TOWER.width / 2 + 0.2), 0.38, 0]} castShadow>
          <boxGeometry args={[0.12, 0.28, TOWER.depth + 0.5]} />
          <meshStandardMaterial color="#d3cec1" roughness={0.6} transparent opacity={1} />
        </mesh>
      ))}
      <mesh position={[-5, 0.65, -2.5]}>
        <boxGeometry args={[2.4, 0.9, 2]} />
        <meshStandardMaterial color="#c9c3b5" roughness={0.7} transparent opacity={1} />
      </mesh>
      <mesh position={[4.5, 0.5, 2]}>
        <cylinderGeometry args={[0.8, 0.8, 0.7, 20]} />
        <meshStandardMaterial color="#b3ada0" roughness={0.55} metalness={0.35} transparent opacity={1} />
      </mesh>
      {/* residents' helipad */}
      <Helipad p={[0.3, 0.24, -1.3]} />
      {/* glowing rooftop sign facing the entrance */}
      <group position={[0, 0.85, 4.6]}>
        {[-3.1, 3.1].map((x) => (
          <mesh key={x} position={[x, -0.3, -0.1]}>
            <boxGeometry args={[0.08, 0.85, 0.08]} />
            <meshStandardMaterial color="#46535f" roughness={0.6} metalness={0.4} transparent opacity={1} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[6.6, 0.7, 0.14]} />
          <meshStandardMaterial color="#16121f" roughness={0.7} transparent opacity={1} />
        </mesh>
        <mesh position={[0, 0, 0.08]}>
          <boxGeometry args={[6.3, 0.44, 0.02]} />
          <meshStandardMaterial color="#ffb454" emissive="#ffb454" emissiveIntensity={lit ? 1.6 : 0.15} transparent opacity={1} />
        </mesh>
        {/* Html ignores the fade animation — drop it as soon as the roof slices away */}
        {!sliced && (
          <Html position={[0, 0, 0.12]} center distanceFactor={18} zIndexRange={[18, 0]}>
            <p className="pointer-events-none select-none whitespace-nowrap text-[13px] font-black tracking-[0.3em] text-[#3a1d08]">
              MAHARACK
            </p>
          </Html>
        )}
      </group>
      {/* blinking aviation beacon */}
      <mesh position={[-5, 1.35, -2.5]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial ref={beacon} color="#ff2d2d" emissive="#ff2d2d" emissiveIntensity={2} transparent opacity={1} />
      </mesh>
    </group>
  );
}

/** Granite-clad podium with entrance steps, canopy and a warm glass lobby. */
function GranitePodium() {
  const maps = usePBRMaps("granite_tile", [7, 1], { normalScale: 0.7 });
  return (
    <mesh position={[0, TOWER.podiumHeight / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[TOWER.width + 2, TOWER.podiumHeight, TOWER.depth + 2]} />
      <meshStandardMaterial {...maps} color="#cfc9bd" />
    </mesh>
  );
}

function Podium() {
  const { lit, theme } = useSceneMode();
  const fz = (TOWER.depth + 2) / 2; // front face of the podium
  return (
    <group>
      <Suspense
        fallback={
          <mesh position={[0, TOWER.podiumHeight / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[TOWER.width + 2, TOWER.podiumHeight, TOWER.depth + 2]} />
            <meshStandardMaterial color="#b9b2a2" roughness={0.85} />
          </mesh>
        }
      >
        <GranitePodium />
      </Suspense>
      {/* warm glass lobby front */}
      <mesh position={[0, 0.34, fz + 0.012]}>
        <planeGeometry args={[5.2, 0.58]} />
        <meshStandardMaterial
          color="#1a2430"
          emissive="#ffc684"
          emissiveIntensity={lit ? theme.windowGlow * 0.7 : 0.12}
          roughness={0.1}
          metalness={0.4}
        />
      </mesh>
      {/* door frame + mullions */}
      {[-2.6, -0.9, 0.9, 2.6].map((x) => (
        <mesh key={x} position={[x, 0.34, fz + 0.02]}>
          <boxGeometry args={[0.06, 0.58, 0.04]} />
          <meshStandardMaterial color="#3c424a" roughness={0.3} metalness={0.85} />
        </mesh>
      ))}
      {/* entrance canopy on slim columns */}
      <mesh position={[0, 0.78, fz + 0.85]} castShadow>
        <boxGeometry args={[5.6, 0.09, 1.9]} />
        <meshStandardMaterial color="#e8e3d8" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.815, fz + 0.85]}>
        <boxGeometry args={[5.66, 0.045, 1.96]} />
        <meshStandardMaterial color="#454a52" roughness={0.3} metalness={0.8} />
      </mesh>
      {[-2.5, 2.5].map((x) => (
        <mesh key={x} position={[x, 0.39, fz + 1.6]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.78, 10]} />
          <meshStandardMaterial color="#3c424a" roughness={0.3} metalness={0.85} />
        </mesh>
      ))}
      {/* canopy downlights */}
      {lit &&
        [-1.8, 0, 1.8].map((x) => (
          <mesh key={x} position={[x, 0.732, fz + 0.85]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.06, 10]} />
            <meshStandardMaterial color="#fff" emissive="#ffd9a0" emissiveIntensity={2.4} />
          </mesh>
        ))}
      {/* entrance steps */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.105 - i * 0.07, fz + 0.3 + i * 0.26]} castShadow receiveShadow>
          <boxGeometry args={[6 - i * 0.4, 0.07, 0.5]} />
          <meshStandardMaterial color="#cfc9bd" roughness={0.5} />
        </mesh>
      ))}
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
      <Site />
      <Podium />
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
