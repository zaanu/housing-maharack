"use client";

// Stylized furnished interior for an opened home — a procedural "dollhouse"
// cutaway in the spirit of archviz section renders: warm oak, white walls,
// terracotta/sage accents, glowing pendants, plants. All primitives, so it
// costs nothing to load and works until real GLB interiors are supplied.

import type { ReactNode } from "react";

// palette
const WALL = "#f7f3ea";
const OAK = "#c89a64"; // furniture wood
const OAK_DEEP = "#a8794a"; // accent panelling / frames
const FLOOR_LINE = "#c9a873";
const FABRIC = "#b3bac1"; // upholstery grey
const TERRA = "#cd7f54"; // terracotta accent
const SAGE = "#8fa882"; // sage accent
const WHITE = "#fcfaf4";
const CREAM = "#ece3d0"; // rugs
const STEEL = "#3f4750";
const SCREEN = "#22272e";
const LEAF = "#4e7d46";
const LEAF_LIGHT = "#6da25e";
const POT = "#b9683f";
const GLOW = "#ffc97a";
const GLASS = "#bcd6e2";
const BOOKS = ["#c96f4a", "#5b7d99", "#88a06b", "#d8b45a", "#9c6b8f"];

type V3 = [number, number, number];

function B({ p, s, c, glow = 0 }: { p: V3; s: V3; c: string; glow?: number }) {
  return (
    <mesh position={p} castShadow>
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

function Cyl({ p, r, h, c }: { p: V3; r: number; h: number; c: string }) {
  return (
    <mesh position={p} castShadow>
      <cylinderGeometry args={[r, r, h, 12]} />
      <meshStandardMaterial color={c} roughness={0.85} />
    </mesh>
  );
}

export function Plant({ p, big = false }: { p: V3; big?: boolean }) {
  const k = big ? 1.5 : 1;
  return (
    <group position={p}>
      <Cyl p={[0, 0.05 * k, 0]} r={0.065 * k} h={0.1 * k} c={POT} />
      <mesh position={[0, 0.2 * k, 0]} castShadow>
        <sphereGeometry args={[0.11 * k, 10, 8]} />
        <meshStandardMaterial color={LEAF} roughness={1} />
      </mesh>
      <mesh position={[0.05 * k, 0.27 * k, 0.03 * k]} castShadow>
        <sphereGeometry args={[0.07 * k, 8, 6]} />
        <meshStandardMaterial color={LEAF_LIGHT} roughness={1} />
      </mesh>
    </group>
  );
}

function Rug({ p, s }: { p: V3; s: [number, number] }) {
  return (
    <group position={p}>
      <B p={[0, 0.006, 0]} s={[s[0], 0.012, s[1]]} c={CREAM} />
      <B p={[0, 0.013, 0]} s={[s[0] - 0.18, 0.004, s[1] - 0.18]} c="#dfd2b8" />
    </group>
  );
}

/** Framed artwork hung on a wall; `nx`/`nz` is the outward face direction. */
function Art({ p, w = 0.45, h = 0.3, nx = 0, nz = 0, c = TERRA }: { p: V3; w?: number; h?: number; nx?: number; nz?: number; c?: string }) {
  const t = 0.025;
  const s: V3 = nx !== 0 ? [t, h, w] : [w, h, t];
  const s2: V3 = nx !== 0 ? [t, h - 0.07, w - 0.07] : [w - 0.07, h - 0.07, t];
  const off = 0.012;
  return (
    <group position={p}>
      <B p={[0, 0, 0]} s={s} c={OAK_DEEP} />
      <B p={[nx * off, 0, nz * off]} s={s2} c={c} />
    </group>
  );
}

function Pendant({ p, drop = 0.32 }: { p: V3; drop?: number }) {
  return (
    <group position={p}>
      <B p={[0, -drop / 2, 0]} s={[0.012, drop, 0.012]} c={STEEL} />
      <mesh position={[0, -drop, 0]} castShadow>
        <sphereGeometry args={[0.05, 10, 8]} />
        <meshStandardMaterial color={GLOW} emissive={GLOW} emissiveIntensity={1.6} />
      </mesh>
    </group>
  );
}

function FloorLamp({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <Cyl p={[0, 0.01, 0]} r={0.06} h={0.02} c={STEEL} />
      <B p={[0, 0.2, 0]} s={[0.015, 0.4, 0.015]} c={STEEL} />
      <mesh position={[0, 0.42, 0]}>
        <sphereGeometry args={[0.045, 10, 8]} />
        <meshStandardMaterial color={GLOW} emissive={GLOW} emissiveIntensity={1.4} />
      </mesh>
    </group>
  );
}

/** Linen curtain panels along a window wall (axis x by default). */
function Curtains({ p, w, h = 0.5 }: { p: V3; w: number; h?: number }) {
  return (
    <group position={p}>
      <B p={[-w / 2 + 0.1, h / 2, 0]} s={[0.2, h, 0.03]} c="#efe7d5" />
      <B p={[w / 2 - 0.1, h / 2, 0]} s={[0.2, h, 0.03]} c="#efe7d5" />
      <B p={[0, h - 0.01, 0]} s={[w, 0.02, 0.04]} c={OAK_DEEP} />
    </group>
  );
}

function Bed({ p, small = false }: { p: V3; small?: boolean }) {
  const L = small ? 0.82 : 1.0; // along x, headboard at -x
  const W = small ? 0.6 : 0.72;
  return (
    <group position={p}>
      <B p={[0, 0.05, 0]} s={[L, 0.1, W]} c={OAK} />
      <B p={[0.02, 0.13, 0]} s={[L - 0.08, 0.07, W - 0.06]} c={WHITE} />
      {/* terracotta throw across the foot */}
      <B p={[L / 2 - 0.16, 0.165, 0]} s={[0.24, 0.02, W - 0.08]} c={TERRA} />
      <B p={[-L / 2 + 0.1, 0.19, -W / 4 + 0.02]} s={[0.16, 0.05, W / 3]} c={WHITE} />
      <B p={[-L / 2 + 0.1, 0.19, W / 4 - 0.02]} s={[0.16, 0.05, W / 3]} c={WHITE} />
      <B p={[-L / 2 + 0.18, 0.185, 0]} s={[0.1, 0.04, 0.18]} c={SAGE} />
      <B p={[-L / 2 - 0.02, 0.18, 0]} s={[0.05, 0.36, W + 0.04]} c={OAK_DEEP} />
    </group>
  );
}

function Nightstand({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <B p={[0, 0.07, 0]} s={[0.16, 0.14, 0.16]} c={OAK} />
      <mesh position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.03, 8, 6]} />
        <meshStandardMaterial color={GLOW} emissive={GLOW} emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

function Wardrobe({ p, w = 0.95, alongX = true }: { p: V3; w?: number; alongX?: boolean }) {
  const s: V3 = alongX ? [w, 0.5, 0.2] : [0.2, 0.5, w];
  return (
    <group position={p}>
      <B p={[0, 0.25, 0]} s={s} c={OAK} />
      <B
        p={alongX ? [0, 0.25, 0.101] : [0.101, 0.25, 0]}
        s={alongX ? [0.015, 0.42, 0.004] : [0.004, 0.42, 0.015]}
        c={OAK_DEEP}
      />
    </group>
  );
}

function Sofa({ p }: { p: V3 }) {
  // L-shaped, seat opening toward +x
  return (
    <group position={p}>
      <B p={[0, 0.09, 0]} s={[0.42, 0.18, 1.3]} c={FABRIC} />
      <B p={[-0.17, 0.29, 0]} s={[0.1, 0.24, 1.3]} c="#9aa2aa" />
      <B p={[0.33, 0.09, -0.44]} s={[0.45, 0.18, 0.42]} c={FABRIC} />
      <B p={[-0.05, 0.24, 0.42]} s={[0.18, 0.12, 0.26]} c={TERRA} />
      <B p={[-0.05, 0.24, 0.05]} s={[0.18, 0.12, 0.26]} c={SAGE} />
      <B p={[-0.05, 0.24, -0.32]} s={[0.18, 0.12, 0.26]} c={WHITE} />
    </group>
  );
}

function CoffeeTable({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <B p={[0, 0.13, 0]} s={[0.52, 0.025, 0.32]} c={OAK} />
      <B p={[0, 0.06, 0]} s={[0.08, 0.12, 0.08]} c={STEEL} />
      <B p={[0.1, 0.155, 0.04]} s={[0.12, 0.025, 0.09]} c={TERRA} />
    </group>
  );
}

function Armchair({ p, c = SAGE }: { p: V3; c?: string }) {
  return (
    <group position={p}>
      <B p={[0, 0.09, 0]} s={[0.32, 0.18, 0.32]} c={c} />
      <B p={[0, 0.27, -0.13]} s={[0.32, 0.2, 0.07]} c={c} />
    </group>
  );
}

function Dining({ p, pendant = true }: { p: V3; pendant?: boolean }) {
  const chairs: { q: V3; c: string }[] = [
    { q: [-0.24, 0, -0.31], c: SAGE },
    { q: [0.24, 0, -0.31], c: TERRA },
    { q: [-0.24, 0, 0.31], c: TERRA },
    { q: [0.24, 0, 0.31], c: SAGE },
  ];
  return (
    <group position={p}>
      <B p={[0, 0.21, 0]} s={[0.66, 0.03, 0.38]} c={OAK} />
      <B p={[0, 0.1, 0]} s={[0.1, 0.2, 0.1]} c={OAK_DEEP} />
      <Cyl p={[0, 0.245, 0]} r={0.06} h={0.025} c={SAGE} />
      {chairs.map(({ q, c }, i) => (
        <B key={i} p={[q[0], 0.1, q[2]]} s={[0.15, 0.2, 0.15]} c={c} />
      ))}
      {pendant && <Pendant p={[0, 0.85, 0]} drop={0.4} />}
    </group>
  );
}

/** Kitchen run along a back wall (-z) with backsplash, uppers and a fridge. */
function Kitchen({ p, w = 2.4 }: { p: V3; w?: number }) {
  return (
    <group position={p}>
      <B p={[0, 0.12, 0]} s={[w, 0.24, 0.38]} c={OAK} />
      <B p={[0, 0.255, 0]} s={[w, 0.03, 0.4]} c={WHITE} />
      <B p={[0, 0.36, -0.17]} s={[w, 0.18, 0.03]} c="#e9ddc8" />
      <B p={[-w / 6, 0.56, -0.13]} s={[w * 0.55, 0.2, 0.12]} c={WHITE} />
      <B p={[-0.45, 0.272, 0.02]} s={[0.32, 0.012, 0.24]} c={SCREEN} />
      <Cyl p={[0.35, 0.29, -0.05]} r={0.025} h={0.07} c={STEEL} />
      <B p={[w / 2 - 0.18, 0.33, 0]} s={[0.36, 0.66, 0.36]} c="#d9d6cf" />
    </group>
  );
}

function Island({ p, w = 1.1, stools = 2 }: { p: V3; w?: number; stools?: number }) {
  return (
    <group position={p}>
      <B p={[0, 0.12, 0]} s={[w, 0.24, 0.36]} c={OAK_DEEP} />
      <B p={[0, 0.255, 0]} s={[w + 0.06, 0.03, 0.42]} c={WHITE} />
      <B p={[-0.2, 0.28, 0]} s={[0.14, 0.025, 0.14]} c={SAGE} />
      {Array.from({ length: stools }, (_, i) => (
        <Cyl key={i} p={[-w / 4 + (i * w) / (2 * Math.max(stools - 1, 1)), 0.1, 0.32]} r={0.06} h={0.2} c={TERRA} />
      ))}
      <Pendant p={[-w / 4, 0.85, 0]} drop={0.38} />
      <Pendant p={[w / 4, 0.85, 0]} drop={0.38} />
    </group>
  );
}

/** Media feature wall: oak panel, TV, low white unit; faces -x. */
function TvWall({ p, w = 1.5 }: { p: V3; w?: number }) {
  return (
    <group position={p}>
      <B p={[0.03, 0.34, 0]} s={[0.035, 0.68, w]} c={OAK_DEEP} />
      <B p={[-0.0, 0.38, 0]} s={[0.025, 0.3, w * 0.52]} c={SCREEN} />
      <B p={[-0.06, 0.06, 0]} s={[0.16, 0.12, w * 0.8]} c={WHITE} />
      <B p={[-0.06, 0.14, w * 0.28]} s={[0.1, 0.04, 0.1]} c={SAGE} />
    </group>
  );
}

/** Shelf with colorful book spines. */
function Bookshelf({ p, w = 1.0, alongX = false }: { p: V3; w?: number; alongX?: boolean }) {
  const rows = [0.14, 0.32, 0.5];
  return (
    <group position={p}>
      <B p={[0, 0.3, 0]} s={alongX ? [w, 0.6, 0.14] : [0.14, 0.6, w]} c={OAK} />
      {rows.map((y, r) => (
        <group key={r}>
          {Array.from({ length: 5 }, (_, i) => {
            const off = -w / 2 + 0.12 + i * ((w - 0.24) / 4);
            const c = BOOKS[(i + r) % BOOKS.length];
            return (
              <B
                key={i}
                p={alongX ? [off, y, 0.005] : [0.005, y, off]}
                s={alongX ? [0.09, 0.11, 0.1] : [0.1, 0.11, 0.09]}
                c={c}
              />
            );
          })}
        </group>
      ))}
    </group>
  );
}

function Desk({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <B p={[0, 0.18, 0]} s={[0.55, 0.03, 0.28]} c={OAK} />
      <B p={[-0.24, 0.09, 0]} s={[0.04, 0.18, 0.24]} c={OAK_DEEP} />
      <B p={[0.24, 0.09, 0]} s={[0.04, 0.18, 0.24]} c={OAK_DEEP} />
      <B p={[0, 0.31, -0.08]} s={[0.3, 0.2, 0.02]} c={SCREEN} />
      <B p={[0, 0.1, 0.28]} s={[0.16, 0.2, 0.16]} c={TERRA} />
    </group>
  );
}

function Bath({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <B p={[0, 0.11, -0.32]} s={[0.95, 0.22, 0.42]} c={WHITE} />
      <B p={[0, 0.18, -0.32]} s={[0.75, 0.04, 0.26]} c={GLASS} />
      <B p={[-0.3, 0.14, 0.28]} s={[0.42, 0.28, 0.28]} c={OAK} />
      <B p={[-0.3, 0.295, 0.28]} s={[0.44, 0.02, 0.3]} c={WHITE} />
      <B p={[0.25, 0.3, 0.34]} s={[0.18, 0.24, 0.02]} c={GLASS} />
      <B p={[0.28, 0.22, 0.2]} s={[0.04, 0.16, 0.02]} c={TERRA} />
    </group>
  );
}

/** Plank lines so the oak floor reads as boards, not a flat slab. */
function Planks({ w, d, sx, sz }: { w: number; d: number; sx: number; sz: number }) {
  const n = Math.floor(w / 0.55);
  return (
    <group>
      {Array.from({ length: n }, (_, i) => (
        <B
          key={i}
          p={[(-w / 2 + (i + 1) * (w / (n + 1))) * sx, 0.002, 0]}
          s={[0.018, 0.004, d * 0.97]}
          c={FLOOR_LINE}
        />
      ))}
    </group>
  );
}

/**
 * Canonical layout: outer facade at -x, window/balcony front at +z.
 * `sx`/`sz` mirror the layout into the unit's actual quadrant.
 * Interior spans x ∈ [-3.45, 3.45], z ∈ [-1.95, 1.95].
 */
export default function UnitInterior({
  bedrooms,
  sx,
  sz,
}: {
  bedrooms: number;
  sx: 1 | -1;
  sz: 1 | -1;
}) {
  const M = (x: number, y: number, z: number): V3 => [x * sx, y, z * sz];
  const wallH = 0.55;
  const t = 0.07;

  const wall = (x: number, z: number, w: number, d: number, h = wallH, c = WALL): ReactNode => (
    <B p={M(x, h / 2, z)} s={[w, h, d]} c={c} />
  );

  return (
    <group>
      <Planks w={6.9} d={3.9} sx={sx} sz={sz} />

      {/* perimeter walls */}
      {wall(-3.45, 0, t, 3.9 + t)}
      {wall(3.45, 0, t, 3.9 + t)}
      {wall(0, 1.95, 6.9 + t, t)}
      {wall(0, -1.95, 6.9 + t, t)}

      {/* partitions: bedroom 1 (front-left), bath, back-left room */}
      {wall(-0.75, 1.025, t, 1.85, 0.5)}
      {wall(-2.1, 0.1, 2.7, t, 0.5)}
      {wall(-1.95, -0.925, t, 2.05, 0.5)}
      {wall(-0.75, -1.5, t, 0.9, 0.5)}

      {/* ---- bedroom 1 (front-left): oak headboard wall, bed, nightstands ---- */}
      {wall(-3.41, 1.02, 0.025, 1.78, 0.55, OAK_DEEP)}
      <group position={M(-2.55, 0, 1.02)}>
        <Bed p={[0, 0, 0]} />
      </group>
      <Rug p={M(-2.35, 0, 1.02)} s={[1.5, 1.15]} />
      <Nightstand p={M(-3.18, 0, 0.52)} />
      <Nightstand p={M(-3.18, 0, 1.52)} />
      <Wardrobe p={M(-0.92, 0, 1.05)} w={1.2} alongX={false} />
      <Art p={M(-3.42, 0.38, 1.0)} nx={sx} c={SAGE} />
      <Plant p={M(-1.15, 0, 1.72)} />
      <Curtains p={M(-2.2, 0, 1.9)} w={2.2} />

      {/* ---- back-left: second bedroom or dressing room ---- */}
      {bedrooms >= 2 ? (
        <>
          <group position={M(-2.78, 0, -1.15)}>
            <Bed p={[0, 0, 0]} small />
          </group>
          <Rug p={M(-2.6, 0, -1.1)} s={[1.2, 0.95]} />
          <Nightstand p={M(-3.2, 0, -0.62)} />
          <Wardrobe p={M(-2.65, 0, -0.08)} w={1.2} />
          <Art p={M(-3.42, 0.36, -1.2)} nx={sx} c={TERRA} />
        </>
      ) : (
        <>
          <Wardrobe p={M(-2.65, 0, -1.78)} w={1.3} />
          <Desk p={M(-3.1, 0, -0.7)} />
          <Plant p={M(-2.1, 0, -1.7)} big />
        </>
      )}

      {/* ---- bathroom ---- */}
      <group position={M(-1.35, 0, -1.2)}>
        <Bath p={[0, 0, 0]} />
      </group>

      {/* ---- kitchen along back wall + island with stools ---- */}
      <group position={M(1.55, 0, -1.68)}>
        <Kitchen p={[0, 0, 0]} w={2.6} />
      </group>
      <group position={M(1.45, 0, -0.78)}>
        <Island p={[0, 0, 0]} w={1.0} />
      </group>

      {/* ---- dining + sideboard ---- */}
      <Dining p={M(-0.18, 0, -1.0)} />
      <B p={M(-0.45, 0.14, -1.78)} s={[0.7, 0.28, 0.22]} c={OAK} />
      <Art p={M(-0.45, 0.5, -1.9)} nz={sz} w={0.5} c={TERRA} />

      {/* ---- living (front-right): rug, sofa, media wall, shelf ---- */}
      <Rug p={M(1.25, 0, 0.95)} s={[2.5, 1.5]} />
      <group position={M(0.0, 0, 0.95)}>
        <Sofa p={[0, 0, 0]} />
      </group>
      <CoffeeTable p={M(0.95, 0, 0.95)} />
      <Armchair p={M(1.7, 0, 1.55)} c={TERRA} />
      <Armchair p={M(1.7, 0, 0.4)} c={FABRIC} />
      <group position={M(3.38, 0, 0.95)} scale={[sx === 1 ? -1 : 1, 1, 1]}>
        <TvWall p={[0, 0, 0]} w={1.5} />
      </group>
      <Bookshelf p={M(3.36, 0, -0.7)} w={1.0} />
      <FloorLamp p={M(-0.45, 0, 1.7)} />
      <Plant p={M(2.95, 0, 1.72)} big />
      <Curtains p={M(1.6, 0, 1.9)} w={3.0} />

      {/* study corner for larger configurations */}
      {bedrooms >= 3 && <Desk p={M(2.5, 0, 1.45)} />}
    </group>
  );
}

/**
 * Two-level duplex penthouse cutaway: open front face (+z, toward the camera),
 * double-height living void at the front, staircase connecting the levels.
 * Canonical: outer facade at -x; `sx` mirrors for the opposite unit.
 * Interior spans x ∈ [-3.45, 3.45], z ∈ [-4.05, 4.05]; each level ≈ 1.0 high.
 */
export function PenthouseInterior({ sx }: { sx: 1 | -1 }) {
  const M = (x: number, y: number, z: number): V3 => [x * sx, y, z];
  const t = 0.07;
  const lowH = 0.97;
  const upY = 1.07; // top of the mid slab
  const upH = 0.93;

  const steps = [];
  for (let i = 0; i < 10; i++) {
    steps.push(
      <B
        key={i}
        p={M(2.85, 0.06 + (i + 1) * 0.1, 1.45 - i * 0.31)}
        s={[1.0, 0.06, 0.31]}
        c={OAK}
      />
    );
  }

  return (
    <group>
      <Planks w={6.9} d={8.1} sx={sx} sz={1} />

      {/* lower walls: sides + back, front left open as the section cut */}
      <B p={M(-3.45, lowH / 2, 0)} s={[t, lowH, 8.1 + t]} c={WALL} />
      <B p={M(3.45, lowH / 2, 0)} s={[t, lowH, 8.1 + t]} c={WALL} />
      <B p={M(0, lowH / 2, -4.05)} s={[6.9 + t, lowH, t]} c={WALL} />
      {/* oak feature wall along the outer side of the living area */}
      <B p={M(-3.4, lowH / 2, 1.8)} s={[0.03, lowH, 4.3]} c={OAK_DEEP} />

      {/* mid slab with stair void + double-height living void at the front */}
      <B p={M(-0.6, 1.02, -1.225)} s={[5.7, 0.1, 5.65]} c={WALL} />
      <B p={M(2.85, 1.02, -2.825)} s={[1.2, 0.1, 2.45]} c={WALL} />

      {/* staircase + glass railings */}
      {steps}
      <mesh position={M(-0.6, upY + 0.12, 1.6)}>
        <boxGeometry args={[5.7, 0.24, 0.04]} />
        <meshStandardMaterial color={GLASS} transparent opacity={0.55} />
      </mesh>
      <mesh position={M(2.25, upY + 0.12, 0)}>
        <boxGeometry args={[0.04, 0.24, 3.2]} />
        <meshStandardMaterial color={GLASS} transparent opacity={0.55} />
      </mesh>

      {/* upper walls */}
      <B p={M(-3.45, upY + upH / 2, 0)} s={[t, upH, 8.1 + t]} c={WALL} />
      <B p={M(3.45, upY + upH / 2, 0)} s={[t, upH, 8.1 + t]} c={WALL} />
      <B p={M(0, upY + upH / 2, -4.05)} s={[6.9 + t, upH, t]} c={WALL} />
      <B p={M(0.2, upY + upH / 2, -2.825)} s={[0.05, upH, 2.45]} c={WALL} />
      {/* oak headboard wall for the master bedroom */}
      <B p={M(-3.4, upY + upH / 2, -2.6)} s={[0.03, upH, 2.7]} c={OAK_DEEP} />

      {/* ---- lower level: kitchen, dining, double-height living ---- */}
      <group position={M(0.8, 0, -3.62)}>
        <Kitchen p={[0, 0, 0]} w={3.2} />
      </group>
      <group position={M(0.4, 0, -2.6)}>
        <Island p={[0, 0, 0]} w={1.4} stools={3} />
      </group>
      <Dining p={M(2.2, 0, -1.2)} />
      <B p={M(-2.9, 0.14, -3.85)} s={[1.0, 0.28, 0.24]} c={OAK} />
      <Art p={M(-2.9, 0.52, -3.99)} nz={1} w={0.6} c={SAGE} />

      <Rug p={M(-1.3, 0, 2.3)} s={[2.6, 2.0]} />
      <group position={M(-2.75, 0, 2.3)}>
        <Sofa p={[0, 0, 0]} />
      </group>
      <CoffeeTable p={M(-1.4, 0, 2.3)} />
      <Armchair p={M(-0.5, 0, 3.15)} c={TERRA} />
      <Armchair p={M(-0.5, 0, 1.45)} c={FABRIC} />
      <group position={M(3.38, 0, 2.6)} scale={[sx === 1 ? -1 : 1, 1, 1]}>
        <TvWall p={[0, 0, 0]} w={1.7} />
      </group>
      <Bookshelf p={M(-3.32, 0, -0.6)} w={1.6} />
      <FloorLamp p={M(-3.1, 0, 3.6)} />
      <Plant p={M(-3.05, 0, 0.85)} big />
      <Plant p={M(3.0, 0, -0.3)} />
      {/* tall pendants dropping through the double-height void */}
      <Pendant p={M(-1.3, 1.9, 2.9)} drop={1.1} />
      <Pendant p={M(-0.7, 1.9, 2.5)} drop={0.9} />
      {/* planters along the open terrace edge */}
      {[-2.6, 0.2, 1.8].map((x) => (
        <Plant key={x} p={M(x, 0, 3.88)} />
      ))}

      {/* ---- upper level: bedrooms, study overlooking the void ---- */}
      <group position={M(0, upY, 0)}>
        <group position={M(-2.5, 0, -3.15)}>
          <Bed p={[0, 0, 0]} />
        </group>
        <Rug p={M(-2.3, 0, -3.1)} s={[1.6, 1.2]} />
        <Nightstand p={M(-3.15, 0, -2.62)} />
        <Nightstand p={M(-3.15, 0, -3.66)} />
        <Art p={M(-3.41, 0.4, -3.1)} nx={sx} c={TERRA} />
        <group position={M(2.35, 0, -3.25)}>
          <Bed p={[0, 0, 0]} small />
        </group>
        <Nightstand p={M(1.78, 0, -3.7)} />
        <Wardrobe p={M(-0.9, 0, -3.88)} w={1.5} />
        <Armchair p={M(-3.0, 0, -1.2)} c={SAGE} />
        <Desk p={M(-1.2, 0, 1.15)} />
        <Bookshelf p={M(-3.34, 0, 0.4)} w={1.2} />
        <Plant p={M(1.7, 0, 1.1)} big />
        <Plant p={M(3.1, 0, -1.0)} />
      </group>
    </group>
  );
}
