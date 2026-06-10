"use client";

// Stylized furnished interior for an opened home — a procedural "dollhouse"
// cutaway in the spirit of archviz section renders: low white walls, wood
// floor, grey upholstery, wood furniture and plants. All primitives, so it
// costs nothing to load and works until real GLB interiors are supplied.

import type { ReactNode } from "react";

const WALL = "#f4f1e9";
const WOOD = "#c9b491";
const WOOD_DARK = "#a98e68";
const FABRIC = "#9ca3af";
const FABRIC_DARK = "#6b7280";
const WHITE = "#fafaf7";
const RUG = "#d7dce1";
const GREEN = "#6a9461";
const SCREEN = "#1f2937";

type V3 = [number, number, number];

function B({ p, s, c }: { p: V3; s: V3; c: string }) {
  return (
    <mesh position={p} castShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={0.85} />
    </mesh>
  );
}

function Plant({ p, big = false }: { p: V3; big?: boolean }) {
  const k = big ? 1.4 : 1;
  return (
    <group position={p}>
      <mesh position={[0, 0.05 * k, 0]} castShadow>
        <cylinderGeometry args={[0.07 * k, 0.055 * k, 0.1 * k, 10]} />
        <meshStandardMaterial color="#e6e0d2" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.21 * k, 0]} castShadow>
        <sphereGeometry args={[0.12 * k, 10, 8]} />
        <meshStandardMaterial color={GREEN} roughness={1} />
      </mesh>
    </group>
  );
}

function Bed({ p, small = false }: { p: V3; small?: boolean }) {
  const L = small ? 0.8 : 0.98; // along x, headboard at -x
  const W = small ? 0.58 : 0.7;
  return (
    <group position={p}>
      <B p={[0, 0.05, 0]} s={[L, 0.1, W]} c={WOOD_DARK} />
      <B p={[0.02, 0.13, 0]} s={[L - 0.08, 0.07, W - 0.06]} c={WHITE} />
      <B p={[0.1, 0.155, 0]} s={[L - 0.35, 0.045, W - 0.1]} c={FABRIC} />
      <B p={[-L / 2 + 0.09, 0.19, -W / 4 + 0.02]} s={[0.16, 0.05, W / 3]} c={WHITE} />
      <B p={[-L / 2 + 0.09, 0.19, W / 4 - 0.02]} s={[0.16, 0.05, W / 3]} c={WHITE} />
      <B p={[-L / 2 - 0.02, 0.16, 0]} s={[0.05, 0.32, W]} c={WOOD} />
    </group>
  );
}

function Sofa({ p }: { p: V3 }) {
  // L-shaped, seat opening toward +x
  return (
    <group position={p}>
      <B p={[0, 0.09, 0]} s={[0.42, 0.18, 1.25]} c={FABRIC} />
      <B p={[-0.17, 0.28, 0]} s={[0.1, 0.22, 1.25]} c={FABRIC_DARK} />
      <B p={[0.32, 0.09, -0.42]} s={[0.45, 0.18, 0.42]} c={FABRIC} />
      <B p={[0.05, 0.23, 0.45]} s={[0.18, 0.1, 0.3]} c={FABRIC_DARK} />
    </group>
  );
}

function CoffeeTable({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <B p={[0, 0.13, 0]} s={[0.5, 0.025, 0.32]} c={WHITE} />
      <B p={[0, 0.06, 0]} s={[0.08, 0.12, 0.08]} c={WOOD_DARK} />
    </group>
  );
}

function Armchair({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <B p={[0, 0.09, 0]} s={[0.32, 0.18, 0.32]} c={WHITE} />
      <B p={[0, 0.26, -0.13]} s={[0.32, 0.18, 0.07]} c={WHITE} />
    </group>
  );
}

function Dining({ p }: { p: V3 }) {
  const chairs: V3[] = [
    [-0.22, 0, -0.3],
    [0.22, 0, -0.3],
    [-0.22, 0, 0.3],
    [0.22, 0, 0.3],
  ];
  return (
    <group position={p}>
      <B p={[0, 0.21, 0]} s={[0.62, 0.03, 0.36]} c={WHITE} />
      <B p={[0, 0.1, 0]} s={[0.1, 0.2, 0.1]} c={WOOD_DARK} />
      {chairs.map((c, i) => (
        <group key={i} position={c}>
          <B p={[0, 0.1, 0]} s={[0.14, 0.2, 0.14]} c={FABRIC} />
        </group>
      ))}
    </group>
  );
}

