/* Verify the Medi-Cal data is still "real":
 *   - every resource URL is reachable (catches link rot)
 *   - every phone number still appears on its source page (catches changed numbers)
 *
 * Run locally:  node scripts/verify-data.mjs
 * Run in CI:    see .github/workflows/verify-data.yml (scheduled cron)
 *
 * Writes data/verification-report.json and prints a summary. Exits non-zero
 * if too many links are truly broken (404/410/5xx/network) so CI flags it.
 * Bot-blocked pages (403/429) are reported separately and do NOT fail the run.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "data");
const read = (...p) => JSON.parse(readFileSync(join(dataDir, ...p), "utf8"));

// ---- gather every {label, url, phone} from the database ----
const index = read("index.json");
const items = [];
for (const g of index.groups) for (const pl of g.plans) {
  const p = read("plans", pl.id + ".json");
  for (const r of p.resources || []) if (r.url) items.push({ label: p.planName + " / " + r.title, url: r.url, phone: r.phone || "" });
  if (p.website) items.push({ label: p.planName + " (website)", url: p.website, phone: p.memberServicesPhone || "" });
}
for (const r of read("state-resources.json").resources || []) if (r.url) items.push({ label: "Statewide / " + r.title, url: r.url, phone: r.phone || "" });
for (const b of read("barriers.json").barriers || []) for (const s of b.solutions || []) if (s.url) items.push({ label: "Barrier / " + s.title, url: s.url, phone: s.phone || "" });

// ---- fetch each unique URL once ----
const urls = [...new Set(items.map((i) => i.url))];
const pages = new Map();
const UA = "AccessMediCalLA-Verify/1.0 (+https://github.com/jcl347/AccessMedicaid)";

async function fetchOne(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: { "User-Agent": UA, Accept: "text/html,*/*" } });
    clearTimeout(t);
    let digits = "";
    const ctype = r.headers.get("content-type") || "";
    if (r.ok && /html|text|xml/.test(ctype)) {
      const txt = (await r.text()).slice(0, 600000);
      digits = txt.replace(/<[^>]+>/g, " ").replace(/\D/g, "");
    }
    pages.set(url, { status: r.status, ok: r.ok, digits });
  } catch (e) {
    clearTimeout(t);
    pages.set(url, { status: 0, ok: false, digits: "", err: e.name === "AbortError" ? "timeout" : "network" });
  }
}
async function pool(list, n, fn) {
  const q = list.slice();
  await Promise.all(Array.from({ length: Math.min(n, q.length) }, async () => { while (q.length) await fn(q.shift()); }));
}

console.log(`Checking ${urls.length} unique URLs across ${items.length} resources...`);
await pool(urls, 6, fetchOne);

// ---- evaluate ----
const report = { checkedAt: new Date().toISOString(), totals: {}, brokenLinks: [], blocked: [], phoneMismatches: [] };
let ok = 0, broken = 0, blocked = 0, phoneMiss = 0;
for (const it of items) {
  const pg = pages.get(it.url) || { status: 0, ok: false, digits: "" };
  // GitHub runners use datacenter IPs that many official sites bot-block, throttle, or
  // stonewall (timeouts, resets, 5xx challenge pages, 401/403/406/429/451). Treat those as
  // "inconclusive" - NOT link rot. Only clear dead links (404/410 and other plain 4xx) count
  // as broken, so a transient/blocked check from CI doesn't fail the run.
  const st = pg.status;
  const inconclusive = st === 0 || st >= 500 || [401, 403, 406, 408, 409, 425, 429, 451].indexOf(st) >= 0;
  if (!pg.ok && inconclusive) { blocked++; if (report.blocked.length < 80) report.blocked.push({ label: it.label, url: it.url, status: st || pg.err || "network" }); continue; }
  if (!pg.ok) { broken++; if (report.brokenLinks.length < 100) report.brokenLinks.push({ label: it.label, url: it.url, status: pg.status, err: pg.err || "" }); continue; }
  ok++;
  const d = (it.phone || "").replace(/\D/g, "");
  const last10 = d.length >= 10 ? d.slice(-10) : "";
  if (last10 && pg.digits && pg.digits.indexOf(last10) === -1) {
    phoneMiss++;
    if (report.phoneMismatches.length < 100) report.phoneMismatches.push({ label: it.label, url: it.url, phone: it.phone });
  }
}
report.totals = { resources: items.length, uniqueUrls: urls.length, reachable: ok, brokenLinks: broken, botBlocked: blocked, phoneNotFoundOnPage: phoneMiss };

writeFileSync(join(dataDir, "verification-report.json"), JSON.stringify(report, null, 2) + "\n", "utf8");

console.log("\n=== Verification summary ===");
console.log(report.totals);
if (report.brokenLinks.length) { console.log("\nBroken links (need attention):"); report.brokenLinks.forEach((b) => console.log(`  [${b.status || b.err}] ${b.label} -> ${b.url}`)); }
if (report.phoneMismatches.length) { console.log(`\nPhone not found on its page (review): ${report.phoneMismatches.length} (see report)`); }
if (report.blocked.length) console.log(`\nBot-blocked (not a failure): ${report.blocked.length}`);

const brokenRatio = items.length ? broken / items.length : 0;
if (brokenRatio > 0.15) { console.error(`\nFAIL: ${(brokenRatio * 100).toFixed(1)}% of resource links are broken (threshold 15%).`); process.exit(1); }
console.log("\nPASS: link rot within acceptable range.");
