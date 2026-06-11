"use client";

// Procedural cars with GTA energy: sedan / SUV / sports body styles, vivid
// paint, tinted glass, spinning spoked wheels, glowing head/tail lights with
// additive light cones, and optional neon underglow. The model's nose points
// along +x; pass `speed` (scene units/s) so the wheels spin to match.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Halo, LightCone } from "./glow";
import { useSceneMode } from "./mode";

type V3 = [number, number, number];
export type CarKind = "sedan" | "suv" | "sports";

const TYRE = "#15181c";
const GLASSC = "#1d2733";
const WHEEL_R = 0.15;

function Part({ p, s, c, rz = 0, glow = 0, metal = 0.45 }: { p: V3; s: V3; c: string; rz?: number; glow?: number; metal?: number }) {
  return (
    <mesh position={p} rotation={[0, 0, rz]} castShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={c}
        roughness={glow > 0 ? 0.4 : 0.32}
        metalness={glow > 0 ? 0 : metal}
        emissive={glow > 0 ? c : "#000000"}
        emissiveIntensity={glow}
      />
    </mesh>
  );
}

function Wheel({
  p,
  r = WHEEL_R,
  innerRef,
}: {
  p: V3;
  r?: number;
  innerRef: (g: THREE.Group | null) => void;
}) {
  return (
    <group position={p} rotation={[Math.PI / 2, 0, 0]}>
      {/* spin group rotates about the axle (local Y after the π/2 tilt) */}
      <group ref={innerRef}>
        <mesh castShadow>
          <cylinderGeometry args={[r, r, 0.12, 16]} />
          <meshStandardMaterial color={TYRE} roughness={0.9} />
        </mesh>
        {[0, 0.105, -0.105].map((y, i) =>
          i === 0 ? null : (
            <group key={i}>
              <mesh position={[0, y * 0.62, 0]}>
                <cylinderGeometry args={[r * 0.52, r * 0.52, 0.012, 12]} />
                <meshStandardMaterial color="#cdd2d8" roughness={0.25} metalness={0.8} />
              </mesh>
              {[0, Math.PI / 2.5, (2 * Math.PI) / 2.5, (3 * Math.PI) / 2.5, (4 * Math.PI) / 2.5].map((a) => (
                <mesh key={a} position={[Math.cos(a) * r * 0.32, y * 0.66, Math.sin(a) * r * 0.32]} rotation={[0, -a, 0]}>
                  <boxGeometry args={[r * 0.6, 0.008, 0.03]} />
                  <meshStandardMaterial color="#9aa1a8" roughness={0.3} metalness={0.7} />
                </mesh>
              ))}
            </group>
          )
        )}
      </group>
    </group>
  );
}

