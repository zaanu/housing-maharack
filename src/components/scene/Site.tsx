"use client";

// Gated-community campus around the tower: compound wall, main gate with
// signage and guard cabin, tree-lined driveway, visitor parking, flowering
// shrubs and a colourful children's playground — the "story" around the home.

import { useState } from "react";
import { Html } from "@react-three/drei";

const ASPHALT = "#41464d";
const KERB = "#d8d4c8";
const WALLC = "#cdd3d8";
const PILLAR = "#9aa3ab";
const STEELD = "#46535f";
const TRUNK = "#8a6f4d";
const LEAF_A = "#55893f";
const LEAF_B = "#6da14b";
const PLAY_RED = "#d23c3c";
const PLAY_YELLOW = "#f3c014";
const PLAY_BLUE = "#2e6bb0";
const PAD_BLUE = "#2f6cb3";
const PAD_SAND = "#dfa94e";
const GLOW = "#ffd9a0";

type V3 = [number, number, number];

function Bx({
  p,
  s,
  c,
  ry = 0,
  rz = 0,
  shadow = false,
}: {
  p: V3;
  s: V3;
  c: string;
  ry?: number;
  rz?: number;
  shadow?: boolean;
}) {
  return (
    <mesh position={p} rotation={[0, ry, rz]} castShadow={shadow}>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={0.85} />
    </mesh>
  );
}

function Palm({ p, h = 2.0 }: { p: V3; h?: number }) {
  const fronds = Array.from({ length: 6 }, (_, i) => (i * Math.PI) / 3);
  return (
    <group position={p}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.09, h, 8]} />
        <meshStandardMaterial color={TRUNK} roughness={1} />
      </mesh>
      {fronds.map((a, i) => (
        <mesh
          key={i}
          position={[Math.cos(a) * 0.32, h + 0.06, Math.sin(a) * 0.32]}
          rotation={[0.45 * Math.sin(a), -a, 0.45 * Math.cos(a)]}
          castShadow
        >
          <boxGeometry args={[0.72, 0.02, 0.16]} />
          <meshStandardMaterial color={i % 2 ? LEAF_A : LEAF_B} roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, h + 0.05, 0]}>
        <sphereGeometry args={[0.08, 8, 6]} />
        <meshStandardMaterial color={LEAF_A} roughness={1} />
      </mesh>
    </group>
  );
}

function Shrub({ p, flower = "#c75db4" }: { p: V3; flower?: string }) {
  return (
    <group position={p}>
      <mesh position={[0, 0.16, 0]} castShadow>
        <sphereGeometry args={[0.22, 8, 6]} />
        <meshStandardMaterial color={LEAF_A} roughness={1} />
      </mesh>
      <mesh position={[0.12, 0.26, 0.06]}>
        <sphereGeometry args={[0.1, 6, 5]} />
        <meshStandardMaterial color={flower} roughness={1} />
      </mesh>
      <mesh position={[-0.12, 0.24, -0.04]}>
        <sphereGeometry args={[0.08, 6, 5]} />
        <meshStandardMaterial color={flower} roughness={1} />
      </mesh>
    </group>
  );
}

function Lamp({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <Bx p={[0, 0.55, 0]} s={[0.05, 1.1, 0.05]} c={STEELD} />
      <mesh position={[0, 1.14, 0]}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial color={GLOW} emissive={GLOW} emissiveIntensity={1.4} />
      </mesh>
    </group>
  );
}

