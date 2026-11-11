// Route Notes moved to https://sparkomojo.github.io/route-notes/ – this worker only retires itself
// (it leaves the offline caches alone: the new address shares them).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil((async () => {
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: "window" })) c.navigate("https://sparkomojo.github.io/route-notes/");
})()));
