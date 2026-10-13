/*
 * Offline support. Pages are client-rendered from localStorage, so caching the
 * HTML shells + static assets is enough for saved recipes and grocery lists to
 * work offline. AI requests (/api/*) always go to the network.
 */
const VERSION = "v1";
const PAGE_CACHE = `ptp-pages-${VERSION}`;
const ASSET_CACHE = `ptp-assets-${VERSION}`;
const PAGES = ["/", "/scan", "/results", "/recipe", "/cook", "/grocery", "/saved", "/profile"];
const STATIC_ASSETS = ["/seed/gnocchi.svg", "/seed/fried-rice.svg", "/seed/tofu-curry.svg", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const pages = await caches.open(PAGE_CACHE);
      const assets = await caches.open(ASSET_CACHE);
      await Promise.all(
        PAGES.map(async (path) => {
          try {
            const response = await fetch(path, { credentials: "same-origin" });
            if (!response.ok) return;
            const html = await response.clone().text();
            await pages.put(path, response);
            // Precache the JS/CSS/font chunks each page shell needs.
            const urls = [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]);
            await Promise.all(urls.map((url) => assets.add(url).catch(() => undefined)));
          } catch {
            // offline during install: runtime caching will fill in later
          }
        }),
      );
      await Promise.all(STATIC_ASSETS.map((url) => assets.add(url).catch(() => undefined)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([PAGE_CACHE, ASSET_CACHE]);
      for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(ASSET_CACHE)).put(request, response.clone());
  return response;
}

async function networkFirstPage(request, url) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(url.pathname, response.clone());
    return response;
  } catch {
    // Query strings (?id=...) are read client-side, so the path's shell works for any id.
    return (await cache.match(url.pathname)) || (await cache.match("/")) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/seed/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request, url));
    return;
  }

  // Router payloads, icons, manifest: network first, cached copy when offline.
  // A failed router fetch makes Next.js fall back to a full page load, which
  // the navigate handler above can serve from cache.
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response.ok && !url.searchParams.has("_rsc")) (await caches.open(ASSET_CACHE)).put(request, response.clone());
        return response;
      } catch {
        return (await caches.match(request)) || Response.error();
      }
    })(),
  );
});