export default function Car({
  p = [0, 0, 0],
  ry = 0,
  color,
  kind = "sedan",
  speed = 0,
  speedRef,
  lights = true,
  neon,
}: {
  p?: V3;
  ry?: number;
  color: string;
  kind?: CarKind;
  speed?: number;
  speedRef?: React.RefObject<number>;
  lights?: boolean;
  neon?: string;
}) {
  const wheelRefs = useRef<(THREE.Group | null)[]>([]);
  useFrame((_, delta) => {
    const v = speedRef ? speedRef.current : speed;
    if (v === 0) return;
    for (const w of wheelRefs.current) {
      if (w) w.rotation.y -= (v * delta) / WHEEL_R;
    }
  });

  // headlights and neon only run after dark, regardless of what the caller asks
  const { lit } = useSceneMode();
  const lightsOn = lights && lit;
  const neonOn = neon && lit;

  const sporty = kind === "sports";
  const tall = kind === "suv";
  const bodyY = sporty ? 0.27 : 0.33;
  const bodyH = sporty ? 0.2 : 0.26;
  const cabinH = tall ? 0.32 : sporty ? 0.17 : 0.22;
  const cabinY = bodyY + bodyH / 2 + cabinH / 2 - 0.02;
  const wheels: V3[] = [
    [0.55, WHEEL_R, 0.43],
    [-0.55, WHEEL_R, 0.43],
    [0.55, WHEEL_R, -0.43],
    [-0.55, WHEEL_R, -0.43],
  ];

  return (
    <group position={p} rotation={[0, ry, 0]}>
      {/* body, hood, boot */}
      <Part p={[0, bodyY, 0]} s={[1.78, bodyH, 0.84]} c={color} />
      <Part p={[0.74, bodyY + bodyH / 2 - 0.02, 0]} s={[0.32, 0.08, 0.8]} c={color} />
      <Part p={[-0.78, bodyY + bodyH / 2 - 0.02, 0]} s={[0.24, 0.08, 0.8]} c={color} />
      {/* cabin, roof, windshields */}
      <Part p={[-0.08, cabinY, 0]} s={[sporty ? 0.7 : 0.78, cabinH, 0.72]} c={GLASSC} metal={0.1} />
      <Part p={[-0.08, cabinY + cabinH / 2 + 0.015, 0]} s={[sporty ? 0.74 : 0.82, 0.04, 0.76]} c={color} />
      <Part p={[0.4, cabinY - 0.02, 0]} s={[0.34, cabinH, 0.7]} c={GLASSC} rz={sporty ? -0.75 : -0.55} metal={0.1} />
      <Part p={[-0.55, cabinY - 0.02, 0]} s={[0.3, cabinH, 0.7]} c={GLASSC} rz={sporty ? 0.7 : 0.5} metal={0.1} />
      {/* trims */}
      <Part p={[0.9, 0.26, 0]} s={[0.05, 0.1, 0.7]} c="#23282e" metal={0.2} />
      <Part p={[-0.9, 0.26, 0]} s={[0.05, 0.1, 0.7]} c="#23282e" metal={0.2} />
      {tall && <Part p={[-0.05, cabinY + cabinH / 2 + 0.06, 0.3]} s={[0.7, 0.03, 0.04]} c="#33393f" />}
      {tall && <Part p={[-0.05, cabinY + cabinH / 2 + 0.06, -0.3]} s={[0.7, 0.03, 0.04]} c="#33393f" />}
      {sporty && <Part p={[-0.85, 0.5, 0]} s={[0.16, 0.035, 0.74]} c={color} />}
      {sporty && <Part p={[-0.85, 0.44, 0.3]} s={[0.05, 0.09, 0.05]} c="#23282e" />}
      {sporty && <Part p={[-0.85, 0.44, -0.3]} s={[0.05, 0.09, 0.05]} c="#23282e" />}
      {/* headlights + taillights */}
      <Part p={[0.9, 0.38, 0.26]} s={[0.04, 0.06, 0.14]} c="#fff3c4" glow={lightsOn ? 2.2 : 0.4} />
      <Part p={[0.9, 0.38, -0.26]} s={[0.04, 0.06, 0.14]} c="#fff3c4" glow={lightsOn ? 2.2 : 0.4} />
      <Part p={[-0.9, 0.38, 0.26]} s={[0.03, 0.05, 0.13]} c="#ff3b30" glow={lightsOn ? 1.6 : 0.5} />
      <Part p={[-0.9, 0.38, -0.26]} s={[0.03, 0.05, 0.13]} c="#ff3b30" glow={lightsOn ? 1.6 : 0.5} />
      {lightsOn && (
        <group>
          <Halo p={[0.94, 0.38, 0.26]} size={0.42} color="#ffe9b0" opacity={0.65} />
          <Halo p={[0.94, 0.38, -0.26]} size={0.42} color="#ffe9b0" opacity={0.65} />
          <Halo p={[-0.94, 0.38, 0.26]} size={0.3} color="#ff5a4d" opacity={0.55} />
          <Halo p={[-0.94, 0.38, -0.26]} size={0.3} color="#ff5a4d" opacity={0.55} />
          {speed !== 0 && (
            <>
              <group position={[2.05, 0.34, 0.26]} rotation={[0, 0, -Math.PI / 2]}>
                <mesh>
                  <coneGeometry args={[0.42, 2.3, 12, 1, true]} />
                  <meshBasicMaterial color="#ffe9b0" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
                </mesh>
              </group>
              <group position={[2.05, 0.34, -0.26]} rotation={[0, 0, -Math.PI / 2]}>
                <mesh>
                  <coneGeometry args={[0.42, 2.3, 12, 1, true]} />
                  <meshBasicMaterial color="#ffe9b0" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
                </mesh>
              </group>
            </>
          )}
        </group>
      )}
      {/* neon underglow */}
      {neonOn && (
        <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.9, 1.1]} />
          <meshBasicMaterial color={neon} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
      {wheels.map((w, i) => (
        <Wheel key={i} p={w} innerRef={(g) => (wheelRefs.current[i] = g)} />
      ))}
    </group>
  );
}

export { LightCone };
