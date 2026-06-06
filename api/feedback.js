/* Vercel serverless function: member feedback inbox.
 * Receives "was this helpful?" votes and "report a wrong number" notes.
 *
 * Where it goes:
 *   - Always logged to the Vercel function logs.
 *   - If env var FEEDBACK_WEBHOOK_URL is set (e.g., a Slack/Discord/Make/Zapier
 *     incoming webhook), the message is forwarded there so a human sees it.
 * Set that one env var in Vercel -> Project -> Settings -> Environment Variables
 * to route feedback to a real inbox. No database required.
 */
module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "POST only" }); return; }
  try {
    var body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    body = body || {};
    var entry = {
      type: String(body.type || "note").slice(0, 24),
      value: String(body.value || "").slice(0, 2000),
      plan: String(body.plan || "").slice(0, 60),
      page: String(body.page || "").slice(0, 300),
      at: new Date().toISOString(),
    };
    console.log("[feedback]", JSON.stringify(entry));

    var hook = process.env.FEEDBACK_WEBHOOK_URL;
    if (hook) {
      var text = "Medi-Cal LA feedback (" + entry.type + "): " + (entry.value || "(no text)") + (entry.plan ? " | plan: " + entry.plan : "") + " | " + entry.page;
      try {
        var ctrl = new AbortController();
        var t = setTimeout(function () { ctrl.abort(); }, 6000);
        await fetch(hook, { method: "POST", signal: ctrl.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: text, content: text }) });
        clearTimeout(t);
      } catch (e) { /* logged above regardless */ }
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(200).json({ ok: false, error: "Could not record feedback" });
  }
};
