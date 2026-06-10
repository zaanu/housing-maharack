"use client";

// flow.life-inspired interior: warm cream, organic shapes, biophilic olive tree,
// matte black fixtures, curved built-in seating, pendant pendants.

import { useState } from "react";
import { Html } from "@react-three/drei";
import type { RoomHover } from "./Interior";

// ── Palette ───────────────────────────────────────────────────────────────────
const SAND     = "#F2E6D5";  // warm sand wall
const CREAM    = "#F8F0E3";  // slightly lighter
const WD_LIGHT = "#E0CBAA";  // warm blond floor
const WD_DARK  = "#C4A070";  // slightly darker trim
const ORGANIC  = "#F5EFE5";  // organic seating
const TABLE_W  = "#F0EBE3";  // white rounded table
const KIT_CAB  = "#EDE5D8";  // kitchen cabinet
const COUNTER  = "#D8D0C0";  // stone countertop
const BLACK    = "#2A2A2A";  // matte black fixtures
const GLASS_W  = "#D8EEF8";  // window glass
const CURTAIN  = "#F8F2EC";  // sheer curtain
const GLOW_W   = "#FFF0C8";  // warm pendant glow
const OLV_GRN  = "#6A8A5A";  // olive foliage
const OLV_LT   = "#8AAA72";  // lighter foliage
const OLV_TRK  = "#8A6A48";  // olive trunk
const SHELF_W  = "#EDE8E0";  // floating shelf
const POT_W    = "#D8D0C4";  // pot/planter

type V3 = [number, number, number];

const FT_PER_UNIT = 6;
function ftDim(su: number): string {
  const ft = su * FT_PER_UNIT;
  const whole = Math.floor(ft);
  const inches = Math.round((ft - whole) * 12);
  return inches === 0 ? `${whole}'0"` : `${whole}'${inches}"`;
}

function B({ p, s, c, glow = 0, rough = 0.85, metal = 0 }: {
  p: V3; s: V3; c: string; glow?: number; rough?: number; metal?: number;
}) {
  return (
    <mesh position={p} castShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={c} roughness={rough} metalness={metal}
        emissive={glow > 0 ? c : "#000000"} emissiveIntensity={glow}
      />
    </mesh>
  );
}

function Cyl({ p, r, h, c, rough = 0.7 }: { p: V3; r: number; h: number; c: string; rough?: number }) {
  return (
    <mesh position={p} castShadow>
      <cylinderGeometry args={[r, r * 1.05, h, 14]} />
      <meshStandardMaterial color={c} roughness={rough} />
    </mesh>
  );
}

