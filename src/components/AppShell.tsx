"use client";

import { WifiOff } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useOnline } from "@/hooks/useOnline";
import { BottomNav } from "./BottomNav";
import { TimerTray } from "./timers/TimerPill";

/** Screens with their own sticky action bar hide the main nav. */
const FLOW_ROUTES = ["/results", "/recipe", "/cook"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const online = useOnline();
  const isFlow = FLOW_ROUTES.some((r) => pathname.startsWith(r));
  const isCooking = pathname.startsWith("/cook");

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-night px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      {!online && (
        <div
          role="status"
          className="fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-night px-4 py-2 text-sm font-medium text-white shadow-float"
        >
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden /> Offline · saved recipes still work
        </div>
      )}
      <div id="main">{children}</div>
      {!isCooking && <TimerTray bottomOffset={isFlow ? "6.5rem" : "6rem"} />}
      {!isFlow && <BottomNav />}
    </>
  );
}
