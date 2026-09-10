const CACHE = "oqp-shell-v5";
const PRECACHE = ["/", "/attempt", "/result", "/quiz/offline-check", "/manifest.webmanifest"];

function legacyAttemptRedirect(pathname) {
  const match = pathname.match(/^\/attempt\/([^/]+)\/?$/);
  if (!match) return null;
  let attemptId;
  try {
    attemptId = decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  const safeAttemptId = JSON.stringify(attemptId).replace(/</g, "\\u003c");
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Opening quiz</title></head><body><script>try{localStorage.setItem("aithera:active-attempt",${safeAttemptId})}catch(e){}location.replace("/attempt")</script></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => undefined).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // The connectivity probe must ALWAYS hit the network — never serve it from cache.
  if (url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    // Older app versions used /attempt/:id. Migrate those links without a
    // network request so existing in-progress attempts also recover offline.
    const legacyResponse = legacyAttemptRedirect(url.pathname);
    if (legacyResponse) {
      event.respondWith(Promise.resolve(legacyResponse));
      return;
    }
    // network first, fall back to cached shell so the app opens offline
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((r) => r || caches.match(url.pathname))
            .then((r) => r || caches.match("/"))
            .then(
              (r) =>
                r ||
                new Response(
                  "<!doctype html><meta charset=utf-8><title>Offline</title><body style=\"font-family:system-ui;padding:2rem\">You are offline and this page is not saved on the device.</body>",
                  { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
                ),
            )
            .catch(
              () =>
                new Response("Offline", {
                  status: 503,
                  headers: { "Content-Type": "text/plain; charset=utf-8" },
                }),
            ),
        ),
    );
    return;
  }

  // stale-while-revalidate for static assets
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          return res;
        })
        .catch(
          () =>
            cached ||
            new Response("Offline", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            }),
        );
      return cached || network;
    }),
  );
});