function Kitchen({ p }: { p: V3 }) {
  // counter along back wall (-z side) + island in front of it
  return (
    <group position={p}>
      <B p={[0, 0.12, 0]} s={[2.3, 0.24, 0.38]} c={WOOD} />
      <B p={[0, 0.255, 0]} s={[2.3, 0.03, 0.4]} c={WHITE} />
      <B p={[-0.7, 0.27, 0]} s={[0.3, 0.02, 0.25]} c={SCREEN} />
      <B p={[-0.1, 0.12, 0.85]} s={[1.05, 0.24, 0.38]} c={WOOD_DARK} />
      <B p={[-0.1, 0.255, 0.85]} s={[1.1, 0.03, 0.42]} c={WHITE} />
    </group>
  );
}

function Tv({ p }: { p: V3 }) {
  // against +x wall, screen facing -x
  return (
    <group position={p}>
      <B p={[0, 0.06, 0]} s={[0.16, 0.12, 0.95]} c={WHITE} />
      <B p={[0.04, 0.38, 0]} s={[0.03, 0.34, 0.72]} c={SCREEN} />
    </group>
  );
}

function Bookshelf({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <B p={[0, 0.3, 0]} s={[0.13, 0.6, 1.05]} c={WOOD} />
      <B p={[-0.035, 0.3, 0]} s={[0.07, 0.52, 0.95]} c={WOOD_DARK} />
    </group>
  );
}

function Desk({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <B p={[0, 0.18, 0]} s={[0.55, 0.03, 0.28]} c={WOOD} />
      <B p={[-0.22, 0.09, 0]} s={[0.05, 0.18, 0.24]} c={WOOD} />
      <B p={[0.22, 0.09, 0]} s={[0.05, 0.18, 0.24]} c={WOOD} />
      <B p={[0, 0.31, -0.08]} s={[0.3, 0.2, 0.02]} c={SCREEN} />
      <B p={[0, 0.1, 0.28]} s={[0.16, 0.2, 0.16]} c={FABRIC_DARK} />
    </group>
  );
}

function Bath({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <B p={[0, 0.1, -0.35]} s={[0.95, 0.2, 0.4]} c={WHITE} />
      <B p={[-0.3, 0.14, 0.3]} s={[0.4, 0.28, 0.3]} c={WOOD} />
      <B p={[-0.3, 0.29, 0.3]} s={[0.42, 0.02, 0.32]} c={WHITE} />
    </group>
  );
}

