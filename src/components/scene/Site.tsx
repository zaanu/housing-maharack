"use client";

// Gated-community campus around the tower: compound wall, main gate with
// signage and guard cabin, tree-lined driveway, visitor parking, flowering
// shrubs, a resort-style swimming pool, a residents' gym and a children's
// playground — the "story" around the home. Geometry is procedural; ground
// and water surfaces use bundled PBR texture maps.

import { Suspense, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import Car from "./Vehicles";
import { Halo, LightCone } from "./glow";
import { Walker, Sitter, Lounging, Swimmer, Person } from "./People";
import { causticsTexture, usePBRMaps, useWaterNormals } from "./materials";
import { useSceneMode } from "./mode";

const KERB = "#cfccc0";
const WALLC = "#c3c9ce";
const PILLAR = "#9aa3ab";
const STEELD = "#46535f";
const TRUNK = "#5d4a35";
const PALM_TRUNK = "#7d654a";
const PLAY_RED = "#bc4a40";
const PLAY_YELLOW = "#d9af34";
const PLAY_BLUE = "#3a6a99";
const PAD_BLUE = "#41617e";
const PAD_SAND = "#d3b181";
const GLOW = "#ffd9a0";
const DECK = "#d9cdb4";
const CANOPY = ["#c96a52", "#d9af34", "#5b8fa8"];
const LEAFS = ["#466032", "#52713c", "#3d5a2e", "#5b7a42", "#4a6837"];

type V3 = [number, number, number];

/** Deterministic pseudo-random in [0,1) from a seed and index. */
const rnd = (seed: number, i: number) => {
  const v = Math.sin(seed * 37.13 + i * 13.7) * 43758.5453;
  return v - Math.floor(v);
};

function Bx({
  p,
  s,
  c,
  ry = 0,
  rz = 0,
  rx = 0,
  shadow = false,
  opacity = 1,
  glow = 0,
  rough = 0.85,
  metal = 0,
}: {
  p: V3;
  s: V3;
  c: string;
  ry?: number;
  rz?: number;
  rx?: number;
  shadow?: boolean;
  opacity?: number;
  glow?: number;
  rough?: number;
  metal?: number;
}) {
  return (
    <mesh position={p} rotation={[rx, ry, rz]} castShadow={shadow}>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={c}
        roughness={rough}
        metalness={metal}
        transparent={opacity < 1}
        opacity={opacity}
        emissive={glow > 0 ? c : "#000000"}
        emissiveIntensity={glow}
      />
    </mesh>
  );
}

/* ---------- textured ground planes (each suspends independently) ---------- */

function Lawn() {
  // ShapeGeometry UVs are world-unit, so repeat is per scene unit here
  const maps = usePBRMaps("leafy_grass", [0.28, 0.28], { arm: false, normalScale: 0.8 });
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 55, 0, Math.PI * 2, false);
    // hole under the sunken pool basin (plane y maps to world -z)
    const hole = new THREE.Path();
    const px = -13;
    const py = -10;
    hole.moveTo(px - POOL_W / 2, py - POOL_D / 2);
    hole.lineTo(px + POOL_W / 2, py - POOL_D / 2);
    hole.lineTo(px + POOL_W / 2, py + POOL_D / 2);
    hole.lineTo(px - POOL_W / 2, py + POOL_D / 2);
    hole.closePath();
    shape.holes.push(hole);
    return new THREE.ShapeGeometry(shape, 48);
  }, []);
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial {...maps} color="#b9d3a4" roughness={1} />
    </mesh>
  );
}

function Plaza() {
  const maps = usePBRMaps("granite_tile", [12, 12], { normalScale: 0.8 });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
      <circleGeometry args={[14, 48]} />
      <meshStandardMaterial {...maps} color="#eee9dd" />
    </mesh>
  );
}

/** Paved footpath linking the plaza to an amenity. */
function Path({ p, w, l, ry }: { p: V3; w: number; l: number; ry: number }) {
  const maps = usePBRMaps("granite_tile", [1.6, 3.2], { normalScale: 0.8 });
  return (
    <mesh rotation={[-Math.PI / 2, 0, ry]} position={p} receiveShadow>
      <planeGeometry args={[w, l]} />
      <meshStandardMaterial {...maps} color="#eee9dd" />
    </mesh>
  );
}

function AsphaltPatch({ p, s, lines }: { p: V3; s: [number, number]; lines?: boolean }) {
  const maps = usePBRMaps("clean_asphalt", [s[0] / 4, s[1] / 4], { normalScale: 0.7 });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={p} receiveShadow>
      <planeGeometry args={s} />
      <meshStandardMaterial {...maps} color={lines ? "#9a9da1" : "#84878c"} />
    </mesh>
  );
}

function Grounds() {
  return (
    <Suspense
      fallback={
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[55, 64]} />
            <meshStandardMaterial color="#83a85e" roughness={1} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
            <circleGeometry args={[14, 48]} />
            <meshStandardMaterial color="#d3c5ac" roughness={1} />
          </mesh>
        </>
      }
    >
      <Lawn />
      <Plaza />
      {/* driveway from the gate */}
      <AsphaltPatch p={[0, 0.018, 20]} s={[3.4, 12.5]} />
      <AsphaltPatch p={[0, 0.018, 29.4]} s={[3.4, 6.8]} />
      {/* visitor parking pad */}
      <AsphaltPatch p={[-6.2, 0.016, 21.5]} s={[4.4, 6.5]} lines />
      {/* footpaths to the amenities */}
      <Path p={[-11.4, 0.014, 7.4]} w={1.3} l={5.4} ry={0.65} />
      <Path p={[10.9, 0.014, 10.9]} w={1.3} l={6.2} ry={-0.78} />
      <Path p={[-12.4, 0.014, -2.6]} w={1.2} l={4.6} ry={1.25} />
    </Suspense>
  );
}

/* ------------------------------- planting -------------------------------- */

