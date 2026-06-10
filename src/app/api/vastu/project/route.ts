import { NextResponse } from "next/server";
import { getVastuProject } from "@/server/vastuStore";
import { toVastuPublicProject } from "@/server/vastuPublic";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = getVastuProject();
  return NextResponse.json(toVastuPublicProject(state));
}
