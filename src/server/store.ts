import "server-only";
import fs from "node:fs";
import path from "node:path";
import { seedProject, type ProjectState, type Floor, type Home } from "./data";

// Draft/published store persisted to data/store.json on the server's disk.
// Public APIs read `published`; admin edits accumulate in `draft` until publish.

type StoreShape = {
  published: ProjectState;
  draft: ProjectState;
};

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

let cache: StoreShape | null = null;

function load(): StoreShape {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(STORE_FILE, "utf8")) as StoreShape;
  } catch {
    const seed = seedProject();
    cache = { published: seed, draft: structuredClone(seed) };
    save();
  }
  return cache!;
}

function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(cache, null, 2));
}

export function getPublished(): ProjectState {
  return load().published;
}

export function getDraft(): ProjectState {
  return load().draft;
}

export function updateDraft(mutate: (draft: ProjectState) => void): ProjectState {
  const store = load();
  mutate(store.draft);
  save();
  return store.draft;
}

export function publishDraft(): ProjectState {
  const store = load();
  store.published = structuredClone(store.draft);
  save();
  return store.published;
}

export function discardDraft(): ProjectState {
  const store = load();
  store.draft = structuredClone(store.published);
  save();
  return store.draft;
}

export function findHome(state: ProjectState, homeId: string): { floor: Floor; home: Home } | null {
  for (const floor of state.floors) {
    const home = floor.homes.find((h) => h.id === homeId);
    if (home) return { floor, home };
  }
  return null;
}

// --- uploaded assets -------------------------------------------------------

export function floorPlanPath(homeId: string): string | null {
  const dir = path.join(UPLOADS_DIR, "floor-plans");
  if (!fs.existsSync(dir)) return null;
  const file = fs.readdirSync(dir).find((f) => f.startsWith(homeId + "."));
  return file ? path.join(dir, file) : null;
}

export function interiorPaths(homeId: string): string[] {
  const dir = path.join(UPLOADS_DIR, "interiors", homeId);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .sort()
    .map((f) => path.join(dir, f));
}

export function saveUpload(kind: "floor-plan" | "interior", homeId: string, fileName: string, bytes: Buffer): void {
  const ext = path.extname(fileName).toLowerCase() || ".webp";
  if (![".webp", ".png", ".jpg", ".jpeg", ".svg"].includes(ext)) {
    throw new Error("Unsupported image type");
  }
  if (kind === "floor-plan") {
    const dir = path.join(UPLOADS_DIR, "floor-plans");
    fs.mkdirSync(dir, { recursive: true });
    // one plan per home — remove previous extensions
    for (const f of fs.readdirSync(dir)) {
      if (f.startsWith(homeId + ".")) fs.unlinkSync(path.join(dir, f));
    }
    fs.writeFileSync(path.join(dir, homeId + ext), bytes);
  } else {
    const dir = path.join(UPLOADS_DIR, "interiors", homeId);
    fs.mkdirSync(dir, { recursive: true });
    const idx = fs.readdirSync(dir).length;
    fs.writeFileSync(path.join(dir, String(idx).padStart(2, "0") + ext), bytes);
  }
}

// --- logs (error monitoring + analytics) -----------------------------------

export function appendLog(file: "analytics.jsonl" | "errors.jsonl" | "reservations.jsonl", entry: object): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.appendFileSync(
    path.join(DATA_DIR, file),
    JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n"
  );
}

export function readLogTail(file: "analytics.jsonl" | "errors.jsonl" | "reservations.jsonl", n = 500): object[] {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return [];
  return fs
    .readFileSync(p, "utf8")
    .trim()
    .split("\n")
    .slice(-n)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean) as object[];
}
