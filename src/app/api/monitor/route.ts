import { NextRequest, NextResponse } from "next/server";
import { appendLog } from "@/server/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    appendLog("errors.jsonl", {
      message: String(body.message ?? "").slice(0, 2000),
      stack: String(body.stack ?? "").slice(0, 8000),
      url: String(body.url ?? "").slice(0, 500),
      userAgent: req.headers.get("user-agent")?.slice(0, 300),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
