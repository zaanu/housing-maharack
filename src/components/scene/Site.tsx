"use client";

// Gated-community campus around the tower: compound wall, main gate with
// signage and guard cabin, tree-lined driveway, visitor parking, flowering
// shrubs, a swimming pool, a residents' gym and a colourful children's
// playground — the "story" around the home. Everything is procedural.

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import Car from "./Vehicles";
import { Halo, LightCone } from "./glow";
import { Walker, Sitter, Lounging, Swimmer, Person } from "./People";
import { useSceneMode } from "./mode";

const ASPHALT = "#41464d";
const KERB = "#d8d4c8";
const WALLC = "#cdd3d8";
const PILLAR = "#9aa3ab";
const STEELD = "#46535f";
const TRUNK = "#6e5238";
const PALM_TRUNK = "#8a6f4d";
const PLAY_RED = "#d23c3c";
const PLAY_YELLOW = "#f3c014";
const PLAY_BLUE = "#2e6bb0";
const PAD_BLUE = "#2f6cb3";
const PAD_SAND = "#dfa94e";
const GLOW = "#ffd9a0";
const DECK = "#e9dfc8";
const WATER = "#37b1d8";
const CANOPY = ["#e2654f", "#f3c014", "#5b8fa8"];
const LEAFS = ["#3f7a37", "#4e8c41", "#5fa04c", "#69a958", "#578f3f"];

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
}) {
  return (
    <mesh position={p} rotation={[rx, ry, rz]} castShadow={shadow}>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={c}
        roughness={0.85}
        transparent={opacity < 1}
        opacity={opacity}
        emissive={glow > 0 ? c : "#000000"}
        emissiveIntensity={glow}
      />
    </mesh>
  );
}

