"use client";

// The far side of the road: a Vaishno Dhaba with its tandoor, plastic
// chairs, charpais and string lights; an HP petrol pump with canopy, pylon
// and dispensers; and Mittal International School with its gate arch,
// tricolour flag and playground. A school bus idles at the gate while kids
// in uniform stream out and mothers in sarees walk them home.

import { useState } from "react";
import { Html } from "@react-three/drei";
import Car, { Bus } from "./Vehicles";
import { Halo, LightCone } from "./glow";
import { Walker, Sitter, Person } from "./People";
import { useSceneMode } from "./mode";

type V3 = [number, number, number];

const ROAD_Z = 35.2; // keep in sync with Traffic.tsx

function Bx({ p, s, c, ry = 0, glow = 0 }: { p: V3; s: V3; c: string; ry?: number; glow?: number }) {
  return (
    <mesh position={p} rotation={[0, ry, 0]} castShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={c}
        roughness={0.85}
        emissive={glow > 0 ? c : "#000000"}
        emissiveIntensity={glow}
      />
    </mesh>
  );
}

function Cyl({ p, r, h, c, glow = 0 }: { p: V3; r: number; h: number; c: string; glow?: number }) {
  return (
    <mesh position={p} castShadow>
      <cylinderGeometry args={[r, r, h, 12]} />
      <meshStandardMaterial color={c} roughness={0.9} emissive={glow > 0 ? c : "#000000"} emissiveIntensity={glow} />
    </mesh>
  );
}

