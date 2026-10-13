"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * In-memory stand-in for `next/navigation` used by the single-file artifact
 * build. Routes look exactly like the Next.js ones ("/recipe?id=..."), so the
 * screens run unchanged. The current stack is kept in sessionStorage so a
 * reload stays on the same screen.
 */

const KEY = "ptp:route-stack";

function normalize(href: string): string {
  const clean = href.replace(/^#/, "");
  return clean.startsWith("/") ? clean : `/${clean}`;
}

function initialStack(): string[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    if (Array.isArray(saved) && saved.length && saved.every((s) => typeof s === "string")) return saved.slice(-30);
  } catch {
    // storage unavailable: start at home
  }
  return ["/"];
}

interface RouterApi {
  push(href: string): void;
  replace(href: string): void;
  back(): void;
  forward(): void;
  refresh(): void;
  prefetch(href: string): void;
}

const RouteContext = createContext("/");
const RouterContext = createContext<RouterApi | null>(null);

export function MemoryRouter({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<string[]>(initialStack);
  const current = stack[stack.length - 1] ?? "/";

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(stack.slice(-30)));
    } catch {
      // ignore
    }
  }, [stack]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [current]);

  const api = useMemo<RouterApi>(
    () => ({
      push: (href) => setStack((s) => [...s, normalize(href)].slice(-30)),
      replace: (href) => setStack((s) => [...s.slice(0, -1), normalize(href)]),
      back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : ["/"])),
      forward: () => undefined,
      refresh: () => undefined,
      prefetch: () => undefined,
    }),
    [],
  );

  return (
    <RouterContext.Provider value={api}>
      <RouteContext.Provider value={current}>{children}</RouteContext.Provider>
    </RouterContext.Provider>
  );
}

export function useRouter(): RouterApi {
  const api = useContext(RouterContext);
  if (!api) throw new Error("useRouter must be used inside <MemoryRouter>");
  return api;
}

export function usePathname(): string {
  return useContext(RouteContext).split("?")[0] || "/";
}

export function useSearchParams(): URLSearchParams {
  const route = useContext(RouteContext);
  return useMemo(() => new URLSearchParams(route.split("?")[1] ?? ""), [route]);
}