/** Broadleaf tree: tapered, slightly leaning trunk + layered canopy puffs. */
function Tree({ p, scale = 1, seed = 1 }: { p: V3; scale?: number; seed?: number }) {
  const h = (1.15 + rnd(seed, 0) * 0.5) * scale;
  const lean = (rnd(seed, 1) - 0.5) * 0.18;
  const puffs = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + rnd(seed, i + 2) * 1.2;
    const r = 0.16 + rnd(seed, i + 10) * 0.34;
    return {
      x: Math.cos(a) * (0.28 + rnd(seed, i + 20) * 0.22) * scale,
      y: h + (rnd(seed, i + 30) - 0.25) * 0.5 * scale,
      z: Math.sin(a) * (0.28 + rnd(seed, i + 40) * 0.22) * scale,
      r: r * scale,
      c: LEAFS[Math.floor(rnd(seed, i + 50) * LEAFS.length)],
    };
  });
  return (
    <group position={p} rotation={[0, rnd(seed, 60) * Math.PI, lean]}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.05 * scale, 0.11 * scale, h, 10]} />
        <meshStandardMaterial color={TRUNK} roughness={1} />
      </mesh>
      <mesh position={[0.12 * scale, h * 0.7, 0]} rotation={[0, 0, -0.7]} castShadow>
        <cylinderGeometry args={[0.025 * scale, 0.045 * scale, 0.5 * scale, 8]} />
        <meshStandardMaterial color={TRUNK} roughness={1} />
      </mesh>
      <mesh position={[0, h + 0.18 * scale, 0]} castShadow>
        <sphereGeometry args={[0.42 * scale, 14, 12]} />
        <meshStandardMaterial color={LEAFS[1]} roughness={1} />
      </mesh>
      {puffs.map((q, i) => (
        <mesh key={i} position={[q.x, q.y, q.z]} castShadow>
          <sphereGeometry args={[q.r, 12, 10]} />
          <meshStandardMaterial color={q.c} roughness={1} />
        </mesh>
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
            <Bx p={[0.3, 0.05, 0]} s={[0.55, 0.025, 0.15]} c={LEAFS[i % 2 ? 2 : 4]} rz={-0.25} shadow />
            <Bx p={[0.72, 0.0, 0]} s={[0.45, 0.02, 0.11]} c={LEAFS[i % 2 ? 3 : 2]} rz={-0.65} />
            <Bx p={[1.0, -0.16, 0]} s={[0.3, 0.016, 0.07]} c={LEAFS[i % 2 ? 2 : 3]} rz={-1.0} />
          </group>
        ))}
        <mesh>
          <sphereGeometry args={[0.09, 10, 8]} />
          <meshStandardMaterial color={LEAFS[0]} roughness={1} />
        </mesh>
        {[0.12, -0.1].map((x) => (
          <mesh key={x} position={[x, -0.08, 0.06]} castShadow>
            <sphereGeometry args={[0.05, 8, 6]} />
            <meshStandardMaterial color="#7a5c33" roughness={1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Shrub({ p, flower = "#c75db4", seed = 1 }: { p: V3; flower?: string; seed?: number }) {
  const blooms = Array.from({ length: 5 }, (_, i) => ({
    x: (rnd(seed, i) - 0.5) * 0.36,
    y: 0.16 + rnd(seed, i + 5) * 0.18,
    z: (rnd(seed, i + 9) - 0.5) * 0.3,
    r: 0.045 + rnd(seed, i + 13) * 0.05,
  }));
  return (
    <group position={p}>
      <mesh position={[0, 0.16, 0]} castShadow>
        <sphereGeometry args={[0.23, 12, 10]} />
        <meshStandardMaterial color={LEAFS[0]} roughness={1} />
      </mesh>
      <mesh position={[0.14, 0.2, 0.08]} castShadow>
        <sphereGeometry args={[0.15, 10, 8]} />
        <meshStandardMaterial color={LEAFS[2]} roughness={1} />
      </mesh>
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
        <cylinderGeometry args={[0.022, 0.035, 1.1, 8]} />
        <meshStandardMaterial color={STEELD} roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 1.14, 0]}>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshStandardMaterial color={GLOW} emissive={GLOW} emissiveIntensity={lit ? 2.2 : 0.12} />
      </mesh>
      {lit && (
        <>
          <Halo p={[0, 1.14, 0]} size={0.9} color="#ffce8a" opacity={0.5} />
          <LightCone p={[0, 1.1, 0]} h={1.15} r={0.6} opacity={0.07} />
        </>
      )}
    </group>
  );
}

function Bench({ p, ry = 0 }: { p: V3; ry?: number }) {
  return (
    <group position={p} rotation={[0, ry, 0]}>
      <Bx p={[0, 0.18, 0]} s={[0.8, 0.05, 0.3]} c={PALM_TRUNK} />
      <Bx p={[0, 0.38, -0.13]} s={[0.8, 0.26, 0.05]} c={PALM_TRUNK} />
      <Bx p={[-0.32, 0.09, 0]} s={[0.06, 0.18, 0.26]} c={STEELD} />
      <Bx p={[0.32, 0.09, 0]} s={[0.06, 0.18, 0.26]} c={STEELD} />
    </group>
  );
}

/** Animated pool water: gentle ripple shimmer strips drifting across. */
function PoolWater({ w, d }: { w: number; d: number }) {
  const { lit } = useSceneMode();
  const shimmer = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (shimmer.current) {
      shimmer.current.position.x = Math.sin(t * 0.6) * 0.35;
      shimmer.current.position.z = Math.cos(t * 0.45) * 0.2;
      shimmer.current.children.forEach((m, i) => {
        const mat = (m as THREE.Mesh).material as THREE.MeshStandardMaterial;
        mat.opacity = 0.1 + 0.07 * Math.sin(t * 1.4 + i * 1.7);
      });
    }
  });
  return (
    <group>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial
          color={WATER}
          roughness={0.08}
          metalness={0.15}
          transparent
          opacity={0.88}
          emissive="#1f9cc4"
          emissiveIntensity={lit ? 0.55 : 0.08}
        />
      </mesh>
      {/* underwater lights glowing after dark */}
      {lit &&
        [-2.2, 0, 2.2].map((x) => (
          <group key={x}>
            <mesh position={[x, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.55, 20]} />
              <meshBasicMaterial color="#7fe6ff" transparent opacity={0.32} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            <Halo p={[x, 0.12, 0]} size={1.3} color="#5fd8f0" opacity={0.3} />
          </group>
        ))}
      <group ref={shimmer}>
        {[-0.9, 0.2, 1.1].map((z, i) => (
          <mesh key={i} position={[0, 0.058, z * (d / 3.6)]} rotation={[-Math.PI / 2, 0, 0.12 * i]}>
            <planeGeometry args={[w * 0.85, 0.1]} />
            <meshStandardMaterial color="#dff6ff" transparent opacity={0.14} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Lounger({ p, ry = 0, c = "#cd7f54" }: { p: V3; ry?: number; c?: string }) {
  return (
    <group position={p} rotation={[0, ry, 0]}>
      <Bx p={[0, 0.12, 0]} s={[0.7, 0.04, 0.26]} c="#f3efe4" />
      <Bx p={[-0.28, 0.25, 0]} s={[0.3, 0.04, 0.26]} c="#f3efe4" rz={0.7} />
      <Bx p={[0.04, 0.145, 0]} s={[0.56, 0.025, 0.22]} c={c} />
      <Bx p={[-0.27, 0.26, 0]} s={[0.26, 0.025, 0.22]} c={c} rz={0.7} />
      {([[-0.25, 0.1], [0.25, 0.1], [-0.25, -0.1], [0.25, -0.1]] as [number, number][]).map(([x, z], i) => (
        <Bx key={i} p={[x, 0.05, z]} s={[0.04, 0.1, 0.04]} c={STEELD} />
      ))}
    </group>
  );
}

function Umbrella({ p, c = "#e2654f" }: { p: V3; c?: string }) {
  return (
    <group position={p}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.025, 1.1, 8]} />
        <meshStandardMaterial color="#e9e3d4" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.08, 0]} castShadow>
        <coneGeometry args={[0.62, 0.3, 10]} />
        <meshStandardMaterial color={c} roughness={0.85} />
      </mesh>
    </group>
  );
}

function Pool({ p }: { p: V3 }) {
  const LANES = 8;
  const POOL_W = 9.4; // long axis (x)
  const POOL_D = 4.1; // lanes run along x
  const laneD = POOL_D / LANES;
  return (
    <group position={p}>
      {/* competition deck */}
      <Bx p={[0, 0.03, 0]} s={[12, 0.06, 6.8]} c={DECK} />
      {Array.from({ length: 16 }, (_, i) => (
        <Bx key={i} p={[-5.5 + i * 0.74, 0.062, 0]} s={[0.02, 0.004, 6.6]} c="#d3c5a6" />
      ))}
      {/* basin walls + white coping */}
      <Bx p={[0, 0.06, -POOL_D / 2 - 0.07]} s={[POOL_W + 0.3, 0.1, 0.16]} c="#ffffff" />
      <Bx p={[0, 0.06, POOL_D / 2 + 0.07]} s={[POOL_W + 0.3, 0.1, 0.16]} c="#ffffff" />
      <Bx p={[-POOL_W / 2 - 0.07, 0.06, 0]} s={[0.16, 0.1, POOL_D + 0.4]} c="#ffffff" />
      <Bx p={[POOL_W / 2 + 0.07, 0.06, 0]} s={[0.16, 0.1, POOL_D + 0.4]} c="#ffffff" />
      <PoolWater w={POOL_W} d={POOL_D} />
      {/* dark lane stripes on the bottom */}
      {Array.from({ length: LANES }, (_, i) => (
        <Bx
          key={i}
          p={[0, 0.042, -POOL_D / 2 + laneD * (i + 0.5)]}
          s={[POOL_W * 0.94, 0.004, 0.07]}
          c="#1f5f8a"
        />
      ))}
      {/* floating lane ropes at the lane boundaries */}
      {Array.from({ length: LANES - 1 }, (_, i) => (
        <mesh
          key={i}
          position={[0, 0.058, -POOL_D / 2 + laneD * (i + 1)]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.024, 0.024, POOL_W * 0.98, 8]} />
          <meshStandardMaterial color={i % 2 ? "#e03c3c" : "#f3c014"} roughness={0.8} />
        </mesh>
      ))}
      {/* starting blocks, one per lane */}
      {Array.from({ length: LANES }, (_, i) => (
        <group key={i} position={[-POOL_W / 2 - 0.32, 0.06, -POOL_D / 2 + laneD * (i + 0.5)]}>
          <Bx p={[0, 0.1, 0]} s={[0.3, 0.2, 0.28]} c="#f4f1e8" />
          <Bx p={[0.02, 0.215, 0]} s={[0.3, 0.035, 0.28]} c="#2e6bb0" rz={-0.12} />
        </group>
      ))}
      {/* backstroke flag lines near both ends */}
      {[-POOL_W / 2 + 1.4, POOL_W / 2 - 1.4].map((x) => (
        <group key={x}>
          {[-POOL_D / 2 - 0.5, POOL_D / 2 + 0.5].map((z) => (
            <Bx key={z} p={[x, 0.3, z]} s={[0.04, 0.6, 0.04]} c={STEELD} />
          ))}
          <Bx p={[x, 0.58, 0]} s={[0.015, 0.015, POOL_D + 1.0]} c="#e9e3d4" />
          {Array.from({ length: 9 }, (_, i) => (
            <Bx
              key={i}
              p={[x, 0.53, -POOL_D / 2 + 0.1 + i * ((POOL_D - 0.2) / 8)]}
              s={[0.02, 0.09, 0.12]}
              c={i % 2 ? "#e03c3c" : "#2e6bb0"}
            />
          ))}
        </group>
      ))}
      {/* ladder */}
      <group position={[4.45, 0, -1.0]}>
        <Bx p={[0, 0.25, -0.12]} s={[0.025, 0.5, 0.025]} c="#c2c9cf" />
        <Bx p={[0, 0.25, 0.12]} s={[0.025, 0.5, 0.025]} c="#c2c9cf" />
        {[0.12, 0.26, 0.4].map((y) => (
          <Bx key={y} p={[0, y, 0]} s={[0.02, 0.02, 0.24]} c="#c2c9cf" />
        ))}
      </group>
      {/* loungers + umbrellas along the far edge, a couple sunbathing */}
      <Lounger p={[-2.6, 0.06, 2.6]} ry={-1.5} c="#cd7f54" />
      <Lounger p={[-1.5, 0.06, 2.6]} ry={-1.5} c="#8fa882" />
      <Lounger p={[1.6, 0.06, 2.6]} ry={-1.5} c="#cd7f54" />
      <Lounger p={[2.7, 0.06, 2.6]} ry={-1.5} c="#5b8fa8" />
      <Lounging p={[-2.6, 0.17, 2.6]} ry={-1.5} suit="#d23c6e" />
      <Lounging p={[2.7, 0.17, 2.6]} ry={-1.5} suit="#2e6bb0" skin="#a8754f" />
      {/* lap swimmers in their lanes */}
      <Swimmer p={[0, 0.05, -0.77]} range={3.8} />
      <Swimmer p={[0.4, 0.05, 0.77]} range={3.4} phase={2.4} />
      <Umbrella p={[-2.0, 0.06, 2.85]} c={CANOPY[0]} />
      <Umbrella p={[2.15, 0.06, 2.85]} c={CANOPY[1]} />
      {/* kids' splash pool */}
      <group position={[4.9, 0, 2.7]}>
        <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.9, 24]} />
          <meshStandardMaterial color="#5cc6e4" roughness={0.1} transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, 0.04, 0]}>
          <torusGeometry args={[0.92, 0.05, 8, 24]} />
          <meshStandardMaterial color="#ffffff" roughness={0.6} />
        </mesh>
      </group>
      <Shrub p={[-4.7, 0.06, 2.7]} flower="#c75db4" seed={31} />
      <Shrub p={[4.7, 0.06, -2.7]} flower="#e7e0d3" seed={32} />
    </group>
  );
}

