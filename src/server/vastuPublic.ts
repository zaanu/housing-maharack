import "server-only";
import type { PublicFloor, PublicHome } from "@/lib/types";
import type { VastuBuilding, VastuProject } from "@/lib/vastuTypes";
import type { VastuFloor, VastuHome, VastuProjectState } from "./vastuData";

function toPublicHome(home: VastuHome): PublicHome {
  const letter = home.homeCode.split("-")[1]?.toUpperCase() ?? "?";
  const isPrivate = home.availability === "private";
  return {
    id: home.id,
    floorId: home.floorId,
    homeCode: home.homeCode,
    label: home.showPublicName && home.publicDisplayName ? home.publicDisplayName : `Unit ${letter}`,
    letter,
    configuration: isPrivate ? undefined : home.configuration,
    carpetAreaSqFt: isPrivate ? undefined : home.carpetAreaSqFt,
    builtUpAreaSqFt: isPrivate ? undefined : home.builtUpAreaSqFt,
    orientation: isPrivate ? undefined : home.orientation,
    availability: home.availability,
    meshIds: home.meshIds,
    hasFloorPlan: false,
    interiorImageCount: 0,
    isPrivate,
  };
}

function toPublicFloor(floor: VastuFloor): PublicFloor {
  return {
    id: floor.id,
    number: floor.number,
    label: floor.label,
    featured: floor.featured,
    penthouse: floor.penthouse,
    homes: floor.homes.map(toPublicHome),
  };
}

export function toVastuPublicProject(state: VastuProjectState): VastuProject {
  return {
    projectName: state.projectName,
    tagline: state.tagline,
    residentDisplayMode: state.residentDisplayMode,
    buildings: state.buildings.map(
      (b): VastuBuilding => ({
        buildingId: b.buildingId,
        towerName: b.towerName,
        towerType: b.towerType,
        direction: b.direction,
        vastuZone: b.vastuZone,
        vastuElement: b.vastuElement,
        floors: b.floors.map(toPublicFloor),
      })
    ),
  };
}
