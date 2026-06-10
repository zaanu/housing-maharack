"use client";

import type { AnalyticsEvent } from "./types";

export function webglSupported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

export function track(event: AnalyticsEvent): void {
  try {
    navigator.sendBeacon?.("/api/analytics", JSON.stringify(event)) ||
      fetch("/api/analytics", {
        method: "POST",
        body: JSON.stringify(event),
        keepalive: true,
      }).catch(() => {});
  } catch {
    // analytics must never break the experience
  }
}

let monitorInstalled = false;

export function installErrorMonitor(): void {
  if (monitorInstalled) return;
  monitorInstalled = true;
  const report = (message: string, stack?: string) => {
    try {
      fetch("/api/monitor", {
        method: "POST",
        body: JSON.stringify({ message, stack, url: location.href }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* noop */
    }
  };
  window.addEventListener("error", (e) => report(e.message, e.error?.stack));
  window.addEventListener("unhandledrejection", (e) =>
    report(`Unhandled rejection: ${String(e.reason)}`, e.reason?.stack)
  );
}