function Treadmill({ p, ry = 0 }: { p: V3; ry?: number }) {
  return (
    <group position={p} rotation={[0, ry, 0]}>
      <Bx p={[0, 0.06, 0]} s={[0.8, 0.06, 0.34]} c="#2b3138" />
      <Bx p={[0, 0.085, 0]} s={[0.66, 0.015, 0.26]} c="#454f59" />
      <Bx p={[0.36, 0.32, 0]} s={[0.05, 0.5, 0.3]} c={STEELD} rz={-0.15} />
      <Bx p={[0.42, 0.58, 0]} s={[0.06, 0.16, 0.34]} c="#1d2126" rz={-0.3} />
    </group>
  );
}

function Gym({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <Bx p={[0, 0.05, 0]} s={[6.2, 0.1, 4.4]} c="#d9d4c6" />
      {/* glass walls */}
      <Bx p={[0, 0.65, -2.1]} s={[6.0, 1.1, 0.06]} c="#a8d8ea" opacity={0.35} />
      <Bx p={[-2.95, 0.65, 0]} s={[0.06, 1.1, 4.2]} c="#a8d8ea" opacity={0.35} />
      <Bx p={[2.95, 0.65, 0]} s={[0.06, 1.1, 4.2]} c="#a8d8ea" opacity={0.35} />
      <Bx p={[-2.0, 0.65, 2.1]} s={[2.0, 1.1, 0.06]} c="#a8d8ea" opacity={0.35} />
      <Bx p={[2.0, 0.65, 2.1]} s={[2.0, 1.1, 0.06]} c="#a8d8ea" opacity={0.35} />
      {/* roof with dark fascia */}
      <Bx p={[0, 1.26, 0]} s={[6.6, 0.12, 4.8]} c="#f0ece1" shadow />
      <Bx p={[0, 1.2, 2.42]} s={[6.6, 0.18, 0.06]} c={STEELD} />
      <Bx p={[0, 1.2, -2.42]} s={[6.6, 0.18, 0.06]} c={STEELD} />
      {/* equipment */}
      <Treadmill p={[-2.0, 0.1, -1.3]} ry={Math.PI / 2} />
      <Treadmill p={[-1.1, 0.1, -1.3]} ry={Math.PI / 2} />
      <Treadmill p={[-0.2, 0.1, -1.3]} ry={Math.PI / 2} />
      {/* bench press */}
      <group position={[1.6, 0.1, -1.2]}>
        <Bx p={[0, 0.16, 0]} s={[0.7, 0.06, 0.24]} c="#8c2f2f" />
        <Bx p={[-0.28, 0.08, 0]} s={[0.06, 0.16, 0.2]} c={STEELD} />
        <Bx p={[0.28, 0.08, 0]} s={[0.06, 0.16, 0.2]} c={STEELD} />
        <Bx p={[0, 0.46, 0]} s={[0.025, 0.025, 0.9]} c="#9aa3ab" />
        {[0.38, -0.38].map((z) => (
          <mesh key={z} position={[0, 0.46, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.04, 14]} />
            <meshStandardMaterial color="#2b3138" roughness={0.7} />
          </mesh>
        ))}
        <Bx p={[0, 0.3, 0.42]} s={[0.05, 0.34, 0.05]} c={STEELD} />
        <Bx p={[0, 0.3, -0.42]} s={[0.05, 0.34, 0.05]} c={STEELD} />
      </group>
      {/* dumbbell rack */}
      <group position={[2.4, 0.1, 0.9]}>
        <Bx p={[0, 0.2, 0]} s={[0.24, 0.4, 1.2]} c={STEELD} />
        {[-0.4, -0.13, 0.13, 0.4].map((z, i) => (
          <mesh key={i} position={[0, 0.44, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.045, 0.045, 0.2, 10]} />
            <meshStandardMaterial color={i % 2 ? "#c23b3b" : "#2e6bb0"} roughness={0.6} />
          </mesh>
        ))}
      </group>
      {/* yoga corner */}
      {[-0.5, -0.1].map((z, i) => (
        <mesh key={i} position={[-2.4, 0.14, z + 1.4]} rotation={[0, 0.4, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 10]} />
          <meshStandardMaterial color={i ? "#8fa882" : "#cd7f54"} roughness={0.9} />
        </mesh>
      ))}
      {/* sign */}
      <Bx p={[0, 1.05, 2.14]} s={[1.6, 0.26, 0.04]} c="#1f2937" />
      <Html position={[0, 1.05, 2.2]} center distanceFactor={12} zIndexRange={[24, 0]}>
        <p className="pointer-events-none select-none text-[9px] font-bold tracking-[0.2em] text-amber-100">
          FITNESS STUDIO
        </p>
      </Html>
    </group>
  );
}

