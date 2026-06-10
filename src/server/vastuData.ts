import "server-only";
import type { Availability, ResidentDisplayMode } from "@/lib/types";
import {
  residentialZone,
  commercialZone,
  type FloorZone,
} from "@/lib/vastuLayout";

// ── Internal types ────────────────────────────────────────────────────────────

export type VastuHome = {
  id: string;
  floorId: string;
  homeCode: string;
  publicDisplayName?: string;
  showPublicName: boolean;
  configuration: string;
  carpetAreaSqFt?: number;
  builtUpAreaSqFt?: number;
  orientation?: string;
  availability: Availability;
  meshIds: string[];
};

export type VastuFloor = {
  id: string;
  number: number;
  label: string;
  featured: boolean;
  penthouse?: boolean;
  zone: FloorZone;
  homes: VastuHome[];
};

export type VastuBuildingState = {
  buildingId: string;
  towerName: string;
  towerType: "residential" | "commercial";
  direction: "NE" | "SE" | "SW" | "NW";
  vastuZone: string;
  vastuElement: string;
  floors: VastuFloor[];
};

export type VastuProjectState = {
  projectName: string;
  tagline: string;
  residentDisplayMode: ResidentDisplayMode;
  buildings: VastuBuildingState[];
};

// ── Residential data ──────────────────────────────────────────────────────────

const RES_CONFIGS: Record<FloorZone, { configs: string[]; areas: number[] }> = {
  lobby:     { configs: ["Lobby Suite"], areas: [800] },
  standard:  { configs: ["Studio", "1 BHK", "1 BHK", "Studio"], areas: [520, 780, 820, 560] },
  premium:   { configs: ["2 BHK", "3 BHK", "3 BHK", "2 BHK"], areas: [1180, 1520, 1560, 1240] },
  "sky-suite": { configs: ["3 BHK", "4 BHK", "4 BHK", "3 BHK"], areas: [1880, 2420, 2480, 1960] },
  signature:  { configs: ["4 BHK Sky Villa", "5 BHK Sky Villa"], areas: [3800, 4600] },
  crown:      { configs: ["Crown Penthouse", "Crown Penthouse"], areas: [7200, 6800] },
};

const COM_CONFIGS: Record<FloorZone, { configs: string[]; areas: number[] }> = {
  lobby:       { configs: ["Retail Suite", "Retail Suite"], areas: [1200, 1400] },
  standard:    { configs: ["Business Suite", "Business Suite", "Business Suite", "Business Suite"], areas: [900, 1050, 1080, 920] },
  premium:     { configs: ["Corporate Office", "Corporate Office", "Corporate Office", "Corporate Office"], areas: [1600, 2100, 2100, 1700] },
  "sky-suite": { configs: ["Premium Office Suite", "Premium Office Suite", "Premium Office Suite", "Premium Office Suite"], areas: [2600, 3200, 3200, 2700] },
  signature:   { configs: ["Executive Sky Suite", "Executive Sky Suite"], areas: [4200, 4800] },
  crown:       { configs: ["Sky Lounge", "Sky Club Penthouse"], areas: [5800, 6400] },
};

const ORIENTATIONS = [
  "East-facing panorama", "South-west corner", "North garden view", "West sunset view",
  "City skyline views", "Brahmasthan courtyard view", "Dual aspect",
  "Full-floor panoramic", "Private sky terrace",
];

const AVAIL_CYCLE: Availability[] = ["available", "available", "reserved", "sold"];

// Featured floor names per building

const ISHAN_NAMES: Record<number, string[]> = {
  20: ["Varuna Residence", "Jal Suite", "Neer Home", "Amrit Villa"],
  40: ["Shanti Abode", "Prana Home", "Bodhi Suite", "Dharma Residence"],
  50: ["Surya Sky Home", "Chandra Terrace", "Tara Suite", "Indra Penthouse"],
  55: ["Brahma Sky Villa", "Vishnu Estate"],
  65: ["Ishan Crown Penthouse", "Kailash Sky Penthouse"],
};

const NAIRUTYA_NAMES: Record<number, string[]> = {
  20: ["Prithvi Home", "Dharti Suite", "Bhumi Villa", "Mati Residence"],
  40: ["Heritage Abode", "Sandalwood Home", "Teak Suite", "Rosewood Residence"],
  50: ["Maharack Sky Estate", "Imperial Terrace", "Sovereign Suite", "Crown Home"],
  55: ["Nairutya Sky Villa", "Grand Estate"],
  65: ["Nairutya Crown Penthouse", "Mahal Sky Penthouse"],
};

const AGNI_NAMES: Record<number, string[]> = {
  15: ["Agni Business Hub", "Tejas Office", "Shakti Suite", "Power Centre"],
  35: ["Vastu Corporate HQ", "Mandala Office", "Zenith Suite", "Apex Centre"],
  50: ["Sky Business Club", "Executive Vault", "Penthouse Office", "Crown Corporate"],
  55: ["Agni Sky Suite", "Tapas Executive"],
  65: ["Agni Observation Lounge", "Sky Club Crown"],
};

const VAYU_NAMES: Record<number, string[]> = {
  15: ["Vayu Business Centre", "Wind Tower Office", "Breeze Suite", "Zephyr Hub"],
  35: ["NW Corporate Park", "Innovation Floor", "Nexus Suite", "Altitude Centre"],
  50: ["Sky Business Suite", "Executive Penthouse Office", "Apex Sky Suite", "Crown Office"],
  55: ["Vayu Sky Villa", "Pavan Executive"],
  65: ["Vayu Sky Lounge", "Crown Club Penthouse"],
};

