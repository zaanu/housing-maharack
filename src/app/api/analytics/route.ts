import { NextRequest, NextResponse } from "next/server";
import { appendLog } from "@/server/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const type = String(body.type ?? "").slice(0, 64);
    if (!type) return NextResponse.json({ ok: false }, { status: 400 });
    appendLog("analytics.jsonl", {
      type,
      floorId: body.floorId ? String(body.floorId).slice(0, 64) : undefined,
      homeId: body.homeId ? String(body.homeId).slice(0, 64) : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