/** Roadside hover label, same pattern as the campus SiteZone. */
function Spot({ p, s, name, detail }: { p: V3; s: V3; name: string; detail: string }) {
  const [hover, setHover] = useState(false);
  return (
    <group position={p}>
      <mesh
        position={[0, s[1] / 2, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
      >
        <boxGeometry args={s} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {hover && (
        <Html position={[0, s[1] + 0.6, 0]} center distanceFactor={18} zIndexRange={[30, 0]}>
          <div className="pointer-events-none select-none whitespace-nowrap rounded-xl bg-slate-900/90 px-3 py-1.5 text-center shadow-lg backdrop-blur">
            <p className="text-[12px] font-semibold text-white">{name}</p>
            <p className="text-[10px] text-slate-300">{detail}</p>
          </div>
        </Html>
      )}
    </group>
  );
}

/* ------------------------------- dhaba ---------------------------------- */

function PlasticTable({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <Cyl p={[0, 0.3, 0]} r={0.26} h={0.025} c="#f4f1e8" />
      <Cyl p={[0, 0.15, 0]} r={0.03} h={0.3} c="#d8d4c8" />
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((a) => (
        <Bx key={a} p={[Math.cos(a) * 0.42, 0.14, Math.sin(a) * 0.42]} s={[0.16, 0.28, 0.16]} c="#c0392b" ry={-a} />
      ))}
    </group>
  );
}

function Charpai({ p, ry = 0 }: { p: V3; ry?: number }) {
  return (
    <group position={p} rotation={[0, ry, 0]}>
      <Bx p={[0, 0.16, 0]} s={[0.95, 0.035, 0.5]} c="#d8b173" />
      {([[-0.43, -0.21], [0.43, -0.21], [-0.43, 0.21], [0.43, 0.21]] as [number, number][]).map(([x, z], i) => (
        <Bx key={i} p={[x, 0.08, z]} s={[0.05, 0.16, 0.05]} c="#8a6038" />
      ))}
    </group>
  );
}

function Dhaba({ p }: { p: V3 }) {
  const { lit } = useSceneMode();
  return (
    <group position={p}>
      {/* packed-earth forecourt */}
      <Bx p={[0, 0.012, 0]} s={[11, 0.025, 8]} c="#a08a64" />
      {/* kitchen building at the back */}
      <group position={[0, 0, 2.4]}>
        <Bx p={[0, 0.75, 0]} s={[5.4, 1.5, 2.6]} c="#f0e0bd" />
        <Bx p={[0, 1.56, 0]} s={[5.8, 0.14, 3.0]} c="#8a6038" />
        {/* open serving front with red pillars + counter */}
        <Bx p={[-2.5, 0.75, -1.32]} s={[0.18, 1.5, 0.18]} c="#c0392b" />
        <Bx p={[2.5, 0.75, -1.32]} s={[0.18, 1.5, 0.18]} c="#c0392b" />
        <Bx p={[0, 0.42, -1.28]} s={[3.6, 0.84, 0.3]} c="#b1452f" />
        <Bx p={[0, 0.87, -1.3]} s={[3.7, 0.06, 0.36]} c="#e9ddc8" />
        {/* hot case + pots on the counter */}
        <Bx p={[-1.1, 1.02, -1.3]} s={[0.5, 0.24, 0.24]} c="#cfd6dc" glow={lit ? 0.4 : 0} />
        {["#6b6f74", "#8c5a30", "#6b6f74"].map((c, i) => (
          <Cyl key={i} p={[0.2 + i * 0.4, 0.96, -1.3]} r={0.1} h={0.14} c={c} />
        ))}
        {/* signboard */}
        <Bx p={[0, 1.85, -1.45]} s={[4.6, 0.5, 0.1]} c="#f3c014" glow={lit ? 0.9 : 0.15} />
        <Html position={[0, 1.85, -1.55]} center distanceFactor={16} zIndexRange={[14, 0]}>
          <div className="pointer-events-none select-none whitespace-nowrap text-center">
            <p className="text-[11px] font-black tracking-wide text-[#a31621]">VAISHNO DHABA</p>
            <p className="text-[6.5px] font-bold tracking-[0.25em] text-[#1a3a1a]">PURE VEG · SINCE 1987</p>
          </div>
        </Html>
        {/* string lights along the eave */}
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} position={[-2.4 + i * 0.6, 1.48, -1.42]}>
            <sphereGeometry args={[0.035, 8, 6]} />
            <meshStandardMaterial
              color={["#ffb454", "#ff5a8a", "#5fd8f0"][i % 3]}
              emissive={["#ffb454", "#ff5a8a", "#5fd8f0"][i % 3]}
              emissiveIntensity={lit ? 1.8 : 0.1}
            />
          </mesh>
        ))}
      </group>
      {/* tandoor with a live fire */}
      <group position={[2.9, 0, 0.9]}>
        <Cyl p={[0, 0.3, 0]} r={0.24} h={0.6} c="#b07040" />
        <mesh position={[0, 0.61, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.16, 14]} />
          <meshStandardMaterial color="#ff7a2d" emissive="#ff7a2d" emissiveIntensity={1.6} />
        </mesh>
        <Halo p={[0, 0.72, 0]} size={0.55} color="#ff9a4d" opacity={0.4} />
      </group>
      {/* seating: plastic tables + charpais */}
      <PlasticTable p={[-1.6, 0, -0.6]} />
      <PlasticTable p={[0.4, 0, -1.4]} />
      <PlasticTable p={[1.9, 0, -0.3]} />
      <Charpai p={[-3.6, 0, 0.6]} ry={0.4} />
      <Charpai p={[-3.9, 0, 2.2]} ry={-0.2} />
      {/* diners + the waiter weaving between tables */}
      <Sitter p={[-1.18, 0.31, -0.6]} ry={Math.PI} shirt="#3a6ea5" />
      <Sitter p={[-2.02, 0.31, -0.6]} ry={0} shirt="#e8a23c" />
      <Sitter p={[0.4, 0.31, -0.98]} ry={-Math.PI / 2} shirt="#8a5fa8" skin="#8a5a3b" />
      <Walker
        path={[[0, 0.9], [-1.6, 0.1], [-0.6, -1.6], [0.9, -2.0], [1.9, -1.0], [1.2, 0.4]]}
        speed={0.55}
        shirt="#f4f1e8"
        pants="#5a4a3a"
        skin="#a8754f"
      />
      <Walker
        path={[[-2.6, -3.2], [-1.2, -1.4], [0.8, -0.6], [2.4, -1.8], [1.4, -3.4]]}
        speed={0.45}
        offset={6}
        shirt="#2f9e8f"
        pants="#3a4660"
      />
      {/* trucker's lorry pulled up beside */}
      <group position={[4.6, 0, 2.0]} rotation={[0, 0.12, 0]}>
        <Bx p={[1.0, 0.45, 0]} s={[0.8, 0.7, 1.0]} c="#2e6bb0" />
        <Bx p={[1.42, 0.55, 0]} s={[0.06, 0.3, 0.9]} c="#1d2733" />
        <Bx p={[-0.35, 0.62, 0]} s={[1.9, 0.95, 1.05]} c="#46b46e" />
        <Bx p={[-0.35, 1.12, 0]} s={[1.95, 0.08, 1.1]} c="#f3c014" />
        {([[1.2, 0.55], [-0.9, 0.55], [0.1, 0.55], [1.2, -0.55], [-0.9, -0.55], [0.1, -0.55]] as [number, number][]).map(
          ([x, z], i) => (
            <mesh key={i} position={[x, 0.18, z]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.18, 0.18, 0.14, 12]} />
              <meshStandardMaterial color="#15181c" roughness={0.9} />
            </mesh>
          )
        )}
      </group>
      <Spot p={[0, 0, 0]} s={[10.5, 2.2, 7.5]} name="Vaishno Dhaba" detail="Pure veg · tandoori rotis · truckers' favourite" />
    </group>
  );
}

