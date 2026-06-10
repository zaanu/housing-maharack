// Public-facing types for the Vastu Heights multi-tower project.

import type { PublicFloor, ResidentDisplayMode } from "@/lib/types";

export type VastuTowerType = "residential" | "commercial";
export type VastuDirection = "NE" | "SE" | "SW" | "NW";

export type VastuBuilding = {
  buildingId: string;
  towerName: string;
  towerType: VastuTowerType;
  direction: VastuDirection;
  vastuZone: string;
  vastuElement: string;
  floors: PublicFloor[];
};

export type VastuProject = {
  projectName: string;
  tagline: string;
  residentDisplayMode: ResidentDisplayMode;
  buildings: VastuBuilding[];
};
