import "server-only";
import type { PublicFloor, PublicHome, PublicProject } from "@/lib/types";
import type { Floor, Home, ProjectState } from "./data";
import { floorPlanPath, interiorPaths } from "./store";

// Maps internal records to the public payload.
// HARD RULE: `internalResidentReference` is never copied. Private homes also
// lose configuration, areas, orientation and assets.

const LETTER_OF = (home: Home) => home.homeCode.split("-")[1]?.toUpperCase() ?? "?";

function resolveLabel(home: Home, mode: ProjectState["residentDisplayMode"]): string {
  const generic = `Home ${LETTER_OF(home)}`;
  if (mode === "hidden") return generic;
  // "fictional-demo": sample residence names from demo data.
  // "approved-display-name": only labels an admin has approved (showPublicName).
  return home.showPublicName && home.publicDisplayName ? home.publicDisplayName : generic;
}

function toPublicHome(home: Home, mode: ProjectState["residentDisplayMode"]): PublicHome {
  const isPrivate = home.availability === "private";
  return {
    id: home.id,
    floorId: home.floorId,
    homeCode: home.homeCode,
    label: resolveLabel(home, mode),
    letter: LETTER_OF(home),
    configuration: isPrivate ? undefined : home.configuration,
    carpetAreaSqFt: isPrivate ? undefined : home.carpetAreaSqFt,
    builtUpAreaSqFt: isPrivate ? undefined : home.builtUpAreaSqFt,
    orientation: isPrivate ? undefined : home.orientation,
    availability: home.availability,
    meshIds: home.meshIds,
    hasFloorPlan: isPrivate ? false : floorPlanPath(home.id) !== null,
    interiorImageCount: isPrivate ? 0 : interiorPaths(home.id).length,
    isPrivate,
  };
}

function toPublicFloor(floor: Floor, mode: ProjectState["residentDisplayMode"]): PublicFloor {
  return {
    id: floor.id,
    number: floor.number,
    label: floor.label,
    featured: floor.featured,
    homes: floor.homes.map((h) => toPublicHome(h, mode)),
  };
}

export function toPublicProject(state: ProjectState): PublicProject {
  return {
    projectName: state.projectName,
    towerName: state.towerName,
    residentDisplayMode: state.residentDisplayMode,
    floors: state.floors.map((f) => toPublicFloor(f, state.residentDisplayMode)),
  };
}
