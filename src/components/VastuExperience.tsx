"use client";

import { Component, type ReactNode, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { PublicFloor, PublicHome } from "@/lib/types";
import type { VastuBuilding, VastuProject } from "@/lib/vastuTypes";
import { AVAILABILITY_COLOR } from "@/lib/layout";
import HomePanel from "./ui/HomePanel";

const VastuCampus = dynamic(() => import("./scene/VastuCampus"), { ssr: false });

// ── Direction badge colour ────────────────────────────────────────────────────
const DIR_STYLE: Record<string, { bg: string; text: string }> = {
  NE: { bg: "#dbeafe", text: "#1e40af" },
  SE: { bg: "#fee2e2", text: "#991b1b" },
  SW: { bg: "#fef3c7", text: "#92400e" },
  NW: { bg: "#ede9fe", text: "#5b21b6" },
};

// ── Element icon ──────────────────────────────────────────────────────────────
const ELEMENT_ICON: Record<string, string> = {
  Water: "◈",
  Fire: "◆",
  Earth: "◇",
  Air: "◉",
};

class SceneErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) {
    fetch("/api/monitor", {
      method: "POST",
      body: JSON.stringify({ message: `VastuScene crash: ${error.message}`, url: location.href }),
    }).catch(() => {});
    this.props.onError();
  }
  render() { return this.state.failed ? null : this.props.children; }
}

