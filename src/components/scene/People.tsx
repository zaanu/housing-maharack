"use client";

// Stylized residents that make the campus feel alive: walkers and joggers
// following waypoint loops with swinging arms/legs, people seated on benches,
// loungers by the pool and a swimmer doing slow laps. Deliberately low-poly
// to match the rest of the procedural world.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type V3 = [number, number, number];
type XZ = [number, number];

const SKIN = ["#cfa180", "#a8754f", "#8a5a3b", "#e0b08c"];
const PANTS = ["#3a4660", "#5a4a3a", "#2e3b35", "#6b3a4a"];

function Limb({
  p,
  len,
  w,
  c,
  swingRef,
}: {
  p: V3;
  len: number;
  w: number;
  c: string;
  swingRef?: (g: THREE.Group | null) => void;
}) {
  return (
    <group position={p} ref={swingRef}>
      <mesh position={[0, -len / 2, 0]} castShadow>
        <boxGeometry args={[w, len, w]} />
        <meshStandardMaterial color={c} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Body with forward = +x. `swing` ≠ 0 animates a walk cycle.
 * `dress` drapes a saree/skirt block and a hair bun; `backpack` straps a
 * school bag on the back. */
export function Person({
  shirt,
  pants = PANTS[0],
  skin = SKIN[0],
  scale = 1,
  swing = 0,
  phase = 0,
  dress,
  backpack,
}: {
  shirt: string;
  pants?: string;
  skin?: string;
  scale?: number;
  swing?: number;
  phase?: number;
  dress?: string;
  backpack?: string;
}) {
  const limbs = useRef<(THREE.Group | null)[]>([]);
  const body = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (swing === 0) return;
    const t = clock.elapsedTime * swing + phase;
    const a = Math.sin(t) * 0.55;
    const [ll, rl, la, ra] = limbs.current;
    if (ll) ll.rotation.z = a;
    if (rl) rl.rotation.z = -a;
    if (la) la.rotation.z = -a * 0.8;
    if (ra) ra.rotation.z = a * 0.8;
    if (body.current) body.current.position.y = Math.abs(Math.cos(t)) * 0.012;
  });
  return (
    <group ref={body} scale={scale}>
      <Limb p={[0, 0.24, 0.05]} len={0.24} w={0.055} c={pants} swingRef={(g) => (limbs.current[0] = g)} />
      <Limb p={[0, 0.24, -0.05]} len={0.24} w={0.055} c={pants} swingRef={(g) => (limbs.current[1] = g)} />
      <mesh position={[0, 0.345, 0]} castShadow>
        <boxGeometry args={[0.1, 0.21, 0.16]} />
        <meshStandardMaterial color={shirt} roughness={0.85} />
      </mesh>
      <Limb p={[0, 0.44, 0.105]} len={0.2} w={0.042} c={shirt} swingRef={(g) => (limbs.current[2] = g)} />
      <Limb p={[0, 0.44, -0.105]} len={0.2} w={0.042} c={shirt} swingRef={(g) => (limbs.current[3] = g)} />
      <mesh position={[0, 0.52, 0]} castShadow>
        <sphereGeometry args={[0.052, 10, 8]} />
        <meshStandardMaterial color={skin} roughness={0.9} />
      </mesh>
      <mesh position={[-0.005, 0.55, 0]}>
        <sphereGeometry args={[0.05, 10, 8]} />
        <meshStandardMaterial color="#2c2118" roughness={1} />
      </mesh>
      {dress && (
        <>
          {/* saree skirt over the hips + pallu across the shoulder + bun */}
          <mesh position={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[0.105, 0.18, 0.165]} />
            <meshStandardMaterial color={dress} roughness={0.95} />
          </mesh>
          <mesh position={[-0.02, 0.38, 0.05]} rotation={[0.25, 0, 0]}>
            <boxGeometry args={[0.115, 0.2, 0.045]} />
            <meshStandardMaterial color={dress} roughness={0.95} />
          </mesh>
          <mesh position={[-0.045, 0.51, 0]}>
            <sphereGeometry args={[0.026, 8, 6]} />
            <meshStandardMaterial color="#2c2118" roughness={1} />
          </mesh>
        </>
      )}
      {backpack && (
        <mesh position={[-0.085, 0.36, 0]} castShadow>
          <boxGeometry args={[0.055, 0.14, 0.12]} />
          <meshStandardMaterial color={backpack} roughness={0.85} />
        </mesh>
      )}
    </group>
  );
}