/* ----------------------------- petrol pump ------------------------------ */

function Dispenser({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <Bx p={[0, 0.06, 0]} s={[1.5, 0.12, 0.7]} c="#c9c4b6" />
      <Bx p={[0, 0.42, 0]} s={[0.34, 0.6, 0.26]} c="#f4f1e8" />
      <Bx p={[0, 0.62, 0]} s={[0.36, 0.18, 0.28]} c="#1a3a8c" />
      <Bx p={[0, 0.38, 0.135]} s={[0.22, 0.16, 0.01]} c="#23282e" />
      <Bx p={[0.2, 0.42, 0]} s={[0.03, 0.3, 0.03]} c="#23282e" />
    </group>
  );
}

function PetrolPump({ p }: { p: V3 }) {
  const { lit } = useSceneMode();
  return (
    <group position={p}>
      {/* concrete apron */}
      <Bx p={[0, 0.01, 0]} s={[13, 0.022, 8.5]} c="#b4b0a3" />
      {/* canopy on four columns */}
      {([[-3.6, -1.6], [3.6, -1.6], [-3.6, 1.6], [3.6, 1.6]] as [number, number][]).map(([x, z], i) => (
        <Bx key={i} p={[x, 1.25, z]} s={[0.22, 2.5, 0.22]} c="#f4f1e8" />
      ))}
      <Bx p={[0, 2.62, 0]} s={[9.6, 0.22, 5.4]} c="#f4f1e8" />
      {/* fascia: HP blue band with red stripe */}
      <Bx p={[0, 2.5, 2.72]} s={[9.6, 0.5, 0.08]} c="#1a3a8c" glow={lit ? 0.5 : 0.05} />
      <Bx p={[0, 2.5, -2.72]} s={[9.6, 0.5, 0.08]} c="#1a3a8c" glow={lit ? 0.5 : 0.05} />
      <Bx p={[4.82, 2.5, 0]} s={[0.08, 0.5, 5.4]} c="#1a3a8c" glow={lit ? 0.5 : 0.05} />
      <Bx p={[-4.82, 2.5, 0]} s={[0.08, 0.5, 5.4]} c="#1a3a8c" glow={lit ? 0.5 : 0.05} />
      <Bx p={[0, 2.28, 2.73]} s={[9.6, 0.07, 0.06]} c="#d23c2e" glow={lit ? 0.5 : 0.05} />
      <Html position={[0, 2.52, 2.8]} center distanceFactor={16} zIndexRange={[14, 0]}>
        <p className="pointer-events-none select-none whitespace-nowrap text-[11px] font-black tracking-[0.2em] text-white">
          HP · HINDUSTAN PETROLEUM
        </p>
      </Html>
      {/* under-canopy lights */}
      {lit && (
        <>
          <Halo p={[-2, 2.45, 0]} size={1.6} color="#eef4ff" opacity={0.4} />
          <Halo p={[2, 2.45, 0]} size={1.6} color="#eef4ff" opacity={0.4} />
          <LightCone p={[-2, 2.45, 0]} h={2.3} r={1.4} color="#dfeaff" opacity={0.05} />
          <LightCone p={[2, 2.45, 0]} h={2.3} r={1.4} color="#dfeaff" opacity={0.05} />
        </>
      )}
      {/* dispensers + customer car + attendant */}
      <Dispenser p={[-2, 0, 0]} />
      <Dispenser p={[2, 0, 0]} />
      <Car p={[-2, 0, 1.1]} ry={0.06} color="#e0e4e8" kind="sedan" lights={false} />
      <group position={[-1.4, 0, 0.45]} rotation={[0, -Math.PI / 2, 0]}>
        <Person shirt="#e8731a" pants="#27364a" skin="#8a5a3b" />
      </group>
      {/* HP pylon sign */}
      <group position={[-5.6, 0, 3.3]}>
        <Bx p={[0, 1.5, 0]} s={[0.28, 3.0, 0.28]} c="#d8d4c8" />
        <Bx p={[0, 3.3, 0]} s={[1.5, 1.1, 0.22]} c="#f4f1e8" glow={lit ? 0.6 : 0.05} />
        <Html position={[0, 3.32, 0.16]} center distanceFactor={15} zIndexRange={[14, 0]}>
          <div className="pointer-events-none select-none text-center leading-tight">
            <p className="text-[16px] font-black text-[#1a3a8c]">HP</p>
            <p className="text-[5.5px] font-bold tracking-wider text-[#d23c2e]">PETROL · DIESEL</p>
          </div>
        </Html>
      </group>
      {/* air-and-water shack */}
      <group position={[4.6, 0, -2.6]}>
        <Bx p={[0, 0.7, 0]} s={[2.4, 1.4, 1.6]} c="#e9e3d4" />
        <Bx p={[0, 1.46, 0]} s={[2.6, 0.1, 1.8]} c="#1a3a8c" />
        <Bx p={[-0.4, 0.6, 0.81]} s={[0.8, 1.0, 0.02]} c="#9fc6dd" />
      </group>
      <Spot p={[0, 0, 0]} s={[12.5, 3, 8]} name="HP Petrol Pump" detail="Petrol · diesel · air & water · 24×7" />
    </group>
  );
}

