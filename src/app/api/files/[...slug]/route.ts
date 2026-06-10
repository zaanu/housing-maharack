import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { floorPlanPath, interiorPaths, findHome, getPublished } from "@/server/store";

// Serves admin-uploaded images: /api/files/floor-plan/<homeId>
//                               /api/files/interior/<homeId>/<index>
// Assets for private homes are not served publicly.

const MIME: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await ctx.params;
  const [kind, homeId, idx] = slug;

  const hit = homeId ? findHome(getPublished(), homeId) : null;
  if (!hit || hit.home.availability === "private") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let filePath: string | null = null;
  if (kind === "floor-plan") {
    filePath = floorPlanPath(homeId);
  } else if (kind === "interior") {
    const all = interiorPaths(homeId);
    const i = Number(idx);
    if (Number.isInteger(i) && i >= 0 && i < all.length) filePath = all[i];
  }

  if (!filePath || !fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = new Uint8Array(fs.readFileSync(filePath));
  return new NextResponse(body, {
    headers: {
      "Content-Type": MIME[path.extname(filePath).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=300",
    },
  });
}
