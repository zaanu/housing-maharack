import "server-only";
import type { Availability, ResidentDisplayMode } from "@/lib/types";

// ---------------------------------------------------------------------------
// INTERNAL record types. `internalResidentReference` must never be sent to the
// public frontend — the mapping in src/server/public.ts strips it.
// ---------------------------------------------------------------------------

export type Home = {
  id: string;
  floorId: string;
  homeCode: string;
  publicDisplayName?: string;
  internalResidentReference?: string;
  showPublicName: boolean;
  configuration: string;
  carpetAreaSqFt?: number;
  builtUpAreaSqFt?: number;
  orientation?: string;
  availability: Availability;
  meshIds: string[];
};

export type Floor = {
  id: string;
  number: number;
  label: string;
  featured: boolean;
  penthouse?: boolean;
  homes: Home[];
};

export type ProjectState = {
  projectName: string;
  towerName: string;
  residentDisplayMode: ResidentDisplayMode;
  floors: Floor[];
};

const LETTERS = ["a", "b", "c", "d"] as const;

function genericFloor(number: number): Floor {
  const id = `floor-${String(number).padStart(2, "0")}`;
  const nn = String(number).padStart(2, "0");
  const configs = ["2 BHK", "3 BHK", "3 BHK", "2 BHK"];
  const areas = [1080, 1420, 1460, 1120];
  const avail: Availability[] = ["available", "available", "reserved", "sold"];
  return {
    id,
    number,
    label: `Floor ${nn}`,
    featured: false,
    homes: LETTERS.map((l, i) => ({
      id: `home-${nn}-${l}`,
      floorId: id,
      homeCode: `${nn}-${l.toUpperCase()}`,
      showPublicName: false,
      configuration: configs[i],
      carpetAreaSqFt: areas[i],
      availability: avail[(i + number) % 4],
      meshIds: [`tower-a__floor-${nn}__home-${l}`],
    })),
  };
}

function namedFloor(
  number: number,
  homes: Array<{
    name: string;
    config: string;
    carpet: number;
    orientation: string;
    availability: Availability;
    internalRef?: string;
  }>
): Floor {
  const nn = String(number).padStart(2, "0");
  const id = `floor-${nn}`;
  return {
    id,
    number,
    label: `Floor ${nn}`,
    featured: true,
    homes: homes.map((h, i) => ({
      id: `home-${nn}-${LETTERS[i]}`,
      floorId: id,
      homeCode: `${nn}-${LETTERS[i].toUpperCase()}`,
      publicDisplayName: h.name,
      internalResidentReference: h.internalRef,
      showPublicName: true,
      configuration: h.config,
      carpetAreaSqFt: h.carpet,
      orientation: h.orientation,
      availability: h.availability,
      meshIds: [`tower-a__floor-${nn}__home-${LETTERS[i]}`],
    })),
  };
}

function penthouseFloor(): Floor {
  return {
    id: "floor-13",
    number: 13,
    label: "Penthouse · Floors 13–14",
    featured: true,
    penthouse: true,
    homes: [
      {
        id: "home-ph-a",
        floorId: "floor-13",
        homeCode: "PH-A",
        publicDisplayName: "The Maharack Penthouse",
        showPublicName: true,
        configuration: "5 BHK Duplex",
        carpetAreaSqFt: 4250,
        orientation: "Double-height living · private terrace",
        availability: "available",
        meshIds: ["tower-a__penthouse__home-a"],
      },
      {
        id: "home-ph-b",
        floorId: "floor-13",
        homeCode: "PH-B",
        publicDisplayName: "Skyline Crown Penthouse",
        showPublicName: true,
        configuration: "4 BHK Duplex",
        carpetAreaSqFt: 3600,
        orientation: "Sunset-facing · double-height lounge",
        availability: "reserved",
        meshIds: ["tower-a__penthouse__home-b"],
      },
    ],
  };
}

export function seedProject(): ProjectState {
  const floors: Floor[] = [];
  for (let n = 1; n <= 12; n++) {
    if (n === 6) {
      floors.push(
        namedFloor(6, [
          { name: "Aman Residence", config: "3 BHK", carpet: 1420, orientation: "East-facing balcony", availability: "available" },
          { name: "Karan Residence", config: "2 BHK", carpet: 1080, orientation: "Garden-facing", availability: "private", internalRef: "INTERNAL-REF-0042 — do not publish" },
          { name: "Sky Garden Home", config: "3 BHK", carpet: 1510, orientation: "North garden deck", availability: "reserved" },
          { name: "Maharack Signature Home", config: "4 BHK", carpet: 1980, orientation: "South-west corner", availability: "available" },
        ])
      );
    } else if (n === 9) {
      floors.push(
        namedFloor(9, [
          { name: "Mittal Family Home", config: "4 BHK", carpet: 1850, orientation: "Corner residence", availability: "private", internalRef: "INTERNAL-REF-0107 — do not publish" },
          { name: "Choudhary Residence", config: "3 BHK", carpet: 1460, orientation: "West-facing balcony", availability: "reserved" },
          { name: "Sunrise Home", config: "2 BHK", carpet: 1120, orientation: "East morning light", availability: "available" },
          { name: "Courtyard Home", config: "3 BHK", carpet: 1540, orientation: "Central courtyard view", availability: "available" },
        ])
      );
    } else if (n === 12) {
      floors.push(
        namedFloor(12, [
          { name: "The Terrace Residence", config: "4 BHK", carpet: 2100, orientation: "Private terrace", availability: "available" },
          { name: "Lake View Home", config: "3 BHK", carpet: 1620, orientation: "Lake-facing", availability: "reserved" },
          { name: "Premium Corner Home", config: "3 BHK", carpet: 1580, orientation: "North-east corner", availability: "available" },
          { name: "Garden Balcony Home", config: "2 BHK", carpet: 1180, orientation: "Garden balcony", availability: "sold" },
        ])
      );
    } else {
      floors.push(genericFloor(n));
    }
  }
  floors.push(penthouseFloor());
  return {
    projectName: "Maharack Heights",
    towerName: "Tower A",
    residentDisplayMode: "fictional-demo",
    floors,
  };
}
