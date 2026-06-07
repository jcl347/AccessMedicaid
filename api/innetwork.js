/* Vercel serverless function: in-network providers from a plan's FHIR Provider Directory.
 *
 * CMS-9115-F requires Medi-Cal plans to publish a PUBLIC FHIR R4 (Da Vinci PDEX Plan-Net)
 * Provider Directory. We use it as the PRIMARY map source; the client falls back to
 * Google/OpenStreetMap only when a plan has no usable endpoint or it returns nothing.
 *
 * IMPORTANT reality check (verified live): most of these directories DO NOT populate
 * Location.position (no lat/lng), so FHIR `near=` returns nothing. We therefore query by
 * postal code (ZIPs within the search radius, from data/zip-centroids.json) and place pins
 * at the ZIP centroid - approximate to the provider's ZIP area, like Health Net. Endpoints
 * that DO store coordinates (e.g. Blue Shield Promise / Smile CDR) use geo `near` with
 * exact positions. Per-endpoint mode is data/fhir-endpoints.json -> plans[id].geo.
 *
 * Modes: locations (default) and providers (?specialty=... or ?language=...).
 */
var ENDPOINTS = require("../data/fhir-endpoints.json");
var HN = null; try { HN = require("../data/healthnet-providers.json"); } catch (e) { HN = null; }
var ZIPC = {}; try { ZIPC = require("../data/zip-centroids.json"); } catch (e) { ZIPC = {}; }

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
  "primary care": /family medicine|family practice|general practice|general practitioner|internal medicine|\bprimary care\b|nurse practitioner|family nurse|adult medicine|family health|community health|federally qualified|\bfqhc\b/i,
  "pediatrics": /pediatric|\bpeds\b|\bchild|adolescent/i,
  "ob-gyn": /obstetri|gynecolog|ob.?gyn|midwife|maternal.fetal|\bwomen'?s\b/i,
  "mental health": /psychiat|psycholog|behavioral|mental health|counsel|therapist|social work|substance|addiction|marriage and family/i,
  "cardiology": /cardio|heart|vascular/i,
  "dermatology": /dermat|skin/i,
  "vision": /optom|ophthalmol|\bvision\b|\beye\b/i,
  "orthopedics": /orthop|\bbone|\bjoint|sports medicine/i,
};

