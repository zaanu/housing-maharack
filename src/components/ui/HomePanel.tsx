"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PublicFloor, PublicHome } from "@/lib/types";
import { AVAILABILITY_COLOR, AVAILABILITY_LABEL } from "@/lib/layout";
import { track } from "@/lib/client";
import FloorPlanSVG from "./FloorPlanSVG";

type ModalKind = "plan" | "interiors" | "request" | "reserve" | null;

const FEE = 30000;
const GST = Math.round(FEE * 0.18);
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"
        initial={{ scale: 0.95, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 12 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

export default function HomePanel({
  home,
  floor,
  onClose,
}: {
  home: PublicHome | null;
  floor: PublicFloor | null;
  onClose: () => void;
}) {
  const [modal, setModal] = useState<ModalKind>(null);
  const [requested, setRequested] = useState(false);
  const [reserveState, setReserveState] = useState<
    | { step: "review" }
    | { step: "paying" }
    | { step: "done"; reference: string }
    | { step: "error"; message: string }
  >({ step: "review" });

  const open = (kind: Exclude<ModalKind, null>) => {
    if (!home) return;
    setModal(kind);
    track({
      type:
        kind === "plan"
          ? "floor-plan-viewed"
          : kind === "interiors"
            ? "interiors-viewed"
            : kind === "reserve"
              ? "reserve-opened"
              : "details-requested",
      floorId: home.floorId,
      homeId: home.id,
    });
    if (kind === "request") setRequested(true);
    if (kind === "reserve") setReserveState({ step: "review" });
  };

  const payReservation = async () => {
    if (!home) return;
    setReserveState({ step: "paying" });
    track({ type: "reserve-submitted", floorId: home.floorId, homeId: home.id });
    try {
      const res = await fetch("/api/reserve", {
        method: "POST",
        body: JSON.stringify({ homeId: home.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReserveState({ step: "error", message: data.error ?? "Reservation failed" });
      } else {
        setReserveState({ step: "done", reference: data.reference });
      }
    } catch {
      setReserveState({ step: "error", message: "Network error — please try again" });
    }
  };

  return (
    <>
      <AnimatePresence>
        {home && floor && (
          <motion.aside
            key={home.id}
            initial={{ x: "110%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "110%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="pointer-events-auto fixed bottom-0 left-0 right-0 z-30 rounded-t-2xl bg-white/95 p-5 shadow-2xl backdrop-blur md:bottom-auto md:left-auto md:right-5 md:top-24 md:w-[340px] md:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold leading-tight text-slate-900">{home.label}</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {floor.label} · Home {home.letter}
                </p>
              </div>
              <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close panel">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="mt-3 border-t border-slate-100 pt-3">
              {home.isPrivate ? (
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700">Private Residence</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Additional details are not publicly displayed.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-800">
                    {home.configuration} Residence
                  </p>
                  <dl className="mt-2 space-y-1.5 text-sm">
                    {home.carpetAreaSqFt != null && (
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Carpet Area</dt>
                        <dd className="font-medium text-slate-800">
                          {home.carpetAreaSqFt.toLocaleString("en-IN")} sq. ft.
                        </dd>
                      </div>
                    )}
                    {home.orientation && (
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Orientation</dt>
                        <dd className="font-medium text-slate-800">{home.orientation}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Price</dt>
                      <dd className="font-medium text-slate-800">On request</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Status</dt>
                      <dd>
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-semibold text-slate-900"
                          style={{ backgroundColor: AVAILABILITY_COLOR[home.availability] }}
                        >
                          {AVAILABILITY_LABEL[home.availability]}
                        </span>
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4 grid grid-cols-1 gap-2">
                    {home.availability === "available" && (
                      <button
                        onClick={() => open("reserve")}
                        className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
                      >
                        Reserve · {inr(FEE)} + taxes
                      </button>
                    )}
                    <button
                      onClick={() => open("plan")}
                      className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      View Floor Plan
                    </button>
                    <button
                      onClick={() => open("interiors")}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      Explore Interiors
                    </button>
                    <button
                      onClick={() => open("request")}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      Request Details
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modal === "plan" && home && floor && (
          <Modal title={`${home.label} — Floor Plan`} onClose={() => setModal(null)}>
            {home.hasFloorPlan ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/files/floor-plan/${home.id}`} alt={`${home.label} floor plan`} className="w-full rounded-xl" />
            ) : (
              <>
                <FloorPlanSVG floor={floor} selectedHomeId={home.id} />
                <p className="mt-2 text-xs text-slate-500">
                  Schematic layout — detailed floor plan can be uploaded from the admin panel.
                </p>
              </>
            )}
          </Modal>
        )}
        {modal === "interiors" && home && (
          <Modal title={`${home.label} — Interiors`} onClose={() => setModal(null)}>
            {home.interiorImageCount > 0 ? (
              <div className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto">
                {Array.from({ length: home.interiorImageCount }, (_, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={`/api/files/interior/${home.id}/${i}`}
                    alt={`${home.label} interior ${i + 1}`}
                    className="w-full rounded-lg object-cover"
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Interior photography for this residence has not been published yet.
              </p>
            )}
          </Modal>
        )}
        {modal === "reserve" && home && (
          <Modal title={`Reserve ${home.label}`} onClose={() => setModal(null)}>
            {reserveState.step === "done" ? (
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M4 11.5l5 5L18 6.5" stroke="#059669" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">Reservation recorded</p>
                <p className="mt-1 text-sm text-slate-600">
                  Reference <span className="font-mono font-semibold">{reserveState.reference}</span>.
                  The sales desk will contact you to complete the secure payment of {inr(FEE + GST)}.
                  Your reservation fee is <strong>fully refundable</strong>.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-600">
                  Reserve <strong>{home.label}</strong> ({home.configuration}) by paying a token
                  reservation fee. The fee is <strong>fully refundable</strong> if you choose not
                  to proceed.
                </p>
                <dl className="mt-4 space-y-1.5 rounded-xl bg-slate-50 p-4 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Reservation fee</dt>
                    <dd className="font-medium text-slate-800">{inr(FEE)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">GST (18%)</dt>
                    <dd className="font-medium text-slate-800">{inr(GST)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1.5">
                    <dt className="font-semibold text-slate-800">Total payable</dt>
                    <dd className="font-bold text-slate-900">{inr(FEE + GST)}</dd>
                  </div>
                </dl>
                <p className="mt-2 text-xs text-slate-500">
                  100% refundable · no questions asked · holds this home for 30 days
                </p>
                {reserveState.step === "error" && (
                  <p className="mt-2 text-sm text-red-600">{reserveState.message}</p>
                )}
                <button
                  onClick={payReservation}
                  disabled={reserveState.step === "paying"}
                  className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                >
                  {reserveState.step === "paying" ? "Processing…" : `Pay ${inr(FEE + GST)} & Reserve`}
                </button>
              </>
            )}
          </Modal>
        )}
        {modal === "request" && home && (
          <Modal title="Request Details" onClose={() => setModal(null)}>
            <p className="text-sm text-slate-600">
              {requested
                ? `Your interest in ${home.label} has been recorded. The sales office will share availability, pricing and visit slots through the published project channels.`
                : "Recording your request…"}
            </p>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}
