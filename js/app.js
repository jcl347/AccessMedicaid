/* ============================================================
   Access Medi-Cal LA — app logic (vanilla JS, no build step)
   Reads window.AM_DATA (see js/data.js).
   ============================================================ */
(function () {
  "use strict";

  var DATA = window.AM_DATA || { plans: [], stateResources: [], barriers: [], categories: [], meta: {} };

  // Friendly icons per category (emojis read well across languages & literacy levels)
  var CAT_ICONS = {
    "Find a doctor": "🩺",
    "Get a ride (transportation)": "🚗",
    "Nurse advice line (24/7)": "📞",
    "Mental health & substance use": "💚",
    "Pharmacy & prescriptions": "💊",
    "Dental": "🦷",
    "Vision": "👓",
    "Language & interpreter help": "🗣️",
    "Member ID card & online account": "🪪",
    "Renew Medi-Cal / keep coverage": "🔄",
    "Complaints & appeals (grievances)": "⚖️",
    "Extra benefits & community supports (CalAIM)": "🎁",
    "Urgent & after-hours care": "⏰",
    "Member handbook & forms": "📘",
    "Transportation to non-medical (NMT)": "🛒",
    "Other": "ℹ️"
  };

  var STORE_KEY_PLAN = "amla.plan";
  var STORE_KEY_SIZE = "amla.textsize";

  var state = {
    planId: null,
    category: null,   // active need filter
    query: ""
  };

  // ---------- helpers ----------
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") e.className = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else if (k === "text") e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function telHref(phone) { return "tel:" + String(phone || "").replace(/[^0-9+]/g, ""); }
  function safeStore(get, key, val) {
    try { return get ? localStorage.getItem(key) : localStorage.setItem(key, val); }
    catch (e) { return null; }
  }
  function icon(cat) { return CAT_ICONS[cat] || "ℹ️"; }

  function getPlan() {
    return DATA.plans.filter(function (p) { return p.id === state.planId; })[0] || null;
  }

  // Build a unified resource list for the selected plan:
  // synthesized "essential contact" cards from the plan's top-level fields + the plan.resources array.
  function planResources(plan) {
    if (!plan) return [];
    var out = [];
    function add(category, title, description, phone, url, languages) {
      if (!phone && !url) return;
      out.push({ category: category, title: title, description: description || "",
                 phone: phone || "", url: url || "", languages: languages || "", verified: true, _essential: true });
    }
    add("Member ID card & online account", "Call " + plan.name + " Member Services",
        "Your plan's main help line. Ask any question about your coverage — interpreters are free." +
        (plan.memberServicesHours ? " Hours: " + plan.memberServicesHours + "." : ""),
        plan.memberServicesPhone, plan.memberPortalUrl, "Free interpreters in all languages");
    if (plan.ttyPhone) add("Member ID card & online account", "TTY line (deaf / hard of hearing)",
        "For members who are deaf, hard of hearing, or have a speech disability.", plan.ttyPhone, "", "");
    if (plan.nurseAdviceLine) add("Nurse advice line (24/7)", "24/7 Nurse Advice Line",
        "Talk to a nurse any time, day or night, about a health question or symptom.", plan.nurseAdviceLine, "", "");
    if (plan.findADoctorUrl) add("Find a doctor", "Find a doctor or clinic in your plan",
        "Search for a doctor, specialist, or clinic that takes your plan.", "", plan.findADoctorUrl, "");
    if (plan.memberHandbookUrl) add("Member handbook & forms", "Your Member Handbook",
        "The full guide to your benefits, rights, and how to get care.", "", plan.memberHandbookUrl, "");

    // Merge richer researched resources
    (plan.resources || []).forEach(function (r) { out.push(r); });
    return out;
  }

  function matches(r) {
    if (state.category && r.category !== state.category) return false;
    if (state.query) {
      var q = state.query.toLowerCase();
      var hay = (r.title + " " + r.description + " " + r.category + " " + (r.languages || "")).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  // ---------- renderers ----------
  function renderPlanPicker() {
    var wrap = $("#planPicker");
    wrap.innerHTML = "";
    var options = DATA.plans.concat([{ id: "__all__", name: "I'm not sure / show me everything", relationship: "We'll show resources that work for every plan" }]);
    options.forEach(function (p) {
      var checked = state.planId === p.id || (p.id === "__all__" && !state.planId);
      var card = el("button", {
        class: "plan-card", type: "button", role: "radio",
        "aria-checked": checked ? "true" : "false", "data-id": p.id
      }, [
        el("span", { class: "pc-name", text: p.name }),
        el("span", { class: "pc-rel", text: p.relationship || "" }),
        el("span", { class: "pc-check", text: "✓ Selected" })
      ]);
      card.addEventListener("click", function () {
        state.planId = (p.id === "__all__") ? null : p.id;
        safeStore(false, STORE_KEY_PLAN, state.planId || "");
        renderPlanPicker();
        renderNeeds();
        renderResults();
        $("#needs-step").scrollIntoView({ block: "start" });
      });
      wrap.appendChild(card);
    });
  }

  function renderNeeds() {
    var grid = $("#needsGrid");
    grid.innerHTML = "";
    var plan = getPlan();
    var pool = plan ? planResources(plan) : [];
    // Count resources per category (plan + statewide so tiles are meaningful even with no plan)
    var counts = {};
    pool.concat(DATA.stateResources || []).forEach(function (r) {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    // Show categories that have at least one resource, ordered by the canonical list
    var cats = (DATA.categories && DATA.categories.length ? DATA.categories : Object.keys(CAT_ICONS));
    cats = cats.filter(function (c) { return counts[c]; });

    // "All" tile first
    var allTile = el("button", { class: "need-tile", type: "button", role: "listitem",
      "aria-pressed": state.category ? "false" : "true" }, [
      el("span", { class: "nt-icon", text: "🗂️", "aria-hidden": "true" }),
      el("span", { class: "nt-label", text: "Show all" })
    ]);
    allTile.addEventListener("click", function () { state.category = null; renderNeeds(); renderResults(); });
    grid.appendChild(allTile);

    cats.forEach(function (c) {
      var tile = el("button", { class: "need-tile", type: "button", role: "listitem",
        "aria-pressed": state.category === c ? "true" : "false" }, [
        el("span", { class: "nt-icon", text: icon(c), "aria-hidden": "true" }),
        el("span", { class: "nt-label", text: shortLabel(c) }),
        el("span", { class: "nt-count", text: counts[c] + (counts[c] === 1 ? " resource" : " resources") })
      ]);
      tile.addEventListener("click", function () {
        state.category = (state.category === c) ? null : c;
        renderNeeds(); renderResults();
        $("#results").scrollIntoView({ block: "start" });
      });
      grid.appendChild(tile);
    });
  }

  function shortLabel(c) {
    // Trim parentheticals for tile display, keep full text for screen readers via aria handled by label text
    return c.replace(/\s*\(.*?\)\s*/g, "").trim();
  }

  function resCard(r) {
    var actions = el("div", { class: "res-actions" });
    if (r.phone) {
      actions.appendChild(el("a", { class: "btn btn-call", href: telHref(r.phone) },
        [document.createTextNode("📞 Call " + r.phone)]));
    }
    if (r.url) {
      actions.appendChild(el("a", { class: "btn btn-link", href: r.url, target: "_blank", rel: "noopener" },
        [document.createTextNode("Open website ↗")]));
    }
    var badge = el("span", { class: "verify-badge" + (r.verified ? "" : " unverified"),
      text: r.verified ? "✓ Checked" : "⚠ Please confirm" });

    var card = el("div", { class: "res-card" }, [
      el("span", { class: "rc-cat" }, [document.createTextNode(icon(r.category) + " " + r.category)]),
      el("h3", { text: r.title }),
      el("p", { class: "rc-desc", text: r.description }),
      r.languages ? el("p", { class: "rc-lang", text: "🗣️ " + r.languages }) : null,
      actions,
      badge
    ]);
    return card;
  }

  function renderResults() {
    var list = $("#resultsList");
    var ctx = $("#resultsContext");
    list.innerHTML = "";
    var plan = getPlan();

    var items = (plan ? planResources(plan) : []).filter(matches);

    var label = plan ? plan.name : "all plans";
    var catLabel = state.category ? ("“" + shortLabel(state.category) + "”") : "all topics";
    ctx.textContent = plan
      ? ("Showing " + items.length + " resource" + (items.length === 1 ? "" : "s") + " for " + label + " — " + catLabel + ". Statewide help is below.")
      : "Pick your plan above to see resources for your plan. For now, here is help that works with every plan, below.";

    if (!plan) {
      list.appendChild(el("div", { class: "empty-note",
        html: "👆 <strong>Choose your health plan above</strong> to see your plan's doctors, nurse line, rides, and more. Don't know your plan? Open <em>“I don't know which plan I have.”</em>" }));
      return;
    }
    if (!items.length) {
      list.appendChild(el("div", { class: "empty-note",
        html: "We don't have a specific resource here for that topic yet. Try <strong>Show all</strong>, search above, or call your plan's Member Services — they can help with anything. The <strong>Statewide help</strong> section below may also have what you need." }));
      return;
    }
    items.forEach(function (r) { list.appendChild(resCard(r)); });
  }

  function renderState() {
    var list = $("#stateList");
    list.innerHTML = "";
    (DATA.stateResources || []).filter(matches).forEach(function (r) { list.appendChild(resCard(r)); });
    if (!list.children.length) {
      list.appendChild(el("div", { class: "empty-note", text: "No statewide resources match your search. Clear the search box to see all." }));
    }
  }

  function renderBarriers() {
    var wrap = $("#barriersList");
    wrap.innerHTML = "";
    (DATA.barriers || []).forEach(function (b) {
      var sols = el("div", { class: "b-solutions" });
      (b.solutions || []).forEach(function (s) {
        var actions = el("div", { class: "res-actions" });
        if (s.phone) actions.appendChild(el("a", { class: "btn btn-call", href: telHref(s.phone) }, [document.createTextNode("📞 " + s.phone)]));
        if (s.url) actions.appendChild(el("a", { class: "btn btn-link", href: s.url, target: "_blank", rel: "noopener" }, [document.createTextNode("Open ↗")]));
        sols.appendChild(el("div", { class: "b-sol" }, [
          el("div", { class: "bs-title", text: s.title }),
          el("div", { class: "bs-desc", text: s.description }),
          (s.phone || s.url) ? actions : null
        ]));
      });

      var details = el("details", { class: "barrier" }, [
        el("summary", {}, [
          el("span", {}, [
            el("span", { class: "b-name", text: b.name }),
            b.memberVoice ? el("span", { class: "b-voice", text: "“" + b.memberVoice + "”" }) : null
          ])
        ]),
        el("div", { class: "barrier-body" }, [
          el("p", { class: "b-desc", text: b.description }),
          b.affectedGroups ? el("p", { class: "b-affected", text: "Who this affects most: " + b.affectedGroups }) : null,
          sols
        ])
      ]);
      wrap.appendChild(details);
    });
  }

  function renderSources() {
    var box = $("#sourcesList");
    var urls = {};
    (DATA.plans || []).forEach(function (p) { (p.sources || []).forEach(function (u) { urls[u] = 1; }); });
    ((DATA.stateSources) || []).forEach(function (u) { urls[u] = 1; });
    ((DATA.barrierSources) || []).forEach(function (u) { urls[u] = 1; });
    var ul = el("ul", {});
    Object.keys(urls).forEach(function (u) {
      ul.appendChild(el("li", {}, [el("a", { href: u, target: "_blank", rel: "noopener", text: u })]));
    });
    box.innerHTML = "";
    box.appendChild(ul.children.length ? ul : el("p", { text: "Sources are listed on each plan's official website." }));
  }

  // ---------- controls: text size, read aloud, print, search ----------
  function initTextSize() {
    var saved = safeStore(true, STORE_KEY_SIZE) || "normal";
    applySize(saved);
    Array.prototype.forEach.call(document.querySelectorAll(".ts-btn"), function (btn) {
      btn.addEventListener("click", function () { applySize(btn.getAttribute("data-size")); });
    });
    function applySize(size) {
      var scale = size === "xlarge" ? 1.35 : size === "large" ? 1.18 : 1;
      document.documentElement.style.setProperty("--font-scale", scale);
      safeStore(false, STORE_KEY_SIZE, size);
      Array.prototype.forEach.call(document.querySelectorAll(".ts-btn"), function (b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-size") === size ? "true" : "false");
      });
    }
  }

  function initReadAloud() {
    var btn = $("#readAloudBtn");
    if (!("speechSynthesis" in window)) { btn.style.display = "none"; return; }
    var speaking = false;
    btn.addEventListener("click", function () {
      if (speaking) { window.speechSynthesis.cancel(); speaking = false; btn.setAttribute("aria-pressed", "false"); return; }
      var main = $("#main");
      var text = main ? main.innerText.replace(/\s+/g, " ").slice(0, 8000) : "";
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      u.onend = function () { speaking = false; btn.setAttribute("aria-pressed", "false"); };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      speaking = true; btn.setAttribute("aria-pressed", "true");
    });
  }

  function initPrint() { $("#printBtn").addEventListener("click", function () { window.print(); }); }

  function initSearch() {
    var box = $("#searchBox");
    var t;
    box.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () {
        state.query = box.value.trim();
        renderResults(); renderState();
      }, 120);
    });
  }

  function initMeta() {
    var lu = $("#lastUpdated");
    var m = DATA.meta || {};
    lu.textContent = "Last updated: " + (m.lastUpdated || "—") +
      ". Covers: " + (m.county || "Los Angeles County") + " Medi-Cal managed care plans." +
      (m.h1Note ? "  Note on “H1”: " + m.h1Note : "");
  }

  // ---------- init ----------
  function init() {
    var savedPlan = safeStore(true, STORE_KEY_PLAN);
    if (savedPlan && DATA.plans.some(function (p) { return p.id === savedPlan; })) state.planId = savedPlan;

    renderPlanPicker();
    renderNeeds();
    renderResults();
    renderState();
    renderBarriers();
    renderSources();
    initTextSize();
    initReadAloud();
    initPrint();
    initSearch();
    initMeta();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