// ── Building selector pills ───────────────────────────────────────────────────
function BuildingPills({
  buildings,
  selected,
  onSelect,
}: {
  buildings: VastuBuilding[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {buildings.map((b) => {
        const ds = DIR_STYLE[b.direction] ?? { bg: "#f1f5f9", text: "#334155" };
        const active = b.buildingId === selected;
        return (
          <button
            key={b.buildingId}
            onClick={() => onSelect(active ? null : b.buildingId)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold shadow transition-all ${
              active ? "bg-[#2A2420] text-white shadow-black/20" : "bg-white/90 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
              style={active ? { background: "#ffffff30", color: "#fff" } : { background: ds.bg, color: ds.text }}
            >
              {b.direction}
            </span>
            {b.towerName}
            <span className={active ? "text-amber-300" : "text-slate-400"} title={b.vastuElement}>
              {ELEMENT_ICON[b.vastuElement] ?? "◯"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full bg-white/85 px-3.5 py-1.5 text-[11px] font-medium text-slate-700 shadow backdrop-blur">
      {(["available", "reserved", "sold", "private"] as const).map((k) => (
        <span key={k} className="flex items-center gap-1.5 capitalize">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: AVAILABILITY_COLOR[k] }} />
          {k}
        </span>
      ))}
    </div>
  );
}

// ── Floor strip (vertical pill list for the selected tower) ───────────────────
function FloorStrip({
  floors,
  selectedNumber,
  onSelect,
}: {
  floors: PublicFloor[];
  selectedNumber: number | null;
  onSelect: (f: PublicFloor) => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedNumber == null || !stripRef.current) return;
    const el = stripRef.current.querySelector(`[data-fn="${selectedNumber}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedNumber]);

  const sorted = [...floors].sort((a, b) => b.number - a.number);

  return (
    <div
      ref={stripRef}
      className="flex max-h-[60vh] flex-col gap-0.5 overflow-y-auto pr-0.5"
      style={{ scrollbarWidth: "none" }}
    >
      {sorted.map((f) => {
        const isSel = f.number === selectedNumber;
        const availCount = f.homes.filter((h) => h.availability === "available").length;
        return (
          <button
            key={f.id}
            data-fn={f.number}
            onClick={() => onSelect(f)}
            className={`flex min-w-[72px] flex-col items-start rounded-md px-2.5 py-1.5 text-left transition-all ${
              isSel
                ? "bg-[#2A2420] text-white shadow"
                : f.featured
                ? "bg-amber-50 text-slate-700 hover:bg-amber-100"
                : f.penthouse
                ? "bg-violet-50 text-slate-700 hover:bg-violet-100"
                : "bg-white/80 text-slate-600 hover:bg-white"
            }`}
          >
            <span className={`text-[11px] font-bold ${isSel ? "text-white" : "text-slate-800"}`}>
              {f.penthouse ? "PH" : `FL ${f.number}`}
            </span>
            {availCount > 0 && (
              <span className={`text-[9px] ${isSel ? "text-emerald-300" : "text-emerald-600"}`}>
                {availCount} avail.
              </span>
            )}
            {f.featured && !isSel && (
              <span className="text-[9px] text-amber-500">featured</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Home chips for a selected floor ──────────────────────────────────────────
function FloorHomeChips({
  floor,
  selectedHomeId,
  onSelect,
}: {
  floor: PublicFloor;
  selectedHomeId: string | null;
  onSelect: (h: PublicHome) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {floor.penthouse ? "Penthouse" : `Floor ${floor.number}`} · {floor.homes.length} unit{floor.homes.length !== 1 ? "s" : ""}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {floor.homes.map((h) => {
          const isSel = h.id === selectedHomeId;
          const col = AVAILABILITY_COLOR[h.availability] ?? "#94a3b8";
          return (
            <button
              key={h.id}
              onClick={() => onSelect(h)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold shadow-sm transition-all ${
                isSel ? "bg-[#2A2420] text-white" : "bg-white/90 text-slate-700 hover:bg-white"
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col }} />
              {h.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Building info header ──────────────────────────────────────────────────────
function BuildingHeader({ building }: { building: VastuBuilding }) {
  const ds = DIR_STYLE[building.direction] ?? { bg: "#f1f5f9", text: "#334155" };
  return (
    <div className="flex items-start gap-2">
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: ds.bg, color: ds.text }}>
            {building.direction}
          </span>
          <span className="text-[10px] text-slate-500 uppercase tracking-wide">{building.vastuZone}</span>
        </div>
        <div className="mt-0.5 text-[15px] font-bold text-slate-800">{building.towerName}</div>
        <div className="text-[11px] text-slate-500 capitalize">{building.towerType} · {building.vastuElement} element · 65 floors</div>
      </div>
    </div>
  );
}

// ── Main VastuExperience ──────────────────────────────────────────────────────
export default function VastuExperience() {
  const [project, setProject] = useState<VastuProject | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneError, setSceneError] = useState(false);

  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<PublicFloor | null>(null);
  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/vastu/project")
      .then((r) => r.json())
      .then((data) => setProject(data as VastuProject))
      .catch(() => setLoadError(true));
  }, []);

  const selectedBuilding = project?.buildings.find((b) => b.buildingId === selectedBuildingId) ?? null;
  const selectedHome = selectedFloor?.homes.find((h) => h.id === selectedHomeId) ?? null;

  function handleSelectBuilding(id: string | null) {
    setSelectedBuildingId(id);
    setSelectedFloor(null);
    setSelectedHomeId(null);
  }

  function handleSelectFloor(floor: PublicFloor) {
    setSelectedFloor(floor);
    setSelectedHomeId(null);
  }

  function handleSelectHome(home: PublicHome) {
    setSelectedHomeId(home.id);
  }

  function handleClearSelection() {
    setSelectedBuildingId(null);
    setSelectedFloor(null);
    setSelectedHomeId(null);
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-100">
      {/* 3D canvas */}
      {!sceneError && (
        <SceneErrorBoundary onError={() => setSceneError(true)}>
          {project && (
            <div className="absolute inset-0">
              <VastuCampus
                buildings={project.buildings}
                selectedBuildingId={selectedBuildingId}
                selectedFloor={selectedFloor}
                selectedHomeId={selectedHomeId}
                onSelectBuilding={handleSelectBuilding}
                onSelectFloor={handleSelectFloor}
                onSelectHome={handleSelectHome}
                onClearSelection={handleClearSelection}
                onReady={() => setSceneReady(true)}
              />
            </div>
          )}
        </SceneErrorBoundary>
      )}

      {/* Loading shimmer */}
      {!sceneReady && !loadError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-100">
          <div className="text-center">
            <div className="mb-3 text-[13px] font-semibold uppercase tracking-widest text-slate-500">
              Vastu Heights
            </div>
            <div className="flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                  style={{ animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* load error */}
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <div className="text-center text-slate-500">
            <div className="mb-2 text-lg font-semibold">Could not load project data</div>
            <button className="rounded bg-slate-800 px-4 py-2 text-sm text-white"
                    onClick={() => location.reload()}>Retry</button>
          </div>
        </div>
      )}

      {/* ── Top bar ── */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-start justify-between gap-3 p-3">
        {/* Project header / breadcrumb */}
        <div className="pointer-events-auto flex flex-col gap-1 rounded-2xl bg-white/90 px-4 py-3 shadow backdrop-blur">
          <div className="flex items-center gap-2">
            {selectedBuilding && (
              <button
                onClick={handleClearSelection}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-200"
              >
                ← All
              </button>
            )}
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              {project?.projectName ?? "Vastu Heights"}
            </span>
          </div>
          {project?.tagline && (
            <p className="max-w-[300px] text-[11px] text-slate-500">{project.tagline}</p>
          )}
          {/* building selector pills */}
          {project && (
            <div className="mt-1">
              <BuildingPills
                buildings={project.buildings}
                selected={selectedBuildingId}
                onSelect={handleSelectBuilding}
              />
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="pointer-events-auto mt-1">
          <Legend />
        </div>
      </div>

      {/* ── Left sidebar — floor selector (appears when a building is selected) ── */}
      {selectedBuilding && (
        <div className="pointer-events-auto absolute bottom-4 left-3 top-[120px] z-10 flex w-[100px] flex-col gap-2 overflow-hidden">
          <div className="rounded-2xl bg-white/90 p-2 shadow backdrop-blur">
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">Floors</div>
            <FloorStrip
              floors={selectedBuilding.floors}
              selectedNumber={selectedFloor?.number ?? null}
              onSelect={handleSelectFloor}
            />
          </div>
        </div>
      )}

      {/* ── Right sidebar — building info + floor homes panel ── */}
      {selectedBuilding && (
        <div className="pointer-events-auto absolute right-3 top-[72px] z-10 flex w-[260px] flex-col gap-3">
          <div className="rounded-2xl bg-white/92 p-3 shadow backdrop-blur">
            <BuildingHeader building={selectedBuilding} />
          </div>
          {selectedFloor && (
            <div className="rounded-2xl bg-white/92 p-3 shadow backdrop-blur">
              <FloorHomeChips
                floor={selectedFloor}
                selectedHomeId={selectedHomeId}
                onSelect={handleSelectHome}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Home details panel (bottom) ── */}
      {selectedHome && selectedFloor && (
        <div className="pointer-events-auto absolute bottom-4 right-3 z-10 w-[300px]">
          <HomePanel
            home={selectedHome}
            floor={selectedFloor}
            onClose={() => setSelectedHomeId(null)}
          />
        </div>
      )}

      {/* Back to original project link */}
      <div className="pointer-events-auto absolute bottom-4 left-[120px] z-10">
        <a
          href="/"
          className="rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow backdrop-blur hover:bg-white"
        >
          ← Main Building
        </a>
      </div>
    </div>
  );
}
