/* Build the website data bundle (js/data.js) from the JSON "database" in /data.
   The /data JSON files are the single source of truth. Run:  node scripts/build-data.mjs
   The site reads window.AM_DATA so it works by simply opening index.html (no server). */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "data");
const read = (...p) => JSON.parse(readFileSync(join(dataDir, ...p), "utf8"));

const meta = read("meta.json");
const index = read("index.json");
const barriersDoc = read("barriers.json");
const stateDoc = read("state-resources.json");

const plans = index.planOrder.map((id) => {
  const p = read("plans", id + ".json");
  // The site reads `id`/`name`; the database uses `planId`/`planName`. Provide both.
  return Object.assign({ id: p.planId, name: p.planName }, p);
});

const bundle = {
  meta: { lastUpdated: meta.lastUpdated, county: meta.county, h1Note: meta.h1Note || "" },
  categories: meta.categories,
  plans,
  barriers: barriersDoc.barriers,
  stateResources: stateDoc.resources,
  stateSources: stateDoc.sources || [],
  barrierSources: barriersDoc.sources || [],
};

const banner = "/* AUTO-GENERATED from /data by scripts/build-data.mjs - do not edit by hand. */\n";
writeFileSync(
  join(root, "js", "data.js"),
  banner + "window.AM_DATA = " + JSON.stringify(bundle, null, 2) + ";\n",
  "utf8"
);

const resourceCount =
  plans.reduce((n, p) => n + (p.resources ? p.resources.length : 0), 0) + stateDoc.resources.length;
console.log(
  `Wrote js/data.js — ${plans.length} plans, ${barriersDoc.barriers.length} barriers, ` +
    `${stateDoc.resources.length} statewide resources, ${resourceCount} total resource cards.`
);
