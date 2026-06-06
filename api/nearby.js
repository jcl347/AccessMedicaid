/* Vercel serverless function: nearby health resources.
 * Proxies the OpenStreetMap Overpass API server-side (cached, key-free)
 * to return real clinics / pharmacies / hospitals / etc. around a point,
 * within a radius. The client ranks them by distance to find the closest.
 */
var TYPE_FILTERS = {
 pharmacy: ['node["amenity"="pharmacy"]', 'way["amenity"="pharmacy"]'],
 hospital: ['node["amenity"="hospital"]', 'way["amenity"="hospital"]'],
 urgent_care: ['node["healthcare"="urgent_care"]', 'way["healthcare"="urgent_care"]', 'node["amenity"="clinic"]', 'way["amenity"="clinic"]', 'node["healthcare"="clinic"]', 'way["healthcare"="clinic"]', 'node["amenity"="hospital"]', 'way["amenity"="hospital"]'],
 clinic: ['node["amenity"="clinic"]', 'way["amenity"="clinic"]', 'node["healthcare"="clinic"]', 'way["healthcare"="clinic"]', 'node["healthcare"="centre"]', 'way["healthcare"="centre"]', 'node["healthcare"="community_health_centre"]', 'way["healthcare"="community_health_centre"]', 'node["amenity"="doctors"]', 'way["amenity"="doctors"]'],
 doctor: ['node["amenity"="doctors"]', 'way["amenity"="doctors"]', 'node["healthcare"="doctor"]', 'way["healthcare"="doctor"]'],
 dentist: ['node["amenity"="dentist"]', 'way["amenity"="dentist"]', 'node["healthcare"="dentist"]', 'way["healthcare"="dentist"]'],
 mental_health: ['node["healthcare"="psychotherapist"]', 'way["healthcare"="psychotherapist"]', 'node["healthcare"="counselling"]', 'way["healthcare"="counselling"]', 'node["healthcare:speciality"~"psych|mental|behav|counsel|addict",i]', 'way["healthcare:speciality"~"psych|mental|behav|counsel|addict",i]', 'node["amenity"~"clinic|doctors|hospital"]["name"~"mental|behav|psych|counsel|wellness",i]', 'way["amenity"~"clinic|doctors|hospital"]["name"~"mental|behav|psych|counsel|wellness",i]', 'node["healthcare"~"clinic|centre|hospital"]["name"~"mental|behav|psych|counsel|wellness",i]', 'way["healthcare"~"clinic|centre|hospital"]["name"~"mental|behav|psych|counsel|wellness",i]', 'node["social_facility"]["name"~"mental|behav|psych|counsel",i]', 'way["social_facility"]["name"~"mental|behav|psych|counsel",i]'],
};

module.exports = async function handler(req, res) {
 res.setHeader("Content-Type", "application/json; charset=utf-8");
 var q = req.query || {};
 var lat = parseFloat(q.lat), lng = parseFloat(q.lng);
 var type = String(q.type || "clinic").toLowerCase();
 var radius = parseInt(q.radius || "8047", 10) || 8047;
 radius = Math.min(Math.max(radius, 500), 24140); // 0.3 - 15 mi
 if (!isFinite(lat) || !isFinite(lng)) { res.status(400).json({ ok: false, error: "Missing coordinates" }); return; }

 var filters = TYPE_FILTERS[type] || TYPE_FILTERS.clinic;
 var ql = "[out:json][timeout:30];(" +
 filters.map(function (f) { return f + "(around:" + radius + "," + lat + "," + lng + ");"; }).join("") +
 ");out center tags 250;";

 var controller = new AbortController();
 var timer = setTimeout(function () { controller.abort(); }, 13000);
 try {
 var r = await fetch("https://overpass-api.de/api/interpreter", {
 method: "POST",
 signal: controller.signal,
 headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "AccessMediCalLA-Navigator/1.0 (https://github.com/jcl347/AccessMedicaid)" },
 body: "data=" + encodeURIComponent(ql),
 });
 clearTimeout(timer);
 var data = await r.json();
 var seen = {};
 var places = (data.elements || []).map(function (e) {
 var c = e.type === "node" ? { lat: e.lat, lon: e.lon } : (e.center || {});
 var t = e.tags || {};
 var addr = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ");
 if (t["addr:city"]) addr += (addr ? ", " : "") + t["addr:city"];
 return {
 name: t.name || t.operator || t["healthcare:speciality"] || "(Unnamed location)",
 lat: c.lat, lng: c.lon,
 phone: t.phone || t["contact:phone"] || "",
 address: addr,
 website: t.website || t["contact:website"] || "",
 };
 }).filter(function (x) {
 if (!isFinite(x.lat) || !isFinite(x.lng)) return false;
 var k = x.name + "@" + x.lat.toFixed(4) + "," + x.lng.toFixed(4);
 if (seen[k]) return false; seen[k] = 1; return true;
 });
 res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
 res.status(200).json({ ok: true, type: type, radius: radius, count: places.length, places: places });
 } catch (e) {
 clearTimeout(timer);
 res.status(200).json({ ok: false, error: e.name === "AbortError" ? "Search timed out" : "Search failed" });
 }
};