function homeCount(zone: FloorZone): number {
  if (zone === "lobby") return 2;
  if (zone === "standard" || zone === "premium" || zone === "sky-suite") return 4;
  return 2; // signature + crown
}

function buildResidentialFloor(
  buildingId: string,
  number: number,
  featuredNames?: string[]
): VastuFloor {
  const nn = String(number).padStart(2, "0");
  const id = `${buildingId}-floor-${nn}`;
  const zone = residentialZone(number);
  const { configs, areas } = RES_CONFIGS[zone];
  const count = homeCount(zone);
  const letters = ["a", "b", "c", "d"].slice(0, count);
  const isPenthouse = zone === "crown";

  const label = isPenthouse
    ? `Crown · Floor ${nn}`
    : zone === "signature"
    ? `Signature Floor ${nn}`
    : zone === "sky-suite"
    ? `Sky Suite Floor ${nn}`
    : `Floor ${nn}`;

  return {
    id,
    number,
    label,
    featured: !!featuredNames,
    penthouse: isPenthouse,
    zone,
    homes: letters.map((l, i) => ({
      id: `${buildingId}-home-${nn}-${l}`,
      floorId: id,
      homeCode: `${nn}-${l.toUpperCase()}`,
      publicDisplayName: featuredNames?.[i],
      showPublicName: !!featuredNames?.[i],
      configuration: configs[i % configs.length],
      carpetAreaSqFt: areas[i % areas.length],
      builtUpAreaSqFt: Math.round(areas[i % areas.length] * 1.22),
      orientation: ORIENTATIONS[(number * 3 + i * 7) % ORIENTATIONS.length],
      availability: AVAIL_CYCLE[(i + number) % 4],
      meshIds: [`${buildingId}__floor-${nn}__home-${l}`],
    })),
  };
}

function buildCommercialFloor(
  buildingId: string,
  number: number,
  featuredNames?: string[]
): VastuFloor {
  const nn = String(number).padStart(2, "0");
  const id = `${buildingId}-floor-${nn}`;
  const zone = commercialZone(number);
  const { configs, areas } = COM_CONFIGS[zone];
  const count = homeCount(zone);
  const letters = ["a", "b", "c", "d"].slice(0, count);
  const isPenthouse = zone === "crown";

  const label = isPenthouse
    ? `Sky Lounge · Floor ${nn}`
    : zone === "signature"
    ? `Executive Floor ${nn}`
    : zone === "sky-suite"
    ? `Premium Office Floor ${nn}`
    : `Floor ${nn}`;

  return {
    id,
    number,
    label,
    featured: !!featuredNames,
    penthouse: isPenthouse,
    zone,
    homes: letters.map((l, i) => ({
      id: `${buildingId}-home-${nn}-${l}`,
      floorId: id,
      homeCode: `${nn}-${l.toUpperCase()}`,
      publicDisplayName: featuredNames?.[i],
      showPublicName: !!featuredNames?.[i],
      configuration: configs[i % configs.length],
      carpetAreaSqFt: areas[i % areas.length],
      builtUpAreaSqFt: Math.round(areas[i % areas.length] * 1.2),
      orientation: ORIENTATIONS[(number * 5 + i * 11) % ORIENTATIONS.length],
      availability: AVAIL_CYCLE[(i + number + 1) % 4],
      meshIds: [`${buildingId}__floor-${nn}__home-${l}`],
    })),
  };
}

function seedResidentialTower(
  buildingId: string,
  towerName: string,
  direction: "NE" | "SW",
  vastuZone: string,
  vastuElement: string,
  featuredMap: Record<number, string[]>
): VastuBuildingState {
  const floors: VastuFloor[] = [];
  for (let n = 1; n <= 65; n++) {
    floors.push(buildResidentialFloor(buildingId, n, featuredMap[n]));
  }
  return { buildingId, towerName, towerType: "residential", direction, vastuZone, vastuElement, floors };
}

function seedCommercialTower(
  buildingId: string,
  towerName: string,
  direction: "SE" | "NW",
  vastuZone: string,
  vastuElement: string,
  featuredMap: Record<number, string[]>
): VastuBuildingState {
  const floors: VastuFloor[] = [];
  for (let n = 1; n <= 65; n++) {
    floors.push(buildCommercialFloor(buildingId, n, featuredMap[n]));
  }
  return { buildingId, towerName, towerType: "commercial", direction, vastuZone, vastuElement, floors };
}

export function seedVastuProject(): VastuProjectState {
  return {
    projectName: "Vastu Heights",
    tagline: "Four Towers. One Sacred Centre.",
    residentDisplayMode: "fictional-demo",
    buildings: [
      seedResidentialTower(
        "ishan", "Tower Ishan", "NE",
        "Ishan — Northeast", "Water · Serenity",
        ISHAN_NAMES
      ),
      seedCommercialTower(
        "agni", "Tower Agni", "SE",
        "Agni — Southeast", "Fire · Ambition",
        AGNI_NAMES
      ),
      seedResidentialTower(
        "nairutya", "Tower Nairutya", "SW",
        "Nairutya — Southwest", "Earth · Stability",
        NAIRUTYA_NAMES
      ),
      seedCommercialTower(
        "vayu", "Tower Vayu", "NW",
        "Vayu — Northwest", "Air · Movement",
        VAYU_NAMES
      ),
    ],
  };
}
