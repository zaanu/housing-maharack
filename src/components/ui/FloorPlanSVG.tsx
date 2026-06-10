"use client";

import type { PublicFloor, PublicHome } from "@/lib/types";
import { unitRect, AVAILABILITY_COLOR } from "@/lib/layout";

// 2D floor plan used by the WebGL fallback and the "View Floor Plan" modal.
// Mirrors the 3D quadrant layout (scene metre × 10 = SVG unit).

export default function FloorPlanSVG({
  floor,
  selectedHomeId,
  onSelect,
}: {
  floor: PublicFloor;
  selectedHomeId?: string | null;
  onSelect?: (home: PublicHome) => void;
}) {
  return (
    <svg viewBox="0 0 176 116" className="h-auto w-full" role="img" aria-label={`${floor.label} plan`}>
      <rect x="4" y="4" width="168" height="108" rx="4" fill="#f5f2ea" stroke="#94a3b8" strokeWidth="1.5" />
      {/* corridor cross */}
      <rect x="80" y="6" width="16" height="104" fill="#e4ded0" />
      <rect x="6" y="47" width="164" height="22" fill="#e4ded0" />
      <text x="88" y="60.5" textAnchor="middle" fontSize="5" fill="#64748b" letterSpacing="1.5">
        CORRIDOR
      </text>
      {floor.homes.map((home, i) => {
        const r = unitRect(i);
        const x = 88 + (r.x - r.w / 2) * 10;
        const y = 58 + (r.z - r.d / 2) * 10;
        const selected = home.id === selectedHomeId;
        return (
          <g
            key={home.id}
            onClick={() => onSelect?.(home)}
            className={onSelect ? "cursor-pointer" : undefined}
          >
            <rect
              x={x + 2}
              y={y + 2}
              width={r.w * 10 - 4}
              height={r.d * 10 - 4}
              rx="2.5"
              fill={AVAILABILITY_COLOR[home.availability] ?? "#cbd5e1"}
              fillOpacity={selected ? 0.95 : 0.6}
              stroke={selected ? "#0f172a" : "#475569"}
              strokeWidth={selected ? 2 : 1}
            />
            <text
              x={x + r.w * 5}
              y={y + r.d * 5 - 1}
              textAnchor="middle"
              fontSize="6.5"
              fontWeight="600"
              fill="#0f172a"
            >
              {home.homeCode}
            </text>
            <text x={x + r.w * 5} y={y + r.d * 5 + 7} textAnchor="middle" fontSize="4.6" fill="#1e293b">
              {home.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
