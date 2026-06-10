import { NextResponse } from "next/server";
import { isAdmin } from "@/server/auth";
import { publishDraft, discardDraft } from "@/server/store";

export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  publishDraft();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  discardDraft();
  return NextResponse.json({ ok: true });
}
