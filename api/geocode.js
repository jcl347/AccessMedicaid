/* Vercel serverless function: geocoding (address / ZIP -> coordinates).
 * Proxies OpenStreetMap Nominatim server-side so we can set a proper
 * User-Agent, cache results, and avoid client rate limits. Key-free.
 * Returns coordinates plus the county (used to suggest the local plan).
 */
module.exports = async function handler(req, res) {
 res.setHeader("Content-Type", "application/json; charset=utf-8");
 var q = ((req.query && req.query.q) || "").trim();
 if (q.length < 3) { res.status(400).json({ ok: false, error: "Enter an address or ZIP code" }); return; }
 if (q.length > 160) q = q.slice(0, 160);

 // Bias plain ZIPs / partial text toward California.
 var hasState = /\b(ca|california)\b/i.test(q);
 var query = hasState ? q : q + ", California";
 var url = "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=us&accept-language=en&q=" + encodeURIComponent(query);

 var controller = new AbortController();
 var timer = setTimeout(function () { controller.abort(); }, 8000);
 try {
 var r = await fetch(url, {
 signal: controller.signal,
 headers: {
 "User-Agent": "AccessMediCalLA-Navigator/1.0 (https://github.com/jcl347/AccessMedicaid)",
 "Accept": "application/json",
 },
 });
 clearTimeout(timer);
 var arr = await r.json();
 if (!Array.isArray(arr) || !arr.length) { res.status(200).json({ ok: false, error: "We couldn't find that address. Try adding a city or ZIP." }); return; }
 var a = arr[0]; var ad = a.address || {};
 res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
 res.status(200).json({
 ok: true,
 lat: parseFloat(a.lat),
 lng: parseFloat(a.lon),
 display: a.display_name || query,
 county: ad.county || "",
 city: ad.city || ad.town || ad.village || "",
 state: ad.state || "",
 postcode: ad.postcode || "",
 });
 } catch (e) {
 clearTimeout(timer);
 res.status(200).json({ ok: false, error: e.name === "AbortError" ? "Lookup timed out" : "Lookup failed" });
 }
};
