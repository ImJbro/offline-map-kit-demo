const VERSION = "omk-public-demo-v2";
const path = file => new URL(file, self.registration.scope).href;
const FILES = ["./","./index.html","./app.js","./style.css","./manifest.webmanifest","./icon-192.png","./icon-512.png","./beavercreek-10mi.geojson","./atlas.html","./atlas.css","./atlas.js","./maplibre-gl.js","./maplibre-gl.css","./pmtiles.js","./us-overview.geojson","./pack-catalog.json","./glyphs-Noto%20Sans%20Regular-0-255.pbf","./terrain-shade.png","./terrain-contours.geojson","./terrain-coverage.json","./public-recreation.geojson","./outage-guide.html","./shelters.js","./shelter-directory.geojson","./shelter-directory-info.json","./medical.js","./medical-facilities.geojson","./medical-facilities-info.json"].map(path);
self.addEventListener("install", event => event.waitUntil((async () => {
  const cache = await caches.open(VERSION);
  await cache.addAll(FILES);
  await self.skipWaiting();
})()));
self.addEventListener("activate", event => event.waitUntil((async () => {
  for (const name of await caches.keys()) {
    if (name.startsWith("omk-public-demo-") && name !== VERSION) await caches.delete(name);
  }
  await self.clients.claim();
})()));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || !FILES.includes(event.request.url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    return (await cache.match(event.request)) || fetch(event.request);
  })());
});
