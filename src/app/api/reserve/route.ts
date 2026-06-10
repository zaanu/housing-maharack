import { NextRequest, NextResponse } from "next/server";
import { appendLog, findHome, getPublished } from "@/server/store";

// Reservation request: ₹30,000 fee + 18% GST, fully refundable.
// Records the request server-side; payment capture is completed by the
// sales desk (no payment gateway is wired in this deployment).

const RESERVATION = {
  feeInr: 30000,
  gstRate: 0.18,
} as const;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const homeId = typeof body?.homeId === "string" ? body.homeId.slice(0, 64) : "";
  const hit = homeId ? findHome(getPublished(), homeId) : null;

  if (!hit) {
    return NextResponse.json({ error: "Home not found" }, { status: 404 });
  }
  if (hit.home.availability !== "available") {
    return NextResponse.json({ error: "This home is not open for reservation" }, { status: 409 });
  }

  const gst = Math.round(RESERVATION.feeInr * RESERVATION.gstRate);
  const reference = `MH-${Date.now().toString(36).toUpperCase()}`;
  appendLog("reservations.jsonl", {
    reference,
    homeId: hit.home.id,
    homeCode: hit.home.homeCode,
    floorId: hit.floor.id,
    feeInr: RESERVATION.feeInr,
    gstInr: gst,
    totalInr: RESERVATION.feeInr + gst,
    refundable: true,
  });

  return NextResponse.json({
    ok: true,
    reference,
    fee: RESERVATION.feeInr,
    gst,
    total: RESERVATION.feeInr + gst,
  });
}
