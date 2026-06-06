/* Vercel serverless function: geocoding (address / ZIP -> coordinates).
 * Key-free and resilient: tries OpenStreetMap Nominatim first, then falls
 * back to Photon (komoot) if Nominatim is down/rate-limited/empty.
 * Returns coordinates plus the county (used to suggest the local plan).
 */
function timeoutFetch(url, opts, ms) {
  var ctrl = new AbortController();
  var t = setTimeout(function () { ctrl.abort(); }, ms || 8000);
  opts = opts || {}; opts.signal = ctrl.signal;
  return fetch(url, opts).then(function (r) { clearTimeout(t); return r; }).catch(function (e) { clearTimeout(t); throw e; });
}

async function viaNominatim(query) {
  var url = "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=us&accept-language=en&q=" + encodeURIComponent(query);
  var r = await timeoutFetch(url, { headers: { "User-Agent": "AccessMediCalLA-Navigator/1.0 (https://github.com/jcl347/AccessMedicaid)", "Accept": "application/json" } }, 8000);
  if (!r.ok) throw new Error("nominatim " + r.status);
  var arr = await r.json();
  if (!Array.isArray(arr) || !arr.length) throw new Error("nominatim empty");
  var a = arr[0], ad = a.address || {};
  return { lat: parseFloat(a.lat), lng: parseFloat(a.lon), display: a.display_name || query, county: ad.county || "", city: ad.city || ad.town || ad.village || "", state: ad.state || "", postcode: ad.postcode || "" };
}

async function viaPhoton(query) {
  var url = "https://photon.komoot.io/api/?limit=1&lang=en&q=" + encodeURIComponent(query);
  var r = await timeoutFetch(url, { headers: { "Accept": "application/json", "User-Agent": "AccessMediCalLA-Navigator/1.0" } }, 8000);
  if (!r.ok) throw new Error("photon " + r.status);
  var j = await r.json();
  var f = j && j.features && j.features[0];
  if (!f || !f.geometry) throw new Error("photon empty");
  var c = f.geometry.coordinates || [], pr = f.properties || {};
  var disp = [pr.name, pr.street, pr.city, pr.state, pr.postcode].filter(Boolean).join(", ");
  return { lat: c[1], lng: c[0], display: disp || query, county: pr.county || "", city: pr.city || "", state: pr.state || "", postcode: pr.postcode || "" };
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  var q = ((req.query && req.query.q) || "").trim();
  if (q.length < 3) { res.status(400).json({ ok: false, error: "Enter an address or ZIP code" }); return; }
  if (q.length > 160) q = q.slice(0, 160);
  var hasState = /\b(ca|california)\b/i.test(q);
  var query = hasState ? q : q + ", California";

  var out = null;
  try { out = await viaNominatim(query); } catch (e1) {
    try { out = await viaPhoton(query); } catch (e2) { out = null; }
  }
  if (!out || !isFinite(out.lat) || !isFinite(out.lng)) {
    res.status(200).json({ ok: false, error: "We couldn't find that address. Try adding a city or ZIP." });
    return;
  }
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
  res.status(200).json({ ok: true, lat: out.lat, lng: out.lng, display: out.display, county: out.county, city: out.city, state: out.state, postcode: out.postcode });
};