/** Organic canopy blob: displaced icosahedron so foliage isn't a perfect sphere. */
function canopyGeo(seed: number, r: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(r, 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n =
      Math.sin(v.x * 5.1 + seed) * Math.cos(v.y * 4.3 + seed * 2.1) +
      Math.sin(v.z * 6.3 + seed * 3.7) * 0.6;
    v.multiplyScalar(1 + 0.13 * n);
    pos.setXYZ(i, v.x, v.y * 0.82, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function CanopyPuff({ p, r, seed, color }: { p: V3; r: number; seed: number; color: string }) {
  const geo = useMemo(() => canopyGeo(seed, r), [seed, r]);
  return (
    <mesh position={p} geometry={geo} castShadow>
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

/** Broadleaf tree: tapered, slightly leaning trunk + organic canopy lobes. */
function Tree({ p, scale = 1, seed = 1 }: { p: V3; scale?: number; seed?: number }) {
  const h = (1.15 + rnd(seed, 0) * 0.5) * scale;
  const lean = (rnd(seed, 1) - 0.5) * 0.18;
  const puffs = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * Math.PI * 2 + rnd(seed, i + 2) * 1.2;
    return {
      x: Math.cos(a) * (0.22 + rnd(seed, i + 20) * 0.2) * scale,
      y: h + (rnd(seed, i + 30) - 0.15) * 0.45 * scale,
      z: Math.sin(a) * (0.22 + rnd(seed, i + 40) * 0.2) * scale,
      r: (0.3 + rnd(seed, i + 10) * 0.22) * scale,
      c: LEAFS[Math.floor(rnd(seed, i + 50) * LEAFS.length)],
    };
  });
  return (
    <group position={p} rotation={[0, rnd(seed, 60) * Math.PI, lean]}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.05 * scale, 0.12 * scale, h, 10]} />
        <meshStandardMaterial color={TRUNK} roughness={1} />
      </mesh>
      <mesh position={[0.12 * scale, h * 0.7, 0]} rotation={[0, 0, -0.7]} castShadow>
        <cylinderGeometry args={[0.025 * scale, 0.045 * scale, 0.5 * scale, 8]} />
        <meshStandardMaterial color={TRUNK} roughness={1} />
      </mesh>
      <CanopyPuff p={[0, h + 0.2 * scale, 0]} r={0.46 * scale} seed={seed * 3 + 1} color={LEAFS[1]} />
      {puffs.map((q, i) => (
        <CanopyPuff key={i} p={[q.x, q.y, q.z]} r={q.r} seed={seed * 5 + i} color={q.c} />
      ))}
    </group>
  );
}

/** Palm with a curved segmented trunk and drooping multi-segment fronds. */
function Palm({ p, h = 2.0, seed = 1 }: { p: V3; h?: number; seed?: number }) {
  const segs = 6;
  const bend = 0.07 + rnd(seed, 0) * 0.05;
  const trunk = Array.from({ length: segs }, (_, i) => ({
    x: bend * i * i * 0.16,
    y: (i + 0.5) * (h / segs),
    rz: -bend * i * 0.9,
  }));
  const topX = bend * segs * segs * 0.155;
  const fronds = Array.from({ length: 9 }, (_, i) => (i / 9) * Math.PI * 2 + rnd(seed, i) * 0.5);
  const crown = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    // breeze: the crown sways gently, each palm out of phase
    if (crown.current) {
      const t = clock.elapsedTime;
      crown.current.rotation.z = Math.sin(t * 0.9 + seed * 2.1) * 0.05;
      crown.current.rotation.x = Math.cos(t * 0.7 + seed * 1.3) * 0.04;
    }
  });
  return (
    <group position={p} rotation={[0, rnd(seed, 9) * Math.PI * 2, 0]}>
      {trunk.map((t, i) => (
        <mesh key={i} position={[t.x, t.y, 0]} rotation={[0, 0, t.rz]} castShadow>
          <cylinderGeometry args={[0.055 - i * 0.004, 0.075 - i * 0.004, h / segs + 0.04, 10]} />
          <meshStandardMaterial color={PALM_TRUNK} roughness={1} />
        </mesh>
      ))}
      <group ref={crown} position={[topX, h + 0.04, 0]}>
        {fronds.map((a, i) => (
          <group key={i} rotation={[0, -a, 0]}>
            <Bx p={[0.3, 0.05, 0]} s={[0.55, 0.025, 0.15]} c={LEAFS[i % 2 ? 2 : 4]} rz={-0.25} shadow rough={1} />
            <Bx p={[0.72, 0.0, 0]} s={[0.45, 0.02, 0.11]} c={LEAFS[i % 2 ? 3 : 2]} rz={-0.65} rough={1} />
            <Bx p={[1.0, -0.16, 0]} s={[0.3, 0.016, 0.07]} c={LEAFS[i % 2 ? 2 : 3]} rz={-1.0} rough={1} />
          </group>
        ))}
        <mesh>
          <sphereGeometry args={[0.09, 10, 8]} />
          <meshStandardMaterial color={LEAFS[0]} roughness={1} />
        </mesh>
        {[0.12, -0.1].map((x) => (
          <mesh key={x} position={[x, -0.08, 0.06]} castShadow>
            <sphereGeometry args={[0.05, 8, 6]} />
            <meshStandardMaterial color="#6e5330" roughness={1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Shrub({ p, flower = "#b55ba6", seed = 1 }: { p: V3; flower?: string; seed?: number }) {
  const blooms = Array.from({ length: 5 }, (_, i) => ({
    x: (rnd(seed, i) - 0.5) * 0.36,
    y: 0.16 + rnd(seed, i + 5) * 0.18,
    z: (rnd(seed, i + 9) - 0.5) * 0.3,
    r: 0.045 + rnd(seed, i + 13) * 0.05,
  }));
  return (
    <group position={p}>
      <CanopyPuff p={[0, 0.16, 0]} r={0.23} seed={seed * 7} color={LEAFS[0]} />
      <CanopyPuff p={[0.14, 0.2, 0.08]} r={0.15} seed={seed * 7 + 3} color={LEAFS[2]} />
      {blooms.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, b.z]}>
          <sphereGeometry args={[b.r, 8, 6]} />
          <meshStandardMaterial color={flower} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Lamp({ p }: { p: V3 }) {
  const { lit } = useSceneMode();
  return (
    <group position={p}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.034, 1.1, 10]} />
        <meshStandardMaterial color="#2e3338" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* angled arm + LED head */}
      <mesh position={[0.09, 1.12, 0]} rotation={[0, 0, -0.5]}>
        <cylinderGeometry args={[0.016, 0.016, 0.24, 8]} />
        <meshStandardMaterial color="#2e3338" roughness={0.4} metalness={0.7} />
      </mesh>
      <mesh position={[0.18, 1.16, 0]}>
        <boxGeometry args={[0.22, 0.04, 0.1]} />
        <meshStandardMaterial color="#2e3338" roughness={0.4} metalness={0.7} />
      </mesh>
      <mesh position={[0.18, 1.138, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.18, 0.07]} />
        <meshStandardMaterial color={GLOW} emissive={GLOW} emissiveIntensity={lit ? 2.6 : 0.1} side={THREE.DoubleSide} />
      </mesh>
      {lit && (
        <>
          <Halo p={[0.18, 1.12, 0]} size={0.8} color="#ffce8a" opacity={0.4} />
          <LightCone p={[0.18, 1.12, 0]} h={1.2} r={0.62} opacity={0.06} />
        </>
      )}
    </group>
  );
}

function Bench({ p, ry = 0 }: { p: V3; ry?: number }) {
  return (
    <group position={p} rotation={[0, ry, 0]}>
      {[-0.09, 0, 0.09].map((dz) => (
        <Bx key={dz} p={[0, 0.18, dz]} s={[0.8, 0.035, 0.075]} c="#9a7b52" rough={0.6} />
      ))}
      {[0.31, 0.4].map((y, i) => (
        <Bx key={i} p={[0, y, -0.14]} s={[0.8, 0.07, 0.035]} c="#9a7b52" rough={0.6} rx={-0.2} />
      ))}
      <Bx p={[-0.32, 0.09, 0]} s={[0.05, 0.18, 0.26]} c="#33383d" rough={0.35} metal={0.8} />
      <Bx p={[0.32, 0.09, 0]} s={[0.05, 0.18, 0.26]} c="#33383d" rough={0.35} metal={0.8} />
    </group>
  );
}

/* ------------------------------ resort pool ------------------------------ */

const POOL_W = 9.4; // long axis (x)
const POOL_D = 4.1;
const POOL_DEPTH = 0.5;

/** Tiled basin: floor + four walls + drifting caustic light webs. The diff
 * map of the tile asset is too weathered for a pool, so only the normal map
 * is used over a clean chlorine-blue base. */
function PoolBasin() {
  const maps = { ...usePBRMaps("blue_floor_tiles_01", [8, 3.6], { diff: false, arm: false, normalScale: 0.7 }), roughness: 0.3 };
  const wall = { ...usePBRMaps("blue_floor_tiles_01", [8, 0.5], { diff: false, arm: false, normalScale: 0.7 }), roughness: 0.3 };
  const { lit } = useSceneMode();
  const c1 = useRef<THREE.Mesh>(null);
  const c2 = useRef<THREE.Mesh>(null);
  const caustics = useMemo(() => {
    const t = causticsTexture();
    const a = t.clone();
    a.repeat.set(5, 2.4);
    a.needsUpdate = true;
    const b = t.clone();
    b.repeat.set(4.2, 2);
    b.needsUpdate = true;
    return [a, b];
  }, []);
  useFrame((_, delta) => {
    caustics[0].offset.x += delta * 0.022;
    caustics[0].offset.y += delta * 0.013;
    caustics[1].offset.x -= delta * 0.017;
    caustics[1].offset.y -= delta * 0.01;
  });
  const y0 = -POOL_DEPTH;
  return (
    <group>
      <mesh position={[0, y0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[POOL_W, POOL_D]} />
        <meshStandardMaterial {...maps} color="#bfe2ec" />
      </mesh>
      {/* walls */}
      <mesh position={[0, y0 / 2, -POOL_D / 2]} rotation={[0, 0, 0]}>
        <planeGeometry args={[POOL_W, POOL_DEPTH]} />
        <meshStandardMaterial {...wall} color="#a8d4e2" />
      </mesh>
      <mesh position={[0, y0 / 2, POOL_D / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[POOL_W, POOL_DEPTH]} />
        <meshStandardMaterial {...wall} color="#a8d4e2" />
      </mesh>
      <mesh position={[-POOL_W / 2, y0 / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[POOL_D, POOL_DEPTH]} />
        <meshStandardMaterial {...wall} color="#a8d4e2" />
      </mesh>
      <mesh position={[POOL_W / 2, y0 / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[POOL_D, POOL_DEPTH]} />
        <meshStandardMaterial {...wall} color="#a8d4e2" />
      </mesh>
      {/* caustic light webs dancing on the floor */}
      <mesh ref={c1} position={[0, y0 + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[POOL_W, POOL_D]} />
        <meshBasicMaterial
          map={caustics[0]}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={c2} position={[0, y0 + 0.024, 0]} rotation={[-Math.PI / 2, 0, 0.04]}>
        <planeGeometry args={[POOL_W, POOL_D]} />
        <meshBasicMaterial
          map={caustics[1]}
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* underwater lights on the long walls */}
      {lit &&
        [-3.2, 0, 3.2].flatMap((x) =>
          [-1, 1].map((s) => (
            <mesh key={`${x}${s}`} position={[x, y0 / 2 - 0.06, s * (POOL_D / 2 - 0.015)]} rotation={[0, s > 0 ? Math.PI : 0, 0]}>
              <circleGeometry args={[0.09, 14]} />
              <meshStandardMaterial color="#dffaff" emissive="#9fe8ff" emissiveIntensity={3.2} />
            </mesh>
          ))
        )}
      {/* submerged steps in the corner */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[POOL_W / 2 - 0.55, y0 + (POOL_DEPTH / 3) * (i + 0.5), POOL_D / 2 - 0.45 - i * 0.3]}>
          <boxGeometry args={[1.1, POOL_DEPTH / 3 + (POOL_DEPTH / 3) * i, 0.3]} />
          <meshStandardMaterial color="#cfe9f0" roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/** Transparent rippling water surface with sun glints and sky reflections.
 * Suspends while the normal map streams — must sit inside a boundary. */
function WaterSurface({ w, d }: { w: number; d: number }) {
  const norm = useWaterNormals([3.4, 1.6]);
  const { lit } = useSceneMode();
  useFrame((_, delta) => {
    norm.offset.x += delta * 0.02;
    norm.offset.y += delta * 0.012;
  });
  return (
    <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, d, 1, 1]} />
      <meshPhysicalMaterial
        color="#2a7d9e"
        normalMap={norm}
        normalScale={new THREE.Vector2(0.45, 0.45)}
        roughness={0.04}
        metalness={0}
        clearcoat={1}
        clearcoatRoughness={0.08}
        envMapIntensity={1.7}
        transparent
        opacity={0.52}
        depthWrite={false}
        emissive="#1f6e8c"
        emissiveIntensity={lit ? 0.22 : 0.03}
      />
    </mesh>
  );
}

/** Hardwood pool deck with the basin cut out; ShapeGeometry UVs are in
 * world units so plank scale stays uniform around the hole. */
function DeckPlanks() {
  const maps = usePBRMaps("brown_planks_09", [0.42, 0.42], { normalScale: 0.7 });
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-6, -3.4);
    shape.lineTo(6, -3.4);
    shape.lineTo(6, 3.4);
    shape.lineTo(-6, 3.4);
    shape.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-POOL_W / 2, -POOL_D / 2);
    hole.lineTo(POOL_W / 2, -POOL_D / 2);
    hole.lineTo(POOL_W / 2, POOL_D / 2);
    hole.lineTo(-POOL_W / 2, POOL_D / 2);
    hole.closePath();
    shape.holes.push(hole);
    return new THREE.ShapeGeometry(shape, 4);
  }, []);
  return (
    <group>
      <mesh geometry={geo} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial {...maps} color="#cbb68e" />
      </mesh>
      {/* deck skirting so the slab reads as a raised timber platform */}
      <Bx p={[0, 0.028, 3.4]} s={[12, 0.06, 0.04]} c="#9c8662" rough={0.8} />
      <Bx p={[0, 0.028, -3.4]} s={[12, 0.06, 0.04]} c="#9c8662" rough={0.8} />
      <Bx p={[6, 0.028, 0]} s={[0.04, 0.06, 6.8]} c="#9c8662" rough={0.8} />
      <Bx p={[-6, 0.028, 0]} s={[0.04, 0.06, 6.8]} c="#9c8662" rough={0.8} />
    </group>
  );
}

function Lounger({ p, ry = 0, c = "#cd7f54", towel }: { p: V3; ry?: number; c?: string; towel?: string }) {
  return (
    <group position={p} rotation={[0, ry, 0]}>
      {/* slatted base + raised back */}
      <Bx p={[0, 0.13, 0]} s={[0.72, 0.035, 0.27]} c="#e3dccb" rough={0.55} />
      <Bx p={[-0.29, 0.26, 0]} s={[0.31, 0.035, 0.27]} c="#e3dccb" rz={0.7} rough={0.55} />
      {/* cushion */}
      <Bx p={[0.04, 0.155, 0]} s={[0.56, 0.035, 0.23]} c={c} rough={0.95} />
      <Bx p={[-0.275, 0.272, 0]} s={[0.26, 0.035, 0.23]} c={c} rz={0.7} rough={0.95} />
      {towel && <Bx p={[0.1, 0.178, 0.02]} s={[0.3, 0.012, 0.19]} c={towel} rough={1} ry={0.06} />}
      {/* chrome frame legs */}
      {([[-0.25, 0.1], [0.25, 0.1], [-0.25, -0.1], [0.25, -0.1]] as [number, number][]).map(([x, z], i) => (
        <Bx key={i} p={[x, 0.055, z]} s={[0.035, 0.11, 0.035]} c="#b8bdc2" rough={0.25} metal={0.9} />
      ))}
    </group>
  );
}

function SideTable({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <mesh position={[0, 0.17, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.02, 14]} />
        <meshStandardMaterial color="#e3dccb" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.015, 0.02, 0.16, 8]} />
        <meshStandardMaterial color="#b8bdc2" roughness={0.25} metalness={0.9} />
      </mesh>
    </group>
  );
}

function Umbrella({ p, c = "#c96a52" }: { p: V3; c?: string }) {
  return (
    <group position={p}>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.14, 0.16, 0.07, 12]} />
        <meshStandardMaterial color="#8d8678" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.022, 1.15, 8]} />
        <meshStandardMaterial color="#d9d2c2" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.13, 0]} castShadow>
        <coneGeometry args={[0.66, 0.26, 12]} />
        <meshStandardMaterial color={c} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* rib tips */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.63, 1.005, Math.sin(a) * 0.63]}>
            <sphereGeometry args={[0.012, 6, 5]} />
            <meshStandardMaterial color="#d9d2c2" roughness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

