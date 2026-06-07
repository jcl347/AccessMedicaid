/* Build a compact in-network provider dataset for Health Net (Centene) Medi-Cal from its
 * public machine-readable JSON directories. Health Net gates its FHIR base URL behind a
 * portal login but publishes per-county provider-directory JSON (no auth). Those files are
 * large (LA ~40MB) and have NO coordinates, so we flatten + ZIP-centroid geocode them once
 * into data/healthnet-providers.json, which /api/innetwork reads at request time.
 *
 * Source files are cached in data/.healthnet-cache/ (gitignored). If a file is missing the
 * script downloads it (needs internet). To refresh: node scripts/build-healthnet.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "data");
const cacheDir = join(dataDir, ".healthnet-cache");
if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });

const BASE = "https://www.healthnet.com/content/dam/centene/healthnet/pdfs/medi-cal/";
// Greater-LA focus: LA main + LA ancillary (mental health + vision) are what this site needs.
// Other county files are listed so the script can refresh them too if present/desired.
const REGIONS = [
  { key: "la", file: "medi-cal-provider-directory-la.json" },
  { key: "la-ancillary", file: "medi-cal-provider-directory-la-ancillary.json" },
];

const zipCentroids = JSON.parse(readFileSync(join(dataDir, "zip-centroids.json"), "utf8"));

// Map a Health Net section name to one of our map care categories.
function catForSection(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("clinic")) return "clinic";
  if (n.includes("primary care")) return "doctor";
  if (n.includes("obstetric") || n.includes("gyneco")) return "doctor";
  if (n.includes("specialist")) return "doctor";
  if (n.includes("urgent")) return "urgent_care";
  if (n.includes("hospital")) return "hospital";
  if (n.includes("mental")) return "mental_health";
  if (n.includes("vision")) return "vision";
  if (n.includes("skilled nursing")) return "facility";
  if (n.includes("acupuncture") || n.includes("doula") || n.includes("other")) return "other";
  if (n.includes("facilit")) return "facility";
  return "other";
}

const pick = (o, keys) => { for (const k of keys) { if (o[k] != null && o[k] !== "") return o[k]; } return ""; };
function zip5(z) { const s = String(z || "").trim(); const m = s.match(/\d{5}/); return m ? m[0] : ""; }
function langs(s) { return String(s || "").split(",").map((x) => x.trim()).filter((x) => x && !/^none$/i.test(x)); }

// A record is any nested object carrying both a name-ish and a zip-ish field.
function isRecord(o) {
  if (!o || typeof o !== "object" || Array.isArray(o)) return false;
  const hasName = o.Name || o.name || o.locationName;
  const hasZip = o.Zip != null || o.zip != null;
  return !!(hasName && hasZip);
}

function normalize(o, sectionName) {
  const name = pick(o, ["Name", "name", "locationName"]);
  const zip = zip5(pick(o, ["Zip", "zip"]));
  const c = zipCentroids[zip];
  if (!c) return null; // can't place on a map without a centroid
  const languages = langs(pick(o, ["Languages", "SiteStaffLang", "OfficeStaffLang"]));
  const newRaw = String(pick(o, ["NpFlg", "NpFlag", "AcceptNewPatient"]) || "");
  return {
    name: String(name).trim(),
    cat: catForSection(sectionName),
    section: sectionName,
    specialty: String(pick(o, ["Speciality", "Specialty", "Specialties", "ClinicType"]) || "").trim(),
    ipa: String(pick(o, ["Group", "group"]) || "").trim(),
    address: String(pick(o, ["Address", "locationAddress1"]) || "").trim(),
    city: String(pick(o, ["CityName", "City", "city"]) || "").trim(),
    state: String(pick(o, ["State", "state"]) || "CA").trim(),
    zip,
    lat: c[0], lng: c[1],
    phone: String(pick(o, ["Phone", "locationPhone", "phone"]) || "").trim(),
    languages,
    npi: String(pick(o, ["Npi", "providerNpi", "npi"]) || "").trim(),
    newPatients: /^[ROY]/i.test(newRaw),
    telehealth: /^(y|true|1)/i.test(String(o.telehealth || "")),
  };
}

// Recursively collect record objects from a section's nested City/Group/Specialities tree.
function collect(node, sectionName, out) {
  if (Array.isArray(node)) { for (const x of node) collect(x, sectionName, out); return; }
  if (!node || typeof node !== "object") return;
  if (isRecord(node)) {
    const r = normalize(node, sectionName);
    if (r && r.name) out.push(r);
    return; // a record's own children aren't separate records
  }
  for (const key of Object.keys(node)) collect(node[key], sectionName, out);
}

async function load(region) {
  const path = join(cacheDir, region.file);
  if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8"));
  const url = BASE + region.file;
  process.stdout.write(`Downloading ${region.key} from ${url} ...\n`);
  const r = await fetch(url, { headers: { "User-Agent": "AccessMediCalLA-Navigator/1.0" } });
  if (!r.ok) throw new Error(`${region.key}: HTTP ${r.status}`);
  const text = await r.text();
  writeFileSync(path, text, "utf8");
  return JSON.parse(text);
}

const raw = [];
for (const region of REGIONS) {
  let doc;
  try { doc = await load(region); }
  catch (e) { console.warn(`Skipping ${region.key}: ${e.message}`); continue; }
  const sections = (doc && doc.Section) || [];
  let regionCount = 0;
  for (const sec of sections) {
    const before = raw.length;
    collect(sec.County || sec, sec.name, raw);
    regionCount += raw.length - before;
  }
  console.log(`  ${region.key}: ${regionCount} raw listings`);
}

// Merge listings for the same provider-location (same doctor appears under each of their
// specialties / medical groups) so we keep ONE pin but ALL specialties and languages.
const merged = new Map();
for (const r of raw) {
  const k = r.name.toLowerCase() + "@" + r.zip + "@" + r.address.toLowerCase();
  const ex = merged.get(k);
  if (!ex) { r.specialties = r.specialty ? [r.specialty] : []; merged.set(k, r); continue; }
  if (r.specialty && ex.specialties.indexOf(r.specialty) < 0) ex.specialties.push(r.specialty);
  for (const l of r.languages) if (ex.languages.indexOf(l) < 0) ex.languages.push(l);
  ex.newPatients = ex.newPatients || r.newPatients;
  ex.telehealth = ex.telehealth || r.telehealth;
  if (!ex.ipa && r.ipa) ex.ipa = r.ipa;
  if (!ex.npi && r.npi) ex.npi = r.npi;
  if (ex.cat === "other" && r.cat !== "other") ex.cat = r.cat;
}
const all = [...merged.values()].map((r) => { r.specialty = r.specialties.join("; "); delete r.specialties; return r; });

const byCat = {};
for (const r of all) byCat[r.cat] = (byCat[r.cat] || 0) + 1;

// Safety: never overwrite a good dataset with garbage if a download failed/was blocked.
if (all.length < 1000) {
  console.error(`Refusing to write: only ${all.length} records parsed (a source download likely failed). Existing data/healthnet-providers.json left untouched.`);
  process.exit(1);
}

const bundle = {
  plan: "health-net",
  source: "Health Net of California Medi-Cal machine-readable provider directory (public JSON)",
  note: "Coordinates are ZIP-code centroids (the source directory has no per-record geocoordinates), so pins are approximate to the provider's ZIP area.",
  generated: new Date().toISOString().slice(0, 10),
  count: all.length,
  records: all,
};
writeFileSync(join(dataDir, "healthnet-providers.json"), JSON.stringify(bundle), "utf8");
console.log(`Wrote data/healthnet-providers.json - ${all.length} records`);
console.log("By category:", byCat);
