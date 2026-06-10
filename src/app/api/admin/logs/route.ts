import { NextResponse } from "next/server";
import { isAdmin } from "@/server/auth";
import { readLogTail } from "@/server/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    analytics: readLogTail("analytics.jsonl"),
    errors: readLogTail("errors.jsonl", 100),
  });
}