function Wardrobe({ p }: { p: V3 }) {
  return <B p={[p[0], 0.32, p[2]]} s={[0.95, 0.64, 0.22]} c={WOOD} />;
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

  const wall = (x: number, z: number, w: number, d: number, h = wallH): ReactNode => (
    <B p={M(x, h / 2, z)} s={[w, h, d]} c={WALL} />
  );

  return (
    <group>
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

      {/* bedroom 1 */}
      <group position={M(-2.55, 0, 1.05)}>
        <Bed p={[0, 0, 0]} />
      </group>
      <B p={M(-3.2, 0.09, 0.45)} s={[0.18, 0.18, 0.18]} c={WOOD} />
      <Plant p={M(-1.0, 0, 1.7)} />

      {/* back-left: second bedroom or storage */}
      {bedrooms >= 2 ? (
        <>
          <group position={M(-2.75, 0, -1.15)}>
            <Bed p={[0, 0, 0]} small />
          </group>
          <Wardrobe p={M(-2.6, 0, -0.18)} />
        </>
      ) : (
        <>
          <Wardrobe p={M(-2.6, 0, -1.75)} />
          <Plant p={M(-3.2, 0, -0.4)} big />
        </>
      )}

      {/* bathroom */}
      <group position={M(-1.35, 0, -1.2)}>
        <Bath p={[0, 0, 0]} />
      </group>

      {/* kitchen along back wall + island */}
      <group position={M(1.45, 0, -1.65)}>
        <Kitchen p={[0, 0, 0]} />
      </group>

      {/* dining */}
      <Dining p={M(-0.1, 0, -0.75)} />

      {/* living: rug, sofa facing TV on the inner wall */}
      <B p={M(1.5, 0.006, 0.95)} s={[1.8, 0.012, 1.25]} c={RUG} />
      <group position={M(0.05, 0, 0.95)}>
        <Sofa p={[0, 0, 0]} />
      </group>
      <CoffeeTable p={M(1.0, 0, 0.95)} />
      <Armchair p={M(1.45, 0, 1.55)} />
      <Tv p={M(3.28, 0, 0.95)} />
      <Bookshelf p={M(3.32, 0, -0.45)} />
      <Plant p={M(2.9, 0, 1.7)} big />

      {/* study corner for larger configurations */}
      {bedrooms >= 3 && <Desk p={M(2.45, 0, 1.6)} />}
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
        c={WOOD}
      />
    );
  }

  return (
    <group>
      {/* lower walls: sides + back, front left open as the section cut */}
      <B p={M(-3.45, lowH / 2, 0)} s={[t, lowH, 8.1 + t]} c={WALL} />
      <B p={M(3.45, lowH / 2, 0)} s={[t, lowH, 8.1 + t]} c={WALL} />
      <B p={M(0, lowH / 2, -4.05)} s={[6.9 + t, lowH, t]} c={WALL} />

      {/* mid slab with stair void + double-height living void at the front */}
      <B p={M(-0.6, 1.02, -1.225)} s={[5.7, 0.1, 5.65]} c={WALL} />
      <B p={M(2.85, 1.02, -2.825)} s={[1.2, 0.1, 2.45]} c={WALL} />

      {/* staircase + railings */}
      {steps}
      <B p={M(-0.6, upY + 0.12, 1.6)} s={[5.7, 0.24, 0.05]} c="#ddd6c8" />
      <B p={M(2.25, upY + 0.12, 0)} s={[0.05, 0.24, 3.2]} c="#ddd6c8" />

      {/* upper walls */}
      <B p={M(-3.45, upY + upH / 2, 0)} s={[t, upH, 8.1 + t]} c={WALL} />
      <B p={M(3.45, upY + upH / 2, 0)} s={[t, upH, 8.1 + t]} c={WALL} />
      <B p={M(0, upY + upH / 2, -4.05)} s={[6.9 + t, upH, t]} c={WALL} />
      <B p={M(0.2, upY + upH / 2, -2.825)} s={[0.05, upH, 2.45]} c={WALL} />

      {/* lower level: kitchen, dining, double-height living */}
      <group position={M(0.8, 0, -3.6)}>
        <Kitchen p={[0, 0, 0]} />
      </group>
      <Dining p={M(2.0, 0, -1.5)} />
      <B p={M(-1.4, 0.006, 2.3)} s={[2.3, 0.012, 1.8]} c={RUG} />
      <group position={M(-2.8, 0, 2.3)}>
        <Sofa p={[0, 0, 0]} />
      </group>
      <CoffeeTable p={M(-1.5, 0, 2.3)} />
      <Armchair p={M(-0.7, 0, 3.2)} />
      <Tv p={M(3.28, 0, 2.6)} />
      <Bookshelf p={M(-3.32, 0, -0.5)} />
      <Plant p={M(-3.0, 0, 3.6)} big />
      <Plant p={M(3.0, 0, -0.3)} />

      {/* upper level: bedrooms, study overlooking the void */}
      <group position={M(0, upY, 0)}>
        <group position={M(-2.4, 0, -3.2)}>
          <Bed p={[0, 0, 0]} />
        </group>
        <group position={M(2.35, 0, -3.25)}>
          <Bed p={[0, 0, 0]} small />
        </group>
        <Wardrobe p={M(-0.9, 0, -3.85)} />
        <B p={M(-2.4, 0.006, -2.5)} s={[1.6, 0.012, 1.1]} c={RUG} />
        <Desk p={M(-1.2, 0, 1.15)} />
        <Plant p={M(1.7, 0, 1.1)} big />
      </group>
    </group>
  );
}