function Pool({ p }: { p: V3 }) {
  return (
    <group position={p}>
      {/* hardwood resort deck */}
      <Suspense fallback={<Bx p={[0, 0.03, 0]} s={[12, 0.06, 6.8]} c={DECK} />}>
        <DeckPlanks />
        <PoolBasin />
        <WaterSurface w={POOL_W} d={POOL_D} />
      </Suspense>
      {/* wet sheen ring where the deck meets the water */}
      {([
        [0, -POOL_D / 2 - 0.32, POOL_W + 1.2, 0.5] as const,
        [0, POOL_D / 2 + 0.32, POOL_W + 1.2, 0.5] as const,
      ]).map(([x, z, w, dd], i) => (
        <mesh key={i} position={[x, 0.062, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w, dd]} />
          <meshStandardMaterial color="#3d3a32" transparent opacity={0.22} roughness={0.08} depthWrite={false} />
        </mesh>
      ))}
      {/* stone coping around the basin */}
      <Bx p={[0, 0.075, -POOL_D / 2 - 0.1]} s={[POOL_W + 0.44, 0.05, 0.22]} c="#ece7da" rough={0.4} />
      <Bx p={[0, 0.075, POOL_D / 2 + 0.1]} s={[POOL_W + 0.44, 0.05, 0.22]} c="#ece7da" rough={0.4} />
      <Bx p={[-POOL_W / 2 - 0.1, 0.075, 0]} s={[0.22, 0.05, POOL_D + 0.44]} c="#ece7da" rough={0.4} />
      <Bx p={[POOL_W / 2 + 0.1, 0.075, 0]} s={[0.22, 0.05, POOL_D + 0.44]} c="#ece7da" rough={0.4} />
      {/* drainage groove inside the coping */}
      <Bx p={[0, 0.064, -POOL_D / 2 - 0.24]} s={[POOL_W + 0.5, 0.012, 0.05]} c="#6e695e" rough={0.6} />
      <Bx p={[0, 0.064, POOL_D / 2 + 0.24]} s={[POOL_W + 0.5, 0.012, 0.05]} c="#6e695e" rough={0.6} />
      {/* chrome ladder */}
      <group position={[-POOL_W / 2 + 0.35, 0, -POOL_D / 2 + 0.6]}>
        {[-0.12, 0.12].map((z) => (
          <mesh key={z} position={[0, 0.22, z]}>
            <cylinderGeometry args={[0.014, 0.014, 0.62, 8]} />
            <meshStandardMaterial color="#d4d9dd" roughness={0.12} metalness={1} />
          </mesh>
        ))}
        {[0.08, 0.24, 0.4].map((y) => (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.24, 8]} />
            <meshStandardMaterial color="#d4d9dd" roughness={0.12} metalness={1} />
          </mesh>
        ))}
      </group>
      {/* loungers + umbrellas along the far edge, a couple sunbathing */}
      <Lounger p={[-2.6, 0.06, 2.6]} ry={-1.5} c="#b97249" towel="#e8e2d2" />
      <Lounger p={[-1.5, 0.06, 2.6]} ry={-1.5} c="#85936f" />
      <Lounger p={[1.6, 0.06, 2.6]} ry={-1.5} c="#b97249" towel="#5b8fa8" />
      <Lounger p={[2.7, 0.06, 2.6]} ry={-1.5} c="#5b8fa8" />
      <SideTable p={[-2.05, 0.06, 2.6]} />
      <SideTable p={[2.15, 0.06, 2.6]} />
      <Lounging p={[-2.6, 0.17, 2.6]} ry={-1.5} suit="#a83a5e" />
      <Lounging p={[2.7, 0.17, 2.6]} ry={-1.5} suit="#2e6bb0" skin="#a8754f" />
      {/* swimmers */}
      <Swimmer p={[0, -0.015, -0.77]} range={3.6} />
      <Swimmer p={[0.4, -0.015, 0.77]} range={3.2} phase={2.4} />
      <Umbrella p={[-2.0, 0.06, 2.95]} c={CANOPY[0]} />
      <Umbrella p={[2.15, 0.06, 2.95]} c={CANOPY[1]} />
      {/* potted plants framing the deck corners */}
      {([[-5.5, 2.9], [5.5, 2.9], [-5.5, -2.9], [5.5, -2.9]] as [number, number][]).map(([x, z], i) => (
        <group key={i} position={[x, 0.06, z]}>
          <mesh position={[0, 0.14, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.13, 0.28, 12]} />
            <meshStandardMaterial color="#8d8678" roughness={0.8} />
          </mesh>
          <CanopyPuff p={[0, 0.4, 0]} r={0.2} seed={i * 11 + 5} color={LEAFS[(i + 1) % LEAFS.length]} />
        </group>
      ))}
      {/* raised kids' splash pool on the deck */}
      <group position={[4.9, 0.06, 2.7]}>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.98, 1.02, 0.12, 28]} />
          <meshStandardMaterial color="#cfe2e8" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.121, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.92, 24]} />
          <meshStandardMaterial color="#bfe2ec" roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.155, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.92, 24]} />
          <meshPhysicalMaterial
            color="#2a7d9e"
            roughness={0.05}
            clearcoat={1}
            envMapIntensity={1.6}
            transparent
            opacity={0.5}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0, 0.125, 0]}>
          <torusGeometry args={[0.97, 0.05, 8, 28]} />
          <meshStandardMaterial color="#ece7da" roughness={0.4} />
        </mesh>
      </group>
      <Shrub p={[-4.7, 0.06, 2.7]} flower="#b55ba6" seed={31} />
      <Shrub p={[4.7, 0.06, -2.7]} flower="#e7e0d3" seed={32} />
      <Palm p={[-5.9, 0, -2.6]} h={1.9} seed={51} />
      <Palm p={[6.0, 0, -2.4]} h={2.1} seed={52} />
    </group>
  );
}

