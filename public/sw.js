// Dependency-free service worker. The precache list and version below are
// rewritten at build time by scripts/gen-sw.mjs so the FULL app shell
// (hashed JS/CSS, icons, manifest) is cached on first load — guaranteeing
// the app opens offline / on a flaky connection instead of a white screen.
const VERSION = "dev"; // build:version
const ASSETS = ["./", "./index.html"]; // build:assets

const CACHE = "tabatica-" + VERSION;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) =>
      // Cache entries individually so one failure can't abort the whole set.
      Promise.all(
        ASSETS.map((url) =>
          c.add(new Request(url, { cache: "reload" })).catch(() => undefined),
        ),
      ),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  // Navigations: serve the cached shell instantly (works offline), and
  // refresh it in the background so new deploys are picked up next launch.
  if (req.mode === "navigate") {
    event.respondWith(
      caches.open(CACHE).then(async (c) => {
        const cached = (await c.match("./index.html")) || (await c.match("./"));
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) c.put("./index.html", res.clone());
            return res;
          })
          .catch(() => null);
        return cached || (await network) || new Response(
          "<!doctype html><meta charset=utf-8><title>Tabatica</title><body style=\"font-family:system-ui;padding:2rem;text-align:center\">Offline — open the app once while online to enable offline use.",
          { headers: { "Content-Type": "text/html" } },
        );
      }),
    );
    return;
  }

  // Static assets: cache-first (content-hashed = immutable), then network.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