/* -------------------------------- school -------------------------------- */

function Flag({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <Cyl p={[0, 1.3, 0]} r={0.025} h={2.6} c="#d8d4c8" />
      <Bx p={[0.23, 2.48, 0]} s={[0.42, 0.09, 0.015]} c="#ff9933" />
      <Bx p={[0.23, 2.39, 0]} s={[0.42, 0.09, 0.015]} c="#ffffff" />
      <Bx p={[0.23, 2.3, 0]} s={[0.42, 0.09, 0.015]} c="#138808" />
    </group>
  );
}

function School({ p }: { p: V3 }) {
  const { lit } = useSceneMode();
  const windows: V3[] = [];
  for (let f = 0; f < 2; f++) {
    for (let i = 0; i < 7; i++) {
      windows.push([-5.4 + i * 1.8, 0.75 + f * 1.05, -2.01]);
    }
  }
  return (
    <group position={p}>
      {/* compound ground + boundary wall with a gate gap on the road side */}
      <Bx p={[0, 0.008, 0]} s={[24, 0.018, 14]} c="#c2b394" />
      <Bx p={[-7.25, 0.3, -7]} s={[9.5, 0.6, 0.18]} c="#e3d9c0" />
      <Bx p={[7.25, 0.3, -7]} s={[9.5, 0.6, 0.18]} c="#e3d9c0" />
      <Bx p={[0, 0.3, 7]} s={[24, 0.6, 0.18]} c="#e3d9c0" />
      <Bx p={[-12, 0.3, 0]} s={[0.18, 0.6, 14]} c="#e3d9c0" />
      <Bx p={[12, 0.3, 0]} s={[0.18, 0.6, 14]} c="#e3d9c0" />
      {/* gate arch */}
      <Bx p={[-2.6, 1.0, -7]} s={[0.4, 2.0, 0.4]} c="#2e6bb0" />
      <Bx p={[2.6, 1.0, -7]} s={[0.4, 2.0, 0.4]} c="#2e6bb0" />
      <Bx p={[0, 2.18, -7]} s={[5.8, 0.55, 0.3]} c="#f4f1e8" glow={lit ? 0.45 : 0.05} />
      <Html position={[0, 2.18, -7.2]} center distanceFactor={17} zIndexRange={[14, 0]}>
        <p className="pointer-events-none select-none whitespace-nowrap text-[9px] font-black tracking-[0.12em] text-[#1a3a8c]">
          MITTAL INTERNATIONAL SCHOOL
        </p>
      </Html>
      {/* main two-storey block */}
      <group position={[0, 0, 3.2]}>
        <Bx p={[0, 1.15, 0]} s={[13.6, 2.3, 4.2]} c="#f5edd8" />
        <Bx p={[0, 2.36, 0]} s={[14.0, 0.14, 4.6]} c="#2e6bb0" />
        <Bx p={[0, 1.18, -2.12]} s={[13.6, 0.1, 0.06]} c="#2e6bb0" />
        {/* entrance porch */}
        <Bx p={[0, 0.55, -2.5]} s={[2.2, 1.1, 1.0]} c="#e9ddc8" />
        <Bx p={[0, 1.16, -2.5]} s={[2.6, 0.12, 1.3]} c="#2e6bb0" />
        {windows.map((w, i) => (
          <Bx key={i} p={w} s={[1.0, 0.62, 0.04]} c="#9fc6dd" glow={lit ? 0.25 : 0} />
        ))}
      </group>
      <Flag p={[-4.2, 0, -0.6]} />
      {/* playground corner: slide + seesaw + kids at play */}
      <group position={[7.5, 0, -3.4]}>
        <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.8, 26]} />
          <meshStandardMaterial color="#dfa94e" roughness={1} />
        </mesh>
        <Bx p={[-1.2, 0.16, 0]} s={[0.12, 0.32, 0.2]} c="#d23c3c" />
        <Bx p={[-0.55, 0.32, 0]} s={[1.6, 0.05, 0.22]} c="#f3c014" ry={0} glow={0} />
        <Bx p={[0.9, 0.18, 0.6]} s={[0.1, 0.36, 0.1]} c="#2e6bb0" />
        <Bx p={[0.9, 0.36, 0.6]} s={[1.7, 0.05, 0.18]} c="#d23c3c" />
        <Walker
          path={[[2.0, 0], [1.4, 1.4], [0, 2.0], [-1.4, 1.4], [-2.0, 0], [-1.4, -1.4], [0, -2.0], [1.4, -1.4]]}
          speed={1.1}
          shirt="#f3f6fa"
          pants="#27364a"
          scale={0.55}
          backpack="#d23c3c"
        />
        <Walker
          path={[[2.0, 0], [1.4, 1.4], [0, 2.0], [-1.4, 1.4], [-2.0, 0], [-1.4, -1.4], [0, -2.0], [1.4, -1.4]]}
          speed={1.1}
          offset={5}
          shirt="#f3f6fa"
          pants="#27364a"
          skin="#8a5a3b"
          scale={0.52}
          backpack="#2e6bb0"
        />
      </group>
      <Spot p={[0, 0, 0]} s={[23, 3, 13.5]} name="Mittal International School" detail="Nursery to Class XII · CBSE" />
    </group>
  );
}