/* --------------------------------- gym ----------------------------------- */

function Treadmill({ p, ry = 0 }: { p: V3; ry?: number }) {
  return (
    <group position={p} rotation={[0, ry, 0]}>
      <Bx p={[0, 0.06, 0]} s={[0.8, 0.06, 0.34]} c="#2b3138" rough={0.5} />
      <Bx p={[0, 0.085, 0]} s={[0.66, 0.015, 0.26]} c="#454f59" rough={0.7} />
      <Bx p={[0.36, 0.32, 0]} s={[0.05, 0.5, 0.3]} c={STEELD} rz={-0.15} rough={0.35} metal={0.7} />
      <Bx p={[0.42, 0.58, 0]} s={[0.06, 0.16, 0.34]} c="#1d2126" rz={-0.3} rough={0.45} />
    </group>
  );
}

function Gym({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <Bx p={[0, 0.05, 0]} s={[6.2, 0.1, 4.4]} c="#d4cfc1" rough={0.6} />
      {/* full-height glass walls with slim frames */}
      <Bx p={[0, 0.65, -2.1]} s={[6.0, 1.1, 0.05]} c="#bcdcea" opacity={0.22} rough={0.08} metal={0.1} />
      <Bx p={[-2.95, 0.65, 0]} s={[0.05, 1.1, 4.2]} c="#bcdcea" opacity={0.22} rough={0.08} metal={0.1} />
      <Bx p={[2.95, 0.65, 0]} s={[0.05, 1.1, 4.2]} c="#bcdcea" opacity={0.22} rough={0.08} metal={0.1} />
      <Bx p={[-2.0, 0.65, 2.1]} s={[2.0, 1.1, 0.05]} c="#bcdcea" opacity={0.22} rough={0.08} metal={0.1} />
      <Bx p={[2.0, 0.65, 2.1]} s={[2.0, 1.1, 0.05]} c="#bcdcea" opacity={0.22} rough={0.08} metal={0.1} />
      {/* glazing mullions */}
      {[-2.95, -1, 1, 2.95].map((x) => (
        <Bx key={x} p={[x, 0.65, -2.08]} s={[0.05, 1.1, 0.05]} c="#3c424a" rough={0.3} metal={0.85} />
      ))}
      {/* roof with dark fascia */}
      <Bx p={[0, 1.26, 0]} s={[6.6, 0.12, 4.8]} c="#ece8dd" shadow rough={0.5} />
      <Bx p={[0, 1.2, 2.42]} s={[6.6, 0.18, 0.06]} c="#454a52" rough={0.3} metal={0.8} />
      <Bx p={[0, 1.2, -2.42]} s={[6.6, 0.18, 0.06]} c="#454a52" rough={0.3} metal={0.8} />
      {/* equipment */}
      <Treadmill p={[-2.0, 0.1, -1.3]} ry={Math.PI / 2} />
      <Treadmill p={[-1.1, 0.1, -1.3]} ry={Math.PI / 2} />
      <Treadmill p={[-0.2, 0.1, -1.3]} ry={Math.PI / 2} />
      {/* bench press */}
      <group position={[1.6, 0.1, -1.2]}>
        <Bx p={[0, 0.16, 0]} s={[0.7, 0.06, 0.24]} c="#7c2f2f" rough={0.7} />
        <Bx p={[-0.28, 0.08, 0]} s={[0.06, 0.16, 0.2]} c={STEELD} rough={0.35} metal={0.7} />
        <Bx p={[0.28, 0.08, 0]} s={[0.06, 0.16, 0.2]} c={STEELD} rough={0.35} metal={0.7} />
        <Bx p={[0, 0.46, 0]} s={[0.025, 0.025, 0.9]} c="#aab3ba" rough={0.2} metal={0.9} />
        {[0.38, -0.38].map((z) => (
          <mesh key={z} position={[0, 0.46, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.04, 14]} />
            <meshStandardMaterial color="#2b3138" roughness={0.5} metalness={0.3} />
          </mesh>
        ))}
        <Bx p={[0, 0.3, 0.42]} s={[0.05, 0.34, 0.05]} c={STEELD} rough={0.35} metal={0.7} />
        <Bx p={[0, 0.3, -0.42]} s={[0.05, 0.34, 0.05]} c={STEELD} rough={0.35} metal={0.7} />
      </group>
      {/* dumbbell rack */}
      <group position={[2.4, 0.1, 0.9]}>
        <Bx p={[0, 0.2, 0]} s={[0.24, 0.4, 1.2]} c={STEELD} rough={0.35} metal={0.7} />
        {[-0.4, -0.13, 0.13, 0.4].map((z, i) => (
          <mesh key={i} position={[0, 0.44, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.045, 0.045, 0.2, 10]} />
            <meshStandardMaterial color={i % 2 ? "#a23636" : "#2e6bb0"} roughness={0.45} />
          </mesh>
        ))}
      </group>
      {/* yoga corner */}
      {[-0.5, -0.1].map((z, i) => (
        <mesh key={i} position={[-2.4, 0.14, z + 1.4]} rotation={[0, 0.4, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 10]} />
          <meshStandardMaterial color={i ? "#85936f" : "#b97249"} roughness={0.9} />
        </mesh>
      ))}
      {/* sign */}
      <Bx p={[0, 1.05, 2.14]} s={[1.6, 0.26, 0.04]} c="#1f2937" rough={0.6} />
      <Html position={[0, 1.05, 2.2]} center distanceFactor={12} zIndexRange={[24, 0]}>
        <p className="pointer-events-none select-none text-[9px] font-bold tracking-[0.2em] text-amber-100">
          FITNESS STUDIO
        </p>
      </Html>
    </group>
  );
}

