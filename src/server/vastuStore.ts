import "server-only";
import fs from "node:fs";
import path from "node:path";
import { seedVastuProject, type VastuProjectState, type VastuFloor, type VastuHome } from "./vastuData";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "vastu-store.json");

let cache: VastuProjectState | null = null;

function load(): VastuProjectState {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(STORE_FILE, "utf8")) as VastuProjectState;
  } catch {
    cache = seedVastuProject();
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(cache, null, 2));
  }
  return cache!;
}

export function getVastuProject(): VastuProjectState {
  return load();
}

export function findVastuHome(
  state: VastuProjectState,
  homeId: string
): { floor: VastuFloor; home: VastuHome } | null {
  for (const building of state.buildings) {
    for (const floor of building.floors) {
      const home = floor.homes.find((h) => h.id === homeId);
      if (home) return { floor, home };
    }
  }
  return null;
}
