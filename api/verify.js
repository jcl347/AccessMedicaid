/* Vercel serverless health check (lightweight, for the Vercel Cron in vercel.json).
 * Checks a small sample of key official pages are reachable and returns JSON.
 * Heavy/full verification lives in scripts/verify-data.mjs (GitHub Action cron),
 * which can take longer than a serverless function should run.
 */
var SAMPLE = [
  "https://www.lacare.org/health-plans/medi-cal",
  "https://www.healthnet.com/content/healthnet/en_us/members/medi-cal.html",
  "https://www.iehp.org/en/browse-plans/medi-cal",
  "https://www.caloptima.org/en/health-insurance-plans/medi-cal",
  "https://www.goldcoasthealthplan.org/",
  "https://positivehealthcare.net/california/phc/members/",
  "https://medi-calrx.dhcs.ca.gov/home/",
  "https://smilecalifornia.org/",
  "https://www.healthcareoptions.dhcs.ca.gov/",
  "https://www.benefitscal.com",
];

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  var results = await Promise.all(SAMPLE.map(async function (url) {
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, 7000);
    try {
      var r = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: { "User-Agent": "AccessMediCalLA-Verify/1.0" } });
      clearTimeout(t);
      return { url: url, status: r.status, ok: r.ok || r.status === 403 || r.status === 429 };
    } catch (e) {
      clearTimeout(t);
      return { url: url, status: 0, ok: false, err: e.name === "AbortError" ? "timeout" : "network" };
    }
  }));
  var down = results.filter(function (x) { return !x.ok; });
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ ok: down.length === 0, checkedAt: new Date().toISOString(), sample: results.length, down: down, results: results });
};
