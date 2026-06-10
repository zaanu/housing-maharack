import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/server/auth";
import { findHome, getDraft, saveUpload } from "@/server/store";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const kind = form.get("kind");
  const homeId = String(form.get("homeId") ?? "");
  const file = form.get("file");

  if ((kind !== "floor-plan" && kind !== "interior") || !(file instanceof File)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!findHome(getDraft(), homeId)) {
    return NextResponse.json({ error: "Home not found" }, { status: 404 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 8 MB)" }, { status: 413 });
  }

  try {
    saveUpload(kind, homeId, file.name, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}
