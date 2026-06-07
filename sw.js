/* Access Medi-Cal LA service worker - offline support + faster repeat visits.
   Core files are precached. Same-origin requests are cache-first (with network
   refresh). The dynamic /api/ endpoints are always network (graceful offline
   JSON). Cross-origin assets (fonts, Leaflet, map tiles) are runtime-cached so
   the map and styles keep working offline once seen. */
var CACHE = "amla-v17";
var CORE = ["./", "./index.html", "./css/styles.css", "./js/app.js", "./js/data.js", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  // Live/dynamic APIs: always network; offline -> graceful JSON so the app can degrade.
  if (url.origin === location.origin && url.pathname.indexOf("/api/") === 0) {
    e.respondWith(fetch(req).catch(function () {
      return new Response(JSON.stringify({ ok: false, error: "offline" }), { headers: { "Content-Type": "application/json" } });
    }));
    return;
  }

  // Same-origin static: cache-first, refresh in background, fall back to app shell.
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(function (cached) {
      var net = fetch(req).then(function (res) {
        if (res && res.status === 200) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
        return res;
      }).catch(function () { return cached || caches.match("./index.html"); });
      return cached || net;
    }));
    return;
  }

  // Cross-origin (fonts, Leaflet, tiles, images): cache-first runtime.
  e.respondWith(caches.match(req).then(function (cached) {
    return cached || fetch(req).then(function (res) {
      try { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); } catch (_) {}
      return res;
    }).catch(function () { return cached; });
  }));
});