function RoomZone({
  zone, M, onSelect, onHover,
}: {
  zone: { name: string; x: number; z: number; w: number; d: number; tipY?: number };
  M: (x: number, y: number, z: number) => V3;
  onSelect: () => void;
  onHover: (r: RoomHover | null) => void;
}) {
  const { name, x, z, w, d, tipY = 0.6 } = zone;
  const c = M(x, 0, z);
  return (
    <mesh
      position={[c[0], tipY / 2 + 0.02, c[2]]}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
        onHover({ name, dims: `${ftDim(w)} × ${ftDim(d)}`, x: c[0], z: c[2], tipY: tipY + 0.42 });
      }}
      onPointerOut={() => { document.body.style.cursor = "auto"; onHover(null); }}
    >
      <boxGeometry args={[w, tipY, d]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function RoomTip({ hover }: { hover: RoomHover | null }) {
  if (!hover) return null;
  return (
    <Html position={[hover.x, hover.tipY, hover.z]} center distanceFactor={9} zIndexRange={[40, 0]}>
      <div className="pointer-events-none select-none whitespace-nowrap rounded-lg bg-[#2A2420]/90 px-2.5 py-1 text-center shadow-lg backdrop-blur">
        <p className="text-[11px] font-semibold leading-tight text-white">{hover.name}</p>
        <p className="text-[9.5px] leading-tight text-amber-200">{hover.dims}</p>
      </div>
    </Html>
  );
}

// ── Olive tree (biophilic statement piece) ────────────────────────────────────
function OliveTree({ p }: { p: V3 }) {
  return (
    <group position={p}>
      {/* main trunk */}
      <Cyl p={[0, 0.3, 0]} r={0.04} h={0.6} c={OLV_TRK} />
      <Cyl p={[0, 0.7, 0]} r={0.03} h={0.4} c={OLV_TRK} />
      {/* side branches */}
      <mesh position={[-0.12, 0.72, 0.05]} rotation={[0, 0, 0.5]} castShadow>
        <cylinderGeometry args={[0.015, 0.025, 0.32, 8]} />
        <meshStandardMaterial color={OLV_TRK} roughness={0.9} />
      </mesh>
      <mesh position={[0.1, 0.68, -0.08]} rotation={[0, 0, -0.4]} castShadow>
        <cylinderGeometry args={[0.012, 0.022, 0.28, 8]} />
        <meshStandardMaterial color={OLV_TRK} roughness={0.9} />
      </mesh>
      {/* foliage clusters */}
      {([
        [0, 0.98, 0, 0.22, OLV_GRN],
        [-0.18, 0.88, 0.06, 0.17, OLV_LT],
        [0.16, 0.85, -0.1, 0.16, OLV_GRN],
        [-0.08, 0.82, -0.16, 0.13, OLV_LT],
        [0.06, 0.92, 0.18, 0.14, OLV_GRN],
        [-0.22, 0.76, -0.04, 0.12, OLV_LT],
      ] as Array<[number, number, number, number, string]>).map(([x, y, z, r, col], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <sphereGeometry args={[r, 10, 8]} />
          <meshStandardMaterial color={col} roughness={1} />
        </mesh>
      ))}
      {/* planter */}
      <Cyl p={[0, 0.07, 0]} r={0.11} h={0.14} c={POT_W} />
    </group>
  );
}

// ── Organic curved sofa (U-shaped approximation) ──────────────────────────────
function OrganicSofa({ cx, cz, w, d, sx }: { cx: number; cz: number; w: number; d: number; sx: 1 | -1 }) {
  const bh = 0.23; // back height
  const sh = 0.14; // seat height
  const aw = 0.1;  // arm width
  return (
    <group position={[cx, 0, cz]}>
      {/* back */}
      <B p={[0, sh + bh / 2, (-d / 2 + aw) * sx]} s={[w - aw * 2, bh, aw * 1.2]} c={ORGANIC} />
      {/* seat */}
      <B p={[0, sh / 2, 0]} s={[w - aw * 2, sh, d - aw]} c={ORGANIC} rough={0.9} />
      {/* left arm */}
      <B p={[(-w / 2 + aw / 2), sh / 2, 0]} s={[aw, sh + bh * 0.6, d]} c={ORGANIC} />
      {/* right arm */}
      <B p={[(w / 2 - aw / 2), sh / 2, 0]} s={[aw, sh + bh * 0.6, d]} c={ORGANIC} />
      {/* cushion seams */}
      {[-w * 0.15, w * 0.15].map((ox, i) => (
        <B key={i} p={[ox, sh + 0.005, 0]} s={[0.012, 0.01, d - aw]} c={SAND} />
      ))}
    </group>
  );
}

// ── Organic coffee table ──────────────────────────────────────────────────────
function OrganicTable({ p }: { p: V3 }) {
  return (
    <group position={p}>
      {/* rounded top — approximate with a squashed box */}
      <B p={[0, 0.16, 0]} s={[0.8, 0.06, 0.55]} c={ORGANIC} rough={0.6} />
      {/* single organic pedestal leg */}
      <B p={[0, 0.08, 0]} s={[0.18, 0.16, 0.18]} c={ORGANIC} rough={0.6} />
      {/* flowers on table */}
      <Cyl p={[0.08, 0.28, 0.04]} r={0.025} h={0.1} c="#C89898" />
      <mesh position={[0.08, 0.34, 0.04]} castShadow>
        <sphereGeometry args={[0.04, 8, 6]} />
        <meshStandardMaterial color="#E8C8C0" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ── LED shelf ─────────────────────────────────────────────────────────────────
function LedShelf({ p, w }: { p: V3; w: number }) {
  return (
    <group position={p}>
      <B p={[0, 0, 0]} s={[w, 0.04, 0.18]} c={SHELF_W} />
      {/* LED strip glow underneath */}
      <B p={[0, -0.03, -0.04]} s={[w * 0.85, 0.015, 0.02]} c={GLOW_W} glow={1.5} />
    </group>
  );
}

// ── Pendant light ─────────────────────────────────────────────────────────────
function Pendant({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <Cyl p={[0, 0, 0]} r={0.006} h={0.35} c={BLACK} />
      <mesh position={[0, -0.18, 0]} castShadow>
        <sphereGeometry args={[0.055, 10, 8]} />
        <meshStandardMaterial color={BLACK} roughness={0.3} metalness={0.6} />
      </mesh>
      <B p={[0, -0.18, 0]} s={[0.03, 0.03, 0.03]} c={GLOW_W} glow={3.5} />
    </group>
  );
}

// ── Large window with sheer curtain ──────────────────────────────────────────
function CurtainWindow({ cx, cz, w, h, sx }: { cx: number; cz: number; w: number; h: number; sx: 1 | -1 }) {
  const frameD = 0.04;
  return (
    <group position={[cx, h / 2, cz]}>
      {/* glass pane */}
      <B p={[0, 0, 0]} s={[w, h, frameD]} c={GLASS_W} rough={0.05} metal={0.1} />
      {/* thin frame */}
      <B p={[0, 0, -frameD / 2 * sx]} s={[w + 0.04, h + 0.04, 0.025]} c={SAND} />
      {/* centre mullion */}
      <B p={[0, 0, -frameD * sx]} s={[0.03, h, 0.03]} c={SAND} />
      {/* sheer curtains (partially pulled) */}
      <B p={[-w * 0.4, -h * 0.05, -frameD * 1.2 * sx]} s={[w * 0.16, h * 0.9, 0.02]} c={CURTAIN} rough={1} />
      <B p={[w * 0.42, -h * 0.06, -frameD * 1.2 * sx]} s={[w * 0.12, h * 0.88, 0.02]} c={CURTAIN} rough={1} />
    </group>
  );
}

// ── flow.life kitchen ────────────────────────────────────────────────────────
function FlowKitchen({
  M, w, d,
}: {
  M: (x: number, y: number, z: number) => V3;
  w: number;
  d: number;
}) {
  const kx = 0;
  const kz = -d * 0.35;
  const ctrH = 0.25; // counter height
  const cabH = 0.35;
  const ctrD = 0.32;

  const pos = (x: number, y: number, z: number) => M(kx + x, y, kz + z);

  return (
    <group>
      {/* lower cabinets */}
      <B p={pos(0, ctrH / 2, 0)} s={[w * 0.7, ctrH, ctrD]} c={KIT_CAB} rough={0.7} />
      {/* countertop */}
      <B p={pos(0, ctrH + 0.015, 0)} s={[w * 0.72, 0.03, ctrD + 0.02]} c={COUNTER} rough={0.5} />
      {/* cabinet doors (horizontal pushes) */}
      {[-0.28, 0, 0.28].map((ox, i) => (
        <B key={i} p={pos(ox * (w * 0.7 / 0.56), ctrH * 0.5, ctrD / 2 + 0.005)} s={[w * 0.22, ctrH * 0.82, 0.02]} c={KIT_CAB} rough={0.6} />
      ))}
      {/* upper cabinets */}
      <B p={pos(0, ctrH + 0.18 + cabH / 2, -ctrD * 0.05)} s={[w * 0.68, cabH, ctrD * 0.7]} c={KIT_CAB} rough={0.7} />
      {/* LED shelf above upper cabinets */}
      <LedShelf p={pos(0, ctrH + 0.18 + cabH + 0.03, -ctrD * 0.05)} w={w * 0.65} />
      {/* 3 glass jars on shelf */}
      {[-0.2, 0, 0.22].map((ox, i) => (
        <group key={i} position={pos(ox, ctrH + 0.18 + cabH + 0.1, -ctrD * 0.06)}>
          <Cyl p={[0, 0, 0]} r={0.045} h={0.1} c="#D8E8E0" rough={0.1} />
        </group>
      ))}
      {/* matte black sink */}
      <B p={pos(-w * 0.18, ctrH + 0.02, 0)} s={[0.22, 0.04, 0.18]} c={BLACK} rough={0.6} />
      {/* gooseneck faucet */}
      <Cyl p={pos(-w * 0.18, ctrH + 0.12, -ctrD * 0.15)} r={0.012} h={0.14} c={BLACK} />
      <mesh position={pos(-w * 0.18, ctrH + 0.19, ctrD * 0.01)}>
        <torusGeometry args={[0.04, 0.012, 8, 16, Math.PI * 0.8]} />
        <meshStandardMaterial color={BLACK} roughness={0.5} />
      </mesh>
      {/* coffee machine */}
      <B p={pos(w * 0.2, ctrH + 0.1, 0)} s={[0.14, 0.2, 0.14]} c={BLACK} rough={0.3} metal={0.3} />
      <B p={pos(w * 0.2, ctrH + 0.16, ctrD / 2 + 0.01)} s={[0.08, 0.06, 0.02]} c="#1A1A1A" glow={0.3} />
    </group>
  );
}

// ── Main FlowInterior ────────────────────────────────────────────────────────

export default function FlowInterior({
  bedrooms,
  sx,
  sz,
  onSelect,
  onHoverChange,
}: {
  bedrooms: number;
  sx: 1 | -1;
  sz: 1 | -1;
  onSelect: () => void;
  onHoverChange: (hovered: boolean) => void;
}) {
  const [hover, setHover] = useState<RoomHover | null>(null);

  // Unit rect for a Vastu tower unit ≈ 9 × 6 scene units (vastuUnitRect)
  const W = 9.0;
  const D = 6.0;
  const hw = W / 2;
  const hd = D / 2;

  // Mirror canonical positions to the right quadrant
  function M(x: number, y: number, z: number): V3 {
    return [x * sx, y, z * sz];
  }

  function setH(r: RoomHover | null) {
    setHover(r);
    onHoverChange(r !== null);
  }

  const zones = bedrooms <= 2
    ? [
        { name: "Living Room",  x: -hw * 0.3, z: hd * 0.2, w: W * 0.55, d: D * 0.55 },
        { name: "Kitchen",      x: hw * 0.38, z: hd * 0.18, w: W * 0.38, d: D * 0.45 },
        { name: "Bedroom",      x: -hw * 0.32, z: -hd * 0.38, w: W * 0.52, d: D * 0.42 },
        { name: "Bathroom",     x: hw * 0.35, z: -hd * 0.4, w: W * 0.25, d: D * 0.38 },
      ]
    : [
        { name: "Living Room",  x: -hw * 0.28, z: hd * 0.18, w: W * 0.5, d: D * 0.48 },
        { name: "Kitchen",      x: hw * 0.36, z: hd * 0.2, w: W * 0.36, d: D * 0.44 },
        { name: "Master Bedroom", x: -hw * 0.3, z: -hd * 0.35, w: W * 0.48, d: D * 0.38 },
        { name: "Bedroom 2",    x: hw * 0.22, z: -hd * 0.38, w: W * 0.32, d: D * 0.38 },
        { name: "Bathroom",     x: hw * 0.4, z: -hd * 0.4, w: W * 0.22, d: D * 0.32 },
      ];

  const lx = -hw * 0.28;
  const lz =  hd * 0.15;
  const kx =  hw * 0.36;
  const kz =  hd * 0.18;
  const bx = -hw * 0.3;
  const bz = -hd * 0.34;

  return (
    <group
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onPointerOver={() => onHoverChange(true)}
      onPointerOut={() => onHoverChange(false)}
    >
      {/* ── Walls (thin inner walls) ─────────────────────────────────── */}
      {/* back wall */}
      <B p={M(0, 0.5, -hd + 0.03)} s={[W, 1.0, 0.06]} c={SAND} />
      {/* side wall (corridor side) */}
      <B p={M(hw - 0.03, 0.5, 0)} s={[0.06, 1.0, D]} c={CREAM} />
      {/* partial partition */}
      <B p={M(0.1, 0.5, -0.08)} s={[0.06, 1.0, D * 0.55]} c={CREAM} />

      {/* ── Large window ────────────────────────────────────────────── */}
      <CurtainWindow cx={M(0, 0, hd - 0.04)[0]} cz={M(0, 0, hd - 0.04)[2]}
                     w={W * 0.68} h={0.82} sx={sx} />

      {/* ── Blond wood floor highlight ───────────────────────────────── */}
      <mesh position={M(0, 0.002, 0)} receiveShadow>
        <planeGeometry args={[W - 0.08, D - 0.08]} />
        <meshStandardMaterial color={WD_LIGHT} roughness={0.85} />
      </mesh>
      {/* subtle floor planks */}
      {[-W * 0.3, -W * 0.1, W * 0.1, W * 0.3].map((ox, i) => (
        <B key={i} p={M(ox, 0.003, 0)} s={[0.015, 0.002, D - 0.1]} c={WD_DARK} />
      ))}

      {/* ── Living area ──────────────────────────────────────────────── */}
      <OrganicSofa cx={M(lx, 0, lz)[0]} cz={M(lx, 0, lz)[2]}
                   w={W * 0.44} d={D * 0.28} sx={sx} />
      <OrganicTable p={M(lx, 0, lz + 0.38 * sz)} />
      {/* olive tree statement piece */}
      <OliveTree p={M(-hw + 0.55, 0.005, lz - 0.6 * sz)} />
      {/* pendant lights over lounge */}
      <Pendant p={M(lx - 0.3, 0.82, lz)} />
      <Pendant p={M(lx + 0.3, 0.82, lz)} />

      {/* ── Kitchen ─────────────────────────────────────────────────── */}
      <FlowKitchen M={M} w={W * 0.42} d={D} />

      {/* ── Bedroom ─────────────────────────────────────────────────── */}
      {/* bed frame */}
      <B p={M(bx - W * 0.04, 0.08, bz)} s={[W * 0.32, 0.16, D * 0.28]} c={WD_DARK} />
      {/* mattress */}
      <B p={M(bx - W * 0.04, 0.15, bz)} s={[W * 0.3, 0.08, D * 0.26]} c={ORGANIC} />
      {/* pillows */}
      <B p={M(bx - W * 0.04, 0.21, bz - D * 0.08 * sz)} s={[W * 0.26, 0.05, D * 0.1]} c="#F0ECE4" />
      {/* duvet */}
      <B p={M(bx - W * 0.04, 0.19, bz + D * 0.04 * sz)} s={[W * 0.3, 0.03, D * 0.18]} c={CREAM} />
      {/* bedside pendant */}
      <Pendant p={M(bx + W * 0.1, 0.72, bz)} />
      {/* bedside table */}
      <B p={M(bx + W * 0.2, 0.1, bz)} s={[0.18, 0.2, 0.18]} c={WD_DARK} rough={0.7} />

      {/* ── Room zones (hover/click areas) ────────────────────────── */}
      {zones.map((z) => (
        <RoomZone
          key={z.name}
          zone={{ ...z, tipY: 0.65 }}
          M={M}
          onSelect={onSelect}
          onHover={setH}
        />
      ))}
      <RoomTip hover={hover} />
    </group>
  );
}

export function FlowPenthouseInterior({
  sx,
  onSelect,
  onHoverChange,
}: {
  sx: 1 | -1;
  onSelect: () => void;
  onHoverChange: (hovered: boolean) => void;
}) {
  const [hover, setHover] = useState<RoomHover | null>(null);

  const W = 9.0;
  const D = 12.0;
  const hw = W / 2;
  const hd = D / 2;

  function M(x: number, y: number, z: number): V3 {
    return [x * sx, y, z];
  }

  function setH(r: RoomHover | null) {
    setHover(r);
    onHoverChange(r !== null);
  }

  const zones = [
    { name: "Sky Lounge",    x: 0, z: hd * 0.35, w: W * 0.8, d: D * 0.32 },
    { name: "Master Suite",  x: 0, z: -hd * 0.15, w: W * 0.7, d: D * 0.32 },
    { name: "Study",         x: -hw * 0.3, z: -hd * 0.52, w: W * 0.28, d: D * 0.18 },
    { name: "Kitchen",       x: hw * 0.28, z: -hd * 0.48, w: W * 0.32, d: D * 0.22 },
    { name: "Sky Terrace",   x: 0, z: hd * 0.8, w: W * 0.75, d: D * 0.15, tipY: 0.3 },
  ];

  return (
    <group
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onPointerOver={() => onHoverChange(true)}
      onPointerOut={() => onHoverChange(false)}
    >
      <mesh position={M(0, 0.002, 0)} receiveShadow>
        <planeGeometry args={[W - 0.08, D - 0.08]} />
        <meshStandardMaterial color={WD_LIGHT} roughness={0.85} />
      </mesh>
      {/* Sofa arrangement */}
      <OrganicSofa cx={M(0, 0, hd * 0.35)[0]} cz={M(0, 0, hd * 0.35)[2]}
                   w={W * 0.65} d={D * 0.18} sx={sx} />
      <OrganicTable p={M(0, 0, hd * 0.2)} />
      <OliveTree p={M(-hw * 0.5, 0, hd * 0.55)} />
      <OliveTree p={M(hw * 0.55, 0, hd * 0.52)} />
      {/* Pendant cluster */}
      {[-0.5, 0, 0.5].map((ox, i) => <Pendant key={i} p={M(ox, 0.82, hd * 0.34)} />)}
      {/* Bed */}
      <B p={M(0, 0.08, -hd * 0.15)} s={[W * 0.4, 0.16, D * 0.2]} c={WD_DARK} />
      <B p={M(0, 0.15, -hd * 0.15)} s={[W * 0.38, 0.08, D * 0.18]} c={ORGANIC} />
      <B p={M(0, 0.21, -hd * 0.23)} s={[W * 0.34, 0.05, D * 0.05]} c="#F0ECE4" />
      {/* Wide ceiling windows for penthouse */}
      <CurtainWindow cx={M(0, 0, hd - 0.04)[0]} cz={hd - 0.04} w={W * 0.82} h={0.88} sx={sx} />

      {zones.map((z) => (
        <RoomZone key={z.name} zone={{ ...z, tipY: z.tipY ?? 0.65 }} M={M} onSelect={onSelect} onHover={setH} />
      ))}
      <RoomTip hover={hover} />
    </group>
  );
}
