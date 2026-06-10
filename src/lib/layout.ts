// Shared building geometry used by both the 3D scene and the 2D fallback plan.
// Units are metres in scene space.

export const TOWER = {
  width: 16,
  depth: 10,
  floorHeight: 1.15,
  slabThickness: 0.18,
  corridor: 1.6,
  podiumHeight: 0.7,
};

export type UnitRect = { x: number; z: number; w: number; d: number };

/** Quadrant layout: A front-left, B front-right, C back-left, D back-right. */
export function unitRect(letterIndex: number): UnitRect {
  const i = letterIndex % 4;
  const col = i % 2; // 0 = left, 1 = right
  const row = Math.floor(i / 2); // 0 = front (+z), 1 = back (-z)
  const w = (TOWER.width - TOWER.corridor) / 2;
  const d = (TOWER.depth - TOWER.corridor) / 2;
  return {
    x: (col === 0 ? -1 : 1) * (TOWER.corridor / 2 + w / 2),
    z: (row === 0 ? 1 : -1) * (TOWER.corridor / 2 + d / 2),
    w,
    d,
  };
}

/** Penthouse layout: two duplex units split left/right around the core. */
export function penthouseRect(letterIndex: number): UnitRect {
  const i = letterIndex % 2;
  return { x: (i === 0 ? -1 : 1) * 4.4, z: 0, w: 7.2, d: 8.4 };
}

export function floorY(floorNumber: number): number {
  return TOWER.podiumHeight + (floorNumber - 1) * TOWER.floorHeight;
}

export const AVAILABILITY_COLOR: Record<string, string> = {
  available: "#34d399",
  reserved: "#fbbf24",
  sold: "#94a3b8",
  private: "#a5b4fc",
};

export const AVAILABILITY_LABEL: Record<string, string> = {
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
  private: "Private",
};