/** Swing hanging from the bar at y≈0.92, swinging along z. */
function SwingSeat({ x, phase, withKid = false }: { x: number; phase: number; withKid?: boolean }) {
  const pivot = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (pivot.current) pivot.current.rotation.x = Math.sin(clock.elapsedTime * 1.7 + phase) * (withKid ? 0.55 : 0.3);
  });
  return (
    <group position={[x, 0.92, 0]} ref={pivot}>
      <Bx p={[-0.12, -0.36, 0]} s={[0.02, 0.72, 0.02]} c="#888" />
      <Bx p={[0.12, -0.36, 0]} s={[0.02, 0.72, 0.02]} c="#888" />
      <Bx p={[0, -0.72, 0]} s={[0.3, 0.04, 0.14]} c={PLAY_YELLOW} />
      {withKid && (
        <group position={[0, -0.7, 0.02]} rotation={[0, Math.PI / 2, 0]} scale={0.62}>
          <Person shirt={PLAY_RED} pants="#2e6bb0" skin="#cfa180" />
        </group>
      )}
    </group>
  );
}

function Playground() {
  return (
    <group position={[13, 0, 13]}>
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[4.4, 40]} />
        <meshStandardMaterial color={PAD_BLUE} roughness={1} />
      </mesh>
      <mesh position={[1.4, 0.022, 1.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.6, 30]} />
        <meshStandardMaterial color={PAD_SAND} roughness={1} />
      </mesh>
      <group position={[-1.6, 0, -1.3]}>
        {([[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]] as [number, number][]).map(([x, z], i) => (
          <Bx key={i} p={[x, 0.35, z]} s={[0.07, 0.7, 0.07]} c={PLAY_RED} />
        ))}
        <Bx p={[0, 0.72, 0]} s={[0.85, 0.06, 0.85]} c={PLAY_YELLOW} />
        <mesh position={[0, 1.05, 0]} castShadow>
          <coneGeometry args={[0.62, 0.5, 4]} />
          <meshStandardMaterial color={PLAY_BLUE} roughness={0.8} />
        </mesh>
        <Bx p={[0.95, 0.42, 0.2]} s={[1.5, 0.04, 0.4]} c={PLAY_YELLOW} rz={-0.5} shadow />
        <Bx p={[1.62, 0.08, 0.2]} s={[0.5, 0.05, 0.44]} c={PLAY_YELLOW} />
      </group>
      <group position={[1.6, 0, -1.6]}>
        <Bx p={[-1.0, 0.45, 0]} s={[0.06, 0.95, 0.06]} c={PLAY_RED} rz={0.2} />
        <Bx p={[-0.8, 0.45, 0]} s={[0.06, 0.95, 0.06]} c={PLAY_RED} rz={-0.2} />
        <Bx p={[1.0, 0.45, 0]} s={[0.06, 0.95, 0.06]} c={PLAY_RED} rz={0.2} />
        <Bx p={[0.8, 0.45, 0]} s={[0.06, 0.95, 0.06]} c={PLAY_RED} rz={-0.2} />
        <Bx p={[0, 0.92, 0]} s={[2.0, 0.06, 0.06]} c={PLAY_YELLOW} />
        <SwingSeat x={-0.35} phase={0} withKid />
        <SwingSeat x={0.35} phase={1.9} />
      </group>
      <group position={[-0.6, 0, 1.7]}>
        <mesh position={[0, 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.55, 0.55, 0.06, 18]} />
          <meshStandardMaterial color={PLAY_YELLOW} roughness={0.8} />
        </mesh>
        <Bx p={[0, 0.3, 0]} s={[0.05, 0.35, 0.05]} c={PLAY_RED} />
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((a) => (
          <Bx key={a} p={[Math.cos(a) * 0.3, 0.32, Math.sin(a) * 0.3]} s={[0.04, 0.3, 0.04]} c={PLAY_RED} ry={a} />
        ))}
      </group>
      <group position={[2.3, 0, 1.2]}>
        <Bx p={[0, 0.16, 0]} s={[0.12, 0.32, 0.2]} c={PLAY_RED} />
        <Bx p={[0, 0.32, 0]} s={[1.8, 0.05, 0.22]} c={PLAY_YELLOW} rz={0.18} shadow />
      </group>
      <group position={[0.6, 0, 0.4]}>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.05, 0.07, 0.22, 8]} />
          <meshStandardMaterial color="#9aa3ab" roughness={0.6} metalness={0.4} />
        </mesh>
        <Bx p={[0, 0.3, 0]} s={[0.45, 0.12, 0.14]} c={PLAY_RED} />
        <Bx p={[0.2, 0.42, 0]} s={[0.1, 0.16, 0.1]} c={PLAY_YELLOW} />
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
      {/* ---- driveway from the gate to the plaza ---- */}
      <Bx p={[0, 0.012, 20]} s={[3.4, 0.024, 12.5]} c={ASPHALT} />
      <Bx p={[0, 0.012, 29.5]} s={[3.4, 0.024, 7]} c={ASPHALT} />
      {[15.2, 17, 18.8, 20.6, 22.4, 24.2].map((z) => (
        <Bx key={z} p={[0, 0.028, z]} s={[0.1, 0.006, 0.8]} c="#e8e6df" />
      ))}
      <Bx p={[-1.86, 0.04, 20]} s={[0.16, 0.07, 12.5]} c={KERB} />
      <Bx p={[1.86, 0.04, 20]} s={[0.16, 0.07, 12.5]} c={KERB} />
      {[-1.2, -0.6, 0, 0.6, 1.2].map((x) => (
        <Bx key={x} p={[x, 0.026, 27.3]} s={[0.4, 0.005, 1.1]} c="#eceae2" />
      ))}

      {/* ---- compound wall + posts ---- */}
      <Bx p={[-13.35, 0.28, 26]} s={[21.3, 0.56, 0.18]} c={WALLC} />
      <Bx p={[13.35, 0.28, 26]} s={[21.3, 0.56, 0.18]} c={WALLC} />
      <Bx p={[0, 0.28, -18]} s={[48, 0.56, 0.18]} c={WALLC} />
      <Bx p={[-24, 0.28, 4]} s={[0.18, 0.56, 44]} c={WALLC} />
      <Bx p={[24, 0.28, 4]} s={[0.18, 0.56, 44]} c={WALLC} />
      {wallPosts.map(([x, z], i) => (
        <Bx key={i} p={[x, 0.36, z]} s={[0.3, 0.72, 0.3]} c={PILLAR} />
      ))}

      {/* ---- main gate ---- */}
      <group position={[0, 0, 26]}>
        <Bx p={[-2.3, 0.85, 0]} s={[0.55, 1.7, 0.55]} c={PILLAR} shadow />
        <Bx p={[2.3, 0.85, 0]} s={[0.55, 1.7, 0.55]} c={PILLAR} shadow />
        <Bx p={[-2.3, 1.74, 0]} s={[0.68, 0.1, 0.68]} c={KERB} />
        <Bx p={[2.3, 1.74, 0]} s={[0.68, 0.1, 0.68]} c={KERB} />
        {/* pillar lanterns */}
        <Bx p={[-2.3, 1.85, 0]} s={[0.16, 0.12, 0.16]} c={GLOW} glow={lit ? 2 : 0.12} />
        <Bx p={[2.3, 1.85, 0]} s={[0.16, 0.12, 0.16]} c={GLOW} glow={lit ? 2 : 0.12} />
        {lit && <Halo p={[-2.3, 1.85, 0]} size={1.0} color="#ffce8a" opacity={0.55} />}
        {lit && <Halo p={[2.3, 1.85, 0]} size={1.0} color="#ffce8a" opacity={0.55} />}
        <Bx p={[0, 1.98, 0]} s={[5.3, 0.38, 0.42]} c={STEELD} shadow />
        {/* backlit sign glow */}
        <Bx p={[0, 1.98, 0.22]} s={[4.6, 0.26, 0.02]} c="#ffb454" glow={lit ? 1.1 : 0.15} />
        <Html position={[0, 1.98, 0.25]} center distanceFactor={16} zIndexRange={[25, 0]}>
          <div className="pointer-events-none select-none whitespace-nowrap rounded bg-transparent text-center">
            <p className="text-[11px] font-bold tracking-[0.25em] text-amber-100 drop-shadow">MAHARACK HEIGHTS</p>
          </div>
        </Html>
        <group position={[-1.95, 0, 0]} rotation={[0, -1.25, 0]}>
          <Bx p={[0.85, 0.6, 0]} s={[1.7, 1.1, 0.06]} c={STEELD} />
          <Bx p={[0.85, 0.62, 0.04]} s={[1.5, 0.9, 0.02]} c="#5b6a78" />
        </group>
        <group position={[1.95, 0, 0]} rotation={[0, 1.25, 0]}>
          <Bx p={[-0.85, 0.6, 0]} s={[1.7, 1.1, 0.06]} c={STEELD} />
          <Bx p={[-0.85, 0.62, 0.04]} s={[1.5, 0.9, 0.02]} c="#5b6a78" />
        </group>
        <group position={[3.8, 0, -0.7]}>
          <Bx p={[0, 0.48, 0]} s={[1.1, 0.96, 1.0]} c="#e9e3d4" shadow />
          <Bx p={[0, 0.62, 0.51]} s={[0.7, 0.4, 0.02]} c="#3d4a57" />
          <Bx p={[0, 1.0, 0]} s={[1.3, 0.08, 1.2]} c={STEELD} />
          {/* cabin window lit from inside */}
          <Bx p={[0, 0.62, 0.52]} s={[0.62, 0.32, 0.01]} c="#ffd9a0" glow={lit ? 1.2 : 0.1} />
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
      <Sitter p={[9.14, 0.2, 11.26]} ry={0.8 - Math.PI / 2} shirt="#cd7f54" />
      <Sitter p={[8.86, 0.2, 11.54]} ry={0.8 - Math.PI / 2} shirt="#8fa882" skin="#e0b08c" />
      <Sitter p={[-7.5, 0.2, 5.5]} ry={2.2 - Math.PI / 2} shirt="#7c5cff" />
      <Walker
        path={[[12.5, 0], [8.8, 8.8], [0, 12.5], [-7, 8], [-12.5, 0], [-8.8, -8.8], [0, -12.5], [8.8, -8.8]]}
        speed={0.5}
        shirt="#e2654f"
        pants="#3a4660"
      />
      <Walker
        path={[[12.5, 0], [8.8, 8.8], [0, 12.5], [-7, 8], [-12.5, 0], [-8.8, -8.8], [0, -12.5], [8.8, -8.8]]}
        speed={0.52}
        offset={38}
        shirt="#f3c014"
        pants="#6b3a4a"
        skin="#8a5a3b"
      />
      {/* evening jogger looping the whole campus */}
      <Walker
        path={[[20, -2], [19, 13], [14, 20], [4, 22], [-8, 20], [-16, 17], [-21, 8], [-21, -4], [-14, -12], [0, -15], [12, -13], [20, -8]]}
        speed={1.6}
        shirt="#3ec6c0"
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
        [-21.5, 24.8, "#c75db4"], [-17.5, 24.8, "#e7e0d3"], [-13.5, 24.8, "#c75db4"],
        [-9.5, 24.8, "#d98a4a"], [-5.5, 24.8, "#e7e0d3"], [5.5, 24.8, "#c75db4"],
        [9.5, 24.8, "#e7e0d3"], [13.5, 24.8, "#c75db4"], [17.5, 24.8, "#d98a4a"],
        [21.5, 24.8, "#e7e0d3"], [-23.2, 12, "#c75db4"], [-23.2, 2, "#e7e0d3"],
        [23.2, 6, "#c75db4"], [23.2, -4, "#d98a4a"], [8.3, 9.3, "#c75db4"], [18, 13.4, "#e7e0d3"],
      ] as [number, number, string][]).map(([x, z, c], i) => (
        <Shrub key={i} p={[x, 0, z]} flower={c} seed={i + 41} />
      ))}
      {([[-2.6, 16.5], [2.6, 16.5], [-2.6, 20.5], [2.6, 20.5], [-2.6, 24.5], [2.6, 24.5]] as [number, number][]).map(
        ([x, z], i) => (
          <Lamp key={i} p={[x, 0, z]} />
        )
      )}

      {/* ---- visitor parking ---- */}
      <Bx p={[-6.2, 0.008, 21.5]} s={[4.4, 0.016, 6.5]} c="#7e8388" />
      {[-1, 0, 1].map((i) => (
        <Bx key={i} p={[-6.2, 0.02, 21.5 + i * 2.1]} s={[4.2, 0.004, 0.06]} c="#e8e6df" />
      ))}
      <Car p={[-6.2, 0, 22.6]} color="#d23c6e" kind="sedan" ry={0} lights={false} />
      <Car p={[-6.2, 0, 20.4]} color="#2f9e8f" kind="suv" ry={0} lights={false} />
      <Car p={[-6.2, 0, 18.3]} color="#f3a33c" kind="sports" ry={0} lights={false} neon="#e84d8a" />

      {/* ---- amenity hover labels ---- */}
      <SiteZone p={[-13, 0, 10]} s={[12.4, 1.2, 7.2]} name="Olympic-Style Pool" detail={'8 lanes · starting blocks · kids\' splash pool'} active={hover === "Olympic-Style Pool"} onHover={setHover} />
      <SiteZone p={[-16, 0, -5]} s={[6.8, 1.6, 5]} name="Residents' Gym" detail="Cardio deck · free weights · yoga corner" active={hover === "Residents' Gym"} onHover={setHover} />
      <SiteZone p={[13, 0, 13]} s={[9, 1.4, 9]} name="Children's Playground" detail={'55\' × 55\' · rubber-padded play court'} active={hover === "Children's Playground"} onHover={setHover} />
      <SiteZone p={[0, 0, 26.2]} s={[6, 2.4, 2.2]} name="Main Entrance Gate" detail="24×7 security · guard cabin" active={hover === "Main Entrance Gate"} onHover={setHover} />
      <SiteZone p={[-6.2, 0, 21.5]} s={[4.6, 1.2, 6.6]} name="Visitor Parking" detail="6 covered bays" active={hover === "Visitor Parking"} onHover={setHover} />
      <SiteZone p={[14, 0, -8]} s={[12, 0.8, 10]} name="Landscaped Garden" detail="Native trees · flowering shrubs" active={hover === "Landscaped Garden"} onHover={setHover} />
    </group>
  );
}
