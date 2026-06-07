/* Vercel serverless function: in-network providers from a plan's FHIR Provider Directory.
 *
 * CMS-9115-F requires Medi-Cal managed care plans to publish a PUBLIC (no-auth) Provider
 * Directory API in HL7 FHIR R4, following the Da Vinci PDEX Plan-Net IG. This function
 * queries the selected plan's endpoint with a geo "near" search and returns in-network
 * service locations, normalized to the same shape the map uses. It is the PRIMARY source
 * of truth for the map; the client falls back to Google/OpenStreetMap only when a plan has
 * no usable endpoint or the endpoint returns nothing.
 *
 * Endpoints live in /data/fhir-endpoints.json (only firsthand-verified, public, geo-near
 * capable endpoints carry a baseUrl). FHIR R4 "near" search syntax on Location:
 *   GET {base}/Location?near=<lat>|<lng>|<distance>|<unit>
 */
var ENDPOINTS = require("../data/fhir-endpoints.json");

// Soft care-type filter: provider directories don't classify uniformly, so we match the
// chosen need against a location's name + type text. If the filter is too aggressive
// (few hits) we return everything in-network nearby rather than show an empty map.
var CARE_KEYWORDS = {
  pharmacy: /pharmac|drug|\brx\b|apothec/i,
  hospital: /hospital|medical center|med ctr|emergency/i,
  urgent_care: /urgent|immediate care|walk.?in|express care/i,
  clinic: /clinic|health center|community health|fqhc|medical group|family|primary|practice/i,
  doctor: /clinic|medical group|physician|family|primary|practice|associates/i,
  dentist: /dental|dentist|orthodont|oral/i,
  mental_health: /behavioral|mental|psych|counsel|wellness|substance|recovery/i,
};

function num(x) { var n = parseFloat(x); return isFinite(n) ? n : null; }

// Haversine distance in meters - a safety net in case a server ignores the `near` param.
function distM(aLat, aLng, bLat, bLng) {
  var R = 6371000, toRad = Math.PI / 180;
  var dLat = (bLat - aLat) * toRad, dLng = (bLng - aLng) * toRad;
  var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function normLocation(loc) {
  var pos = loc.position || {};
  var lat = num(pos.latitude), lng = num(pos.longitude);
  var phone = "", website = "";
  (loc.telecom || []).forEach(function (t) {
    if (!t || !t.value) return;
    if (t.system === "phone" && !phone) phone = t.value;
    if (t.system === "url" && !website) website = t.value;
  });
  var a = loc.address || {};
  var addr = [].concat(a.line || []).filter(Boolean).join(" ");
  if (a.city) addr += (addr ? ", " : "") + a.city;
  if (a.state) addr += (addr ? ", " : "") + a.state;
  if (a.postalCode) addr += " " + a.postalCode;
  var typeText = "";
  (loc.type || []).forEach(function (tc) {
    (tc.coding || []).forEach(function (c) { typeText += " " + (c.display || c.code || ""); });
    if (tc.text) typeText += " " + tc.text;
  });
  return {
    name: loc.name || "(In-network location)",
    lat: lat, lng: lng, phone: phone, address: addr.trim(), website: website,
    inNetwork: true, _typeText: typeText,
  };
}

function fetchJson(url, ms) {
  var ctrl = new AbortController();
  var t = setTimeout(function () { ctrl.abort(); }, ms || 9000);
  return fetch(url, { signal: ctrl.signal, headers: { Accept: "application/fhir+json, application/json", "User-Agent": "AccessMediCalLA-Navigator/1.0 (+https://github.com/jcl347/AccessMedicaid)" } })
    .then(function (r) {
      clearTimeout(t);
      return r.text().then(function (body) { return { ok: r.ok, status: r.status, body: body }; });
    })
    .catch(function (e) { clearTimeout(t); throw e; });
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  var q = req.query || {};
  var plan = String(q.plan || "");
  var lat = parseFloat(q.lat), lng = parseFloat(q.lng);
  var type = String(q.type || "clinic").toLowerCase();
  var radius = parseInt(q.radius || "8047", 10) || 8047;
  radius = Math.min(Math.max(radius, 500), 40000);
  var debug = String(q.debug || "") === "1";
  if (!isFinite(lat) || !isFinite(lng)) { res.status(400).json({ ok: false, error: "Missing coordinates" }); return; }

  var cfg = (ENDPOINTS.plans || {})[plan];
  if (!cfg || !cfg.baseUrl) { res.status(200).json({ ok: false, reason: "no-endpoint", plan: plan }); return; }
  var base = String(cfg.baseUrl).replace(/\/+$/, "");
  var km = Math.max(0.5, radius / 1000);
  // FHIR R4 geo search: near=lat|lng|distance|unit  (pipes URL-encoded as %7C)
  var near = lat + "%7C" + lng + "%7C" + km.toFixed(1) + "%7Ckm";
  var url = base + "/Location?near=" + near + "&_count=100";

  try {
    var r = await fetchJson(url, 9000);
    if (!r.ok) {
      res.status(200).json({ ok: false, reason: "fhir-error", status: r.status, plan: plan, query: debug ? url : undefined, detail: debug ? r.body.slice(0, 400) : undefined });
      return;
    }
    var bundle;
    try { bundle = JSON.parse(r.body); } catch (e) { res.status(200).json({ ok: false, reason: "bad-json", plan: plan, query: debug ? url : undefined }); return; }
    var entries = (bundle && bundle.entry) || [];
    var locs = entries.map(function (e) { return e && e.resource; }).filter(function (x) { return x && x.resourceType === "Location"; });
    var maxM = radius * 1.1 + 400; // allow a small margin beyond the requested radius
    var places = locs.map(normLocation).filter(function (p) {
      return isFinite(p.lat) && isFinite(p.lng) && distM(lat, lng, p.lat, p.lng) <= maxM;
    });

    // Filter by the chosen need. For generic "see a provider" needs (clinic/doctor) any
    // in-network location counts, so keep all when nothing name-matches. For specific needs
    // (pharmacy/dentist/mental health/etc.) require a match - if none, return empty so the
    // client falls back to public map data (e.g. pharmacies live in Medi-Cal Rx, not here).
    var GENERIC = { clinic: 1, doctor: 1 };
    var kw = CARE_KEYWORDS[type];
    if (kw) {
      var filtered = places.filter(function (p) { return kw.test((p.name || "") + " " + (p._typeText || "")); });
      if (!GENERIC[type] || filtered.length) places = filtered;
    }
    // Dedupe by name + rounded coords, then strip the internal type-text helper.
    var seen = {}, out = [];
    places.forEach(function (p) {
      var k = (p.name || "") + "@" + p.lat.toFixed(4) + "," + p.lng.toFixed(4);
      if (seen[k]) return; seen[k] = 1;
      delete p._typeText;
      out.push(p);
    });

    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    res.status(200).json({ ok: true, source: "fhir", plan: plan, type: type, radius: radius, count: out.length, places: out, query: debug ? url : undefined });
  } catch (e) {
    res.status(200).json({ ok: false, reason: "exception", plan: plan, query: debug ? url : undefined, detail: debug ? String((e && e.message) || e) : undefined });
  }
};
