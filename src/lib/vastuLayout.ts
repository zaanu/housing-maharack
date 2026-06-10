// Vastu Heights — campus geometry constants.
// 65-floor luxury towers, Marina One-inspired proportions.

export const VASTU_TOWER = {
  width: 20,
  depth: 14,
  floorHeight: 1.2,
  slabThickness: 0.22,
  corridor: 2.0,
  podiumHeight: 1.4,
};

// Scene position of each tower around the central Brahmasthan.
// NE = Ishan (residential), SE = Agni (commercial),
// SW = Nairutya (residential), NW = Vayu (commercial).
export const VASTU_POSITIONS: Record<string, [number, number, number]> = {
  ishan:    [32, 0, -32],
  agni:     [32, 0,  32],
  nairutya: [-32, 0,  32],
  vayu:     [-32, 0, -32],
};

// Floors that get sky-garden setback terraces.
export const SKY_GARDEN_FLOORS = new Set([15, 25, 35, 45, 55]);

export type VastuUnitRect = { x: number; z: number; w: number; d: number };

/** Quad layout — 4 units per floor (standard + premium + sky-suite zones). */
export function vastuUnitRect(letterIndex: number): VastuUnitRect {
  const i = letterIndex % 4;
  const col = i % 2;
  const row = Math.floor(i / 2);
  const w = (VASTU_TOWER.width - VASTU_TOWER.corridor) / 2;
  const d = (VASTU_TOWER.depth - VASTU_TOWER.corridor) / 2;
  return {
    x: (col === 0 ? -1 : 1) * (VASTU_TOWER.corridor / 2 + w / 2),
    z: (row === 0 ? 1 : -1) * (VASTU_TOWER.corridor / 2 + d / 2),
    w,
    d,
  };
}

/** Half-floor layout — 2 large units (signature + crown zones). */
export function vastuHalfRect(letterIndex: number): VastuUnitRect {
  const i = letterIndex % 2;
  const w = (VASTU_TOWER.width - VASTU_TOWER.corridor) / 2;
  return {
    x: (i === 0 ? -1 : 1) * (VASTU_TOWER.corridor / 2 + w / 2),
    z: 0,
    w,
    d: VASTU_TOWER.depth - VASTU_TOWER.corridor,
  };
}

export function vastuFloorY(floorNumber: number): number {
  return VASTU_TOWER.podiumHeight + (floorNumber - 1) * VASTU_TOWER.floorHeight;
}

export type FloorZone =
  | "lobby"
  | "standard"
  | "premium"
  | "sky-suite"
  | "signature"
  | "crown";

export function residentialZone(n: number): FloorZone {
  if (n <= 3) return "lobby";
  if (n <= 25) return "standard";
  if (n <= 45) return "premium";
  if (n <= 55) return "sky-suite";
  if (n <= 64) return "signature";
  return "crown";
}

export function commercialZone(n: number): FloorZone {
  if (n <= 3) return "lobby";
  if (n <= 20) return "standard";
  if (n <= 40) return "premium";
  if (n <= 55) return "sky-suite";
  if (n <= 64) return "signature";
  return "crown";
}
