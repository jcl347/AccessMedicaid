/* Vercel serverless function: dynamic "web mining" for the navigator.
 *
 * When a member selects a need, the site calls /api/live?url=<official page>.
 * This runs server-side (no browser CORS limits), fetches the OFFICIAL page,
 * and returns the live <title>, any phone numbers found, and a short text
 * snippet - so the member sees fresh, sourced info, not just our cached copy.
 *
 * Safety: only an allowlist of official Medi-Cal / government / health-plan
 * domains may be fetched. Responses are size-capped, timed out, cached, and
 * stripped of scripts/markup before anything is returned.
 */

const ALLOWED_SUFFIXES = [
 "lacare.org", "healthnet.com", "healthnetcalifornia.com", "molinahealthcare.com",
 "kaiserpermanente.org", "blueshieldca.com", "anthem.com", "positivehealthcare.net",
 "caloptima.org", "iehp.org", "goldcoasthealthplan.org", "kernfamilyhealthcare.com",
 "dhcs.ca.gov", "smilecalifornia.org", "benefitscal.com", "lacounty.gov",
 "healthconsumer.org", "211la.org", "211ventura.org", "988lifeline.org",
 "dmhc.ca.gov", "healthcareoptions.dhcs.ca.gov", "medi-calrx.dhcs.ca.gov",
 "communityresourcecenterla.org", "ca.gov",
];

function hostAllowed(host) {
 host = (host || "").toLowerCase();
 return ALLOWED_SUFFIXES.some((s) => host === s || host.endsWith("." + s));
}

function extractPhones(text) {
 const found = new Set();
 const re = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/g;
 let m;
 while ((m = re.exec(text)) && found.size < 8) {
 const digits = m[0].replace(/\D/g, "");
 if (digits.length === 10 || digits.length === 11) {
 const ten = digits.slice(-10);
 found.add("1-" + ten.slice(0, 3) + "-" + ten.slice(3, 6) + "-" + ten.slice(6));
 }
 }
 return Array.from(found);
}

module.exports = async function handler(req, res) {
 res.setHeader("Content-Type", "application/json; charset=utf-8");
 const raw = (req.query && req.query.url) || "";
 let target;
 try {
 target = new URL(raw);
 } catch {
 res.status(400).json({ ok: false, error: "Invalid or missing url" });
 return;
 }
 if (target.protocol !== "https:" && target.protocol !== "http:") {
 res.status(400).json({ ok: false, error: "Unsupported protocol" });
 return;
 }
 if (!hostAllowed(target.hostname)) {
 res.status(403).json({ ok: false, error: "Domain not allowed", host: target.hostname });
 return;
 }

 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), 8000);
 try {
 const r = await fetch(target.toString(), {
 signal: controller.signal,
 redirect: "follow",
 headers: {
 "User-Agent": "AccessMediCalLA-Navigator/1.0 (+resource navigator; contact via site)",
 Accept: "text/html,application/xhtml+xml",
 },
 });
 clearTimeout(timer);

 const ctype = r.headers.get("content-type") || "";
 if (!r.ok || !/text\/html|xml|text\/plain/.test(ctype)) {
 res.status(200).json({ ok: false, error: "Source not readable", status: r.status, url: target.toString() });
 return;
 }

 // Read at most ~250 KB
 const buf = await r.arrayBuffer();
 let html = Buffer.from(buf).toString("utf8").slice(0, 250000);

 const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
 const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim().slice(0, 160) : "";

 // Strip scripts/styles, then tags, to get visible text
 const stripped = html
 .replace(/<script[\s\S]*?<\/script>/gi, " ")
 .replace(/<style[\s\S]*?<\/style>/gi, " ")
 .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
 const text = stripped.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();

 const phones = extractPhones(stripped);
 const snippet = text.slice(0, 360);

 res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
 res.status(200).json({
 ok: true,
 url: target.toString(),
 host: target.hostname,
 title,
 phones,
 snippet,
 fetchedAt: new Date().toISOString(),
 });
 } catch (err) {
 clearTimeout(timer);
 res.status(200).json({ ok: false, error: err.name === "AbortError" ? "Timed out" : "Fetch failed", url: target.toString() });
 }
}