/* --------------------------- school bus stop ---------------------------- */

function BusStop() {
  // bus idling at the school gate; kids stream from the door to the gate
  // and mothers walk their kids home along the sidewalk
  const KID_PATH: [number, number][] = [
    [31.2, 39.5],
    [33.4, 40.3],
    [36.2, 41.5],
    [38, 42.6],
    [38.8, 43.4],
    [37.6, 42.5],
    [34.6, 40.9],
    [31.8, 39.8],
  ];
  const HOME_PATH: [number, number][] = [
    [38.5, 40.0],
    [26, 39.85],
    [14, 39.85],
    [13.4, 40.5],
    [25, 40.55],
    [38.2, 40.7],
  ];
  return (
    <group>
      <Bus p={[29.4, 0, 38.55]} ry={0} label="MITTAL INTL SCHOOL" />
      {/* kids in uniform hopping off the bus and heading for the gate */}
      <Walker path={KID_PATH} speed={0.75} shirt="#f3f6fa" pants="#27364a" scale={0.55} backpack="#d23c3c" />
      <Walker path={KID_PATH} speed={0.75} offset={5} shirt="#f3f6fa" pants="#27364a" skin="#8a5a3b" scale={0.58} backpack="#2e6bb0" />
      <Walker path={KID_PATH} speed={0.75} offset={11} shirt="#f3f6fa" pants="#27364a" skin="#e0b08c" scale={0.52} backpack="#f3c014" />
      {/* mothers waiting at the gate */}
      <group position={[36.6, 0, 41.4]} rotation={[0, -Math.PI / 2 - 0.5, 0]}>
        <Person shirt="#d23c6e" dress="#d23c6e" skin="#cfa180" />
      </group>
      <group position={[40, 0, 41.6]} rotation={[0, Math.PI + 0.8, 0]}>
        <Person shirt="#e8a23c" dress="#b1452f" skin="#a8754f" />
      </group>
      {/* two mother-and-kid pairs walking home along the sidewalk */}
      <Walker path={HOME_PATH} speed={0.5} shirt="#2f9e8f" dress="#2f9e8f" skin="#cfa180" />
      <Walker path={HOME_PATH} speed={0.5} offset={-0.55} shirt="#f3f6fa" pants="#27364a" scale={0.55} backpack="#46b46e" />
      <Walker path={HOME_PATH} speed={0.47} offset={14} shirt="#8a5fa8" dress="#8a5fa8" skin="#a8754f" />
      <Walker path={HOME_PATH} speed={0.47} offset={13.45} shirt="#f3f6fa" pants="#27364a" skin="#8a5a3b" scale={0.57} backpack="#e8731a" />
    </group>
  );
}

export default function Roadside() {
  return (
    <group>
      <PetrolPump p={[-26, 0, 45.5]} />
      <Dhaba p={[-8, 0, 44.5]} />
      <School p={[40, 0, 50]} />
      <BusStop />
      {/* dusty access aprons connecting each plot to the road */}
      {[-26, -8].map((x) => (
        <Bx key={x} p={[x, 0.005, 41.3]} s={[6, 0.012, 2.6]} c="#9b9484" />
      ))}
      <Bx p={[38.5, 0.005, 41.7]} s={[7, 0.012, 2.8]} c="#9b9484" />
    </group>
  );
}
