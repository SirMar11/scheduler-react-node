const CACHE = "scheduler-v1";
const OFFLINE = "/offline";

// ── Install: precachuj offline stránku ────────────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(OFFLINE))
      .catch(() => {
        // Pokud /offline neexistuje (první build), SW se nainstaluje i bez ní
      })
      .finally(() => self.skipWaiting())
  );
});

// ── Activate: vymaž staré cache verze ─────────────────────────────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: zachyť requesty ─────────────────────────────────────────────────────
self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Přeskočit: API, Supabase, Next.js dev internals, hot-reload WebSocket
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("supabase.co") ||
    url.pathname.startsWith("/_next/") ||
    url.protocol === "chrome-extension:"
  ) {
    return;
  }

  // Navigační requesty (stránky): nejdřív síť, při výpadku offline stránka
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE).then(
          (res) =>
            res ??
            new Response("Offline — nejsou dostupná žádná data.", {
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
        )
      )
    );
    return;
  }

  // Statické assety (fonts, icons…): cache-first, pak aktualizuj na pozadí
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/icons/") ||
      url.pathname.endsWith(".svg") ||
      url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".woff2"))
  ) {
    e.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request).then((res) => {
          if (res.ok) {
            caches.open(CACHE).then((c) => c.put(request, res.clone()));
          }
          return res;
        });
        return cached ?? network;
      })
    );
  }
});
