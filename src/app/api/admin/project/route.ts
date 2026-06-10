import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/server/auth";
import { getDraft, getPublished, updateDraft, findHome } from "@/server/store";
import type { Availability, ResidentDisplayMode } from "@/lib/types";

// Admin-only: returns full internal records (including internalResidentReference)
// for editing. This route requires the admin session cookie.

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ draft: getDraft(), published: getPublished() });
}

type PatchOp =
  | { op: "set-mode"; mode: ResidentDisplayMode }
  | {
      op: "update-home";
      homeId: string;
      fields: Partial<{
        publicDisplayName: string;
        showPublicName: boolean;
        configuration: string;
        carpetAreaSqFt: number | null;
        builtUpAreaSqFt: number | null;
        orientation: string;
        availability: Availability;
        meshIds: string[];
        internalResidentReference: string;
      }>;
    }
  | { op: "add-home"; floorId: string }
  | { op: "add-floor" };

const AVAILABILITIES: Availability[] = ["available", "reserved", "sold", "private"];
const MODES: ResidentDisplayMode[] = ["fictional-demo", "approved-display-name", "hidden"];
const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h"];

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as PatchOp | null;
  if (!body || !body.op) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  try {
    const draft = updateDraft((d) => {
      switch (body.op) {
        case "set-mode": {
          if (!MODES.includes(body.mode)) throw new Error("Invalid mode");
          d.residentDisplayMode = body.mode;
          break;
        }
        case "update-home": {
          const hit = findHome(d, body.homeId);
          if (!hit) throw new Error("Home not found");
          const f = body.fields ?? {};
          if (typeof f.publicDisplayName === "string") hit.home.publicDisplayName = f.publicDisplayName.slice(0, 80) || undefined;
          if (typeof f.showPublicName === "boolean") hit.home.showPublicName = f.showPublicName;
          if (typeof f.configuration === "string") hit.home.configuration = f.configuration.slice(0, 40);
          if (f.carpetAreaSqFt !== undefined) hit.home.carpetAreaSqFt = f.carpetAreaSqFt ?? undefined;
          if (f.builtUpAreaSqFt !== undefined) hit.home.builtUpAreaSqFt = f.builtUpAreaSqFt ?? undefined;
          if (typeof f.orientation === "string") hit.home.orientation = f.orientation.slice(0, 80) || undefined;
          if (f.availability) {
            if (!AVAILABILITIES.includes(f.availability)) throw new Error("Invalid availability");
            hit.home.availability = f.availability;
          }
          if (Array.isArray(f.meshIds)) hit.home.meshIds = f.meshIds.map((m) => String(m).slice(0, 120));
          if (typeof f.internalResidentReference === "string") {
            hit.home.internalResidentReference = f.internalResidentReference.slice(0, 200) || undefined;
          }
          break;
        }
        case "add-home": {
          const floor = d.floors.find((fl) => fl.id === body.floorId);
          if (!floor) throw new Error("Floor not found");
          if (floor.homes.length >= LETTERS.length) throw new Error("Floor is full");
          const nn = String(floor.number).padStart(2, "0");
          const letter = LETTERS[floor.homes.length];
          floor.homes.push({
            id: `home-${nn}-${letter}`,
            floorId: floor.id,
            homeCode: `${nn}-${letter.toUpperCase()}`,
            showPublicName: false,
            configuration: "2 BHK",
            availability: "available",
            meshIds: [`tower-a__floor-${nn}__home-${letter}`],
          });
          break;
        }
        case "add-floor": {
          const number = Math.max(...d.floors.map((fl) => fl.number)) + 1;
          const nn = String(number).padStart(2, "0");
          d.floors.push({
            id: `floor-${nn}`,
            number,
            label: `Floor ${nn}`,
            featured: false,
            homes: [],
          });
          break;
        }
      }
    });
    return NextResponse.json({ ok: true, draft });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Update failed" }, { status: 400 });
  }
}