/** Walks a closed loop of XZ waypoints at `speed` units/s. */
export function Walker({
  path,
  speed = 0.55,
  offset = 0,
  shirt,
  pants,
  skin,
  scale = 1,
  dress,
  backpack,
}: {
  path: XZ[];
  speed?: number;
  offset?: number;
  shirt: string;
  pants?: string;
  skin?: string;
  scale?: number;
  dress?: string;
  backpack?: string;
}) {
  const g = useRef<THREE.Group>(null);
  const { lengths, total } = useMemo(() => {
    const lengths: number[] = [];
    let total = 0;
    for (let i = 0; i < path.length; i++) {
      const [x1, z1] = path[i];
      const [x2, z2] = path[(i + 1) % path.length];
      const l = Math.hypot(x2 - x1, z2 - z1);
      lengths.push(l);
      total += l;
    }
    return { lengths, total };
  }, [path]);

  useFrame(({ clock }) => {
    if (!g.current) return;
    // double-mod so negative offsets (trailing companions) stay on the loop
    let d = (((clock.elapsedTime * speed + offset) % total) + total) % total;
    let i = 0;
    while (d > lengths[i]) {
      d -= lengths[i];
      i = (i + 1) % path.length;
    }
    const [x1, z1] = path[i];
    const [x2, z2] = path[(i + 1) % path.length];
    const f = lengths[i] > 0 ? d / lengths[i] : 0;
    g.current.position.set(x1 + (x2 - x1) * f, 0, z1 + (z2 - z1) * f);
    g.current.rotation.y = Math.atan2(-(z2 - z1), x2 - x1);
  });

  return (
    <group ref={g}>
      <Person
        shirt={shirt}
        pants={pants}
        skin={skin}
        scale={scale}
        swing={speed * 7.5}
        phase={offset}
        dress={dress}
        backpack={backpack}
      />
    </group>
  );
}

/** Seated on a bench/lounger edge, legs bent forward. */
export function Sitter({ p, ry = 0, shirt, skin = SKIN[1] }: { p: V3; ry?: number; shirt: string; skin?: string }) {
  return (
    <group position={p} rotation={[0, ry, 0]}>
      <mesh position={[0, 0.07, 0]} castShadow>
        <boxGeometry args={[0.1, 0.2, 0.16]} />
        <meshStandardMaterial color={shirt} roughness={0.85} />
      </mesh>
      {[0.05, -0.05].map((z) => (
        <group key={z}>
          <mesh position={[0.08, -0.01, z]}>
            <boxGeometry args={[0.16, 0.05, 0.055]} />
            <meshStandardMaterial color={PANTS[2]} roughness={0.9} />
          </mesh>
          <mesh position={[0.15, -0.09, z]}>
            <boxGeometry args={[0.05, 0.14, 0.055]} />
            <meshStandardMaterial color={PANTS[2]} roughness={0.9} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.24, 0]} castShadow>
        <sphereGeometry args={[0.052, 10, 8]} />
        <meshStandardMaterial color={skin} roughness={0.9} />
      </mesh>
      <mesh position={[-0.005, 0.27, 0]}>
        <sphereGeometry args={[0.05, 10, 8]} />
        <meshStandardMaterial color="#3a2a1d" roughness={1} />
      </mesh>
    </group>
  );
}

/** Lying flat on a pool lounger. */
export function Lounging({ p, ry = 0, suit = "#d23c6e", skin = SKIN[3] }: { p: V3; ry?: number; suit?: string; skin?: string }) {
  return (
    <group position={p} rotation={[0, ry, 0]}>
      <mesh position={[0.02, 0.03, 0]}>
        <boxGeometry args={[0.34, 0.06, 0.14]} />
        <meshStandardMaterial color={suit} roughness={0.9} />
      </mesh>
      <mesh position={[0.28, 0.025, 0]}>
        <boxGeometry args={[0.2, 0.045, 0.12]} />
        <meshStandardMaterial color={skin} roughness={0.9} />
      </mesh>
      <mesh position={[-0.17, 0.06, 0]}>
        <sphereGeometry args={[0.05, 10, 8]} />
        <meshStandardMaterial color={skin} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Slow freestyle laps along x inside the pool. */
export function Swimmer({ p, range = 2.6, phase = 0 }: { p: V3; range?: number; phase?: number }) {
  const g = useRef<THREE.Group>(null);
  const la = useRef<THREE.Mesh>(null);
  const ra = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.5 + phase;
    const dir = Math.sin(t) >= 0 ? 1 : -1;
    if (g.current) {
      g.current.position.x = p[0] + Math.sin(t) * range;
      g.current.rotation.y = dir > 0 ? 0 : Math.PI;
      g.current.position.y = p[1] + Math.sin(clock.elapsedTime * 2.2) * 0.008;
    }
    const stroke = clock.elapsedTime * 4;
    if (la.current) la.current.rotation.z = Math.sin(stroke) * 0.9 - 0.4;
    if (ra.current) ra.current.rotation.z = Math.sin(stroke + Math.PI) * 0.9 - 0.4;
  });
  return (
    <group ref={g} position={p}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.3, 0.05, 0.14]} />
        <meshStandardMaterial color={SKIN[2]} roughness={0.9} />
      </mesh>
      <mesh position={[0.2, 0.03, 0]}>
        <sphereGeometry args={[0.05, 10, 8]} />
        <meshStandardMaterial color={SKIN[2]} roughness={0.9} />
      </mesh>
      <mesh ref={la} position={[0.08, 0.02, 0.1]}>
        <boxGeometry args={[0.16, 0.03, 0.04]} />
        <meshStandardMaterial color={SKIN[2]} roughness={0.9} />
      </mesh>
      <mesh ref={ra} position={[0.08, 0.02, -0.1]}>
        <boxGeometry args={[0.16, 0.03, 0.04]} />
        <meshStandardMaterial color={SKIN[2]} roughness={0.9} />
      </mesh>
      {/* wake ripple */}
      <mesh position={[-0.1, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.16, 0.22, 16]} />
        <meshBasicMaterial color="#e8fbff" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}