/* ------------------------------ playground ------------------------------- */

/** Swing hanging from the bar at y≈0.92, swinging along z. */
function SwingSeat({ x, phase, withKid = false }: { x: number; phase: number; withKid?: boolean }) {
  const pivot = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (pivot.current) pivot.current.rotation.x = Math.sin(clock.elapsedTime * 1.7 + phase) * (withKid ? 0.55 : 0.3);
  });
  return (
    <group position={[x, 0.92, 0]} ref={pivot}>
      <Bx p={[-0.12, -0.36, 0]} s={[0.02, 0.72, 0.02]} c="#888" rough={0.4} metal={0.6} />
      <Bx p={[0.12, -0.36, 0]} s={[0.02, 0.72, 0.02]} c="#888" rough={0.4} metal={0.6} />
      <Bx p={[0, -0.72, 0]} s={[0.3, 0.04, 0.14]} c={PLAY_YELLOW} rough={0.7} />
      {withKid && (
        <group position={[0, -0.7, 0.02]} rotation={[0, Math.PI / 2, 0]} scale={0.62}>
          <Person shirt={PLAY_RED} pants="#2e6bb0" skin="#cfa180" />
        </group>
      )}
    </group>
  );
}

function SandPit() {
  const maps = usePBRMaps("playground_sand", [3, 3], { arm: false, normalScale: 0.8 });
  return (
    <mesh position={[1.4, 0.022, 1.0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1.6, 30]} />
      <meshStandardMaterial {...maps} color={PAD_SAND} roughness={1} />
    </mesh>
  );
}

