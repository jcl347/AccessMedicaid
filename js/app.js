/* ============================================================
   Access Medi-Cal LA — app logic (vanilla JS, no build step)
   Reads window.AM_DATA (see js/data.js).
   Features: county-grouped plan picker, task search, dynamic
   web-mining (/api/live), "find care near me" maps, full-page
   translation, text-size, read-aloud, print.
   ============================================================ */
(function () {
  "use strict";

  var DATA = window.AM_DATA || { plans: [], stateResources: [], barriers: [], categories: [], serviceAreas: [], meta: {} };

  /* ---------- inline SVG icon set (Feather-style, MIT-spirit) ---------- */
  var P = {
    plusCircle: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
    car: '<rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    pill: '<path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7Z"/><path d="m8.5 8.5 7 7"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    creditCard: '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    gift: '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    mapPin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    navigation: '<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
    compass: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
    hospital: '<path d="M3 22V8l9-5 9 5v14"/><path d="M9 22v-5h6v5"/><line x1="12" y1="7" x2="12" y2="13"/><line x1="9" y1="10" x2="15" y2="10"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    bolt: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  };
  var CAT_ICON = {
    "Find a doctor": "plusCircle",
    "Get a ride (transportation)": "car",
    "Nurse advice line (24/7)": "phone",
    "Mental health & substance use": "heart",
    "Pharmacy & prescriptions": "pill",
    "Dental": "smile",
    "Vision": "eye",
    "Language & interpreter help": "globe",
    "Member ID card & online account": "creditCard",
    "Renew Medi-Cal / keep coverage": "refresh",
    "Complaints & appeals (grievances)": "shield",
    "Extra benefits & community supports (CalAIM)": "gift",
    "Urgent & after-hours care": "clock",
    "Member handbook & forms": "book",
    "Transportation to non-medical (NMT)": "bag",
    "Other": "info",
  };
  function svg(name, cls) {
    var paths = P[name] || P.info;
    return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + "</svg>";
  }
  function catIcon(cat, cls) { return svg(CAT_ICON[cat] || "info", cls); }

  /* ---------- state ---------- */
  var STORE = { plan: "amla.plan", size: "amla.textsize", zip: "amla.zip", lang: "amla.lang" };
  var state = { planId: null, category: null, query: "", care: "urgent care", loc: "" };

  /* ---------- helpers ---------- */
  function $(s, c) { return (c || document).querySelector(s); }
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
  function telHref(p) { return "tel:" + String(p || "").replace(/[^0-9+]/g, ""); }
  function store(get, key, val) { try { return get ? localStorage.getItem(key) : localStorage.setItem(key, val); } catch (e) { return null; } }
  function getPlan() { return DATA.plans.filter(function (p) { return p.id === state.planId; })[0] || null; }
  function shortLabel(c) { return c.replace(/\s*\(.*?\)\s*/g, "").trim(); }

  function planResources(plan) {
    if (!plan) return [];
    var out = [];
    function add(cat, title, desc, phone, url, langs) {
      if (!phone && !url) return;
      out.push({ category: cat, title: title, description: desc || "", phone: phone || "", url: url || "", languages: langs || "", verified: true, _essential: true });
    }
    add("Member ID card & online account", "Call " + plan.name + " Member Services",
      "Your plan's main help line. Ask any question about your coverage — interpreters are free." + (plan.memberServicesHours ? " Hours: " + plan.memberServicesHours : ""),
      plan.memberServicesPhone, plan.memberPortalUrl, "Free interpreters in all languages");
    if (plan.ttyPhone) add("Member ID card & online account", "TTY line (deaf / hard of hearing)", "For members who are deaf, hard of hearing, or have a speech disability.", plan.ttyPhone, "", "");
    if (plan.nurseAdviceLine) add("Nurse advice line (24/7)", "24/7 Nurse Advice Line", "Talk to a nurse any time, day or night, about a health question or symptom.", plan.nurseAdviceLine, "", "");
    if (plan.findADoctorUrl) add("Find a doctor", "Find a doctor or clinic in your plan", "Search for a doctor, specialist, or clinic that takes your plan.", "", plan.findADoctorUrl, "");
    if (plan.memberHandbookUrl) add("Member handbook & forms", "Your Member Handbook", "The full guide to your benefits, rights, and how to get care.", "", plan.memberHandbookUrl, "");
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

  /* ---------- plan picker (grouped by county) ---------- */
  function renderPlanPicker() {
    var wrap = $("#planPicker");
    wrap.innerHTML = "";
    var areas = DATA.serviceAreas && DATA.serviceAreas.length ? DATA.serviceAreas : ["Los Angeles County"];
    areas.forEach(function (area) {
      var inArea = DATA.plans.filter(function (p) { return p.serviceArea === area; });
      if (!inArea.length) return;
      var group = el("div", { class: "county-group" });
      group.appendChild(el("div", { class: "county-title", html: svg("mapPin") + "<span>" + area + "</span>" }));
      var grid = el("div", { class: "plan-grid" });
      inArea.forEach(function (p) { grid.appendChild(planCard(p)); });
      group.appendChild(grid);
      wrap.appendChild(group);
    });
    // "not sure" option
    var extra = el("div", { class: "county-group" });
    extra.appendChild(el("div", { class: "county-title", html: svg("info") + "<span>Not sure?</span>" }));
    var g2 = el("div", { class: "plan-grid" });
    g2.appendChild(planCard({ id: "__all__", name: "I'm not sure / show me everything", relationship: "See resources that work for every plan and statewide", brandColor: "#6b7c8e" }));
    extra.appendChild(g2);
    wrap.appendChild(extra);
  }
  function planCard(p) {
    var checked = state.planId === p.id || (p.id === "__all__" && !state.planId);
    var card = el("button", {
      class: "plan-card", type: "button", role: "radio", "aria-checked": checked ? "true" : "false",
      "data-id": p.id, style: "--plan-color:" + (p.brandColor || "#0f766e"),
    }, [
      el("span", { class: "pc-name", text: p.name }),
      el("span", { class: "pc-rel", text: p.relationship || "" }),
      el("span", { class: "pc-check", text: "✓ Selected" }),
    ]);
    card.addEventListener("click", function () {
      state.planId = p.id === "__all__" ? null : p.id;
      store(false, STORE.plan, state.planId || "");
      renderPlanPicker(); renderNeeds(); renderResults();
      $("#needs-step").scrollIntoView({ block: "start" });
    });
    return card;
  }

  /* ---------- needs grid ---------- */
  function renderNeeds() {
    var grid = $("#needsGrid");
    grid.innerHTML = "";
    var plan = getPlan();
    var pool = (plan ? planResources(plan) : []).concat(DATA.stateResources || []);
    var counts = {};
    pool.forEach(function (r) { counts[r.category] = (counts[r.category] || 0) + 1; });
    var cats = (DATA.categories && DATA.categories.length ? DATA.categories : Object.keys(CAT_ICON)).filter(function (c) { return counts[c]; });

    var all = el("button", { class: "need-tile", type: "button", "aria-pressed": state.category ? "false" : "true" }, [
      el("span", { html: svg("grid", "nt-ic") }), el("span", { class: "nt-label", text: "Show all" }),
    ]);
    all.addEventListener("click", function () { state.category = null; renderNeeds(); renderResults(); });
    grid.appendChild(all);

    cats.forEach(function (c) {
      var tile = el("button", { class: "need-tile", type: "button", "aria-pressed": state.category === c ? "true" : "false" }, [
        el("span", { html: catIcon(c, "nt-ic") }),
        el("span", { class: "nt-label", text: shortLabel(c) }),
        el("span", { class: "nt-count", text: counts[c] + (counts[c] === 1 ? " resource" : " resources") }),
      ]);
      tile.addEventListener("click", function () {
        state.category = state.category === c ? null : c;
        renderNeeds(); renderResults();
        $("#results").scrollIntoView({ block: "start" });
      });
      grid.appendChild(tile);
    });
  }

  /* ---------- resource cards ---------- */
  function resCard(r) {
    var actions = el("div", { class: "res-actions" });
    if (r.phone) actions.appendChild(el("a", { class: "btn btn-call", href: telHref(r.phone), html: svg("phone") + "<span>Call " + r.phone + "</span>" }));
    if (r.url) actions.appendChild(el("a", { class: "btn btn-link", href: r.url, target: "_blank", rel: "noopener", html: "<span>Open website</span>" + svg("external") }));
    actions.appendChild(el("span", { class: "verify-badge" + (r.verified ? "" : " unverified"), text: r.verified ? "✓ Checked" : "⚠ Please confirm" }));
    return el("div", { class: "res-card" }, [
      el("span", { class: "rc-cat", html: catIcon(r.category) + "<span>" + r.category + "</span>" }),
      el("h3", { text: r.title }),
      el("p", { class: "rc-desc", text: r.description }),
      r.languages ? el("p", { class: "rc-lang", html: svg("globe") + "<span>" + r.languages + "</span>" }) : null,
      actions,
    ]);
  }

  function renderResults() {
    var list = $("#resultsList"), ctx = $("#resultsContext"), plan = getPlan();
    list.innerHTML = "";
    var items = (plan ? planResources(plan) : []).filter(matches);
    var catLabel = state.category ? "“" + shortLabel(state.category) + "”" : "all topics";
    ctx.textContent = plan
      ? "Showing " + items.length + " resource" + (items.length === 1 ? "" : "s") + " for " + plan.name + " — " + catLabel + ". Statewide help is below."
      : "Pick your plan above to see resources for your plan. For now, here is help that works with every plan, below.";

    if (!plan) {
      clearLive();
      list.appendChild(el("div", { class: "empty-note", html: "👆 <strong>Choose your health plan above</strong> to see your plan's doctors, nurse line, rides, and more." }));
      return;
    }
    if (!items.length) {
      list.appendChild(el("div", { class: "empty-note", html: "Nothing here for that topic yet. Try <strong>Show all</strong>, search above, or call your plan's Member Services — they can help with anything." }));
    } else {
      items.forEach(function (r) { list.appendChild(resCard(r)); });
    }
    // dynamic web-mining when a specific topic is chosen
    if (state.category) mineForCategory(plan, state.category); else clearLive();
  }

  /* ---------- dynamic web-mining (/api/live) ---------- */
  function clearLive() { var p = $("#livePanel"); if (p) p.innerHTML = ""; }
  function bestUrlFor(plan, category) {
    var items = (plan.resources || []).filter(function (r) { return r.category === category && r.url && /^https?:/.test(r.url); });
    if (!items.length) return "";
    // prefer the plan's own domain
    var own = items.filter(function (r) { return sameBrand(r.url, plan); })[0];
    return (own || items[0]).url;
  }
  function sameBrand(url, plan) {
    try { var h = new URL(url).hostname; var ph = new URL(plan.website).hostname.replace(/^www\./, ""); var base = ph.split(".").slice(-2).join("."); return h.indexOf(base) !== -1; } catch (e) { return false; }
  }
  function mineForCategory(plan, category) {
    var panel = $("#livePanel");
    if (!panel) return;
    var url = bestUrlFor(plan, category);
    if (!url) { panel.innerHTML = ""; return; }
    var host = ""; try { host = new URL(url).hostname.replace(/^www\./, ""); } catch (e) {}
    panel.innerHTML = "";
    panel.appendChild(el("div", { class: "live-panel" }, [
      el("div", { class: "live-head", html: '<span class="live-badge"><span class="dot"></span> LIVE</span> <span>Getting the latest for ' + shortLabel(category) + " from " + (host || "the official site") + "…</span>" }),
      el("div", { class: "live-body" }, [el("div", { class: "live-skel w70" }), el("div", { class: "live-skel w40" })]),
    ]));
    var token = (state._mineToken = (state._mineToken || 0) + 1);
    fetch("/api/live?url=" + encodeURIComponent(url), { headers: { Accept: "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (token !== state._mineToken) return; // superseded
        if (!d || !d.ok) { panel.innerHTML = ""; return; }
        renderLive(panel, d, category);
      })
      .catch(function () { if (token === state._mineToken) panel.innerHTML = ""; });
  }
  function renderLive(panel, d, category) {
    var phones = el("div", { class: "live-phones" });
    (d.phones || []).slice(0, 4).forEach(function (ph) {
      phones.appendChild(el("a", { class: "btn btn-call", href: telHref(ph), html: svg("phone") + "<span>" + ph + "</span>" }));
    });
    var when = "just now";
    try { var diff = (Date.now() - new Date(d.fetchedAt).getTime()) / 1000; when = diff < 90 ? "just now" : Math.round(diff / 60) + " min ago"; } catch (e) {}
    panel.innerHTML = "";
    panel.appendChild(el("div", { class: "live-panel" }, [
      el("div", { class: "live-head", html: '<span class="live-badge"><span class="dot"></span> LIVE</span> <span>Latest for ' + shortLabel(category) + "</span>" }),
      d.title ? el("div", { class: "live-body", text: d.title }) : null,
      d.snippet ? el("div", { class: "live-body muted", text: d.snippet }) : null,
      (d.phones && d.phones.length) ? phones : null,
      el("div", { class: "live-meta", html: svg("compass") + "<span>Pulled live from <strong>" + d.host + "</strong> · " + when + "</span>" }, [
        el("a", { class: "btn btn-ghost", href: d.url, target: "_blank", rel: "noopener", html: "<span>View page</span>" + svg("external") }),
      ]),
    ]));
  }

  /* ---------- statewide + barriers + sources ---------- */
  function renderState() {
    var list = $("#stateList"); list.innerHTML = "";
    (DATA.stateResources || []).filter(matches).forEach(function (r) { list.appendChild(resCard(r)); });
    if (!list.children.length) list.appendChild(el("div", { class: "empty-note", text: "No statewide resources match your search. Clear the search box to see all." }));
  }
  function renderBarriers() {
    var wrap = $("#barriersList"); wrap.innerHTML = "";
    (DATA.barriers || []).forEach(function (b) {
      var sols = el("div", { class: "b-solutions" });
      (b.solutions || []).forEach(function (s) {
        var a = el("div", { class: "res-actions" });
        if (s.phone) a.appendChild(el("a", { class: "btn btn-call", href: telHref(s.phone), html: svg("phone") + "<span>" + s.phone + "</span>" }));
        if (s.url) a.appendChild(el("a", { class: "btn btn-link", href: s.url, target: "_blank", rel: "noopener", html: "<span>Open</span>" + svg("external") }));
        sols.appendChild(el("div", { class: "b-sol" }, [el("div", { class: "bs-title", text: s.title }), el("div", { class: "bs-desc", text: s.description }), (s.phone || s.url) ? a : null]));
      });
      wrap.appendChild(el("details", { class: "barrier" }, [
        el("summary", {}, [
          el("span", { html: svg("shield", "b-ic") }),
          el("span", {}, [el("span", { class: "b-name", text: b.name }), b.memberVoice ? el("span", { class: "b-voice", text: "“" + b.memberVoice + "”" }) : null]),
        ]),
        el("div", { class: "barrier-body" }, [
          el("p", { class: "b-desc", text: b.description }),
          b.affectedGroups ? el("p", { class: "b-affected", text: "Who this affects most: " + b.affectedGroups }) : null,
          sols,
        ]),
      ]));
    });
  }
  function renderSources() {
    var box = $("#sourcesList"); var urls = {};
    (DATA.plans || []).forEach(function (p) { (p.sources || []).forEach(function (u) { urls[u] = 1; }); });
    (DATA.stateSources || []).forEach(function (u) { urls[u] = 1; });
    (DATA.barrierSources || []).forEach(function (u) { urls[u] = 1; });
    var ul = el("ul", {});
    Object.keys(urls).forEach(function (u) { ul.appendChild(el("li", {}, [el("a", { href: u, target: "_blank", rel: "noopener", text: u })])); });
    box.innerHTML = ""; box.appendChild(ul.children.length ? ul : el("p", { text: "Sources are on each plan's official website." }));
  }

  /* ---------- maps: find care near me ---------- */
  var CARE_TYPES = [
    { key: "urgent care", label: "Urgent care", icon: "clock" },
    { key: "emergency room", label: "Emergency room", icon: "hospital" },
    { key: "community health center FQHC clinic", label: "Community clinic", icon: "users" },
    { key: "pharmacy", label: "Pharmacy", icon: "pill" },
    { key: "Medi-Cal dentist", label: "Dentist", icon: "smile" },
    { key: "mental health clinic", label: "Mental health", icon: "heart" },
    { key: "__plan_doctors__", label: "My plan's doctors", icon: "plusCircle" },
  ];
  function mapQueryLoc() { return state.loc || state.zip || "Los Angeles, CA"; }
  function renderChips() {
    var row = $("#careChips"); row.innerHTML = "";
    CARE_TYPES.forEach(function (c) {
      var pressed = state.care === c.key;
      var chip = el("button", { class: "chip", type: "button", "aria-pressed": pressed ? "true" : "false", html: svg(c.icon) + "<span>" + c.label + "</span>" });
      chip.addEventListener("click", function () {
        if (c.key === "__plan_doctors__") {
          var plan = getPlan();
          if (plan && plan.findADoctorUrl) { window.open(plan.findADoctorUrl, "_blank", "noopener"); }
          else { alert("Pick your health plan first (Step 1) to search your plan's doctors. Showing clinics on the map instead."); state.care = "community health center FQHC clinic"; renderChips(); updateMap(); }
          return;
        }
        state.care = c.key; renderChips(); updateMap();
      });
      row.appendChild(chip);
    });
  }
  function updateMap() {
    var loc = mapQueryLoc();
    var q = state.care.replace("__plan_doctors__", "doctor") + " near " + loc;
    var frame = $("#mapFrame");
    if (frame) frame.src = "https://www.google.com/maps?q=" + encodeURIComponent(q) + "&output=embed";
    var open = $("#mapOpen");
    if (open) open.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
    var label = $("#mapLabel");
    if (label) label.textContent = "Showing " + (CARE_TYPES.filter(function (c) { return c.key === state.care; })[0] || { label: state.care }).label.toLowerCase() + " near " + loc + ".";
  }
  function initNearMe() {
    state.zip = store(true, STORE.zip) || "";
    var zip = $("#zipInput");
    if (zip) {
      zip.value = state.zip;
      zip.addEventListener("change", function () { state.zip = zip.value.trim(); state.loc = ""; store(false, STORE.zip, state.zip); updateMap(); });
      zip.addEventListener("keydown", function (e) { if (e.key === "Enter") { state.zip = zip.value.trim(); state.loc = ""; store(false, STORE.zip, state.zip); updateMap(); } });
    }
    var locate = $("#locateBtn");
    if (locate) locate.addEventListener("click", function () {
      if (!navigator.geolocation) { alert("Your browser can't share location. Please type your ZIP code instead."); return; }
      locate.textContent = "Locating…";
      navigator.geolocation.getCurrentPosition(
        function (pos) { state.loc = pos.coords.latitude.toFixed(4) + "," + pos.coords.longitude.toFixed(4); locate.innerHTML = svg("navigation") + "<span>Use my location</span>"; updateMap(); },
        function () { locate.innerHTML = svg("navigation") + "<span>Use my location</span>"; alert("We couldn't get your location. Please type your ZIP code instead."); }
      );
    });
    renderChips(); updateMap();
  }

  /* ---------- language / full-page translation ---------- */
  var LANGS = [
    { c: "en", n: "English" }, { c: "es", n: "Español" }, { c: "zh-CN", n: "中文 (简)" }, { c: "zh-TW", n: "中文 (繁)" },
    { c: "vi", n: "Tiếng Việt" }, { c: "ko", n: "한국어" }, { c: "hy", n: "Հայերեն" }, { c: "tl", n: "Tagalog" },
    { c: "ru", n: "Русский" }, { c: "fa", n: "فارسی" }, { c: "km", n: "ខ្មែរ" }, { c: "ar", n: "العربية" },
    { c: "ja", n: "日本語" }, { c: "hi", n: "हिन्दी" }, { c: "pa", n: "ਪੰਜਾਬੀ" }, { c: "th", n: "ไทย" },
  ];
  function setCookie(name, value) {
    var host = location.hostname;
    document.cookie = name + "=" + value + ";path=/";
    if (host) {
      document.cookie = name + "=" + value + ";path=/;domain=" + host;
      document.cookie = name + "=" + value + ";path=/;domain=." + host;
    }
  }
  function applyLang(code) {
    store(false, STORE.lang, code);
    var btnLabel = $("#langLabel");
    if (btnLabel) { var f = LANGS.filter(function (l) { return l.c === code; })[0]; btnLabel.textContent = f ? f.n : "Language"; }
    Array.prototype.forEach.call(document.querySelectorAll(".lang-opt"), function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-lang") === code ? "true" : "false"); });
    if (code === "en") {
      setCookie("googtrans", "/en/en");
      var combo0 = document.querySelector("select.goog-te-combo");
      if (combo0) { combo0.value = "en"; combo0.dispatchEvent(new Event("change")); } else { location.reload(); }
      return;
    }
    setCookie("googtrans", "/en/" + code);
    var combo = document.querySelector("select.goog-te-combo");
    if (combo) { combo.value = code; combo.dispatchEvent(new Event("change")); }
    else { location.reload(); }
  }
  function buildLangMenu() {
    var menu = $("#langMenu");
    if (!menu) return;
    LANGS.forEach(function (l) {
      var b = el("button", { class: "lang-opt", type: "button", "data-lang": l.c, text: l.n });
      b.addEventListener("click", function () { applyLang(l.c); menu.classList.remove("open"); });
      menu.appendChild(b);
    });
    menu.appendChild(el("div", { class: "lang-note", text: "Whole-page translation powered by Google Translate. You can also use your browser's built-in Translate." }));
    var btn = $("#langBtn");
    btn.addEventListener("click", function () { var open = menu.classList.toggle("open"); btn.setAttribute("aria-expanded", open ? "true" : "false"); });
    document.addEventListener("click", function (e) { if (!menu.contains(e.target) && !btn.contains(e.target)) menu.classList.remove("open"); });
    var saved = store(true, STORE.lang);
    if (saved && saved !== "en") { var f = LANGS.filter(function (l) { return l.c === saved; })[0]; if (f && $("#langLabel")) $("#langLabel").textContent = f.n; }
  }

  /* ---------- controls ---------- */
  function initTextSize() {
    var saved = store(true, STORE.size) || "normal"; apply(saved);
    Array.prototype.forEach.call(document.querySelectorAll(".ts-btn"), function (b) { b.addEventListener("click", function () { apply(b.getAttribute("data-size")); }); });
    function apply(size) {
      var scale = size === "xlarge" ? 1.35 : size === "large" ? 1.18 : 1;
      document.documentElement.style.setProperty("--font-scale", scale);
      store(false, STORE.size, size);
      Array.prototype.forEach.call(document.querySelectorAll(".ts-btn"), function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-size") === size ? "true" : "false"); });
    }
  }
  function initReadAloud() {
    var btn = $("#readAloudBtn"); if (!btn) return;
    if (!("speechSynthesis" in window)) { btn.style.display = "none"; return; }
    var on = false;
    btn.addEventListener("click", function () {
      if (on) { window.speechSynthesis.cancel(); on = false; btn.setAttribute("aria-pressed", "false"); return; }
      var main = $("#main"); var text = main ? main.innerText.replace(/\s+/g, " ").slice(0, 8000) : "";
      var u = new SpeechSynthesisUtterance(text); u.rate = 0.95;
      u.onend = function () { on = false; btn.setAttribute("aria-pressed", "false"); };
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); on = true; btn.setAttribute("aria-pressed", "true");
    });
  }
  function initPrint() { var b = $("#printBtn"); if (b) b.addEventListener("click", function () { window.print(); }); }
  function initSearch() {
    var box = $("#searchBox"); if (!box) return; var t;
    box.addEventListener("input", function () { clearTimeout(t); t = setTimeout(function () { state.query = box.value.trim(); renderResults(); renderState(); }, 130); });
  }
  function initMeta() {
    var lu = $("#lastUpdated"); var m = DATA.meta || {};
    if (lu) lu.textContent = "Last updated: " + (m.lastUpdated || "—") + ". Covers " + (DATA.plans.length) + " Medi-Cal plans across " + (m.region || "the greater Los Angeles region") + ".";
  }

  /* ---------- init ---------- */
  function init() {
    var sp = store(true, STORE.plan);
    if (sp && DATA.plans.some(function (p) { return p.id === sp; })) state.planId = sp;
    renderPlanPicker(); renderNeeds(); renderResults(); renderState(); renderBarriers(); renderSources();
    initTextSize(); initReadAloud(); initPrint(); initSearch(); initMeta(); initNearMe(); buildLangMenu();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
