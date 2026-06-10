"use client";

// Admin console — not linked from public navigation. Requires ADMIN_PASSWORD
// (server env). This page is the only place internal records are visible,
// and only after authentication.

import { useCallback, useEffect, useState } from "react";
import type { Availability, ResidentDisplayMode } from "@/lib/types";

type AdminHome = {
  id: string;
  floorId: string;
  homeCode: string;
  publicDisplayName?: string;
  internalResidentReference?: string;
  showPublicName: boolean;
  configuration: string;
  carpetAreaSqFt?: number;
  orientation?: string;
  availability: Availability;
  meshIds: string[];
};

type AdminFloor = { id: string; number: number; label: string; featured: boolean; homes: AdminHome[] };
type AdminProject = { projectName: string; residentDisplayMode: ResidentDisplayMode; floors: AdminFloor[] };

const MODES: ResidentDisplayMode[] = ["fictional-demo", "approved-display-name", "hidden"];
const AVAILABILITIES: Availability[] = ["available", "reserved", "sold", "private"];

export default function AdminClient() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [draft, setDraft] = useState<AdminProject | null>(null);
  const [status, setStatus] = useState("");
  const [logs, setLogs] = useState<{ analytics: object[]; errors: object[] } | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/project");
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const data = await res.json();
    setDraft(data.draft);
    setAuthed(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const flash = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(""), 2500);
  };

  const patch = async (body: object) => {
    const res = await fetch("/api/admin/project", { method: "PATCH", body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) {
      flash(`Error: ${data.error}`);
    } else {
      setDraft(data.draft);
      flash("Saved to draft");
    }
  };

  const updateHome = (homeId: string, fields: object) => patch({ op: "update-home", homeId, fields });

  const upload = async (kind: "floor-plan" | "interior", homeId: string, file: File) => {
    const form = new FormData();
    form.set("kind", kind);
    form.set("homeId", homeId);
    form.set("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    flash(res.ok ? "Uploaded" : "Upload failed");
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setPassword("");
      refresh();
    } else {
      setLoginError("Invalid password");
    }
  };

  if (authed === null) {
    return <main className="flex min-h-dvh items-center justify-center text-sm text-slate-500">Loading…</main>;
  }

  if (!authed) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-100 p-4">
        <form onSubmit={login} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
          <h1 className="text-lg font-semibold text-slate-900">Admin Console</h1>
          <p className="mt-1 text-sm text-slate-500">Maharack Heights — homes configuration</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          {loginError && <p className="mt-2 text-sm text-red-600">{loginError}</p>}
          <button className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">
            Sign in
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Homes Admin</h1>
            <p className="text-sm text-slate-500">Edits are saved to a draft. Preview, then publish.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/?preview=1"
              target="_blank"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Preview draft ↗
            </a>
            <button
              onClick={async () => {
                await fetch("/api/admin/publish", { method: "POST" });
                flash("Published");
                refresh();
              }}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Publish
            </button>
            <button
              onClick={async () => {
                await fetch("/api/admin/publish", { method: "DELETE" });
                refresh();
                flash("Draft discarded");
              }}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Discard draft
            </button>
            <button
              onClick={async () => {
                await fetch("/api/admin/logout", { method: "POST" });
                setAuthed(false);
              }}
              className="rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-200"
            >
              Sign out
            </button>
          </div>
        </header>

        {status && (
          <p className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
            {status}
          </p>
        )}

        <section className="mb-6 rounded-2xl bg-white p-4 shadow">
          <h2 className="font-semibold text-slate-900">Resident display mode</h2>
          <p className="mt-1 text-xs text-slate-500">
            fictional-demo: sample residence names · approved-display-name: only names approved below ·
            hidden: generic “Home A/B/C” labels everywhere.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => patch({ op: "set-mode", mode: m })}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
                  draft?.residentDisplayMode === m
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </section>

        <div className="mb-4 flex justify-end">
          <button
            onClick={() => patch({ op: "add-floor" })}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            + Add floor
          </button>
        </div>

        {draft &&
          [...draft.floors]
            .sort((a, b) => b.number - a.number)
            .map((floor) => (
              <section key={floor.id} className="mb-4 rounded-2xl bg-white p-4 shadow">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900">
                    {floor.label}
                    {floor.featured && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">featured</span>}
                  </h2>
                  <button
                    onClick={() => patch({ op: "add-home", floorId: floor.id })}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    + Add home
                  </button>
                </div>
                <div className="space-y-3">
                  {floor.homes.map((home) => (
                    <div key={home.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                        <label className="text-xs text-slate-500">
                          Home code
                          <input disabled value={home.homeCode} className="mt-0.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-500" />
                        </label>
                        <label className="text-xs text-slate-500">
                          Public display name
                          <input
                            defaultValue={home.publicDisplayName ?? ""}
                            onBlur={(e) => {
                              if (e.target.value !== (home.publicDisplayName ?? ""))
                                updateHome(home.id, { publicDisplayName: e.target.value });
                            }}
                            className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs text-slate-500">
                          Configuration
                          <input
                            defaultValue={home.configuration}
                            onBlur={(e) => {
                              if (e.target.value !== home.configuration) updateHome(home.id, { configuration: e.target.value });
                            }}
                            className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs text-slate-500">
                          Carpet area (sq. ft.)
                          <input
                            type="number"
                            defaultValue={home.carpetAreaSqFt ?? ""}
                            onBlur={(e) =>
                              updateHome(home.id, { carpetAreaSqFt: e.target.value === "" ? null : Number(e.target.value) })
                            }
                            className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs text-slate-500">
                          Orientation
                          <input
                            defaultValue={home.orientation ?? ""}
                            onBlur={(e) => {
                              if (e.target.value !== (home.orientation ?? "")) updateHome(home.id, { orientation: e.target.value });
                            }}
                            className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs text-slate-500">
                          Availability
                          <select
                            value={home.availability}
                            onChange={(e) => updateHome(home.id, { availability: e.target.value })}
                            className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                          >
                            {AVAILABILITIES.map((a) => (
                              <option key={a}>{a}</option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs text-slate-500">
                          GLB mesh IDs (comma-separated)
                          <input
                            defaultValue={home.meshIds.join(", ")}
                            onBlur={(e) =>
                              updateHome(home.id, {
                                meshIds: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                              })
                            }
                            className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-mono"
                          />
                        </label>
                        <label className="text-xs text-amber-700">
                          Internal resident reference (never published)
                          <input
                            defaultValue={home.internalResidentReference ?? ""}
                            onBlur={(e) => {
                              if (e.target.value !== (home.internalResidentReference ?? ""))
                                updateHome(home.id, { internalResidentReference: e.target.value });
                            }}
                            className="mt-0.5 w-full rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-sm"
                          />
                        </label>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                        <label className="flex items-center gap-1.5 text-slate-700">
                          <input
                            type="checkbox"
                            checked={home.showPublicName}
                            onChange={(e) => updateHome(home.id, { showPublicName: e.target.checked })}
                          />
                          Show public display name
                        </label>
                        <label className="text-xs text-slate-500">
                          Floor plan:{" "}
                          <input
                            type="file"
                            accept=".webp,.png,.jpg,.jpeg,.svg"
                            onChange={(e) => e.target.files?.[0] && upload("floor-plan", home.id, e.target.files[0])}
                            className="text-xs"
                          />
                        </label>
                        <label className="text-xs text-slate-500">
                          Add interior image:{" "}
                          <input
                            type="file"
                            accept=".webp,.png,.jpg,.jpeg"
                            onChange={(e) => e.target.files?.[0] && upload("interior", home.id, e.target.files[0])}
                            className="text-xs"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                  {floor.homes.length === 0 && <p className="text-sm text-slate-400">No homes on this floor yet.</p>}
                </div>
              </section>
            ))}

        <section className="mt-6 rounded-2xl bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Monitoring</h2>
            <button
              onClick={async () => {
                const res = await fetch("/api/admin/logs");
                if (res.ok) setLogs(await res.json());
              }}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Load analytics & errors
            </button>
          </div>
          {logs && (
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium text-slate-700">Recent interactions ({logs.analytics.length})</h3>
                <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600">
                  {JSON.stringify(logs.analytics.slice(-30), null, 1)}
                </pre>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-700">Recent errors ({logs.errors.length})</h3>
                <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600">
                  {JSON.stringify(logs.errors.slice(-20), null, 1)}
                </pre>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
