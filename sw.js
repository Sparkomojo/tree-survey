// Tree Survey – © 2026 Mark Johnson. All rights reserved. Use only under a written licence from the owner.
// Offline cache: the app works with no signal once it has been opened once.
// Bump VERSION whenever any file changes so phones pick up the update.
const VERSION = "tree-survey-v1.33";
const FILES = ["./", "index.html", "app.css", "app.js", "species.js", "osgb.js", "manifest.webmanifest",
  "lib/jszip.min.js", "lib/xlsx.mini.min.js", "lib/leaflet.js", "lib/leaflet.css", "lib/Leaflet.ImageOverlay.Rotated.js", "map.js", "planscale.js", "defects.js", "works.js", "vet.js", "safety.js", "checklists.js", "checks.js", "laser.js", "boltons.js", "contractor.js", "resources.js", "quote.js", "routenotes.js", "lib/jspdf.umd.min.js", "fungi.js", "pests.js", "qtra.js", "threats.js", "cavat_cti.js", "cavat.js",
  "lib/images/layers.png", "lib/images/layers-2x.png", "lib/images/marker-icon.png", "lib/images/marker-icon-2x.png", "lib/images/marker-shadow.png", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png",
  "icons/apple-touch-icon.png", "icons/favicon-32.png", "icons/favicon-48.png"];

self.addEventListener("install", e => {
  // cache: "reload" – fetch every file fresh from the server, never a stale copy from the browser's own cache
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Network first (so updates arrive when there's signal), cache when offline.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    // revalidate with the server each time (a quick "not modified" when nothing has changed), so an update never
    // mixes old and new files; falls back to the offline copy with no signal
    fetch(e.request.url, { cache: "no-cache", credentials: "same-origin" }).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("index.html")))
  );
});
