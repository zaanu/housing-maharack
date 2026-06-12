"use client";

import { Component, type ReactNode, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import type { PublicFloor, PublicHome, PublicProject } from "@/lib/types";
import { installErrorMonitor, track, webglSupported } from "@/lib/client";
import { AVAILABILITY_COLOR } from "@/lib/layout";
import type { SceneMode } from "./scene/mode";
import FloorSelector from "./ui/FloorSelector";
import HomePanel from "./ui/HomePanel";
import FloorPlanSVG from "./ui/FloorPlanSVG";

const BuildingScene = dynamic(() => import("./scene/BuildingScene"), { ssr: false });

const STAGES = ["Project View", "Building Slice", "Floor Selection", "Home Selection", "Home Details"];

class SceneErrorBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    fetch("/api/monitor", {
      method: "POST",
      body: JSON.stringify({ message: `Scene crash: ${error.message}`, stack: error.stack, url: location.href }),
    }).catch(() => {});
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const MODE_LABEL: Record<SceneMode, string> = { day: "Day", dusk: "Dusk", night: "Night" };

function ModeSwitch({ mode, onChange }: { mode: SceneMode; onChange: (m: SceneMode) => void }) {
  return (
    <div className="pointer-events-auto flex items-center gap-0.5 rounded-full bg-white/85 p-1 shadow backdrop-blur">
      {(Object.keys(MODE_LABEL) as SceneMode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
            mode === m ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {MODE_LABEL[m]}
        </button>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div className="pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full bg-white/85 px-3.5 py-1.5 text-[11px] font-medium text-slate-700 shadow backdrop-blur">
      {(["available", "reserved", "sold", "private"] as const).map((k) => (
        <span key={k} className="flex items-center gap-1.5 capitalize">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: AVAILABILITY_COLOR[k] }} />
          {k}
        </span>
      ))}
    </div>
  );
}

export default function Experience() {
  const [project, setProject] = useState<PublicProject | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [use3D, setUse3D] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [sceneMode, setSceneMode] = useState<SceneMode>("dusk");

  useEffect(() => {
    installErrorMonitor();
    if (!webglSupported()) setUse3D(false);
    const preview = new URLSearchParams(location.search).get("preview") === "1";
    setPreviewMode(preview);
    fetch(`/api/project${preview ? "?preview=1" : ""}`)
      .then((r) => r.json())
      .then(setProject)
      .catch(() => setLoadError(true));
  }, []);

  const floors = useMemo(() => project?.floors ?? [], [project]);
  const selectedFloor = floors.find((f) => f.id === selectedFloorId) ?? null;
  const selectedHome = selectedFloor?.homes.find((h) => h.id === selectedHomeId) ?? null;

  const stageIndex = selectedHome ? 4 : selectedFloor ? 2 : sceneReady || !use3D ? 1 : 0;

  const selectFloor = (floor: PublicFloor) => {
    setSelectedFloorId(floor.id);
    setSelectedHomeId(null);
    track({ type: "floor-selected", floorId: floor.id });
  };
  const selectHome = (home: PublicHome) => {
    setSelectedFloorId(home.floorId);
    setSelectedHomeId(home.id);
    track({ type: "home-selected", floorId: home.floorId, homeId: home.id });
  };
  const clearAll = () => {
    setSelectedFloorId(null);
    setSelectedHomeId(null);
  };

  const loading = !project || (use3D && !sceneReady);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#241a3e]">
      {/* 3D scene or 2D fallback */}
      {project && use3D && (
        <SceneErrorBoundary onError={() => setUse3D(false)}>
          <div className="absolute inset-0">
            <BuildingScene
              floors={floors}
              selectedFloor={selectedFloor}
              selectedHomeId={selectedHomeId}
              mode={sceneMode}
              onSelectFloor={selectFloor}
              onSelectHome={selectHome}
              onClearSelection={() => setSelectedHomeId(null)}
              onReady={() => setSceneReady(true)}
            />
          </div>
        </SceneErrorBoundary>
      )}
      {project && !use3D && (
        <div className="absolute inset-0 overflow-y-auto px-4 pb-40 pt-28 md:px-8">
          <div className="mx-auto max-w-2xl">
            <p className="mb-3 rounded-xl bg-amber-50 px-4 py-2 text-xs text-amber-800">
              3D view is unavailable on this device — showing the 2D floor plan explorer instead.
            </p>
            {selectedFloor ? (
              <div className="rounded-2xl bg-white p-4 shadow">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900">{selectedFloor.label}</h2>
                  <button onClick={clearAll} className="text-sm text-slate-500 underline">
                    All floors
                  </button>
                </div>
                <FloorPlanSVG floor={selectedFloor} selectedHomeId={selectedHomeId} onSelect={selectHome} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[...floors]
                  .sort((a, b) => b.number - a.number)
                  .map((f) => (
                    <button
                      key={f.id}
                      onClick={() => selectFloor(f)}
                      className="rounded-xl bg-white px-4 py-3 text-left shadow transition hover:shadow-md"
                    >
                      <span className="block font-semibold text-slate-900">{f.label}</span>
                      <span className="text-xs text-slate-500">
                        {f.homes.length} homes{f.featured ? " · featured" : ""}
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* header */}
      <header className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex flex-col gap-2 p-4 md:p-5">
        <div className="flex items-start justify-between">
          <div className="pointer-events-auto rounded-2xl bg-white/85 px-4 py-2.5 shadow backdrop-blur">
            <h1 className="text-base font-bold leading-tight text-slate-900 md:text-lg">
              {project?.projectName ?? "Maharack Heights"}
            </h1>
            <p className="text-xs text-slate-500">
              {project?.towerName ?? "Tower A"} · Interactive Slice View
              {previewMode && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">PREVIEW</span>}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Legend />
            {use3D && <ModeSwitch mode={sceneMode} onChange={setSceneMode} />}
            <a
              href="/vastu-heights"
              className="pointer-events-auto rounded-full bg-[#2A2420]/90 px-3.5 py-1.5 text-[11px] font-semibold text-amber-200 shadow backdrop-blur hover:bg-[#2A2420] hover:text-amber-100 transition-colors"
            >
              Vastu Heights →
            </a>
          </div>
        </div>
        <nav className="hidden md:block">
          <ol className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-white/85 px-3.5 py-1.5 text-[11px] shadow backdrop-blur">
            {STAGES.map((s, i) => (
              <li key={s} className="flex items-center gap-1">
                {i > 0 && <span className="text-slate-300">→</span>}
                <span className={i <= stageIndex ? "font-semibold text-slate-900" : "text-slate-400"}>{s}</span>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      {/* floor selector */}
      {project && (
        <div className="absolute left-3 top-1/2 z-20 -translate-y-1/2 md:left-5">
          <FloorSelector
            floors={floors}
            selectedFloorId={selectedFloorId}
            onSelect={selectFloor}
            onClear={clearAll}
          />
        </div>
      )}

      {/* hint */}
      <AnimatePresence>
        {project && !selectedHome && (
          <motion.p
            key={selectedFloor ? "floor" : "building"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/85 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur"
          >
            {selectedFloor
              ? "Tap a home to view its details"
              : use3D
                ? "Drag to rotate · pinch or scroll to zoom · tap a floor to slice"
                : "Select a floor to view its plan"}
          </motion.p>
        )}
      </AnimatePresence>

      {/* home details */}
      <HomePanel home={selectedHome} floor={selectedFloor} onClose={() => setSelectedHomeId(null)} />

      {/* loading / error overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-[#0f172a]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
          >
            {loadError ? (
              <p className="px-6 text-center text-sm text-slate-300">
                Could not load project data. Please refresh the page.
              </p>
            ) : (
              <>
                <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-600 border-t-white" />
                <div className="text-center">
                  <p className="text-lg font-semibold text-white">Maharack Heights</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                    Preparing building view
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
