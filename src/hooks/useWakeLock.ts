"use client";

import { useEffect, useState } from "react";

export type WakeLockStatus = "active" | "unsupported" | "denied" | "idle";

/** Keeps the screen on while `enabled` (re-acquired after the tab becomes visible again). */
export function useWakeLock(enabled: boolean): WakeLockStatus {
  const [status, setStatus] = useState<WakeLockStatus>("idle");
  const supported = typeof navigator !== "undefined" && "wakeLock" in navigator;

  useEffect(() => {
    if (!enabled || !supported) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void sentinel.release();
          return;
        }
        setStatus("active");
        sentinel.addEventListener("release", () => {
          if (!cancelled) setStatus("idle");
        });
      } catch {
        if (!cancelled) setStatus("denied");
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible" && (!sentinel || sentinel.released)) void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => undefined);
    };
  }, [enabled, supported]);

  return supported ? status : "unsupported";
}
