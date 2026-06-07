/* Vercel serverless function: in-network providers from a plan's FHIR Provider Directory.
 *
 * CMS-9115-F requires Medi-Cal managed care plans to publish a PUBLIC (no-auth) Provider
 * Directory API in HL7 FHIR R4, following the Da Vinci PDEX Plan-Net IG. This function
 * queries the selected plan's endpoint and returns in-network results normalized to the
 * shape the map uses. It is the PRIMARY source of truth for the map; the client falls back
 * to Google/OpenStreetMap only when a plan has no usable endpoint or it returns nothing.
 *
 * Geo strategy per endpoint (data/fhir-endpoints.json -> plans[id].geo):
 *   - "near"   (default): GET {base}/Location?near=<lat>|<lng>|<dist>|km   (FHIR R4 geo)
 *   - "postal" (e.g. Molina, whose server 500s on `near`): reverse-geocode the point to a
 *              ZIP, then GET {base}/Location?address-postalcode=<zip>, distance-filter here.
 *
 * Two modes:
 *   - locations (default): in-network service locations.
 *   - providers (?specialty=...): PractitionerRole joined to Practitioner + Location.
 */
var ENDPOINTS = require("../data/fhir-endpoints.json");

var CARE_KEYWORDS = {
  pharmacy: /pharmac|drug|\brx\b|apothec/i,
  hospital: /hospital|medical center|med ctr|emergency/i,
  urgent_care: /urgent|immediate care|walk.?in|express care/i,
  clinic: /clinic|health center|community health|fqhc|medical group|family|primary|practice/i,
  doctor: /clinic|medical group|physician|family|primary|practice|associates/i,
  dentist: /dental|dentist|orthodont|oral|endodont|periodont/i,
  mental_health: /behavioral|mental|psych|counsel|wellness|substance|recovery/i,
};
var SPECIALTY_KW = {
  "primary care": /family|general practice|internal medicine|\bprimary\b|pediatric|geriatric|nurse practitioner/i,
  "pediatrics": /pediatric|\bpeds\b|child|adolescent/i,
  "ob-gyn": /obstetri|gynecolog|ob.?gyn|\bwomen|midwife|maternal/i,
  "mental health": /psych|behavioral|mental|counsel|therapist|social work|substance|addiction/i,
  "cardiology": /cardio|heart|vascular/i,
  "dermatology": /dermat|skin/i,
  "dental": /dental|dentist|orthodont|oral|endodont|periodont/i,
  "vision": /optom|ophthalmol|vision|\beye/i,
  "orthopedics": /orthop|bone|joint|sports medicine/i,
  "endocrinology": /endocrin|diabet|thyroid/i,
  "neurology": /neurolog|nerve|seizure/i,
};