function num(x) { var n = parseFloat(x); return isFinite(n) ? n : null; }
function zip5(z) { var m = String(z == null ? "" : z).match(/\d{5}/); return m ? m[0] : ""; }
function distM(aLat, aLng, bLat, bLng) {
  var R = 6371000, toRad = Math.PI / 180;
  var dLat = (bLat - aLat) * toRad, dLng = (bLng - aLng) * toRad;
  var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
function nearParam(lat, lng, km) { return lat + "%7C" + lng + "%7C" + km.toFixed(1) + "%7Ckm"; }

// ZIP codes whose centroid is within the radius, nearest first (caps the query size).
function zipsWithin(lat, lng, radiusM, max) {
  var out = [];
  for (var z in ZIPC) { var c = ZIPC[z]; if (!c) continue; var d = distM(lat, lng, c[0], c[1]); if (d <= radiusM) out.push([z, d]); }
  out.sort(function (a, b) { return a[1] - b[1]; });
  return out.slice(0, max || 40).map(function (x) { return x[0]; });
}
// Bigger search areas (e.g. a 30-min drive isochrone) need more ZIPs so in-network
// coverage expands to fill the reachable area rather than stopping at a small cap.
function zipCap(radiusM) { return radiusM > 24000 ? 220 : radiusM > 12000 ? 140 : 90; }
// Coordinates for a Location: prefer real FHIR position, else the ZIP centroid (approx).
function coordsFor(res) {
  var pos = res && res.position;
  // Use a real position only if it isn't the 0,0 "null island" some servers return (e.g. BSP
  // postalcode-mode Locations) - fall back to the ZIP centroid in that case.
  if (pos) { var la = num(pos.latitude), lo = num(pos.longitude); if (isFinite(la) && isFinite(lo) && (Math.abs(la) > 0.01 || Math.abs(lo) > 0.01)) return { lat: la, lng: lo, approx: false }; }
  var z = res && res.address ? zip5(res.address.postalCode) : "";
  var c = z && ZIPC[z];
  return c ? { lat: c[0], lng: c[1], approx: true } : null;
}

function fetchText(url, ms) {
  var ctrl = new AbortController();
  var t = setTimeout(function () { ctrl.abort(); }, ms || 9000);
  return fetch(url, { signal: ctrl.signal, headers: { Accept: "application/fhir+json, application/json", "User-Agent": "AccessMediCalLA-Navigator/1.0 (+https://github.com/jcl347/AccessMedicaid)" } })
    .then(function (r) { clearTimeout(t); return r.text().then(function (body) { return { ok: r.ok, status: r.status, body: body }; }); })
    .catch(function (e) { clearTimeout(t); throw e; });
}
function parseBundle(r) { if (!r || !r.ok) return null; try { return JSON.parse(r.body); } catch (e) { return null; } }
function bundleResources(b, type) { return (((b && b.entry) || []).map(function (e) { return e && e.resource; }).filter(function (x) { return x && x.resourceType === type; })); }
function indexBundle(b, idx) { ((b && b.entry) || []).forEach(function (e) { var r = e && e.resource; if (r && r.resourceType && r.id) idx[r.resourceType + "/" + r.id] = r; }); return idx; }
function humanName(p) { if (!p) return ""; var n = (p.name && p.name[0]) || {}; if (n.text) return n.text; var g = [].concat(n.given || []).join(" "); return ((g ? g + " " : "") + (n.family || "")).trim(); }
function langsOf(p) { var out = []; ((p && p.communication) || []).forEach(function (cc) { var c = (cc.coding && cc.coding[0]) || {}; var v = c.display || c.code || cc.text; if (v && out.indexOf(v) < 0) out.push(v); }); return out; }
function langMatch(list, want) { if (!want) return true; want = want.toLowerCase(); return (list || []).some(function (L) { return String(L).toLowerCase().indexOf(want) >= 0; }); }
function telOf(res) { var ph = "", web = ""; ((res && res.telecom) || []).forEach(function (t) { if (t && t.value) { if (t.system === "phone" && !ph) ph = t.value; if (t.system === "url" && !web) web = t.value; } }); return { phone: ph, website: web }; }
function addrOf(loc) { var a = (loc && loc.address) || {}; var s = [].concat(a.line || []).filter(Boolean).join(" "); if (a.city) s += (s ? ", " : "") + a.city; if (a.state) s += (s ? ", " : "") + a.state; if (a.postalCode) s += " " + a.postalCode; return s.trim(); }
function specialtyText(pr) {
  var set = [];
  function add(v) { v = (v || "").trim(); if (v && set.indexOf(v) < 0) set.push(v); }
  ((pr && pr.specialty) || []).forEach(function (cc) { (cc.coding || []).forEach(function (c) { add(c.display || c.code); }); add(cc.text); });
  return set.join(", ");
}
function specialtyMatcher(s) {
  s = (s || "").toLowerCase().trim();
  if (!s) return null;
  if (SPECIALTY_KW[s]) return SPECIALTY_KW[s];
  for (var k in SPECIALTY_KW) { if (s.indexOf(k) >= 0 || k.indexOf(s) >= 0) return SPECIALTY_KW[k]; }
  return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}
// --- street-level geocoding via the FREE U.S. Census batch geocoder (no API key) ---
// Upgrades approximate ZIP-centroid pins to EXACT coordinates where the street address
// matches. Strictly additive: any failure (or no match) leaves the ZIP-centroid pin.
var GEO_CACHE = {};
function addrParts(loc) {
  var a = (loc && loc.address) || {};
  return { street: [].concat(a.line || []).filter(Boolean).join(" "), city: a.city || "", state: a.state || "CA", zip: zip5(a.postalCode) };
}
function csvCell(s) { return String(s == null ? "" : s).replace(/[",\r\n]/g, " ").trim(); }
function parseCsvLine(line) { var out = [], cur = "", q = false; for (var i = 0; i < line.length; i++) { var ch = line[i]; if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; } else { if (ch === ",") { out.push(cur); cur = ""; } else if (ch === '"') q = true; else cur += ch; } } out.push(cur); return out; }
async function censusGeocode(places) {
  if (!places || !places.length || typeof FormData === "undefined") return;
  var rows = [], map = {};
  places.forEach(function (p, i) {
    var a = p._addr || {}; var street = csvCell(a.street);
    if (!street || (!a.zip && !a.city)) return;
    var key = (street + "|" + (a.zip || a.city)).toLowerCase();
    if (Object.prototype.hasOwnProperty.call(GEO_CACHE, key)) { var c = GEO_CACHE[key]; if (c) { p.lat = c[0]; p.lng = c[1]; p.approxByZip = false; } return; }
    map[i] = key;
    rows.push(i + "," + street + "," + csvCell(a.city) + "," + csvCell(a.state || "CA") + "," + csvCell(a.zip));
  });
  if (!rows.length) return;
  var fd = new FormData();
  fd.append("benchmark", "Public_AR_Current");
  fd.append("addressFile", new Blob([rows.join("\n")], { type: "text/csv" }), "a.csv");
  var ctrl = new AbortController(); var t = setTimeout(function () { ctrl.abort(); }, 8000);
  var r = await fetch("https://geocoding.geo.census.gov/geocoder/locations/addressbatch", { method: "POST", body: fd, signal: ctrl.signal });
  clearTimeout(t);
  if (!r.ok) return;
  var text = await r.text();
  text.split(/\r?\n/).forEach(function (line) {
    if (!line) return;
    var f = parseCsvLine(line); var id = parseInt(f[0], 10);
    if (!(id in map)) return;
    if (f[2] === "Match" && f[5]) { var ll = f[5].split(","); var lo = parseFloat(ll[0]), la = parseFloat(ll[1]); if (isFinite(la) && isFinite(lo)) { var p = places[id]; if (p) { p.lat = la; p.lng = lo; p.approxByZip = false; } GEO_CACHE[map[id]] = [la, lo]; return; } }
    GEO_CACHE[map[id]] = null;
  });
}

function normLocation(loc) {
  var co = coordsFor(loc); if (!co) return null;
  var t = telOf(loc), typeText = "";
  (loc.type || []).forEach(function (tc) { (tc.coding || []).forEach(function (c) { typeText += " " + (c.display || c.code || ""); }); if (tc.text) typeText += " " + tc.text; });
  return { name: loc.name || "(In-network location)", lat: co.lat, lng: co.lng, phone: t.phone, address: addrOf(loc), website: t.website, inNetwork: true, approxByZip: co.approx, _typeText: typeText, _addr: addrParts(loc) };
}

// Fetch a Location bundle by the endpoint's geo strategy.
async function locationBundle(base, geoMode, lat, lng, km, radius, zip) {
  if (geoMode === "near") {
    var u = base + "/Location?near=" + nearParam(lat, lng, km) + "&_count=100";
    return { url: u, bundle: parseBundle(await fetchText(u, 9000)) };
  }
  var zips = zipsWithin(lat, lng, radius, zipCap(radius));
  if (!zips.length && zip) zips = [zip5(zip)];
  if (!zips.length) return { error: "no-zips" };
  var u2 = base + "/Location?address-postalcode=" + encodeURIComponent(zips.join(",")) + "&_count=500";
  return { url: u2, zips: zips, bundle: parseBundle(await fetchText(u2, 9000)) };
}

async function locationSearch(base, geoMode, lat, lng, km, radius, type, zip, debug) {
  var lb = await locationBundle(base, geoMode, lat, lng, km, radius, zip);
  if (lb.error) return { ok: false, reason: lb.error };
  if (!lb.bundle) return { ok: false, reason: "fhir-error", query: debug ? [lb.url] : undefined };
  var maxM = radius * 1.1 + 400;
  var places = bundleResources(lb.bundle, "Location").map(normLocation).filter(function (p) { return p && distM(lat, lng, p.lat, p.lng) <= maxM; });
  var GENERIC = { clinic: 1, doctor: 1 };
  var kw = CARE_KEYWORDS[type];
  if (kw) { var f = places.filter(function (p) { return kw.test((p.name || "") + " " + (p._typeText || "")); }); if (!GENERIC[type] || f.length) places = f; }
  var seen = {}, out = [];
  places.forEach(function (p) { var k = (p.name || "") + "@" + p.lat.toFixed(4) + "," + p.lng.toFixed(4); if (seen[k]) return; seen[k] = 1; delete p._typeText; out.push(p); });
  out.sort(function (a, b) { return distM(lat, lng, a.lat, a.lng) - distM(lat, lng, b.lat, b.lng); });
  return { ok: true, mode: "locations", type: type, radius: radius, approxByZip: out.some(function (p) { return p.approxByZip; }), count: out.length, places: out.slice(0, 250), query: debug ? [lb.url] : undefined };
}

async function providerSearch(base, geoMode, lat, lng, km, radius, specialty, language, zip, debug) {
  var inc = "&_include=PractitionerRole:practitioner&_include=PractitionerRole:location&_include=PractitionerRole:organization";
  var queries = [], idx = {}, roles = [];
  if (geoMode === "near") {
    var u1 = base + "/PractitionerRole?location.near=" + nearParam(lat, lng, km) + inc + "&_count=200";
    queries.push(u1);
    var b1 = parseBundle(await fetchText(u1, 9000));
    if (b1 && b1.entry && b1.entry.length) { indexBundle(b1, idx); roles = bundleResources(b1, "PractitionerRole"); }
  } else {
    var zips = zipsWithin(lat, lng, radius, zipCap(radius));
    if (!zips.length && zip) zips = [zip5(zip)];
    if (!zips.length) return { ok: false, reason: "no-zips" };
    var u2 = base + "/PractitionerRole?location.address-postalcode=" + encodeURIComponent(zips.join(",")) + inc + "&_count=500";
    queries.push(u2);
    var b2 = parseBundle(await fetchText(u2, 12000));
    if (b2 && b2.entry && b2.entry.length) { indexBundle(b2, idx); roles = bundleResources(b2, "PractitionerRole"); }
  }
  // Fallback: some servers reject the chained location.* filter on PractitionerRole (IEHP
  // returns HTTP 400). Get nearby Locations first, then PractitionerRoles that reference them.
  if (!roles.length) {
    var lb = await locationBundle(base, geoMode, lat, lng, km, radius, zip);
    if (lb && lb.bundle) {
      indexBundle(lb.bundle, idx);
      var locs = bundleResources(lb.bundle, "Location").map(function (l) { var co = coordsFor(l); return co ? { id: l.id, d: distM(lat, lng, co.lat, co.lng) } : null; }).filter(function (x) { return x && x.id && x.d <= radius * 1.1 + 400; });
      locs.sort(function (a, b) { return a.d - b.d; });
      var ids = locs.slice(0, 40).map(function (x) { return x.id; });
      if (ids.length) {
        var u3 = base + "/PractitionerRole?location=" + encodeURIComponent(ids.map(function (i) { return "Location/" + i; }).join(",")) + "&_include=PractitionerRole:practitioner&_include=PractitionerRole:organization&_count=500";
        queries.push(u3);
        var b3 = parseBundle(await fetchText(u3, 12000));
        if (b3 && b3.entry && b3.entry.length) { indexBundle(b3, idx); roles = bundleResources(b3, "PractitionerRole"); }
      }
    }
  }
  if (!roles.length) return { ok: false, reason: "no-providers", query: debug ? queries : undefined };

  var match = specialtyMatcher(specialty);
  var maxM = radius * 1.1 + 400;
  var seen = {}, out = [];
  roles.forEach(function (pr) {
    var spec = specialtyText(pr), prTel = telOf(pr);
    var pract = (pr.practitioner && pr.practitioner.reference) ? idx[pr.practitioner.reference] : null;
    var practName = humanName(pract), languages = langsOf(pract);
    var ipa = (pr.organization && pr.organization.reference && idx[pr.organization.reference]) ? (idx[pr.organization.reference].name || "") : "";
    if (language && !langMatch(languages, language)) return;
    [].concat(pr.location || []).forEach(function (lref) {
      var loc = lref && lref.reference ? idx[lref.reference] : null; if (!loc) return;
      var co = coordsFor(loc); if (!co || distM(lat, lng, co.lat, co.lng) > maxM) return;
      var name = practName || loc.name || "(In-network provider)";
      // Match the provider's SPECIALTY (precise); only fall back to the name when no specialty
      // is listed - matching the name directly would leak across specialties (e.g. a surname
      // "Childs" matching pediatrics).
      if (match && !match.test(spec || name)) return;
      var lt = telOf(loc);
      var k = name + "@" + co.lat.toFixed(4) + "," + co.lng.toFixed(4);
      if (seen[k]) return; seen[k] = 1;
      out.push({ name: name, specialty: spec, lat: co.lat, lng: co.lng, phone: prTel.phone || lt.phone || "", address: addrOf(loc), website: prTel.website || lt.website || "", inNetwork: true, approxByZip: co.approx, languages: languages, ipa: ipa, _addr: addrParts(loc) });
    });
  });
  out.sort(function (a, b) { return distM(lat, lng, a.lat, a.lng) - distM(lat, lng, b.lat, b.lng); });
  return { ok: true, mode: "providers", specialty: specialty, language: language, approxByZip: out.some(function (p) { return p.approxByZip; }), count: out.length, places: out.slice(0, 250), query: debug ? queries : undefined };
}

// Health Net: filter the preprocessed JSON dataset (ZIP-centroid coordinates).
function healthNetSearch(lat, lng, radius, type, specialty, language) {
  if (!HN || !Array.isArray(HN.records)) return { ok: false, reason: "no-dataset" };
  var maxM = radius * 1.1 + 400;
  var match = specialty ? specialtyMatcher(specialty) : null;
  var providerMode = !!(specialty || language);
  var CARECAT = { clinic: ["clinic"], doctor: ["doctor"], hospital: ["hospital"], urgent_care: ["urgent_care"], mental_health: ["mental_health"], vision: ["vision"] };
  var cats = CARECAT[type] || null;
  var out = [];
  for (var i = 0; i < HN.records.length; i++) {
    var r = HN.records[i];
    if (!isFinite(r.lat) || !isFinite(r.lng) || distM(lat, lng, r.lat, r.lng) > maxM) continue;
    if (providerMode) {
      if (match && !match.test(r.specialty || r.name || "")) continue;
      if (language && !langMatch(r.languages, language)) continue;
    } else if (!cats || cats.indexOf(r.cat) < 0) { continue; }
    var addr = [r.address, r.city, r.state].filter(Boolean).join(", ") + (r.zip ? " " + r.zip : "");
    out.push({ name: r.name, specialty: r.specialty, lat: r.lat, lng: r.lng, phone: r.phone, address: addr.trim(), website: "", inNetwork: true, approxByZip: true, languages: r.languages || [], ipa: r.ipa || "", newPatients: !!r.newPatients, _addr: { street: r.address || "", city: r.city || "", state: r.state || "CA", zip: r.zip || "" } });
  }
  out.sort(function (a, b) { return distM(lat, lng, a.lat, a.lng) - distM(lat, lng, b.lat, b.lng); });
  return { ok: true, mode: providerMode ? "providers" : "locations", source: "healthnet", approxByZip: true, refreshed: HN.generated || "", type: type, specialty: specialty, language: language, count: out.length, places: out.slice(0, 250) };
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  var q = req.query || {};
  var plan = String(q.plan || "");
  var lat = parseFloat(q.lat), lng = parseFloat(q.lng);
  var type = String(q.type || "clinic").toLowerCase();
  var specialty = String(q.specialty || "").trim();
  var language = String(q.language || "").trim();
  var zip = String(q.zip || "").trim();
  var radius = parseInt(q.radius || "8047", 10) || 8047;
  radius = Math.min(Math.max(radius, 500), 40000);
  var debug = String(q.debug || "") === "1";
  if (!isFinite(lat) || !isFinite(lng)) { res.status(400).json({ ok: false, error: "Missing coordinates" }); return; }

  var cfg = (ENDPOINTS.plans || {})[plan];
  if (!cfg || (!cfg.baseUrl && !cfg.dataset)) { res.status(200).json({ ok: false, reason: "no-endpoint", plan: plan }); return; }

  try {
    var result;
    if (cfg.dataset) {
      result = healthNetSearch(lat, lng, radius, type, specialty, language);
      result = Object.assign({ plan: plan }, result);
    } else {
      var base = String(cfg.baseUrl).replace(/\/+$/, "");
      var geoMode = cfg.geo === "near" ? "near" : "postal"; // default postal: most directories lack coordinates
      var km = Math.max(0.5, radius / 1000);
      // "Doctors" (type=doctor) uses provider mode with no specialty filter so EVERY in-network
      // doctor is returned and flagged - not just facility records (location mode = clinics).
      var wantProviders = !!(specialty || language || type === "doctor");
      var r0 = wantProviders ? await providerSearch(base, geoMode, lat, lng, km, radius, specialty, language, zip, debug)
                             : await locationSearch(base, geoMode, lat, lng, km, radius, type, zip, debug);
      // If provider/specialty mode returned nothing (some directories - IEHP, Molina - can't
      // filter PractitionerRole by location via the API), fall back to in-network LOCATIONS so
      // the map still shows in-network places to call.
      if (wantProviders && (!r0.ok || !r0.places || !r0.places.length)) {
        var rl = await locationSearch(base, geoMode, lat, lng, km, radius, "clinic", zip, debug);
        if (rl.ok && rl.places && rl.places.length) { rl.specialtyUnavailable = true; r0 = rl; }
      }
      result = Object.assign({ source: "fhir", plan: plan, geo: geoMode, refreshed: "live" }, r0);
    }
    // Upgrade approximate ZIP-centroid pins to exact street coordinates (free Census
    // geocoder). Best-effort: failures keep the ZIP pin. Then drop the temp address field.
    if (result.ok && Array.isArray(result.places) && result.places.length) {
      try { await censusGeocode(result.places); } catch (e) { /* keep ZIP-centroid coords */ }
      result.approxByZip = result.places.some(function (p) { return p.approxByZip; });
      result.geocoded = result.places.filter(function (p) { return !p.approxByZip; }).length;
      result.places.forEach(function (p) { delete p._addr; });
    }
    if (result.ok) res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    res.status(200).json(result);
  } catch (e) {
    res.status(200).json({ ok: false, reason: "exception", plan: plan, detail: debug ? String((e && e.message) || e) : undefined });
  }
};
