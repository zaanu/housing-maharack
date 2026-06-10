import { NextRequest, NextResponse } from "next/server";
import { getDraft, getPublished } from "@/server/store";
import { toPublicProject } from "@/server/public";
import { isAdmin } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // ?preview=1 lets a logged-in admin see unpublished draft changes.
  const preview = req.nextUrl.searchParams.get("preview") === "1" && (await isAdmin());
  const state = preview ? getDraft() : getPublished();
  return NextResponse.json(toPublicProject(state));
}