function num(x) { var n = parseFloat(x); return isFinite(n) ? n : null; }
function distM(aLat, aLng, bLat, bLng) {
  var R = 6371000, toRad = Math.PI / 180;
  var dLat = (bLat - aLat) * toRad, dLng = (bLng - aLng) * toRad;
  var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
function nearParam(lat, lng, km) { return lat + "%7C" + lng + "%7C" + km.toFixed(1) + "%7Ckm"; }

function fetchText(url, ms, headers) {
  var ctrl = new AbortController();
  var t = setTimeout(function () { ctrl.abort(); }, ms || 9000);
  return fetch(url, { signal: ctrl.signal, headers: headers || { Accept: "application/fhir+json, application/json", "User-Agent": "AccessMediCalLA-Navigator/1.0 (+https://github.com/jcl347/AccessMedicaid)" } })
    .then(function (r) { clearTimeout(t); return r.text().then(function (body) { return { ok: r.ok, status: r.status, body: body }; }); })
    .catch(function (e) { clearTimeout(t); throw e; });
}
function parseBundle(r) { if (!r || !r.ok) return null; try { return JSON.parse(r.body); } catch (e) { return null; } }
function bundleResources(b, type) { return (((b && b.entry) || []).map(function (e) { return e && e.resource; }).filter(function (x) { return x && x.resourceType === type; })); }
function indexBundle(b, idx) { ((b && b.entry) || []).forEach(function (e) { var r = e && e.resource; if (r && r.resourceType && r.id) idx[r.resourceType + "/" + r.id] = r; }); return idx; }
function humanName(p) { if (!p) return ""; var n = (p.name && p.name[0]) || {}; if (n.text) return n.text; var g = [].concat(n.given || []).join(" "); return ((g ? g + " " : "") + (n.family || "")).trim(); }
function telOf(res) { var ph = "", web = ""; ((res && res.telecom) || []).forEach(function (t) { if (t && t.value) { if (t.system === "phone" && !ph) ph = t.value; if (t.system === "url" && !web) web = t.value; } }); return { phone: ph, website: web }; }
function addrOf(loc) { var a = (loc && loc.address) || {}; var s = [].concat(a.line || []).filter(Boolean).join(" "); if (a.city) s += (s ? ", " : "") + a.city; if (a.state) s += (s ? ", " : "") + a.state; if (a.postalCode) s += " " + a.postalCode; return s.trim(); }
function specialtyText(pr) { var s = ""; ((pr && pr.specialty) || []).forEach(function (cc) { (cc.coding || []).forEach(function (c) { s += " " + (c.display || c.code || ""); }); if (cc.text) s += " " + cc.text; }); return s.trim(); }
function specialtyMatcher(s) {
  s = (s || "").toLowerCase().trim();
  if (!s) return null;
  if (SPECIALTY_KW[s]) return SPECIALTY_KW[s];
  for (var k in SPECIALTY_KW) { if (s.indexOf(k) >= 0 || k.indexOf(s) >= 0) return SPECIALTY_KW[k]; }
  return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}
function normLocation(loc) {
  var pos = loc.position || {};
  var t = telOf(loc);
  var typeText = "";
  (loc.type || []).forEach(function (tc) { (tc.coding || []).forEach(function (c) { typeText += " " + (c.display || c.code || ""); }); if (tc.text) typeText += " " + tc.text; });
  return { name: loc.name || "(In-network location)", lat: num(pos.latitude), lng: num(pos.longitude), phone: t.phone, address: addrOf(loc), website: t.website, inNetwork: true, _typeText: typeText };
}

// Reverse-geocode a point to a 5-digit ZIP (for endpoints that lack `near`).
async function reverseZip(lat, lng) {
  try {
    var u = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&addressdetails=1&lat=" + lat + "&lon=" + lng;
    var r = await fetchText(u, 6000, { "User-Agent": "AccessMediCalLA-Navigator/1.0 (+https://github.com/jcl347/AccessMedicaid)" });
    if (!r.ok) return "";
    var j = JSON.parse(r.body);
    var pc = j && j.address && j.address.postcode ? String(j.address.postcode) : "";
    return pc ? pc.split(/[-\s]/)[0] : "";
  } catch (e) { return ""; }
}

// Fetch a bundle of nearby Locations using the endpoint's geo strategy.
async function nearbyLocationBundle(base, geoMode, lat, lng, km, zip) {
  if (geoMode === "postal") {
    var z = zip || (await reverseZip(lat, lng));
    if (!z) return { error: "no-zip" };
    var u = base + "/Location?address-postalcode=" + encodeURIComponent(z) + "&_count=300";
    return { url: u, zip: z, bundle: parseBundle(await fetchText(u, 9000)) };
  }
  var u2 = base + "/Location?near=" + nearParam(lat, lng, km) + "&_count=100";
  return { url: u2, bundle: parseBundle(await fetchText(u2, 9000)) };
}

async function locationSearch(base, geoMode, lat, lng, km, radius, type, zip, debug) {
  var lb = await nearbyLocationBundle(base, geoMode, lat, lng, km, zip);
  if (lb.error === "no-zip") return { ok: false, reason: "no-zip" };
  if (!lb.bundle) return { ok: false, reason: "fhir-error", query: debug ? [lb.url] : undefined };
  var maxM = radius * 1.1 + 400;
  var places = bundleResources(lb.bundle, "Location").map(normLocation).filter(function (p) { return isFinite(p.lat) && isFinite(p.lng) && distM(lat, lng, p.lat, p.lng) <= maxM; });

  var GENERIC = { clinic: 1, doctor: 1 };
  var kw = CARE_KEYWORDS[type];
  if (kw) { var f = places.filter(function (p) { return kw.test((p.name || "") + " " + (p._typeText || "")); }); if (!GENERIC[type] || f.length) places = f; }

  var seen = {}, out = [];
  places.forEach(function (p) { var k = (p.name || "") + "@" + p.lat.toFixed(4) + "," + p.lng.toFixed(4); if (seen[k]) return; seen[k] = 1; delete p._typeText; out.push(p); });
  out.sort(function (a, b) { return distM(lat, lng, a.lat, a.lng) - distM(lat, lng, b.lat, b.lng); });
  return { ok: true, mode: "locations", type: type, radius: radius, count: out.length, places: out.slice(0, 100), query: debug ? [lb.url] : undefined };
}

async function providerSearch(base, geoMode, lat, lng, km, radius, specialty, zip, debug) {
  var inc = "&_include=PractitionerRole:practitioner&_include=PractitionerRole:location";
  var queries = [], idx = {}, roles = [];

  // Primary (near endpoints only): chained location.near on PractitionerRole.
  if (geoMode !== "postal") {
    var url1 = base + "/PractitionerRole?location.near=" + nearParam(lat, lng, km) + inc + "&_count=200";
    queries.push(url1);
    var b1 = parseBundle(await fetchText(url1, 9000));
    if (b1 && b1.entry && b1.entry.length) { indexBundle(b1, idx); roles = bundleResources(b1, "PractitionerRole"); }
  }

  // Fallback / postal: find nearby Locations, then PractitionerRoles at those locations.
  if (!roles.length) {
    var lb = await nearbyLocationBundle(base, geoMode, lat, lng, km, zip);
    if (lb.error === "no-zip") return { ok: false, reason: "no-zip" };
    queries.push(lb.url);
    if (!lb.bundle || !lb.bundle.entry || !lb.bundle.entry.length) return { ok: false, reason: "no-locations", query: debug ? queries : undefined };
    indexBundle(lb.bundle, idx);
    var locList = bundleResources(lb.bundle, "Location").filter(function (l) { return l.position; });
    locList.forEach(function (l) { l.__d = distM(lat, lng, num(l.position.latitude), num(l.position.longitude)); });
    locList = locList.filter(function (l) { return isFinite(l.__d) && l.__d <= radius * 1.1 + 400; }).sort(function (a, b) { return a.__d - b.__d; }).slice(0, 35);
    var ids = locList.map(function (l) { return l.id; }).filter(Boolean);
    if (!ids.length) return { ok: false, reason: "no-locations", query: debug ? queries : undefined };
    var purl = base + "/PractitionerRole?location=" + encodeURIComponent(ids.map(function (i) { return "Location/" + i; }).join(",")) + "&_include=PractitionerRole:practitioner&_count=400";
    queries.push(purl);
    var pb = parseBundle(await fetchText(purl, 9000));
    if (!pb || !pb.entry) { var purl2 = base + "/PractitionerRole?location=" + encodeURIComponent(ids.join(",")) + "&_include=PractitionerRole:practitioner&_count=400"; queries.push(purl2); pb = parseBundle(await fetchText(purl2, 9000)); }
    if (pb && pb.entry) { indexBundle(pb, idx); roles = bundleResources(pb, "PractitionerRole"); }
  }
  if (!roles.length) return { ok: false, reason: "no-providers", query: debug ? queries : undefined };

  var match = specialtyMatcher(specialty);
  var maxM = radius * 1.1 + 400;
  var seen = {}, out = [];
  roles.forEach(function (pr) {
    var spec = specialtyText(pr);
    var prTel = telOf(pr);
    var practName = (pr.practitioner && pr.practitioner.reference) ? humanName(idx[pr.practitioner.reference]) : "";
    [].concat(pr.location || []).forEach(function (lref) {
      var loc = lref && lref.reference ? idx[lref.reference] : null;
      if (!loc || !loc.position) return;
      var lat2 = num(loc.position.latitude), lng2 = num(loc.position.longitude);
      if (!isFinite(lat2) || !isFinite(lng2) || distM(lat, lng, lat2, lng2) > maxM) return;
      var name = practName || loc.name || "(In-network provider)";
      if (match && !match.test((name || "") + " " + (spec || ""))) return;
      var lt = telOf(loc);
      var k = name + "@" + lat2.toFixed(4) + "," + lng2.toFixed(4);
      if (seen[k]) return; seen[k] = 1;
      out.push({ name: name, specialty: spec, lat: lat2, lng: lng2, phone: prTel.phone || lt.phone || "", address: addrOf(loc), website: prTel.website || lt.website || "", inNetwork: true });
    });
  });
  out.sort(function (a, b) { return distM(lat, lng, a.lat, a.lng) - distM(lat, lng, b.lat, b.lng); });
  return { ok: true, mode: "providers", specialty: specialty, count: out.length, places: out.slice(0, 80), query: debug ? queries : undefined };
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  var q = req.query || {};
  var plan = String(q.plan || "");
  var lat = parseFloat(q.lat), lng = parseFloat(q.lng);
  var type = String(q.type || "clinic").toLowerCase();
  var specialty = String(q.specialty || "").trim();
  var zip = String(q.zip || "").trim();
  var radius = parseInt(q.radius || "8047", 10) || 8047;
  radius = Math.min(Math.max(radius, 500), 40000);
  var debug = String(q.debug || "") === "1";
  if (!isFinite(lat) || !isFinite(lng)) { res.status(400).json({ ok: false, error: "Missing coordinates" }); return; }

  var cfg = (ENDPOINTS.plans || {})[plan];
  if (!cfg || !cfg.baseUrl) { res.status(200).json({ ok: false, reason: "no-endpoint", plan: plan }); return; }
  var base = String(cfg.baseUrl).replace(/\/+$/, "");
  var geoMode = cfg.geo === "postal" ? "postal" : "near";
  var km = Math.max(0.5, radius / 1000);

  try {
    var result = specialty ? await providerSearch(base, geoMode, lat, lng, km, radius, specialty, zip, debug)
                           : await locationSearch(base, geoMode, lat, lng, km, radius, type, zip, debug);
    if (result.ok) res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    res.status(200).json(Object.assign({ source: "fhir", plan: plan, geo: geoMode }, result));
  } catch (e) {
    res.status(200).json({ ok: false, reason: "exception", plan: plan, detail: debug ? String((e && e.message) || e) : undefined });
  }
};