function Playground() {
  return (
    <group position={[13, 0, 13]}>
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[4.4, 40]} />
        <meshStandardMaterial color={PAD_BLUE} roughness={1} />
      </mesh>
      <Suspense
        fallback={
          <mesh position={[1.4, 0.022, 1.0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.6, 30]} />
            <meshStandardMaterial color={PAD_SAND} roughness={1} />
          </mesh>
        }
      >
        <SandPit />
      </Suspense>
      <group position={[-1.6, 0, -1.3]}>
        {([[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]] as [number, number][]).map(([x, z], i) => (
          <Bx key={i} p={[x, 0.35, z]} s={[0.07, 0.7, 0.07]} c={PLAY_RED} rough={0.7} />
        ))}
        <Bx p={[0, 0.72, 0]} s={[0.85, 0.06, 0.85]} c={PLAY_YELLOW} rough={0.7} />
        <mesh position={[0, 1.05, 0]} castShadow>
          <coneGeometry args={[0.62, 0.5, 4]} />
          <meshStandardMaterial color={PLAY_BLUE} roughness={0.7} />
        </mesh>
        <Bx p={[0.95, 0.42, 0.2]} s={[1.5, 0.04, 0.4]} c={PLAY_YELLOW} rz={-0.5} shadow rough={0.7} />
        <Bx p={[1.62, 0.08, 0.2]} s={[0.5, 0.05, 0.44]} c={PLAY_YELLOW} rough={0.7} />
      </group>
      <group position={[1.6, 0, -1.6]}>
        <Bx p={[-1.0, 0.45, 0]} s={[0.06, 0.95, 0.06]} c={PLAY_RED} rz={0.2} rough={0.7} />
        <Bx p={[-0.8, 0.45, 0]} s={[0.06, 0.95, 0.06]} c={PLAY_RED} rz={-0.2} rough={0.7} />
        <Bx p={[1.0, 0.45, 0]} s={[0.06, 0.95, 0.06]} c={PLAY_RED} rz={0.2} rough={0.7} />
        <Bx p={[0.8, 0.45, 0]} s={[0.06, 0.95, 0.06]} c={PLAY_RED} rz={-0.2} rough={0.7} />
        <Bx p={[0, 0.92, 0]} s={[2.0, 0.06, 0.06]} c={PLAY_YELLOW} rough={0.7} />
        <SwingSeat x={-0.35} phase={0} withKid />
        <SwingSeat x={0.35} phase={1.9} />
      </group>
      <group position={[-0.6, 0, 1.7]}>
        <mesh position={[0, 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.55, 0.55, 0.06, 18]} />
          <meshStandardMaterial color={PLAY_YELLOW} roughness={0.7} />
        </mesh>
        <Bx p={[0, 0.3, 0]} s={[0.05, 0.35, 0.05]} c={PLAY_RED} rough={0.7} />
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((a) => (
          <Bx key={a} p={[Math.cos(a) * 0.3, 0.32, Math.sin(a) * 0.3]} s={[0.04, 0.3, 0.04]} c={PLAY_RED} ry={a} rough={0.7} />
        ))}
      </group>
      <group position={[2.3, 0, 1.2]}>
        <Bx p={[0, 0.16, 0]} s={[0.12, 0.32, 0.2]} c={PLAY_RED} rough={0.7} />
        <Bx p={[0, 0.32, 0]} s={[1.8, 0.05, 0.22]} c={PLAY_YELLOW} rz={0.18} shadow rough={0.7} />
      </group>
      <group position={[0.6, 0, 0.4]}>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.05, 0.07, 0.22, 8]} />
          <meshStandardMaterial color="#9aa3ab" roughness={0.4} metalness={0.6} />
        </mesh>
        <Bx p={[0, 0.3, 0]} s={[0.45, 0.12, 0.14]} c={PLAY_RED} rough={0.7} />
        <Bx p={[0.2, 0.42, 0]} s={[0.1, 0.16, 0.1]} c={PLAY_YELLOW} rough={0.7} />
      </group>
      {/* kids chasing each other around the court */}
      <Walker
        path={[[3.6, 0], [2.5, 2.5], [0, 3.6], [-2.5, 2.5], [-3.6, 0], [-2.5, -2.5], [0, -3.6], [2.5, -2.5]]}
        speed={1.25}
        shirt={PLAY_BLUE}
        pants={PLAY_RED}
        scale={0.62}
      />
      <Walker
        path={[[3.6, 0], [2.5, 2.5], [0, 3.6], [-2.5, 2.5], [-3.6, 0], [-2.5, -2.5], [0, -3.6], [2.5, -2.5]]}
        speed={1.25}
        offset={3}
        shirt={PLAY_YELLOW}
        pants="#2e6bb0"
        skin="#a8754f"
        scale={0.58}
      />
    </group>
  );
}

