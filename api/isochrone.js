/* Vercel serverless function: travel-time isochrones (reachable areas).
 * Proxies the public Valhalla OSM router (key-free) to return a polygon of
 * everywhere reachable within N minutes by foot / bike / car from a point.
 * Used to show car-free members what care they can actually get to.
 *
 * Note: true public-transit (bus) isochrones require GTFS schedules that no
 * key-free router provides, so transit is handled via per-place Transit
 * directions instead; this endpoint covers walking, biking, and driving.
 */
var COSTING = { walk: "pedestrian", bike: "bicycle", drive: "auto" };

module.exports = async function handler(req, res) {
 res.setHeader("Content-Type", "application/json; charset=utf-8");
 var q = req.query || {};
 var lat = parseFloat(q.lat), lng = parseFloat(q.lng);
 var mode = String(q.mode || "walk").toLowerCase();
 var minutes = parseInt(q.minutes || "20", 10) || 20;
 minutes = Math.min(Math.max(minutes, 5), 45);
 var costing = COSTING[mode] || COSTING.walk;
 if (!isFinite(lat) || !isFinite(lng)) { res.status(400).json({ ok: false, error: "Missing coordinates" }); return; }

 var payload = {
 locations: [{ lat: lat, lon: lng }],
 costing: costing,
 contours: [{ time: minutes }],
 polygons: true,
 denoise: 0.5,
 generalize: 60,
 };

 var controller = new AbortController();
 var timer = setTimeout(function () { controller.abort(); }, 12000);
 try {
 var r = await fetch("https://valhalla1.openstreetmap.de/isochrone", {
 method: "POST",
 signal: controller.signal,
 headers: { "Content-Type": "application/json", "User-Agent": "AccessMediCalLA-Navigator/1.0 (https://github.com/jcl347/AccessMedicaid)" },
 body: JSON.stringify(payload),
 });
 clearTimeout(timer);
 if (!r.ok) { res.status(200).json({ ok: false, error: "Routing unavailable", status: r.status }); return; }
 var geojson = await r.json();
 if (!geojson || !geojson.features) { res.status(200).json({ ok: false, error: "No area returned" }); return; }
 res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
 res.status(200).json({ ok: true, mode: mode, minutes: minutes, geojson: geojson });
 } catch (e) {
 clearTimeout(timer);
 res.status(200).json({ ok: false, error: e.name === "AbortError" ? "Routing timed out" : "Routing failed" });
 }
};
