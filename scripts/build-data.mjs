/* Build the website data bundle (js/data.js) from the JSON "database" in /data.
 The /data JSON files are the single source of truth. Run: node scripts/build-data.mjs
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

// Flatten the grouped manifest into an ordered plan list, attaching the
// service area (county) and brand-accent color to each plan.
const planRefs = index.groups.flatMap((g) =>
 g.plans.map((pl) => ({ id: pl.id, color: pl.color, serviceArea: g.area }))
);

const plans = planRefs.map((ref) => {
 const p = read("plans", ref.id + ".json");
 // The site reads `id`/`name`; the database uses `planId`/`planName`. Provide both.
 return Object.assign({ id: p.planId, name: p.planName, serviceArea: ref.serviceArea, brandColor: ref.color }, p);
});

const serviceAreas = index.groups.map((g) => g.area);

const bundle = {
 meta: { lastUpdated: meta.lastUpdated, region: index.region, county: meta.county, h1Note: meta.h1Note || "" },
 categories: meta.categories,
 serviceAreas,
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
 `Wrote js/data.js - ${plans.length} plans, ${barriersDoc.barriers.length} barriers, ` +
 `${stateDoc.resources.length} statewide resources, ${resourceCount} total resource cards.`
);