/** Invisible hover/label zone for site amenities. */
function SiteZone({
  p,
  s,
  name,
  detail,
  active,
  onHover,
}: {
  p: V3;
  s: V3;
  name: string;
  detail: string;
  active: boolean;
  onHover: (n: string | null) => void;
}) {
  return (
    <group position={p}>
      <mesh
        position={[0, s[1] / 2, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(name);
        }}
        onPointerOut={() => onHover(null)}
      >
        <boxGeometry args={s} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {active && (
        <Html position={[0, s[1] + 0.5, 0]} center distanceFactor={18} zIndexRange={[30, 0]}>
          <div className="pointer-events-none select-none whitespace-nowrap rounded-xl bg-slate-900/90 px-3 py-1.5 text-center shadow-lg backdrop-blur">
            <p className="text-[12px] font-semibold text-white">{name}</p>
            <p className="text-[10px] text-slate-300">{detail}</p>
          </div>
        </Html>
      )}
    </group>
  );
}

export default function Site() {
  const [hover, setHover] = useState<string | null>(null);
  const { lit } = useSceneMode();

  const wallPosts = [];
  for (let x = -24; x <= 24; x += 4) {
    wallPosts.push([x, 26], [x, -18]);
  }
  for (let z = -14; z <= 22; z += 4) {
    wallPosts.push([-24, z], [24, z]);
  }

  return (
    <group>
      {/* ---- lawn, plaza, driveway, parking, footpaths ---- */}
      <Grounds />
      {/* driveway centre dashes + kerbs + crossing */}
      {[15.2, 17, 18.8, 20.6, 22.4, 24.2].map((z) => (
        <Bx key={z} p={[0, 0.028, z]} s={[0.1, 0.006, 0.8]} c="#e0ded6" rough={0.7} />
      ))}
      <Bx p={[-1.86, 0.04, 20]} s={[0.16, 0.07, 12.5]} c={KERB} rough={0.6} />
      <Bx p={[1.86, 0.04, 20]} s={[0.16, 0.07, 12.5]} c={KERB} rough={0.6} />
      {[-1.2, -0.6, 0, 0.6, 1.2].map((x) => (
        <Bx key={x} p={[x, 0.026, 27.3]} s={[0.4, 0.005, 1.1]} c="#e4e2da" rough={0.7} />
      ))}
      {/* parking bay lines */}
      {[-1, 0, 1].map((i) => (
        <Bx key={i} p={[-6.2, 0.024, 21.5 + i * 2.1]} s={[4.2, 0.004, 0.06]} c="#e0ded6" rough={0.7} />
      ))}

      {/* ---- compound wall + posts ---- */}
      <Bx p={[-13.35, 0.28, 26]} s={[21.3, 0.56, 0.18]} c={WALLC} rough={0.75} />
      <Bx p={[13.35, 0.28, 26]} s={[21.3, 0.56, 0.18]} c={WALLC} rough={0.75} />
      <Bx p={[0, 0.28, -18]} s={[48, 0.56, 0.18]} c={WALLC} rough={0.75} />
      <Bx p={[-24, 0.28, 4]} s={[0.18, 0.56, 44]} c={WALLC} rough={0.75} />
      <Bx p={[24, 0.28, 4]} s={[0.18, 0.56, 44]} c={WALLC} rough={0.75} />
      {/* wall coping */}
      <Bx p={[-13.35, 0.575, 26]} s={[21.3, 0.05, 0.26]} c="#aab2b8" rough={0.55} />
      <Bx p={[13.35, 0.575, 26]} s={[21.3, 0.05, 0.26]} c="#aab2b8" rough={0.55} />
      <Bx p={[0, 0.575, -18]} s={[48, 0.05, 0.26]} c="#aab2b8" rough={0.55} />
      <Bx p={[-24, 0.575, 4]} s={[0.26, 0.05, 44]} c="#aab2b8" rough={0.55} />
      <Bx p={[24, 0.575, 4]} s={[0.26, 0.05, 44]} c="#aab2b8" rough={0.55} />
      {wallPosts.map(([x, z], i) => (
        <Bx key={i} p={[x, 0.36, z]} s={[0.3, 0.72, 0.3]} c={PILLAR} rough={0.7} />
      ))}

      {/* ---- main gate ---- */}
      <group position={[0, 0, 26]}>
        <Bx p={[-2.3, 0.85, 0]} s={[0.55, 1.7, 0.55]} c={PILLAR} shadow rough={0.6} />
        <Bx p={[2.3, 0.85, 0]} s={[0.55, 1.7, 0.55]} c={PILLAR} shadow rough={0.6} />
        <Bx p={[-2.3, 1.74, 0]} s={[0.68, 0.1, 0.68]} c={KERB} rough={0.5} />
        <Bx p={[2.3, 1.74, 0]} s={[0.68, 0.1, 0.68]} c={KERB} rough={0.5} />
        {/* pillar lanterns */}
        <Bx p={[-2.3, 1.85, 0]} s={[0.16, 0.12, 0.16]} c={GLOW} glow={lit ? 2 : 0.12} />
        <Bx p={[2.3, 1.85, 0]} s={[0.16, 0.12, 0.16]} c={GLOW} glow={lit ? 2 : 0.12} />
        {lit && <Halo p={[-2.3, 1.85, 0]} size={1.0} color="#ffce8a" opacity={0.5} />}
        {lit && <Halo p={[2.3, 1.85, 0]} size={1.0} color="#ffce8a" opacity={0.5} />}
        <Bx p={[0, 1.98, 0]} s={[5.3, 0.38, 0.42]} c={STEELD} shadow rough={0.4} metal={0.6} />
        {/* backlit sign glow */}
        <Bx p={[0, 1.98, 0.22]} s={[4.6, 0.26, 0.02]} c="#ffb454" glow={lit ? 1.3 : 0.15} />
        <Html position={[0, 1.98, 0.25]} center distanceFactor={16} zIndexRange={[25, 0]}>
          <div className="pointer-events-none select-none whitespace-nowrap rounded bg-transparent text-center">
            <p className="text-[11px] font-bold tracking-[0.25em] text-amber-100 drop-shadow">MAHARACK HEIGHTS</p>
          </div>
        </Html>
        <group position={[-1.95, 0, 0]} rotation={[0, -1.25, 0]}>
          <Bx p={[0.85, 0.6, 0]} s={[1.7, 1.1, 0.06]} c={STEELD} rough={0.4} metal={0.6} />
          <Bx p={[0.85, 0.62, 0.04]} s={[1.5, 0.9, 0.02]} c="#5b6a78" rough={0.35} metal={0.7} />
        </group>
        <group position={[1.95, 0, 0]} rotation={[0, 1.25, 0]}>
          <Bx p={[-0.85, 0.6, 0]} s={[1.7, 1.1, 0.06]} c={STEELD} rough={0.4} metal={0.6} />
          <Bx p={[-0.85, 0.62, 0.04]} s={[1.5, 0.9, 0.02]} c="#5b6a78" rough={0.35} metal={0.7} />
        </group>
        <group position={[3.8, 0, -0.7]}>
          <Bx p={[0, 0.48, 0]} s={[1.1, 0.96, 1.0]} c="#e3ddcc" shadow rough={0.7} />
          <Bx p={[0, 0.62, 0.51]} s={[0.7, 0.4, 0.02]} c="#3d4a57" rough={0.15} metal={0.2} />
          <Bx p={[0, 1.0, 0]} s={[1.3, 0.08, 1.2]} c={STEELD} rough={0.4} metal={0.6} />
          {/* cabin window lit from inside */}
          <Bx p={[0, 0.62, 0.52]} s={[0.62, 0.32, 0.01]} c="#ffd9a0" glow={lit ? 1.4 : 0.1} />
        </group>
        {/* security guard by the barrier */}
        <group position={[2.9, 0, -1.3]} rotation={[0, Math.PI, 0]}>
          <Person shirt="#2e3f55" pants="#1f2a38" />
        </group>
      </group>

      {/* ---- amenities ---- */}
      <Pool p={[-13, 0, 10]} />
      <Gym p={[-16, 0, -5]} />
      <Playground />
      <Bench p={[9.0, 0, 11.4]} ry={0.8} />
      <Bench p={[17.6, 0, 13.6]} ry={-0.9} />
      <Bench p={[-7.5, 0, 5.5]} ry={2.2} />
      {/* residents out for the evening */}
      <Sitter p={[9.14, 0.2, 11.26]} ry={0.8 - Math.PI / 2} shirt="#b97249" />
      <Sitter p={[8.86, 0.2, 11.54]} ry={0.8 - Math.PI / 2} shirt="#85936f" skin="#e0b08c" />
      <Sitter p={[-7.5, 0.2, 5.5]} ry={2.2 - Math.PI / 2} shirt="#6b5ac9" />
      <Walker
        path={[[12.5, 0], [8.8, 8.8], [0, 12.5], [-7, 8], [-12.5, 0], [-8.8, -8.8], [0, -12.5], [8.8, -8.8]]}
        speed={0.5}
        shirt="#c96a52"
        pants="#3a4660"
      />
      <Walker
        path={[[12.5, 0], [8.8, 8.8], [0, 12.5], [-7, 8], [-12.5, 0], [-8.8, -8.8], [0, -12.5], [8.8, -8.8]]}
        speed={0.52}
        offset={38}
        shirt="#d9af34"
        pants="#6b3a4a"
        skin="#8a5a3b"
      />
      {/* evening jogger looping the whole campus */}
      <Walker
        path={[[20, -2], [19, 13], [14, 20], [4, 22], [-8, 20], [-16, 17], [-21, 8], [-21, -4], [-14, -12], [0, -15], [12, -13], [20, -8]]}
        speed={1.6}
        shirt="#3ea8a2"
        pants="#2e3b35"
        skin="#a8754f"
      />

      {/* ---- landscaping: palms along the drive, broadleaf trees around ---- */}
      {([
        [-4.8, 16], [4.8, 16], [-4.8, 19.5], [4.8, 19.5], [-4.8, 23], [4.8, 23],
        [9.5, 13.5], [17, 16.2], [17.5, 10], [-20, 22], [20, 23],
        [-7.6, 12.5], [-19.5, 14.5], [-7, 8],
      ] as [number, number][]).map(([x, z], i) => (
        <Palm key={i} p={[x, 0, z]} h={1.7 + ((i * 7) % 5) * 0.14} seed={i + 1} />
      ))}
      {([
        [-21, -14], [21, -14], [-15, 18.5], [-12, -15.5], [12, -15.5], [18, -10],
        [-21, 2], [21, 6], [16, -2], [-20.5, -7], [8, -14], [-4, -15],
      ] as [number, number][]).map(([x, z], i) => (
        <Tree key={i} p={[x, 0, z]} scale={1 + ((i * 3) % 4) * 0.18} seed={i + 21} />
      ))}
      {([
        [-21.5, 24.8, "#b55ba6"], [-17.5, 24.8, "#e7e0d3"], [-13.5, 24.8, "#b55ba6"],
        [-9.5, 24.8, "#c98448"], [-5.5, 24.8, "#e7e0d3"], [5.5, 24.8, "#b55ba6"],
        [9.5, 24.8, "#e7e0d3"], [13.5, 24.8, "#b55ba6"], [17.5, 24.8, "#c98448"],
        [21.5, 24.8, "#e7e0d3"], [-23.2, 12, "#b55ba6"], [-23.2, 2, "#e7e0d3"],
        [23.2, 6, "#b55ba6"], [23.2, -4, "#c98448"], [8.3, 9.3, "#b55ba6"], [18, 13.4, "#e7e0d3"],
      ] as [number, number, string][]).map(([x, z, c], i) => (
        <Shrub key={i} p={[x, 0, z]} flower={c} seed={i + 41} />
      ))}
      {([[-2.6, 16.5], [2.6, 16.5], [-2.6, 20.5], [2.6, 20.5], [-2.6, 24.5], [2.6, 24.5]] as [number, number][]).map(
        ([x, z], i) => (
          <Lamp key={i} p={[x, 0, z]} />
        )
      )}

      {/* ---- visitor parking ---- */}
      <Car p={[-6.2, 0, 22.6]} color="#8e3552" kind="sedan" ry={0} lights={false} />
      <Car p={[-6.2, 0, 20.4]} color="#2f7a70" kind="suv" ry={0} lights={false} />
      <Car p={[-6.2, 0, 18.3]} color="#c9893a" kind="sports" ry={0} lights={false} neon="#e84d8a" />

      {/* ---- amenity hover labels ---- */}
      <SiteZone p={[-13, 0, 10]} s={[12.4, 1.2, 7.2]} name="Resort Pool" detail={'heated lap pool · sun deck · kids\' splash pool'} active={hover === "Resort Pool"} onHover={setHover} />
      <SiteZone p={[-16, 0, -5]} s={[6.8, 1.6, 5]} name="Residents' Gym" detail="Cardio deck · free weights · yoga corner" active={hover === "Residents' Gym"} onHover={setHover} />
      <SiteZone p={[13, 0, 13]} s={[9, 1.4, 9]} name="Children's Playground" detail={'55\' × 55\' · rubber-padded play court'} active={hover === "Children's Playground"} onHover={setHover} />
      <SiteZone p={[0, 0, 26.2]} s={[6, 2.4, 2.2]} name="Main Entrance Gate" detail="24×7 security · guard cabin" active={hover === "Main Entrance Gate"} onHover={setHover} />
      <SiteZone p={[-6.2, 0, 21.5]} s={[4.6, 1.2, 6.6]} name="Visitor Parking" detail="6 covered bays" active={hover === "Visitor Parking"} onHover={setHover} />
      <SiteZone p={[14, 0, -8]} s={[12, 0.8, 10]} name="Landscaped Garden" detail="Native trees · flowering shrubs" active={hover === "Landscaped Garden"} onHover={setHover} />
    </group>
  );
}