function Car({ p, c, ry = 0 }: { p: V3; c: string; ry?: number }) {
  const wheels: V3[] = [
    [0.55, 0.14, 0.42],
    [-0.55, 0.14, 0.42],
    [0.55, 0.14, -0.42],
    [-0.55, 0.14, -0.42],
  ];
  return (
    <group position={p} rotation={[0, ry, 0]}>
      <Bx p={[0, 0.32, 0]} s={[1.7, 0.3, 0.82]} c={c} shadow />
      <Bx p={[-0.1, 0.56, 0]} s={[0.9, 0.24, 0.74]} c={c} />
      <Bx p={[-0.1, 0.58, 0]} s={[0.86, 0.18, 0.76]} c="#2b3138" />
      {wheels.map((w, i) => (
        <mesh key={i} position={w} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 0.1, 10]} />
          <meshStandardMaterial color="#1d2126" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function Bench({ p, ry = 0 }: { p: V3; ry?: number }) {
  return (
    <group position={p} rotation={[0, ry, 0]}>
      <Bx p={[0, 0.18, 0]} s={[0.8, 0.05, 0.3]} c={TRUNK} />
      <Bx p={[0, 0.38, -0.13]} s={[0.8, 0.26, 0.05]} c={TRUNK} />
      <Bx p={[-0.32, 0.09, 0]} s={[0.06, 0.18, 0.26]} c={STEELD} />
      <Bx p={[0.32, 0.09, 0]} s={[0.06, 0.18, 0.26]} c={STEELD} />
    </group>
  );
}

function Playground() {
  return (
    <group position={[13, 0, 13]}>
      {/* rubber safety surface */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[4.4, 36]} />
        <meshStandardMaterial color={PAD_BLUE} roughness={1} />
      </mesh>
      <mesh position={[1.4, 0.022, 1.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.6, 28]} />
        <meshStandardMaterial color={PAD_SAND} roughness={1} />
      </mesh>

      {/* play tower with blue roof + slide */}
      <group position={[-1.6, 0, -1.3]}>
        {[[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]].map(([x, z], i) => (
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

      {/* swing set */}
      <group position={[1.6, 0, -1.6]}>
        <Bx p={[-1.0, 0.45, 0]} s={[0.06, 0.95, 0.06]} c={PLAY_RED} rz={0.2} />
        <Bx p={[-0.8, 0.45, 0]} s={[0.06, 0.95, 0.06]} c={PLAY_RED} rz={-0.2} />
        <Bx p={[1.0, 0.45, 0]} s={[0.06, 0.95, 0.06]} c={PLAY_RED} rz={0.2} />
        <Bx p={[0.8, 0.45, 0]} s={[0.06, 0.95, 0.06]} c={PLAY_RED} rz={-0.2} />
        <Bx p={[0, 0.92, 0]} s={[2.0, 0.06, 0.06]} c={PLAY_YELLOW} />
        {[-0.35, 0.35].map((x) => (
          <group key={x}>
            <Bx p={[x - 0.12, 0.55, 0]} s={[0.02, 0.7, 0.02]} c="#888" />
            <Bx p={[x + 0.12, 0.55, 0]} s={[0.02, 0.7, 0.02]} c="#888" />
            <Bx p={[x, 0.2, 0]} s={[0.3, 0.04, 0.14]} c={PLAY_YELLOW} />
          </group>
        ))}
      </group>

      {/* merry-go-round */}
      <group position={[-0.6, 0, 1.7]}>
        <mesh position={[0, 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.55, 0.55, 0.06, 16]} />
          <meshStandardMaterial color={PLAY_YELLOW} roughness={0.8} />
        </mesh>
        <Bx p={[0, 0.3, 0]} s={[0.05, 0.35, 0.05]} c={PLAY_RED} />
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((a) => (
          <Bx key={a} p={[Math.cos(a) * 0.3, 0.32, Math.sin(a) * 0.3]} s={[0.04, 0.3, 0.04]} c={PLAY_RED} ry={a} />
        ))}
      </group>

      {/* seesaw */}
      <group position={[2.3, 0, 1.2]}>
        <Bx p={[0, 0.16, 0]} s={[0.12, 0.32, 0.2]} c={PLAY_RED} />
        <Bx p={[0, 0.32, 0]} s={[1.8, 0.05, 0.22]} c={PLAY_YELLOW} rz={0.18} shadow />
      </group>

      {/* spring rider */}
      <group position={[0.6, 0, 0.4]}>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.05, 0.07, 0.22, 8]} />
          <meshStandardMaterial color="#9aa3ab" roughness={0.6} metalness={0.4} />
        </mesh>
        <Bx p={[0, 0.3, 0]} s={[0.45, 0.12, 0.14]} c={PLAY_RED} />
        <Bx p={[0.2, 0.42, 0]} s={[0.1, 0.16, 0.1]} c={PLAY_YELLOW} />
      </group>
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
      {/* crosswalk outside the gate */}
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
        <Bx p={[0, 1.98, 0]} s={[5.3, 0.38, 0.42]} c={STEELD} shadow />
        <Html position={[0, 1.98, 0.25]} center distanceFactor={16} zIndexRange={[25, 0]}>
          <div className="pointer-events-none select-none whitespace-nowrap rounded bg-transparent text-center">
            <p className="text-[11px] font-bold tracking-[0.25em] text-amber-100 drop-shadow">MAHARACK HEIGHTS</p>
          </div>
        </Html>
        {/* open gate leaves */}
        <group position={[-1.95, 0, 0]} rotation={[0, -0.95, 0]}>
          <Bx p={[0.85, 0.6, 0]} s={[1.7, 1.1, 0.06]} c={STEELD} />
          <Bx p={[0.85, 0.62, 0.04]} s={[1.5, 0.9, 0.02]} c="#5b6a78" />
        </group>
        <group position={[1.95, 0, 0]} rotation={[0, 0.95, 0]}>
          <Bx p={[-0.85, 0.6, 0]} s={[1.7, 1.1, 0.06]} c={STEELD} />
          <Bx p={[-0.85, 0.62, 0.04]} s={[1.5, 0.9, 0.02]} c="#5b6a78" />
        </group>
        {/* guard cabin */}
        <group position={[3.8, 0, -0.7]}>
          <Bx p={[0, 0.48, 0]} s={[1.1, 0.96, 1.0]} c="#e9e3d4" shadow />
          <Bx p={[0, 0.62, 0.51]} s={[0.7, 0.4, 0.02]} c="#3d4a57" />
          <Bx p={[0, 1.0, 0]} s={[1.3, 0.08, 1.2]} c={STEELD} />
        </group>
      </group>

      {/* ---- landscaping ---- */}
      {([
        [-4.8, 16], [4.8, 16], [-4.8, 19.5], [4.8, 19.5], [-4.8, 23], [4.8, 23],
        [9.5, 13.5], [17, 16.2], [17.5, 10], [-20, 22], [20, 23], [-21, -14],
        [21, -14], [-15, 18.5], [-12, -15.5], [12, -15.5],
      ] as [number, number][]).map(([x, z], i) => (
        <Palm key={i} p={[x, 0, z]} h={1.7 + ((i * 7) % 5) * 0.14} />
      ))}
      {([
        [-21.5, 24.8, "#c75db4"], [-17.5, 24.8, "#e7e0d3"], [-13.5, 24.8, "#c75db4"],
        [-9.5, 24.8, "#d98a4a"], [-5.5, 24.8, "#e7e0d3"], [5.5, 24.8, "#c75db4"],
        [9.5, 24.8, "#e7e0d3"], [13.5, 24.8, "#c75db4"], [17.5, 24.8, "#d98a4a"],
        [21.5, 24.8, "#e7e0d3"], [-23.2, 12, "#c75db4"], [-23.2, 2, "#e7e0d3"],
        [23.2, 6, "#c75db4"], [23.2, -4, "#d98a4a"], [8.3, 9.3, "#c75db4"], [18, 13.4, "#e7e0d3"],
      ] as [number, number, string][]).map(([x, z, c], i) => (
        <Shrub key={i} p={[x, 0, z]} flower={c} />
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
      <Car p={[-6.2, 0, 22.6]} c="#a83a3a" ry={0} />
      <Car p={[-6.2, 0, 20.4]} c="#3b4a5f" ry={0} />
      <Car p={[1.05, 0, 30.5]} c="#7c2f3e" ry={Math.PI / 2} />

      <Playground />
      <Bench p={[9.0, 0, 11.4]} ry={0.8} />
      <Bench p={[17.6, 0, 13.6]} ry={-0.9} />

      {/* ---- amenity hover labels ---- */}
      <SiteZone p={[13, 0, 13]} s={[9, 1.4, 9]} name="Children's Playground" detail={'55\' × 55\' · rubber-padded play court'} active={hover === "Children's Playground"} onHover={setHover} />
      <SiteZone p={[0, 0, 26.2]} s={[6, 2.4, 2.2]} name="Main Entrance Gate" detail="24×7 security · guard cabin" active={hover === "Main Entrance Gate"} onHover={setHover} />
      <SiteZone p={[-6.2, 0, 21.5]} s={[4.6, 1.2, 6.6]} name="Visitor Parking" detail="6 covered bays" active={hover === "Visitor Parking"} onHover={setHover} />
      <SiteZone p={[-14, 0, 8]} s={[10, 0.8, 12]} name="Landscaped Garden" detail="Palm court · flowering shrubs" active={hover === "Landscaped Garden"} onHover={setHover} />
    </group>
  );
}
