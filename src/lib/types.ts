// Public-facing types only. Internal record types live in src/server/data.ts
// and are never imported by client code.

export type ResidentDisplayMode =
  | "fictional-demo"
  | "approved-display-name"
  | "hidden";

export type Availability = "available" | "reserved" | "sold" | "private";

export type PublicHome = {
  id: string;
  floorId: string;
  homeCode: string;
  /** Resolved display label according to the active ResidentDisplayMode. */
  label: string;
  /** Unit letter within the floor: "A" | "B" | "C" | "D". */
  letter: string;
  configuration?: string;
  carpetAreaSqFt?: number;
  builtUpAreaSqFt?: number;
  orientation?: string;
  availability: Availability;
  meshIds: string[];
  hasFloorPlan: boolean;
  interiorImageCount: number;
  /** True when availability is "private" — details are withheld server-side. */
  isPrivate: boolean;
};

export type PublicFloor = {
  id: string;
  number: number;
  label: string;
  /** Featured floors carry named residences in the demo data. */
  featured: boolean;
  /** Duplex penthouse level spanning two floors, shown as a section cutaway. */
  penthouse?: boolean;
  homes: PublicHome[];
};

export type PublicProject = {
  projectName: string;
  towerName: string;
  residentDisplayMode: ResidentDisplayMode;
  floors: PublicFloor[];
};

export type AnalyticsEvent = {
  type:
    | "floor-selected"
    | "home-selected"
    | "floor-plan-viewed"
    | "interiors-viewed"
    | "details-requested"
    | "reserve-opened"
    | "reserve-submitted";
  floorId?: string;
  homeId?: string;
};
