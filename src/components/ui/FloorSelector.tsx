"use client";

import type { PublicFloor } from "@/lib/types";

export default function FloorSelector({
  floors,
  selectedFloorId,
  onSelect,
  onClear,
}: {
  floors: PublicFloor[];
  selectedFloorId: string | null;
  onSelect: (floor: PublicFloor) => void;
  onClear: () => void;
}) {
  const sorted = [...floors].sort((a, b) => b.number - a.number);
  return (
    <div className="pointer-events-auto flex max-h-[64dvh] flex-col items-center gap-1 overflow-y-auto rounded-2xl bg-white/85 p-2 shadow-lg backdrop-blur">
      <button
        onClick={onClear}
        className={`mb-1 w-11 rounded-xl px-0 py-2.5 text-[10px] font-semibold uppercase tracking-wide transition ${
          selectedFloorId == null
            ? "bg-slate-900 text-white"
            : "text-slate-500 hover:bg-slate-100"
        }`}
        title="Full building view"
      >
        All
      </button>
      {sorted.map((floor) => {
        const active = floor.id === selectedFloorId;
        return (
          <button
            key={floor.id}
            onClick={() => onSelect(floor)}
            title={floor.label}
            className={`relative w-11 rounded-xl py-2.5 text-sm font-semibold transition ${
              active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {floor.penthouse ? "PH" : String(floor.number).padStart(2, "0")}
            {floor.featured && (
              <span
                className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${
                  active ? "bg-amber-300" : "bg-amber-400"
                }`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
