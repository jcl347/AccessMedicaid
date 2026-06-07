/* ============================================================
 Access Medi-Cal LA - app logic (vanilla JS, no build step)
 Reads window.AM_DATA (see js/data.js).
 ============================================================ */
(function () {
 "use strict";

 var DATA = window.AM_DATA || { plans: [], stateResources: [], barriers: [], categories: [], serviceAreas: [], meta: {} };
 var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

 /* ---------- inline SVG icon set ---------- */
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
 message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
 check: '<polyline points="20 6 9 17 4 12"/>',
 star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
 calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
 download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
 };
 var CAT_ICON = {
 "Find a doctor": "plusCircle", "Get a ride (transportation)": "car", "Nurse advice line (24/7)": "phone",
 "Mental health & substance use": "heart", "Pharmacy & prescriptions": "pill", "Dental": "smile",
 "Vision": "eye", "Language & interpreter help": "globe", "Member ID card & online account": "creditCard",
 "Renew Medi-Cal / keep coverage": "refresh", "Complaints & appeals (grievances)": "shield",
 "Extra benefits & community supports (CalAIM)": "gift", "Urgent & after-hours care": "clock",
 "Member handbook & forms": "book", "Transportation to non-medical (NMT)": "bag", "Other": "info",
 };
 function svg(name, cls) {
 return '<svg class="' + (cls || "ic") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || P.info) + "</svg>";
 }
 function catIcon(cat, cls) { return svg(CAT_ICON[cat] || "info", cls); }

 /* ---------- state ---------- */
 var STORE = { plan: "amla.plan", size: "amla.textsize", zip: "amla.zip", lang: "amla.lang", voice: "amla.voice" };
 var state = { planId: null, category: null, query: "", care: "urgent care", loc: "", zip: "" };

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

 /* ---------- animations ---------- */
 function flow(container) {
 if (!container || reduceMotion) return;
 Array.prototype.forEach.call(container.children, function (c, i) {
 c.classList.remove("flow"); void c.offsetWidth;
 c.style.animationDelay = Math.min(i * 45, 380) + "ms";
 c.classList.add("flow");
 });
 }
 function rippleHandler(e) {
 if (reduceMotion) return;
 var sel = ".btn, .btn-hero, .plan-card, .need-tile, .chip, .res-card, .care-num, .near-item, .hero-chip";
 var t = e.target && e.target.closest ? e.target.closest(sel) : null;
 if (!t) { var s = e.target && e.target.closest ? e.target.closest(".triage-item > summary") : null; if (s) t = s; }
 if (!t) return;
 try {
 var rect = t.getBoundingClientRect();
 var d = Math.max(rect.width, rect.height);
 var sp = document.createElement("span");
 sp.className = "ripple";
 sp.style.width = sp.style.height = d + "px";
 sp.style.left = (e.clientX - rect.left - d / 2) + "px";
 sp.style.top = (e.clientY - rect.top - d / 2) + "px";
 if (getComputedStyle(t).position === "static") t.style.position = "relative";
 t.appendChild(sp);
 setTimeout(function () { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 650);
 } catch (err) {}
 }
 function initReveal() {
 var els = document.querySelectorAll("[data-reveal]");
 if (reduceMotion || !("IntersectionObserver" in window)) {
 Array.prototype.forEach.call(els, function (e) { e.classList.add("reveal-in"); });
 return;
 }
 var io = new IntersectionObserver(function (ents) {
 ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("reveal-in"); io.unobserve(en.target); } });
 }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
 Array.prototype.forEach.call(els, function (e) { io.observe(e); });
 }

 /* ---------- resources ---------- */
 function planResources(plan) {
 if (!plan) return [];
 var out = [], present = {};
 (plan.resources || []).forEach(function (r) { present[r.category] = true; });
 function add(cat, title, desc, phone, url, langs) {
 if (!phone && !url) return;
 out.push({ category: cat, title: title, description: desc || "", phone: phone || "", url: url || "", languages: langs || "", verified: true, _essential: true });
 }
 // TTY is unique info - always include it.
 if (plan.ttyPhone) add("Member ID card & online account", "TTY line (deaf / hard of hearing)", "For members who are deaf, hard of hearing, or have a speech disability.", plan.ttyPhone, "", "");
 // Other synthesized cards only when the researched data doesn't already cover that category (avoids duplicates).
 if (!present["Member ID card & online account"]) add("Member ID card & online account", "Call " + plan.name + " Member Services", "Your plan's main help line. Ask any question - interpreters are free." + (plan.memberServicesHours ? " Hours: " + plan.memberServicesHours : ""), plan.memberServicesPhone, plan.memberPortalUrl, "Free interpreters in all languages");
 if (!present["Nurse advice line (24/7)"] && plan.nurseAdviceLine) add("Nurse advice line (24/7)", "24/7 Nurse Advice Line", "Talk to a nurse any time, day or night.", plan.nurseAdviceLine, "", "");
 if (!present["Find a doctor"] && plan.findADoctorUrl) add("Find a doctor", "Find a doctor or clinic in your plan", "Search the online directory, or call Member Services and they'll help you find or switch to any doctor.", plan.memberServicesPhone, plan.findADoctorUrl, "");
 if (!present["Member handbook & forms"] && plan.memberHandbookUrl) add("Member handbook & forms", "Your Member Handbook", "The full guide to your benefits, rights, and how to get care.", "", plan.memberHandbookUrl, "");
 (plan.resources || []).forEach(function (r) { out.push(r); });
 return out;
 }
 function matches(r) {
 if (state.category && r.category !== state.category) return false;
 if (state.query) {
 var q = state.query.toLowerCase();
 if ((r.title + " " + r.description + " " + r.category + " " + (r.languages || "")).toLowerCase().indexOf(q) === -1) return false;
 }
 return true;
 }

 /* ---------- plan picker ---------- */
 function countyGroup(title, plans, showArea) {
 var group = el("div", { class: "county-group" });
 group.appendChild(el("div", { class: "county-title", html: svg("mapPin") + "<span>" + title + "</span>" }));
 var grid = el("div", { class: "plan-grid" });
 plans.forEach(function (p) { grid.appendChild(planCard(p, showArea)); });
 group.appendChild(grid);
 return group;
 }
 function renderPlanPicker() {
 var wrap = $("#planPicker"); wrap.innerHTML = "";
 var primary = "Los Angeles County";
 var la = DATA.plans.filter(function (p) { return p.serviceArea === primary; });
 var others = DATA.plans.filter(function (p) { return p.serviceArea !== primary; });
 // LA County keeps its own grid (it fills the row). All surrounding-county plans
 // share ONE grid so single-plan counties sit side by side (no stacked blank rows).
 if (la.length) wrap.appendChild(countyGroup(primary, la, false));
 if (others.length) wrap.appendChild(countyGroup("Greater LA region - surrounding counties", others, true));
 flow(wrap);
 }
 function planCard(p, showArea) {
 var checked = state.planId === p.id;
 var kids = [];
 if (showArea && p.serviceArea) kids.push(el("span", { class: "pc-area", text: p.serviceArea }));
 kids.push(el("span", { class: "pc-name", text: p.name }));
 kids.push(el("span", { class: "pc-rel", text: p.relationship || "" }));
 kids.push(el("span", { class: "pc-check", text: "✓ Selected" }));
 var card = el("button", { class: "plan-card", type: "button", role: "radio", "aria-checked": checked ? "true" : "false", "data-id": p.id, style: "--plan-color:" + (p.brandColor || "#0a5dc2") }, kids);
 card.addEventListener("click", function () {
 state.planId = p.id;
 store(false, STORE.plan, state.planId || "");
 renderPlanPicker(); renderNeeds(); renderResults(); renderBarriers(); renderToolkit(); renderTriage();
 $("#needs-step").scrollIntoView({ block: "start" });
 });
 return card;
 }

 /* ---------- needs ---------- */
 function renderNeeds() {
 var grid = $("#needsGrid"); grid.innerHTML = "";
 var plan = getPlan();
 var pool = (plan ? planResources(plan) : []).concat(DATA.stateResources || []);
 var counts = {}; pool.forEach(function (r) { counts[r.category] = (counts[r.category] || 0) + 1; });
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
 // Say what a number is FOR, so when several appear it's clear which does what.
 function phonePurpose(r) {
 var c = r.category, t = (r.title || "").toLowerCase();
 if (t.indexOf("tty") >= 0) return "TTY";
 switch (c) {
 case "Nurse advice line (24/7)": return "Nurse line";
 case "Urgent & after-hours care": return "Nurse line";
 case "Mental health & substance use": return "Behavioral health";
 case "Get a ride (transportation)": return "Ride line";
 case "Transportation to non-medical (NMT)": return "Ride line";
 case "Pharmacy & prescriptions": return "Medi-Cal Rx";
 case "Dental": return "Medi-Cal Dental";
 case "Vision": return "Vision";
 case "Complaints & appeals (grievances)": return "Grievances";
 case "Renew Medi-Cal / keep coverage": return "Renew / county";
 case "Find a doctor": return "Member Services";
 case "Member ID card & online account": return "Member Services";
 case "Language & interpreter help": return "Member Services";
 default: return "";
 }
 }
 function parseTTY(r) {
 var src = (r.languages || "") + " " + (r.description || "");
 var m = src.match(/\b(?:TTY|TDD)\b[^0-9]{0,6}(711|1?[-\s]?\d{3}[-\s]?\d{3}[-\s]?\d{4})/i);
 return m ? m[1].trim() : "";
 }
 function resCard(r) {
 var actions = el("div", { class: "res-actions" });
 if (r.phone) {
 var purpose = phonePurpose(r);
 var label = purpose ? "Call " + purpose + ": " + r.phone : "Call " + r.phone;
 actions.appendChild(el("a", { class: "btn btn-call", href: telHref(r.phone), html: svg("phone") + "<span>" + label + "</span>" }));
 }
 var tty = parseTTY(r);
 if (tty && tty.replace(/\D/g, "") !== String(r.phone || "").replace(/\D/g, "")) {
 actions.appendChild(el("a", { class: "btn btn-ghost", href: telHref(tty), html: svg("phone") + "<span>TTY (deaf/hard of hearing): " + tty + "</span>" }));
 }
 if (r.url) actions.appendChild(el("a", { class: "btn btn-link", href: r.url, target: "_blank", rel: "noopener", html: "<span>Open website</span>" + svg("external") }));
 if (r.phone || r.url) {
 var fav = isFav(r);
 var star = el("button", { class: "btn btn-ghost fav-btn" + (fav ? " on" : ""), type: "button", "aria-pressed": fav ? "true" : "false", html: svg("star") + "<span>" + (fav ? "Saved" : "Save") + "</span>" });
 star.addEventListener("click", function () { var on = toggleFav(r); star.classList.toggle("on", on); star.setAttribute("aria-pressed", on ? "true" : "false"); star.querySelector("span").textContent = on ? "Saved" : "Save"; renderToolkit(); });
 actions.appendChild(star);
 }
 actions.appendChild(el("span", { class: "verify-badge" + (r.verified ? "" : " unverified"), text: r.verified ? "✓ Checked" : "⚠ Please confirm" }));
 var note = null;
 if (r.category === "Find a doctor" && r.phone) {
 note = el("p", { class: "rc-note", html: svg("info") + "<span>The phone number is your plan's main <strong>Member Services</strong> line - one number that helps you find or switch to <strong>any</strong> doctor in the plan. The website is the full searchable directory.</span>" });
 }
 return el("div", { class: "res-card" }, [
 el("span", { class: "rc-cat", html: catIcon(r.category) + "<span>" + r.category + "</span>" }),
 el("h3", { text: r.title }),
 el("p", { class: "rc-desc", text: r.description }),
 r.languages ? el("p", { class: "rc-lang", html: svg("globe") + "<span>" + r.languages + "</span>" }) : null,
 actions,
 note,
 ]);
 }

 function renderPlanContext(plan) {
 var box = $("#planContext"); if (!box) return; box.innerHTML = "";
 if (!plan) return;
 var bar = el("div", { class: "plan-context", style: "--plan-color:" + (plan.brandColor || "#0a5dc2") });
 bar.appendChild(el("span", { class: "pcx-title", html: "Your plan: " + plan.name + "<small>" + (plan.serviceArea || "") + " · the links below are for your plan</small>" }));
 if (plan.memberServicesPhone) bar.appendChild(el("a", { class: "btn btn-call", href: telHref(plan.memberServicesPhone), html: svg("phone") + "<span>Member Services</span>" }));
 if (plan.findADoctorUrl) bar.appendChild(el("a", { class: "btn btn-ghost", href: plan.findADoctorUrl, target: "_blank", rel: "noopener", html: svg("plusCircle") + "<span>Find a doctor</span>" }));
 if (plan.memberPortalUrl) bar.appendChild(el("a", { class: "btn btn-ghost", href: plan.memberPortalUrl, target: "_blank", rel: "noopener", html: svg("creditCard") + "<span>Member portal</span>" }));
 if (plan.memberHandbookUrl) bar.appendChild(el("a", { class: "btn btn-ghost", href: plan.memberHandbookUrl, target: "_blank", rel: "noopener", html: svg("book") + "<span>Handbook</span>" }));
 var planLink = location.origin + location.pathname + "?plan=" + plan.id;
 var cp = el("button", { class: "btn btn-ghost", type: "button", title: "For navigators & clinics: a link that opens straight to this plan", html: svg("external") + "<span>Copy this plan's link</span>" });
 cp.addEventListener("click", function () {
 if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(planLink).then(function () { var s = cp.querySelector("span"); var o = s.textContent; s.textContent = "Link copied!"; setTimeout(function () { s.textContent = o; }, 2500); }, function () { window.prompt("Copy this plan's link:", planLink); }); }
 else { window.prompt("Copy this plan's link:", planLink); }
 });
 bar.appendChild(cp);
 box.appendChild(bar);
 }

 function renderResults() {
 var list = $("#resultsList"), ctx = $("#resultsContext"), plan = getPlan();
 list.innerHTML = "";
 renderPlanContext(plan);
 var items = (plan ? planResources(plan) : []).filter(matches);
 var catLabel = state.category ? "“" + shortLabel(state.category) + "”" : "all topics";
 ctx.textContent = plan
 ? "Showing " + items.length + " resource" + (items.length === 1 ? "" : "s") + " for " + plan.name + " - " + catLabel + ". Statewide help is below."
 : "Pick your plan above to see resources for your plan. For now, here is help that works with every plan, below.";
 if (!plan) {
 clearLive();
 list.appendChild(el("div", { class: "empty-note", html: "👆 <strong>Choose your health plan above</strong> to see your plan's doctors, nurse line, rides, and more." }));
 return;
 }
 if (!items.length) {
 list.appendChild(el("div", { class: "empty-note", html: "Nothing here for that topic yet. Try <strong>Show all</strong>, search above, or call your plan's Member Services - they can help with anything." }));
 } else {
 items.forEach(function (r) { list.appendChild(resCard(r)); });
 flow(list);
 }
 if (state.category) mineForCategory(plan, state.category); else clearLive();
 }

 /* ---------- dynamic web-mining (/api/live) ---------- */
 function clearLive() { var p = $("#livePanel"); if (p) p.innerHTML = ""; }
 function candidateUrls(plan, category) {
 var urls = [], seen = {};
 function push(u) { if (!u || !/^https?:/.test(u)) return; var key; try { var x = new URL(u); key = x.host + x.pathname; } catch (e) { key = u; } if (seen[key]) return; seen[key] = 1; urls.push(u); }
 (plan.resources || []).filter(function (r) { return r.category === category && r.url && sameBrand(r.url, plan); }).forEach(function (r) { push(r.url); });
 (plan.resources || []).filter(function (r) { return r.category === category && r.url && !sameBrand(r.url, plan); }).forEach(function (r) { push(r.url); });
 return urls.slice(0, 3);
 }
 function sameBrand(url, plan) {
 try { var h = new URL(url).hostname; var ph = new URL(plan.website).hostname.replace(/^www\./, ""); var base = ph.split(".").slice(-2).join("."); return h.indexOf(base) !== -1; } catch (e) { return false; }
 }
 function mineForCategory(plan, category) {
 var panel = $("#livePanel"); if (!panel) return;
 var urls = candidateUrls(plan, category);
 if (!urls.length) { panel.innerHTML = ""; return; }
 var host = ""; try { host = new URL(urls[0]).hostname.replace(/^www\./, ""); } catch (e) {}
 panel.innerHTML = "";
 panel.appendChild(el("div", { class: "live-panel" }, [
 el("div", { class: "live-head", html: '<span class="live-badge"><span class="dot"></span> LIVE</span> <span>Getting the latest for ' + shortLabel(category) + " from " + (host || "the official site") + "...</span>" }),
 el("div", { class: "live-body" }, [el("div", { class: "live-skel w70" }), el("div", { class: "live-skel w40" })]),
 ]));
 var token = (state._mineToken = (state._mineToken || 0) + 1);
 Promise.all(urls.map(function (u) {
 return fetch("/api/live?url=" + encodeURIComponent(u), { headers: { Accept: "application/json" } }).then(function (r) { return r.json(); }).catch(function () { return { ok: false }; });
 })).then(function (results) {
 if (token !== state._mineToken) return;
 var oks = results.filter(function (d) { return d && d.ok; });
 if (!oks.length) { panel.innerHTML = ""; return; }
 var phones = [], pseen = {};
 oks.forEach(function (d) { (d.phones || []).forEach(function (ph) { var k = ph.replace(/\D/g, ""); if (k && !pseen[k]) { pseen[k] = 1; phones.push(ph); } }); });
 var primary = oks[0];
 renderLive(panel, { host: primary.host, title: primary.title, snippet: primary.snippet, phones: phones, url: primary.url, fetchedAt: primary.fetchedAt, sources: oks.length }, category);
 }).catch(function () { if (token === state._mineToken) panel.innerHTML = ""; });
 }
 function phoneLabelFromPlan(plan, ph) {
 if (!plan) return "";
 var d10 = (ph || "").replace(/\D/g, "").slice(-10); if (!d10) return "";
 var found = "";
 planResources(plan).forEach(function (r) { if (found) return; if ((r.phone || "").replace(/\D/g, "").slice(-10) === d10) found = phonePurpose(r) || r.title; });
 return found;
 }
 function renderLive(panel, d, category) {
 var phones = el("div", { class: "live-phones" });
 var lplan = getPlan();
 (d.phones || []).slice(0, 6).forEach(function (ph) {
 var lab = phoneLabelFromPlan(lplan, ph);
 phones.appendChild(el("a", { class: "btn btn-call", href: telHref(ph), html: svg("phone") + "<span>" + (lab ? lab + ": " + ph : ph) + "</span>" }));
 });
 var when = "just now";
 try { var diff = (Date.now() - new Date(d.fetchedAt).getTime()) / 1000; when = diff < 90 ? "just now" : Math.round(diff / 60) + " min ago"; } catch (e) {}
 panel.innerHTML = "";
 panel.appendChild(el("div", { class: "live-panel" }, [
 el("div", { class: "live-head", html: '<span class="live-badge"><span class="dot"></span> LIVE</span> <span>Latest for ' + shortLabel(category) + "</span>" }),
 d.title ? el("div", { class: "live-body", text: d.title }) : null,
 d.snippet ? el("div", { class: "live-body muted", text: d.snippet }) : null,
 (d.phones && d.phones.length) ? el("div", {}, [el("div", { class: "live-sub", text: "Numbers on the official page (we label the ones we recognize; others are listed as found - open the page to confirm what each is for):" }), phones]) : null,
 el("div", { class: "live-meta", html: svg("compass") + "<span>Pulled live from <strong>" + d.host + "</strong>" + (d.sources > 1 ? " plus " + (d.sources - 1) + " more official page" + (d.sources - 1 > 1 ? "s" : "") : "") + " · " + when + "</span>" }, [
 el("a", { class: "btn btn-ghost", href: d.url, target: "_blank", rel: "noopener", html: "<span>View page</span>" + svg("external") }),
 ]),
 ]));
 }

 /* ---------- statewide + sources ---------- */
 function renderState() {
 var list = $("#stateList"); list.innerHTML = "";
 (DATA.stateResources || []).filter(matches).forEach(function (r) { list.appendChild(resCard(r)); });
 if (!list.children.length) list.appendChild(el("div", { class: "empty-note", text: "No statewide resources match your search. Clear the search box to see all." }));
 else flow(list);
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

 /* ---------- engagement: toolkit (Care Card, favorites, checklist, renewal) ---------- */
 var STATE_RX = "1-800-977-2273", STATE_DENTAL = "1-800-322-6384";
 function lsGet(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
 function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
 function favKey(r) { return (state.planId || "all") + "|" + r.category + "|" + r.title; }
 function getFavs() { return lsGet("amla.saved", []); }
 function isFav(r) { var k = favKey(r); return getFavs().some(function (x) { return x.key === k; }); }
 function toggleFav(r) {
 var a = getFavs(), k = favKey(r), i = -1;
 a.forEach(function (x, idx) { if (x.key === k) i = idx; });
 if (i >= 0) { a.splice(i, 1); lsSet("amla.saved", a); return false; }
 a.push({ key: k, planName: (getPlan() || {}).name || "", category: r.category, title: r.title, phone: r.phone || "", url: r.url || "" });
 lsSet("amla.saved", a); return true;
 }

 var CHECK = [
 "Find and save my plan's Member Services number",
 "Pick or confirm my main doctor (PCP)",
 "Set up my online member account or app",
 "Know my Medi-Cal renewal month and set a reminder",
 "Save the 24/7 nurse line and the 988 crisis line",
 ];
 function getChecks() { var a = lsGet("amla.checklist", []); return CHECK.map(function (_, i) { return !!a[i]; }); }
 function setCheck(i, v) { var a = getChecks(); a[i] = v; lsSet("amla.checklist", a); }

 function renewIcs(ym) {
 var y = ym.slice(0, 4), m = ym.slice(5, 7), dt = y + m + "01";
 return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AccessMediCalLA//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
 "UID:medical-renew-" + ym + "@accessmedicaid", "DTSTART;VALUE=DATE:" + dt, "RRULE:FREQ=YEARLY",
 "SUMMARY:Renew my Medi-Cal", "DESCRIPTION:Renew your Medi-Cal so you do not lose coverage. Watch your mail and check BenefitsCal.com. Call your county if you need help.",
 "BEGIN:VALARM", "TRIGGER:-P21D", "ACTION:DISPLAY", "DESCRIPTION:Medi-Cal renewal is coming up", "END:VALARM",
 "END:VEVENT", "END:VCALENDAR"].join("\r\n");
 }
 function renewGoogleUrl(ym) {
 var y = ym.slice(0, 4), m = ym.slice(5, 7);
 return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent("Renew my Medi-Cal") +
 "&recur=" + encodeURIComponent("RRULE:FREQ=YEARLY") + "&dates=" + y + m + "01/" + y + m + "02" +
 "&details=" + encodeURIComponent("Renew your Medi-Cal so you do not lose coverage. Check BenefitsCal.com.");
 }
 function monthsUntil(ym) {
 try {
 var now = new Date(), cy = now.getFullYear(), cm = now.getMonth() + 1, tm = parseInt(ym.slice(5, 7), 10);
 var diff = tm - cm; if (diff < 0) diff += 12; return diff;
 } catch (e) { return null; }
 }

 function careNumbers(plan) {
 var rows = [];
 if (plan.memberServicesPhone) rows.push({ label: "Member Services", phone: plan.memberServicesPhone });
 if (plan.nurseAdviceLine) rows.push({ label: "24/7 Nurse advice", phone: plan.nurseAdviceLine });
 if (plan.ttyPhone) rows.push({ label: "TTY (deaf/HoH)", phone: plan.ttyPhone });
 rows.push({ label: "Prescriptions (Medi-Cal Rx)", phone: STATE_RX });
 rows.push({ label: "Dental (Medi-Cal Dental)", phone: STATE_DENTAL });
 rows.push({ label: "Crisis line", phone: "988" });
 rows.push({ label: "Emergencies", phone: "911" });
 return rows;
 }
 function careCardText(plan) {
 var lines = ["My Medi-Cal Care Card - " + plan.name];
 careNumbers(plan).forEach(function (r) { lines.push(r.label + ": " + r.phone); });
 if (plan.memberPortalUrl) lines.push("Online account: " + plan.memberPortalUrl);
 if (plan.findADoctorUrl) lines.push("Find a doctor: " + plan.findADoctorUrl);
 lines.push("(from Access Medi-Cal LA)");
 return lines.join("\n");
 }

 function renderToolkit() {
 var box = $("#toolkitBody"); if (!box) return; box.innerHTML = "";
 var plan = getPlan();

 // ---- Care Card ----
 var card = el("div", { class: "tk-card care-card" });
 if (plan) {
 card.setAttribute("style", "--plan-color:" + (plan.brandColor || "#0a5dc2"));
 card.appendChild(el("div", { class: "tk-head", html: svg("creditCard") + "<span>Your Care Card - " + plan.name + "</span>" }));
 var grid = el("div", { class: "care-nums" });
 careNumbers(plan).forEach(function (r) {
 grid.appendChild(el("a", { class: "care-num", href: telHref(r.phone) }, [
 el("span", { class: "cn-label", text: r.label }),
 el("span", { class: "cn-phone", html: svg("phone") + "<span>" + r.phone + "</span>" }),
 ]));
 });
 card.appendChild(grid);
 var acts = el("div", { class: "tk-actions" });
 acts.appendChild(el("a", { class: "btn btn-call", href: "sms:?&body=" + encodeURIComponent(careCardText(plan)), html: svg("message") + "<span>Text these to my phone</span>" }));
 var pr = el("button", { class: "btn btn-ghost", type: "button", html: svg("download") + "<span>Print / Save as PDF</span>" });
 pr.addEventListener("click", function () { window.print(); });
 acts.appendChild(pr);
 card.appendChild(acts);
 } else {
 card.appendChild(el("div", { class: "tk-head", html: svg("creditCard") + "<span>Your Care Card</span>" }));
 card.appendChild(el("p", { class: "muted", html: "Pick your health plan in <a href='#plan-step'>Step 1</a> and your plan's key phone numbers will appear here, ready to text to your phone or print." }));
 }
 box.appendChild(card);

 // ---- Renewal reminder ----
 var rcard = el("div", { class: "tk-card" });
 rcard.appendChild(el("div", { class: "tk-head", html: svg("calendar") + "<span>Never lose coverage: renewal reminder</span>" }));
 var saved = store(true, "amla.renew") || "";
 var row = el("div", { class: "renew-row" });
 var lbl = el("label", { class: "renew-label", for: "renewMonth", text: "My Medi-Cal renews in:" });
 var input = el("input", { type: "month", id: "renewMonth", class: "zip-input" });
 if (saved) input.value = saved;
 row.appendChild(lbl); row.appendChild(input);
 rcard.appendChild(row);
 var out = el("div", { class: "renew-out" });
 rcard.appendChild(out);
 function paintRenew() {
 out.innerHTML = "";
 var ym = input.value;
 if (!ym) { out.appendChild(el("p", { class: "muted", text: "Set your renewal month to get a reminder and a countdown. Renewing on time is the #1 way people keep their Medi-Cal." })); return; }
 store(false, "amla.renew", ym);
 var mu = monthsUntil(ym);
 out.appendChild(el("p", { class: "renew-count", text: mu === 0 ? "Your renewal month is this month - act now." : ("About " + mu + " month" + (mu === 1 ? "" : "s") + " until your renewal month.") }));
 var a = el("div", { class: "tk-actions" });
 var blob = new Blob([renewIcs(ym)], { type: "text/calendar" });
 var u = URL.createObjectURL(blob);
 a.appendChild(el("a", { class: "btn btn-call", href: u, download: "medi-cal-renewal.ics", html: svg("download") + "<span>Add to my calendar</span>" }));
 a.appendChild(el("a", { class: "btn btn-ghost", href: renewGoogleUrl(ym), target: "_blank", rel: "noopener", html: svg("calendar") + "<span>Add to Google Calendar</span>" }));
 out.appendChild(a);
 }
 input.addEventListener("change", paintRenew);
 paintRenew();
 box.appendChild(rcard);
 renderReminders(box);

 // ---- Get-started checklist ----
 var ck = el("div", { class: "tk-card" });
 var checks = getChecks(); var done = checks.filter(Boolean).length;
 ck.appendChild(el("div", { class: "tk-head", html: svg("check") + "<span>Get started: " + done + " of " + CHECK.length + " done</span>" }));
 var bar = el("div", { class: "progress" }, [el("span", { style: "width:" + Math.round(done / CHECK.length * 100) + "%" })]);
 ck.appendChild(bar);
 var ul = el("ul", { class: "checklist" });
 CHECK.forEach(function (label, i) {
 var id = "chk" + i;
 var liInput = el("input", { type: "checkbox", id: id });
 if (checks[i]) liInput.setAttribute("checked", "checked");
 liInput.addEventListener("change", function () { setCheck(i, liInput.checked); renderToolkit(); });
 ul.appendChild(el("li", {}, [liInput, el("label", { for: id, text: label })]));
 });
 ck.appendChild(ul);
 box.appendChild(ck);

 // ---- Saved resources ----
 var favs = getFavs();
 var sc = el("div", { class: "tk-card" });
 sc.appendChild(el("div", { class: "tk-head", html: svg("star") + "<span>Saved resources (" + favs.length + ")</span>" }));
 if (!favs.length) {
 sc.appendChild(el("p", { class: "muted", text: "Tap Save on any resource and it will appear here for quick access next time you visit." }));
 } else {
 var sl = el("div", { class: "saved-list" });
 favs.forEach(function (f) {
 var a = el("div", { class: "saved-item" });
 a.appendChild(el("div", { class: "si-title", text: f.title + (f.planName ? " - " + f.planName : "") }));
 var act = el("div", { class: "near-actions" });
 if (f.phone) act.appendChild(el("a", { class: "btn btn-call", href: telHref(f.phone), html: svg("phone") + "<span>Call: " + f.phone + "</span>" }));
 if (f.url) act.appendChild(el("a", { class: "btn btn-ghost", href: f.url, target: "_blank", rel: "noopener", html: "<span>Open</span>" + svg("external") }));
 var rm = el("button", { class: "btn btn-ghost", type: "button", html: "<span>Remove</span>" });
 rm.addEventListener("click", function () { var arr = getFavs().filter(function (x) { return x.key !== f.key; }); lsSet("amla.saved", arr); renderToolkit(); renderResults(); renderState(); });
 act.appendChild(rm); a.appendChild(act); sl.appendChild(a);
 });
 sc.appendChild(sl);
 }
 box.appendChild(sc);
 flow(box);
 }

 /* ---------- reminders / notifications ---------- */
 function checkupIcs(ym) {
 var y = ym.slice(0, 4), m = ym.slice(5, 7), dt = y + m + "01";
 return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AccessMediCalLA//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
 "UID:medical-checkup-" + ym + "@accessmedicaid", "DTSTART;VALUE=DATE:" + dt, "RRULE:FREQ=YEARLY",
 "SUMMARY:Yearly Medi-Cal check-up (free)", "DESCRIPTION:Your yearly wellness check-up is free with Medi-Cal. Call your doctor or Member Services to schedule.",
 "BEGIN:VALARM", "TRIGGER:-P14D", "ACTION:DISPLAY", "DESCRIPTION:Time to schedule your yearly check-up", "END:VALARM",
 "END:VEVENT", "END:VCALENDAR"].join("\r\n");
 }
 function renderReminders(box) {
 var nb = el("div", { class: "tk-card" });
 nb.appendChild(el("div", { class: "tk-head", html: svg("calendar") + "<span>Reminders (optional, private)</span>" }));
 if ("Notification" in window) {
 var permP = el("p", { class: "muted" });
 var nbtn = el("button", { class: "btn btn-ghost", type: "button", html: svg("phone") + "<span>Turn on reminders</span>" });
 function refreshPerm() {
 var p = Notification.permission;
 permP.textContent = p === "granted" ? "Reminders are on. We'll nudge you when your renewal or check-up is near (next time you open this app)." : p === "denied" ? "Reminders are blocked in your browser settings. The calendar buttons below still work." : "Get a gentle nudge when your renewal or yearly check-up is coming up.";
 nbtn.style.display = p === "granted" ? "none" : "";
 }
 nbtn.addEventListener("click", function () { try { Notification.requestPermission().then(function (p) { refreshPerm(); if (p === "granted") { try { new Notification("Reminders are on", { body: "We'll remind you about renewal and check-ups.", icon: "icon.svg" }); } catch (e) {} } }); } catch (e) {} });
 refreshPerm(); nb.appendChild(permP); nb.appendChild(nbtn);
 }
 var crow = el("div", { class: "renew-row" });
 crow.appendChild(el("label", { class: "renew-label", for: "checkupMonth", text: "Yearly check-up month:" }));
 var cin = el("input", { type: "month", id: "checkupMonth", class: "zip-input" });
 var csaved = store(true, "amla.checkup") || ""; if (csaved) cin.value = csaved;
 crow.appendChild(cin); nb.appendChild(crow);
 var cout = el("div", { class: "renew-out" }); nb.appendChild(cout);
 function paintCheck() {
 cout.innerHTML = ""; var ym = cin.value;
 if (!ym) { cout.appendChild(el("p", { class: "muted", text: "Set a month and we'll remind you about your free yearly check-up." })); return; }
 store(false, "amla.checkup", ym);
 var a = el("div", { class: "tk-actions" });
 var blob = new Blob([checkupIcs(ym)], { type: "text/calendar" });
 a.appendChild(el("a", { class: "btn btn-call", href: URL.createObjectURL(blob), download: "medi-cal-checkup.ics", html: svg("download") + "<span>Add check-up to calendar</span>" }));
 cout.appendChild(a);
 }
 cin.addEventListener("change", paintCheck); paintCheck();
 box.appendChild(nb);
 }
 function maybeNotify() {
 if (!("Notification" in window) || Notification.permission !== "granted") return;
 var last = parseInt(store(true, "amla.notifiedAt") || "0", 10) || 0;
 if (Date.now() - last < 20 * 864e5) return;
 var msgs = [];
 var rm = store(true, "amla.renew"); if (rm) { var mu = monthsUntil(rm); if (mu !== null && mu <= 1) msgs.push("Your Medi-Cal renewal is coming up - don't lose coverage."); }
 var cm = store(true, "amla.checkup"); if (cm) { var cu = monthsUntil(cm); if (cu !== null && cu <= 1) msgs.push("Time for your free yearly check-up."); }
 if (msgs.length) { try { new Notification("Access Medi-Cal LA", { body: msgs.join(" "), icon: "icon.svg" }); store(false, "amla.notifiedAt", String(Date.now())); } catch (e) {} }
 }

 /* ---------- "Where should I go?" triage ---------- */
 var TRIAGE = [
 { t: "Life-threatening emergency", ex: "Chest pain, trouble breathing, stroke signs (face droop, arm weakness, slurred speech), severe bleeding, a seizure, or thoughts of harming yourself.", go: "Call 911 now. For a mental-health crisis, call or text 988. Do not wait.", level: "emergency", phones: [{ label: "911", num: "911" }, { label: "988", num: "988" }] },
 { t: "Serious, but maybe not 911", ex: "A deep cut that may need stitches, a possible broken bone, a high fever that won't come down, or dehydration.", go: "Go to an emergency room, or call your free 24/7 nurse line first if you are unsure.", level: "er", nurse: true },
 { t: "Urgent, not an emergency", ex: "Cold or flu, ear infection, sore throat, urinary tract infection, a sprain, or a minor cut.", go: "Use urgent care or a same-day visit with your doctor. A nurse can help you decide.", level: "urgent", nurse: true, near: "urgent_care" },
 { t: "I have a question, I'm not sure", ex: "Not sure if a symptom is serious, a medication question, or what to do tonight.", go: "Call your plan's free 24/7 nurse line. They help you decide where to go.", level: "nurse", nurse: true },
 { t: "Mental health or substance use", ex: "Feeling very depressed or anxious, in crisis, or needing help with drugs or alcohol.", go: "Call or text 988 any time. For ongoing care, call your plan's Member Services for behavioral health.", level: "mh", phones: [{ label: "988", num: "988" }], member: true },
 { t: "Routine or ongoing care", ex: "A yearly check-up, a prescription refill, managing a condition, or a follow-up.", go: "See your primary doctor (PCP). Many visits can be done by phone or video (telehealth). Call Member Services to set it up.", level: "routine", member: true },
 ];
 function renderTriage() {
 var box = $("#triageBody"); if (!box) return; box.innerHTML = "";
 var plan = getPlan();
 var nurse = plan && plan.nurseAdviceLine ? plan.nurseAdviceLine : "";
 var ms = plan && plan.memberServicesPhone ? plan.memberServicesPhone : "";
 TRIAGE.forEach(function (s) {
 var acts = el("div", { class: "res-actions" });
 (s.phones || []).forEach(function (p) { acts.appendChild(el("a", { class: "btn btn-call", href: telHref(p.num), html: svg("phone") + "<span>Call " + p.label + "</span>" })); });
 if (s.nurse) { if (nurse) acts.appendChild(el("a", { class: "btn btn-call", href: telHref(nurse), html: svg("phone") + "<span>24/7 nurse line: " + nurse + "</span>" })); else acts.appendChild(el("a", { class: "btn btn-ghost", href: "#plan-step", html: svg("phone") + "<span>Pick your plan to see your nurse line</span>" })); }
 if (s.member && ms) acts.appendChild(el("a", { class: "btn btn-ghost", href: telHref(ms), html: svg("phone") + "<span>Member Services: " + ms + "</span>" }));
 if (s.near) acts.appendChild(el("a", { class: "btn btn-ghost", href: "#near-me", html: svg("mapPin") + "<span>Find urgent care near me</span>" }));
 box.appendChild(el("details", { class: "triage-item lvl-" + s.level }, [
 el("summary", {}, [el("span", { class: "tg-name", text: s.t })]),
 el("div", { class: "triage-body" }, [el("p", { class: "tg-ex", text: "For example: " + s.ex }), el("p", { class: "tg-go", text: s.go }), acts]),
 ]));
 });
 }

 /* ---------- pre-translated "Start here" card ---------- */
 var STARTLANGS = [{ c: "en", n: "English" }, { c: "es", n: "Español" }, { c: "zh", n: "中文" }, { c: "vi", n: "Tiếng Việt" }, { c: "ko", n: "한국어" }, { c: "tl", n: "Tagalog" }, { c: "hy", n: "Հայերեն" }, { c: "ar", n: "العربية" }];
 var STARTCOPY = {
 en: { title: "Start here", body: "You have the right to free health care with Medi-Cal, and a free interpreter in your language. In an emergency, call 911. For a mental-health crisis, call or text 988. Renew your Medi-Cal every year so you do not lose it. Pick your plan below to see your phone numbers." },
 es: { title: "Empiece aquí", body: "Usted tiene derecho a atención médica gratuita con Medi-Cal y a un intérprete gratuito en su idioma. En una emergencia, llame al 911. Para una crisis de salud mental, llame o envíe un mensaje de texto al 988. Renueve su Medi-Cal cada año para no perderlo. Elija su plan abajo para ver sus números de teléfono." },
 zh: { title: "从这里开始", body: "您有权通过 Medi-Cal 获得免费医疗服务，并可获得您母语的免费口译服务。遇到紧急情况，请拨打 911。如遇心理健康危机，请拨打或发短信至 988。请每年续保 Medi-Cal，以免失去保障。请在下方选择您的计划以查看电话号码。" },
 vi: { title: "Bắt đầu ở đây", body: "Bạn có quyền được chăm sóc sức khỏe miễn phí với Medi-Cal và có thông dịch viên miễn phí bằng ngôn ngữ của bạn. Khi khẩn cấp, hãy gọi 911. Khi có khủng hoảng sức khỏe tâm thần, hãy gọi hoặc nhắn tin 988. Hãy gia hạn Medi-Cal mỗi năm để không bị mất. Chọn chương trình của bạn bên dưới để xem số điện thoại." },
 ko: { title: "여기서 시작하세요", body: "Medi-Cal로 무료 의료 서비스와 모국어 무료 통역을 받을 권리가 있습니다. 응급 상황에는 911에 전화하세요. 정신 건강 위기에는 988로 전화하거나 문자를 보내세요. 자격을 잃지 않도록 매년 Medi-Cal을 갱신하세요. 아래에서 플랜을 선택하면 전화번호를 볼 수 있습니다." },
 tl: { title: "Magsimula dito", body: "May karapatan ka sa libreng pangangalagang pangkalusugan sa Medi-Cal, at sa libreng interpreter sa iyong wika. Sa emerhensiya, tumawag sa 911. Para sa krisis sa kalusugang pangkaisipan, tumawag o mag-text sa 988. I-renew ang iyong Medi-Cal taun-taon upang hindi ito mawala. Piliin ang iyong plano sa ibaba upang makita ang mga numero ng telepono." },
 hy: { title: "Սկսեք այստեղից", body: "Դուք իրավունք ունեք Medi-Cal-ի միջոցով ստանալու անվճար բժշկական օգնություն և անվճար թարգմանիչ՝ ձեր լեզվով։ Արտակարգ իրավիճակում զանգահարեք 911։ Հոգեկան առողջության ճգնաժամի դեպքում զանգահարեք կամ գրեք 988։ Ամեն տարի թարմացրեք ձեր Medi-Cal-ը, որպեսզի այն չկորցնեք։ Ընտրեք ձեր ծրագիրը ստորև՝ հեռախոսահամարները տեսնելու համար։" },
 ar: { title: "ابدأ من هنا", body: "لديك الحق في رعاية صحية مجانية من خلال Medi-Cal، وفي مترجم فوري مجاني بلغتك. في حالة الطوارئ اتصل بالرقم 911. في أزمة الصحة النفسية اتصل أو أرسل رسالة نصية إلى 988. جدّد Medi-Cal كل عام حتى لا تفقده. اختر خطتك في الأسفل لرؤية أرقام هاتفك." },
 };
 function renderStartHere(lang) {
 var chips = $("#startChips"), body = $("#startHereBody"); if (!body) return;
 lang = lang || store(true, "amla.startlang") || "en";
 store(false, "amla.startlang", lang);
 if (chips && !chips.children.length) {
 STARTLANGS.forEach(function (l) {
 var b = el("button", { class: "chip chip-sm", type: "button", "data-l": l.c, text: l.n });
 b.addEventListener("click", function () { renderStartHere(l.c); });
 chips.appendChild(b);
 });
 }
 if (chips) Array.prototype.forEach.call(chips.children, function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-l") === lang ? "true" : "false"); });
 var c = STARTCOPY[lang] || STARTCOPY.en;
 body.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
 body.innerHTML = "<h3>" + c.title + "</h3><p>" + c.body + "</p>";
 }

 /* ---------- feedback loop ---------- */
 function fbMailto(payload) {
 var email = (DATA.meta && DATA.meta.contactEmail) || "";
 if (!email) return false;
 location.href = "mailto:" + email + "?subject=" + encodeURIComponent("Access Medi-Cal LA feedback") + "&body=" + encodeURIComponent(JSON.stringify(payload, null, 2));
 return true;
 }
 function sendFeedback(payload) {
 payload.page = location.href; payload.at = new Date().toISOString();
 try { fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(function () { fbMailto(payload); }); }
 catch (e) { fbMailto(payload); }
 }
 function initFeedback() {
 var box = $("#feedbackBox"); if (!box) return; box.innerHTML = "";
 var report = el("button", { class: "btn btn-ghost", type: "button", html: svg("info") + "<span>Report a wrong number or broken link</span>" });
 report.addEventListener("click", function () {
 var what = window.prompt("Thank you for helping keep this accurate. What is wrong, and where? (Include the plan and number if you can.)");
 if (what && what.trim()) { sendFeedback({ type: "report", value: what.trim(), plan: state.planId || "" }); window.alert("Thank you - your report was sent."); }
 });
 if (store(true, "amla.helpful")) { box.appendChild(el("span", { class: "muted", text: "Thanks for your feedback!" })); box.appendChild(report); return; }
 var q = el("div", { class: "fb-row" }, [el("span", { text: "Was this page helpful?" })]);
 [["Yes", "yes"], ["Not really", "no"]].forEach(function (v) {
 var b = el("button", { class: "btn btn-ghost", type: "button", text: v[0] });
 b.addEventListener("click", function () { sendFeedback({ type: "helpful", value: v[1] }); store(false, "amla.helpful", v[1]); q.innerHTML = "<span class='muted'>Thanks for your feedback!</span>"; });
 q.appendChild(b);
 });
 box.appendChild(q); box.appendChild(report);
 }
 function initApptPrint() { var b = $("#apptPrintBtn"); if (b) b.addEventListener("click", function () { window.print(); }); }

 /* ---------- barriers (scannable; plan-aware) ---------- */
 function firstSentence(t) { var m = (t || "").match(/^(.*?[.!?])(\s|$)/); return m ? m[1] : (t || ""); }
 function dynamizeSolution(sol, plan) {
 if (!plan) return sol;
 var t = (sol.title || "").toLowerCase();
 var generic = sol.phone === "1-888-839-9909" || t.indexOf("your plan") !== -1 || t.indexOf("your medi-cal plan") !== -1 || (t.indexOf("l.a. care member") !== -1);
 if (!generic) return sol;
 var title = sol.title.replace(/l\.?a\.?\s*care(\s+health\s+plan)?/ig, plan.name).replace(/your medi-cal plan/ig, plan.name).replace(/your plan/ig, plan.name);
 if (title.toLowerCase().indexOf(plan.name.toLowerCase().slice(0, 6)) === -1) title = plan.name + " - " + sol.title;
 return { title: title, description: sol.description, phone: plan.memberServicesPhone || sol.phone, url: plan.website || sol.url };
 }
 function renderBarriers() {
 var wrap = $("#barriersList"); if (!wrap) return; wrap.innerHTML = "";
 var plan = getPlan();
 (DATA.barriers || []).forEach(function (b) {
 var sols = el("div", { class: "b-solutions" });
 (b.solutions || []).forEach(function (s0) {
 var s = dynamizeSolution(s0, plan);
 var a = el("div", { class: "res-actions" });
 if (s.phone) a.appendChild(el("a", { class: "btn btn-call", href: telHref(s.phone), html: svg("phone") + "<span>" + s.phone + "</span>" }));
 if (s.url) a.appendChild(el("a", { class: "btn btn-link", href: s.url, target: "_blank", rel: "noopener", html: "<span>Open</span>" + svg("external") }));
 sols.appendChild(el("div", { class: "b-sol" }, [el("div", { class: "bs-title", text: s.title }), el("div", { class: "bs-desc", text: s.description }), (s.phone || s.url) ? a : null]));
 });
 var body = el("div", { class: "barrier-body" }, [
 b.memberVoice ? el("div", { class: "b-voice", html: svg("message") + "<span>“" + b.memberVoice + "”</span>" }) : null,
 el("div", { class: "b-howto", html: svg("check") + "<span>How we help - who to call</span>" }),
 sols,
 el("details", { class: "b-why" }, [
 el("summary", { text: "Why this happens" }),
 el("p", { class: "b-why-text", text: b.description }),
 b.affectedGroups ? el("p", { class: "b-affected", text: "Who this affects most: " + b.affectedGroups }) : null,
 ]),
 ]);
 wrap.appendChild(el("details", { class: "barrier" }, [
 el("summary", {}, [
 el("span", { html: svg("shield", "b-ic") }),
 el("span", {}, [
 el("span", { class: "b-name", text: b.name }),
 el("span", { class: "b-tag", text: firstSentence(b.description).slice(0, 90) + (firstSentence(b.description).length > 90 ? "…" : "") }),
 ]),
 ]),
 body,
 ]));
 });
 flow(wrap);
 }

 /* ---------- maps: find care near me (geospatial) ---------- */
 var CARE_TYPES = [
 { key: "urgent_care", label: "Urgent care", icon: "clock" },
 { key: "hospital", label: "Emergency room", icon: "hospital" },
 { key: "clinic", label: "Community clinic", icon: "users" },
 { key: "pharmacy", label: "Pharmacy", icon: "pill" },
 { key: "dentist", label: "Dentist", icon: "smile" },
 { key: "mental_health", label: "Mental health", icon: "heart" },
 { key: "doctor", label: "Doctors", icon: "plusCircle" },
 ];
 var RADII = [{ m: 1609, label: "1 mi" }, { m: 4828, label: "3 mi" }, { m: 8047, label: "5 mi" }, { m: 16093, label: "10 mi" }, { m: 24140, label: "15 mi" }];
 var geo = { center: { lat: 34.0522, lng: -118.2437 }, label: "Los Angeles, CA", care: "urgent_care", radius: 8047, map: null, layer: null, t: 0, shared: false, iso: { mode: null, minutes: 20, fc: null, layer: null, radius: null } };
 var ISO_MODES = [{ k: "walk", label: "On foot" }, { k: "bike", label: "By bike" }, { k: "drive", label: "Driving" }];
 var ISO_MINS = [10, 20, 30];
 function isoModeLabel() { var m = ISO_MODES.filter(function (x) { return x.k === geo.iso.mode; })[0]; return m ? m.label.toLowerCase() : ""; }

 function haversineMi(a, b) {
 var R = 3958.8, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
 var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
 return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
 }
 function escapeHtml(s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
 function shortAddr(s) { return s.split(",").slice(0, 3).join(",").trim(); }
 function careLabel() { var c = CARE_TYPES.filter(function (x) { return x.key === geo.care; })[0]; return c ? c.label : geo.care; }
 function miFor(m) { return (m / 1609).toFixed(0); }
 function gmapsSearch() { return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(careLabel() + " near " + geo.label); }
 function dirUrl(lat, lng, mode) { return "https://www.google.com/maps/dir/?api=1&destination=" + lat + "," + lng + "&travelmode=" + (mode || "driving"); }
 function setMapLabel(t) { var l = $("#mapLabel"); if (l) l.textContent = t; }

 function renderCareChips() {
 var row = $("#careChips"); if (!row) return; row.innerHTML = "";
 CARE_TYPES.forEach(function (c) {
 var chip = el("button", { class: "chip", type: "button", "aria-pressed": geo.care === c.key ? "true" : "false", html: svg(c.icon) + "<span>" + c.label + "</span>" });
 chip.addEventListener("click", function () { geo.care = c.key; renderCareChips(); runSearch(); });
 row.appendChild(chip);
 });
 }
 function renderRadiusChips() {
 var row = $("#radiusChips"); if (!row) return; row.innerHTML = "";
 RADII.forEach(function (r) {
 var chip = el("button", { class: "chip chip-sm", type: "button", "aria-pressed": geo.radius === r.m ? "true" : "false", text: r.label });
 chip.addEventListener("click", function () { geo.radius = r.m; renderRadiusChips(); runSearch(); });
 row.appendChild(chip);
 });
 }

 /* ---------- travel-time isochrones (reachable area) ---------- */
 function renderIsoChips() {
 var mrow = $("#isoModeChips");
 if (mrow) {
 mrow.innerHTML = "";
 ISO_MODES.forEach(function (m) {
 var chip = el("button", { class: "chip chip-sm", type: "button", "aria-pressed": geo.iso.mode === m.k ? "true" : "false", text: m.label });
 chip.addEventListener("click", function () { geo.iso.mode = (geo.iso.mode === m.k) ? null : m.k; applyIso(); });
 mrow.appendChild(chip);
 });
 }
 var trow = $("#isoMinChips");
 if (trow) {
 trow.innerHTML = "";
 ISO_MINS.forEach(function (n) {
 var chip = el("button", { class: "chip chip-sm", type: "button", "aria-pressed": geo.iso.minutes === n ? "true" : "false", text: n + " min" });
 chip.addEventListener("click", function () { geo.iso.minutes = n; renderIsoChips(); if (geo.iso.mode) applyIso(); });
 trow.appendChild(chip);
 });
 }
 }
 function fcBounds(fc) {
 var b = { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 };
 function scan(coords) {
 for (var i = 0; i < coords.length; i++) {
 var c = coords[i];
 if (typeof c[0] === "number") { if (c[1] < b.minLat) b.minLat = c[1]; if (c[1] > b.maxLat) b.maxLat = c[1]; if (c[0] < b.minLng) b.minLng = c[0]; if (c[0] > b.maxLng) b.maxLng = c[0]; }
 else scan(c);
 }
 }
 (fc.features || []).forEach(function (f) { if (f.geometry) scan(f.geometry.coordinates); });
 return b;
 }
 function pointInRing(x, y, ring) {
 var inside = false;
 for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
 var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
 if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
 }
 return inside;
 }
 function pointInPoly(x, y, poly) {
 if (!poly || !poly.length || !pointInRing(x, y, poly[0])) return false;
 for (var k = 1; k < poly.length; k++) { if (pointInRing(x, y, poly[k])) return false; }
 return true;
 }
 function pointInFC(lng, lat, fc) {
 if (!fc || !fc.features) return false;
 for (var f = 0; f < fc.features.length; f++) {
 var g = fc.features[f].geometry; if (!g) continue;
 if (g.type === "Polygon") { if (pointInPoly(lng, lat, g.coordinates)) return true; }
 else if (g.type === "MultiPolygon") { for (var m = 0; m < g.coordinates.length; m++) { if (pointInPoly(lng, lat, g.coordinates[m])) return true; } }
 }
 return false;
 }
 function applyIso() {
 renderIsoChips();
 var clr = $("#isoClearBtn"), lg = $("#lgIso");
 if (!geo.iso.mode) {
 if (geo.iso.layer && geo.map) geo.map.removeLayer(geo.iso.layer);
 geo.iso.layer = null; geo.iso.fc = null; geo.iso.radius = null;
 if (clr) clr.hidden = true; if (lg) lg.hidden = true;
 runSearch(); return;
 }
 if (!window.L) { setMapLabel("Reachable-area maps need the live site. Showing places by distance instead."); geo.iso.mode = null; renderIsoChips(); runSearch(); return; }
 ensureMap();
 setMapLabel("Mapping where you can get in " + geo.iso.minutes + " min (" + isoModeLabel() + ")...");
 var token = (geo.t = geo.t + 1);
 fetch("/api/isochrone?lat=" + geo.center.lat + "&lng=" + geo.center.lng + "&mode=" + geo.iso.mode + "&minutes=" + geo.iso.minutes, { headers: { Accept: "application/json" } })
 .then(function (r) { return r.json(); })
 .then(function (d) {
 if (token !== geo.t) return;
 if (!d || !d.ok || !d.geojson) { setMapLabel("We couldn't map a reachable area right now, showing places within " + miFor(geo.radius) + " mi instead."); geo.iso.mode = null; renderIsoChips(); if (clr) clr.hidden = true; if (lg) lg.hidden = true; runSearch(); return; }
 geo.iso.fc = d.geojson;
 if (geo.iso.layer && geo.map) geo.map.removeLayer(geo.iso.layer);
 geo.iso.layer = L.geoJSON(d.geojson, { style: { color: "#15803d", weight: 2, fillColor: "#22c55e", fillOpacity: .16 } }).addTo(geo.map);
 var b = fcBounds(d.geojson);
 var far = Math.max(haversineMi(geo.center, { lat: b.maxLat, lng: b.maxLng }), haversineMi(geo.center, { lat: b.minLat, lng: b.minLng }));
 geo.iso.radius = Math.min(Math.max(Math.ceil(far * 1609) + 250, 1609), 24140);
 try { geo.map.fitBounds(geo.iso.layer.getBounds(), { padding: [20, 20] }); } catch (e) {}
 if (clr) clr.hidden = false;
 if (lg) { lg.hidden = false; var t = $("#lgIsoText"); if (t) t.textContent = "Reachable in " + geo.iso.minutes + " min (" + isoModeLabel() + ")"; }
 runSearch();
 })
 .catch(function () { if (token === geo.t) { setMapLabel("We couldn't map a reachable area right now."); geo.iso.mode = null; renderIsoChips(); if (clr) clr.hidden = true; if (lg) lg.hidden = true; runSearch(); } });
 }

 /* ---------- save / share a location link ---------- */
 function buildShareUrl() {
 var p = [];
 function add(k, v) { if (v !== undefined && v !== null && v !== "") p.push(encodeURIComponent(k) + "=" + encodeURIComponent(v)); }
 if (geo.center) { add("lat", geo.center.lat.toFixed(5)); add("lng", geo.center.lng.toFixed(5)); }
 add("addr", geo.label); add("care", geo.care); add("radius", geo.radius);
 if (geo.iso.mode) { add("mode", geo.iso.mode); add("min", geo.iso.minutes); }
 if (state.planId) add("plan", state.planId);
 if (state.category) add("cat", state.category);
 return location.origin + location.pathname + "#" + p.join("&");
 }
 function parseShareState() {
 // Accept both ?query (clean per-plan links to hand out) and #hash (full saved views).
 var raw = ((location.search || "").replace(/^\?/, "") + "&" + (location.hash || "").replace(/^#/, "")).replace(/^&|&$/g, "");
 if (!raw) return false;
 var p = {}; raw.split("&").forEach(function (kv) { if (!kv) return; var i = kv.indexOf("="); if (i > 0) { try { p[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1)); } catch (e) {} } });
 var any = false;
 if (p.plan && DATA.plans.some(function (x) { return x.id === p.plan; })) { state.planId = p.plan; any = true; }
 if (p.cat) { state.category = p.cat; any = true; }
 if (p.care) { geo.care = p.care; any = true; }
 if (p.radius) { var rr = parseInt(p.radius, 10); if (rr) geo.radius = Math.min(Math.max(rr, 500), 24140); any = true; }
 if (p.lat && p.lng) { var la = parseFloat(p.lat), lo = parseFloat(p.lng); if (isFinite(la) && isFinite(lo)) { geo.center = { lat: la, lng: lo }; geo.label = p.addr || "shared location"; geo.shared = true; any = true; } }
 if (p.mode) { geo.iso.mode = p.mode; geo.iso.minutes = parseInt(p.min, 10) || 20; any = true; }
 return any;
 }
 function initShare() {
 var copy = $("#copyLinkBtn"), share = $("#shareBtn"), status = $("#shareStatus");
 if (copy) copy.addEventListener("click", function () {
 var u = buildShareUrl();
 if (history.replaceState) try { history.replaceState(null, "", u); } catch (e) {}
 if (navigator.clipboard && navigator.clipboard.writeText) {
 navigator.clipboard.writeText(u).then(function () { if (status) { status.textContent = "Link copied. Paste it anywhere to come back to this search."; setTimeout(function () { if (status) status.textContent = ""; }, 3500); } }, function () { window.prompt("Copy this link:", u); });
 } else { window.prompt("Copy this link:", u); }
 });
 if (share && navigator.share) {
 share.hidden = false;
 share.addEventListener("click", function () { navigator.share({ title: document.title, text: "Medi-Cal resources near " + geo.label, url: buildShareUrl() }).catch(function () {}); });
 }
 }

 function ensureMap() {
 if (geo.map || !window.L) return geo.map;
 var node = $("#map"); if (!node) return null;
 geo.map = L.map(node, { scrollWheelZoom: false }).setView([geo.center.lat, geo.center.lng], 12);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(geo.map);
 geo.layer = L.layerGroup().addTo(geo.map);
 setTimeout(function () { if (geo.map) geo.map.invalidateSize(); }, 250);
 return geo.map;
 }
 function mapFallback() {
 var node = $("#map"); if (!node) return;
 node.innerHTML = "";
 node.appendChild(el("iframe", { class: "map-frame", title: "Map of nearby care", loading: "lazy", src: "https://www.google.com/maps?q=" + encodeURIComponent(careLabel() + " near " + geo.label) + "&output=embed" }));
 }

 function runSearch() {
 var open = $("#mapOpen"); if (open) open.href = gmapsSearch();
 if (!window.L) { mapFallback(); setMapLabel("Showing " + careLabel().toLowerCase() + " near " + geo.label + "."); return; }
 var map = ensureMap(); if (!map) return;
 var isoOn = !!geo.iso.fc;
 var effRadius = isoOn && geo.iso.radius ? geo.iso.radius : geo.radius;
 if (!isoOn) map.setView([geo.center.lat, geo.center.lng], geo.radius > 16000 ? 10 : geo.radius > 8000 ? 11 : 12);
 setTimeout(function () { if (geo.map) geo.map.invalidateSize(); }, 60);
 if (geo.layer) geo.layer.clearLayers();
 L.circleMarker([geo.center.lat, geo.center.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#c0395f", fillOpacity: 1 }).addTo(geo.layer).bindPopup("You searched here:<br>" + escapeHtml(geo.label));
 if (!isoOn) L.circle([geo.center.lat, geo.center.lng], { radius: geo.radius, color: "#0a5dc2", weight: 1, fillColor: "#0a5dc2", fillOpacity: .06 }).addTo(geo.layer);
 var scope = isoOn ? ("a " + geo.iso.minutes + " min " + isoModeLabel() + " of " + geo.label) : (miFor(effRadius) + " mi of " + geo.label);
 setMapLabel("Finding " + careLabel().toLowerCase() + " within " + scope + "...");
 var list = $("#nearList"); if (list) list.innerHTML = '<div class="empty-note">Searching the map for the closest places...</div>';
 var token = (geo.t = geo.t + 1);
 var nurl = "/api/nearby?lat=" + geo.center.lat + "&lng=" + geo.center.lng + "&type=" + encodeURIComponent(geo.care) + "&radius=" + effRadius;
 function fail() { if (token !== geo.t) return; setMapLabel("The map search is busy right now. Tap your need again to retry, or use the Google Maps link below."); if (list) list.innerHTML = '<div class="empty-note">Couldn\'t reach the map service. Please retry in a moment, or use "Open this search in Google Maps" below.</div>'; }
 function retryOrFail(n) { if (token !== geo.t) return; if (n < 2) { setTimeout(function () { attempt(n + 1); }, 900); } else { fail(); } }
 function process(rawPlaces) {
 if (token !== geo.t) return;
 var places = (rawPlaces || []).map(function (p) { p.dist = haversineMi(geo.center, { lat: p.lat, lng: p.lng }); return p; });
 if (isoOn) { places = places.filter(function (p) { return pointInFC(p.lng, p.lat, geo.iso.fc); }); }
 else { var maxMi = effRadius / 1609 + 0.25; places = places.filter(function (p) { return p.dist <= maxMi; }); }
 places.sort(function (a, b) { return a.dist - b.dist; });
 places.forEach(function (p) {
 L.circleMarker([p.lat, p.lng], { radius: 7, color: "#fff", weight: 2, fillColor: "#0b66d6", fillOpacity: .92 }).addTo(geo.layer)
 .bindPopup("<strong>" + escapeHtml(p.name) + "</strong><br>" + escapeHtml(p.address || "") + "<br>" + p.dist.toFixed(1) + " mi away" + (p.phone ? '<br><a href="' + telHref(p.phone) + '">Call ' + escapeHtml(p.phone) + "</a>" : "") + '<br><a target="_blank" rel="noopener" href="' + dirUrl(p.lat, p.lng, "driving") + '">Directions</a>');
 });
 var src = geo.lastSource === "google" ? " Place data: Google." : " Place data: OpenStreetMap.";
 setMapLabel((places.length ? ("Found " + places.length + " " + careLabel().toLowerCase() + " within " + scope + ". All are on the map; nearest listed first.") : ("No " + careLabel().toLowerCase() + " found within " + scope + ". Try a wider radius or time.")) + src);
 renderNearList(places.slice(0, 20));
 }
 function acquire() {
 // Run BOTH paths in parallel and merge: the cached serverless proxy (which may use
 // Google Places) AND a direct browser Overpass query (the browser's own IP reaches
 // Overpass reliably even when Vercel's datacenter IP is rate-limited/blocked).
 var serverSource = "osm";
 var server = fetch(nurl, { headers: { Accept: "application/json" } }).then(function (r) { return r.json(); })
 .then(function (d) { if (d && d.ok && Array.isArray(d.places)) { serverSource = d.source || "osm"; return d.places; } return []; })
 .catch(function () { return []; });
 var direct = overpassDirect(geo.care, effRadius, geo.center.lat, geo.center.lng).catch(function () { return []; });
 return Promise.all([server, direct]).then(function (res) {
 var sv = res[0] || [], dr = res[1] || [];
 geo.lastSource = sv.length ? serverSource : "osm";
 var seen = {}, out = [];
 sv.concat(dr).forEach(function (p) { if (!p || !isFinite(p.lat) || !isFinite(p.lng)) return; var k = (p.name || "") + "@" + p.lat.toFixed(4) + "," + p.lng.toFixed(4); if (seen[k]) return; seen[k] = 1; out.push(p); });
 return out;
 });
 }
 function attempt(n) {
 acquire().then(function (places) { if (token !== geo.t) return; process(places); }).catch(function () { retryOrFail(n); });
 }
 attempt(0);
 }
 var OVERPASS_MIRRORS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.osm.ch/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
 var CLIENT_FILTERS = {
 pharmacy: ['node["amenity"="pharmacy"]', 'way["amenity"="pharmacy"]'],
 hospital: ['node["amenity"="hospital"]', 'way["amenity"="hospital"]'],
 urgent_care: ['node["healthcare"="urgent_care"]', 'way["healthcare"="urgent_care"]', 'node["amenity"="clinic"]', 'way["amenity"="clinic"]', 'node["healthcare"="clinic"]', 'way["healthcare"="clinic"]', 'node["amenity"="hospital"]', 'way["amenity"="hospital"]'],
 clinic: ['node["amenity"="clinic"]', 'way["amenity"="clinic"]', 'node["healthcare"="clinic"]', 'way["healthcare"="clinic"]', 'node["healthcare"="centre"]', 'way["healthcare"="centre"]', 'node["healthcare"="community_health_centre"]', 'way["healthcare"="community_health_centre"]', 'node["amenity"="doctors"]', 'way["amenity"="doctors"]'],
 doctor: ['node["amenity"="doctors"]', 'way["amenity"="doctors"]', 'node["healthcare"="doctor"]', 'way["healthcare"="doctor"]'],
 dentist: ['node["amenity"="dentist"]', 'way["amenity"="dentist"]', 'node["healthcare"="dentist"]', 'way["healthcare"="dentist"]'],
 mental_health: ['node["healthcare"="psychotherapist"]', 'way["healthcare"="psychotherapist"]', 'node["healthcare"="counselling"]', 'way["healthcare"="counselling"]', 'node["healthcare:speciality"~"psych|mental|behav|counsel|addict",i]', 'way["healthcare:speciality"~"psych|mental|behav|counsel|addict",i]', 'node["amenity"~"clinic|doctors|hospital"]["name"~"mental|behav|psych|counsel|wellness",i]', 'way["amenity"~"clinic|doctors|hospital"]["name"~"mental|behav|psych|counsel|wellness",i]', 'node["healthcare"~"clinic|centre|hospital"]["name"~"mental|behav|psych|counsel|wellness",i]', 'way["healthcare"~"clinic|centre|hospital"]["name"~"mental|behav|psych|counsel|wellness",i]'],
 };
 function overpassDirect(type, radius, lat, lng) {
 var filters = CLIENT_FILTERS[type] || CLIENT_FILTERS.clinic;
 var ql = "[out:json][timeout:25];(" + filters.map(function (f) { return f + "(around:" + radius + "," + lat + "," + lng + ");"; }).join("") + ");out center tags 250;";
 function one(base) {
 var ctrl = new AbortController(); var t = setTimeout(function () { ctrl.abort(); }, 10000);
 return fetch(base, { method: "POST", signal: ctrl.signal, headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(ql) })
 .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error("status"); return r.json(); })
 .then(function (d) { if (!d || !Array.isArray(d.elements) || (d.remark && !d.elements.length)) throw new Error("remark"); return d; })
 .catch(function (e) { clearTimeout(t); throw e; });
 }
 return Promise.any(OVERPASS_MIRRORS.map(one)).then(function (data) {
 var seen = {};
 return (data.elements || []).map(function (e) {
 var c = e.type === "node" ? { lat: e.lat, lon: e.lon } : (e.center || {});
 var tg = e.tags || {};
 var addr = [tg["addr:housenumber"], tg["addr:street"]].filter(Boolean).join(" ");
 if (tg["addr:city"]) addr += (addr ? ", " : "") + tg["addr:city"];
 return { name: tg.name || tg.operator || "(Unnamed location)", lat: c.lat, lng: c.lon, phone: tg.phone || tg["contact:phone"] || "", address: addr };
 }).filter(function (x) { if (!isFinite(x.lat) || !isFinite(x.lng)) return false; var k = x.name + "@" + x.lat.toFixed(4) + "," + x.lng.toFixed(4); if (seen[k]) return false; seen[k] = 1; return true; });
 });
 }

 function renderNearList(places) {
 var list = $("#nearList"); if (!list) return; list.innerHTML = "";
 if (!places.length) return;
 places.forEach(function (p) {
 var actions = el("div", { class: "near-actions" });
 if (p.phone) actions.appendChild(el("a", { class: "btn btn-call", href: telHref(p.phone), html: svg("phone") + "<span>Call: " + p.phone + "</span>" }));
 actions.appendChild(el("a", { class: "btn btn-ghost", href: dirUrl(p.lat, p.lng, "driving"), target: "_blank", rel: "noopener", html: svg("navigation") + "<span>Drive</span>" }));
 actions.appendChild(el("a", { class: "btn btn-ghost", href: dirUrl(p.lat, p.lng, "transit"), target: "_blank", rel: "noopener", html: svg("car") + "<span>Transit</span>" }));
 list.appendChild(el("div", { class: "near-item" }, [
 el("div", { class: "ni-name", text: p.name }),
 el("div", { class: "ni-dist", text: p.dist.toFixed(1) + " miles away" }),
 p.address ? el("div", { class: "ni-addr", text: p.address }) : null,
 actions,
 ]));
 });
 flow(list);
 }

 function areaForCounty(county) {
 county = (county || "").toLowerCase();
 if (county.indexOf("los angeles") >= 0) return "Los Angeles County";
 if (county.indexOf("orange") >= 0) return "Orange County";
 if (county.indexOf("riverside") >= 0 || county.indexOf("san bernardino") >= 0) return "Inland Empire (Riverside & San Bernardino)";
 if (county.indexOf("ventura") >= 0) return "Ventura County";
 if (county.indexOf("kern") >= 0) return "Kern County";
 return "";
 }
 function showCountyHint(county) {
 var box = $("#countyHint"); if (!box) return; box.innerHTML = "";
 var area = areaForCounty(county); if (!area) return;
 var plans = DATA.plans.filter(function (p) { return p.serviceArea === area; });
 if (!plans.length) return;
 var names = plans.map(function (p) { return p.name.replace(/\s*\(.*?\)\s*/g, "").trim(); }).join(", ");
 var hint = el("div", { class: "county-hint", html: svg("mapPin") + "<span>You're in <strong>" + escapeHtml(county) + "</strong>. Medi-Cal plans here: " + escapeHtml(names) + ".</span>" });
 var btn = el("button", { class: "btn btn-ghost", type: "button", html: "<span>Choose your plan</span>" });
 btn.addEventListener("click", function () { $("#plan-step").scrollIntoView({ block: "start" }); });
 hint.appendChild(btn); box.appendChild(hint);
 }

 function geocode(q) {
 setMapLabel("Looking up “" + q + "”…");
 fetch("/api/geocode?q=" + encodeURIComponent(q), { headers: { Accept: "application/json" } })
 .then(function (r) { return r.json(); })
 .then(function (d) {
 if (!d || !d.ok) { setMapLabel(d && d.error ? d.error : "We couldn't find that address."); return; }
 geo.center = { lat: d.lat, lng: d.lng }; geo.label = d.display ? shortAddr(d.display) : q;
 showCountyHint(d.county);
 if (geo.iso.mode) applyIso(); else runSearch();
 })
 .catch(function () { setMapLabel("Address lookup isn't available on this preview. Try the deployed site, or use the Google Maps link below."); });
 }

 function initNearMe() {
 renderCareChips(); renderRadiusChips(); renderIsoChips(); initShare();
 var addr = $("#addrInput");
 var saved = store(true, STORE.zip) || "";
 function doAddr() { var v = addr ? addr.value.trim() : ""; if (!v) return; store(false, STORE.zip, v); geocode(v); }
 if (addr) {
 addr.value = (geo.shared && geo.label && geo.label !== "shared location" && geo.label !== "your location") ? geo.label : saved;
 addr.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); doAddr(); } });
 }
 var sb = $("#searchBtn"); if (sb) sb.addEventListener("click", doAddr);
 var clr = $("#isoClearBtn"); if (clr) clr.addEventListener("click", function () { geo.iso.mode = null; applyIso(); });
 var locate = $("#locateBtn");
 if (locate) locate.addEventListener("click", function () {
 if (!navigator.geolocation) { alert("Your browser can't share location. Please type an address or ZIP instead."); return; }
 locate.innerHTML = "<span>Locating...</span>";
 navigator.geolocation.getCurrentPosition(
 function (pos) { geo.center = { lat: pos.coords.latitude, lng: pos.coords.longitude }; geo.label = "your location"; locate.innerHTML = svg("navigation") + "<span>Use my location</span>"; var ch = $("#countyHint"); if (ch) ch.innerHTML = ""; if (geo.iso.mode) applyIso(); else runSearch(); },
 function () { locate.innerHTML = svg("navigation") + "<span>Use my location</span>"; alert("We couldn't get your location. Please type an address or ZIP instead."); }
 );
 });
 if (geo.shared && geo.center) { if (geo.iso.mode) applyIso(); else runSearch(); }
 else if (saved) geocode(saved);
 else runSearch();
 }

 /* ---------- hero quick chips ---------- */
 var HERO_CHIPS = [
 { cat: "Get a ride (transportation)", label: "Get a ride", icon: "car" },
 { cat: "Nurse advice line (24/7)", label: "Talk to a nurse", icon: "phone" },
 { cat: "Mental health & substance use", label: "Mental health", icon: "heart" },
 { cat: "Renew Medi-Cal / keep coverage", label: "Renew Medi-Cal", icon: "refresh" },
 { cat: "Find a doctor", label: "Find a doctor", icon: "plusCircle" },
 ];
 function buildHeroChips() {
 var row = $("#heroChips"); if (!row) return;
 HERO_CHIPS.forEach(function (c) {
 var chip = el("button", { class: "hero-chip", type: "button", html: svg(c.icon) + "<span>" + c.label + "</span>" });
 chip.addEventListener("click", function () {
 state.category = c.cat; renderNeeds(); renderResults();
 if (!getPlan()) { $("#plan-step").scrollIntoView({ block: "start" }); }
 else { $("#results").scrollIntoView({ block: "start" }); }
 });
 row.appendChild(chip);
 });
 }

 /* ---------- language / translation ---------- */
 var LANGS = [
 { c: "en", n: "English" }, { c: "es", n: "Español" }, { c: "zh-CN", n: "中文 (简)" }, { c: "zh-TW", n: "中文 (繁)" },
 { c: "vi", n: "Tiếng Việt" }, { c: "ko", n: "한국어" }, { c: "hy", n: "Հայերեն" }, { c: "tl", n: "Tagalog" },
 { c: "ru", n: "Русский" }, { c: "fa", n: "فارسی" }, { c: "km", n: "ខ្មែរ" }, { c: "ar", n: "العربية" },
 { c: "ja", n: "日本語" }, { c: "hi", n: "हिन्दी" }, { c: "pa", n: "ਪੰਜਾਬੀ" }, { c: "th", n: "ไทย" },
 ];
 function setCookie(name, value) {
 var host = location.hostname;
 document.cookie = name + "=" + value + ";path=/";
 if (host) { document.cookie = name + "=" + value + ";path=/;domain=" + host; document.cookie = name + "=" + value + ";path=/;domain=." + host; }
 }
 function applyLang(code) {
 store(false, STORE.lang, code);
 var lbl = $("#langLabel"); if (lbl) { var f = LANGS.filter(function (l) { return l.c === code; })[0]; lbl.textContent = f ? f.n : "Language"; }
 Array.prototype.forEach.call(document.querySelectorAll(".lang-opt"), function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-lang") === code ? "true" : "false"); });
 setCookie("googtrans", "/en/" + code);
 var combo = document.querySelector("select.goog-te-combo");
 if (combo) { combo.value = code; combo.dispatchEvent(new Event("change")); } else { location.reload(); }
 }
 function buildLangMenu() {
 var menu = $("#langMenu"); if (!menu) return;
 LANGS.forEach(function (l) {
 var b = el("button", { class: "lang-opt", type: "button", "data-lang": l.c, text: l.n });
 b.addEventListener("click", function () { applyLang(l.c); menu.classList.remove("open"); });
 menu.appendChild(b);
 });
 menu.appendChild(el("div", { class: "lang-note", text: "Whole-page translation by Google Translate. You can also use your browser's built-in Translate." }));
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
 // Natural-sounding voices vary by OS/browser. We rank the warmer "neural"/"online"
 // voices first (Microsoft Aria/Jenny, Google US English, Apple Samantha/Siri) so the
 // default doesn't land on a robotic fallback. Users can still pick any installed voice.
 var VOICE_RANK = ["aria", "jenny", "michelle", "ava", "emma", "guy", "natural", "online", "google us english", "google uk english female", "samantha", "siri", "karen", "moira", "tessa", "google"];
 function scoreVoice(v) {
 var n = (v.name || "").toLowerCase(), s = 0;
 for (var i = 0; i < VOICE_RANK.length; i++) { if (n.indexOf(VOICE_RANK[i]) >= 0) { s = VOICE_RANK.length - i + 20; break; } }
 if (/en[-_]us/i.test(v.lang)) s += 6; else if (/^en/i.test(v.lang)) s += 3;
 if (v.localService === false) s += 2; // cloud voices are usually higher quality
 if (/female|woman/i.test(n)) s += 1;
 return s;
 }
 function enVoices() {
 var all = window.speechSynthesis.getVoices() || [];
 var en = all.filter(function (v) { return /^en/i.test(v.lang || ""); });
 return (en.length ? en : all).sort(function (a, b) { return scoreVoice(b) - scoreVoice(a); });
 }
 function initReadAloud() {
 var btn = $("#readAloudBtn"); if (!btn) return;
 var synth = window.speechSynthesis;
 if (!("speechSynthesis" in window) || !synth) { btn.style.display = "none"; var sel0 = $("#voiceSelect"); if (sel0) sel0.style.display = "none"; return; }
 var sel = $("#voiceSelect");
 var on = false, voices = [], chosen = null;
 var savedName = store(true, STORE.voice) || "";

 function buildList() {
 voices = enVoices();
 if (!voices.length) return;
 chosen = (savedName && find(voices, function (v) { return v.name === savedName; })) || voices[0];
 if (sel) {
 sel.innerHTML = "";
 voices.forEach(function (v) {
 var o = document.createElement("option");
 o.value = v.name; o.textContent = v.name.replace(/^(Microsoft|Google)\s+/, "") + (/en[-_]?gb/i.test(v.lang) ? " (UK)" : "");
 if (v.name === chosen.name) o.selected = true;
 sel.appendChild(o);
 });
 sel.style.display = "";
 }
 }
 function find(arr, fn) { for (var i = 0; i < arr.length; i++) { if (fn(arr[i])) return arr[i]; } return null; }

 buildList();
 // Voices often load asynchronously - rebuild when they arrive.
 if (typeof synth.onvoiceschanged !== "undefined") synth.onvoiceschanged = buildList;
 setTimeout(buildList, 350);

 if (sel) sel.addEventListener("change", function () {
 chosen = find(voices, function (v) { return v.name === sel.value; }) || chosen;
 store(false, STORE.voice, chosen ? chosen.name : "");
 if (on) { stop(); start(); } // restart with the new voice so the change is audible
 });

 function stop() { synth.cancel(); on = false; btn.setAttribute("aria-pressed", "false"); }
 // Split into sentences so we can add natural pauses and gently vary pitch/rate -
 // the single biggest fix for the "monotone" robot read of one long utterance.
 function chunk(text) {
 var parts = text.replace(/\s+/g, " ").split(/(?<=[.!?:])\s+(?=[A-Z0-9"'])/);
 var out = [], buf = "";
 parts.forEach(function (p) { if ((buf + " " + p).length > 240) { if (buf) out.push(buf.trim()); buf = p; } else { buf += " " + p; } });
 if (buf.trim()) out.push(buf.trim());
 return out.slice(0, 120);
 }
 function start() {
 var main = $("#main"); var text = main ? main.innerText.slice(0, 9000) : "";
 var sentences = chunk(text); if (!sentences.length) return;
 on = true; btn.setAttribute("aria-pressed", "true");
 synth.cancel();
 sentences.forEach(function (s, i) {
 var u = new SpeechSynthesisUtterance(s);
 if (chosen) { u.voice = chosen; u.lang = chosen.lang; }
 u.rate = 0.96 + (i % 3) * 0.02; // 0.96 - 1.00, subtle cadence shifts
 u.pitch = 1.02 + (i % 2 ? -0.06 : 0.06); // gentle rise/fall between sentences
 u.volume = 1;
 if (i === sentences.length - 1) u.onend = function () { on = false; btn.setAttribute("aria-pressed", "false"); };
 synth.speak(u);
 });
 }
 btn.addEventListener("click", function () { if (on) stop(); else start(); });
 }
 function initPrint() { var b = $("#printBtn"); if (b) b.addEventListener("click", function () { window.print(); }); }
 function initSearch() {
 var box = $("#searchBox"); if (!box) return; var t;
 box.addEventListener("input", function () { clearTimeout(t); t = setTimeout(function () { state.query = box.value.trim(); renderResults(); renderState(); }, 130); });
 }
 function initMeta() {
 var lu = $("#lastUpdated"); var m = DATA.meta || {};
 if (lu) lu.textContent = "Last updated: " + (m.lastUpdated || " - ") + ". Covers " + DATA.plans.length + " Medi-Cal plans across " + (m.region || "the greater Los Angeles region") + ".";
 }

 /* ---------- init ---------- */
 function init() {
 var shared = parseShareState();
 if (!shared || !state.planId) {
 var sp = store(true, STORE.plan);
 if (sp && DATA.plans.some(function (p) { return p.id === sp; })) state.planId = sp;
 }
 // Default to L.A. Care (the largest Medi-Cal plan in the region) when nothing is chosen yet.
 if (!state.planId && DATA.plans.some(function (p) { return p.id === "la-care"; })) state.planId = "la-care";
 renderPlanPicker(); renderNeeds(); renderResults(); renderState(); renderBarriers(); renderSources(); renderToolkit(); renderTriage();
 initTextSize(); initReadAloud(); initPrint(); initSearch(); initMeta(); initNearMe(); buildLangMenu(); buildHeroChips(); renderStartHere(); initFeedback(); initApptPrint(); initReveal(); maybeNotify();
 if (!reduceMotion) document.addEventListener("pointerdown", rippleHandler, true);
 if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) { navigator.serviceWorker.register("sw.js").catch(function () {}); }
 }
 if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
