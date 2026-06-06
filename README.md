# Access Medi-Cal LA 🧭

A free, friendly, **barrier-oriented** navigation guide that helps Medi-Cal (Medicaid)
members across the **greater Los Angeles region** find the care and resources they need - fast.

Pick your health plan, tap what you need ("get a ride," "talk to a nurse," "renew my Medi-Cal"),
and get the right phone number or link in plain language - in any language. Built for
low-bandwidth phones, screen readers, and people who are stressed and short on time.

> ⚠️ **Not affiliated** with the State of California, DHCS, any county, or any health plan.
> Always confirm important details with your plan's Member Services line. In an emergency, call **911**.

---

## Plans & areas covered (11 plans, 5 service areas)

- **Los Angeles County:** L.A. Care, Health Net, Molina, Kaiser Permanente, Blue Shield of
 California Promise, Anthem Blue Cross, and **PHC California** (Positive Healthcare / AIDS
 Healthcare Foundation - the specialty plan for people with a prior AIDS diagnosis).
- **Orange County:** CalOptima Health
- **Inland Empire (Riverside & San Bernardino):** Inland Empire Health Plan (IEHP)
- **Ventura County:** Gold Coast Health Plan
- **Kern County:** Kern Family Health Care
- **Statewide** layer that works with any plan (Medi-Cal Rx, Medi-Cal Dental, Health Care
 Options, the Ombudsman, 211 LA, DMH/SAPC lines, 988, and more).

## What's here

```
AccessMedicaid/
├─ index.html ← the website (open in any browser, or deploy the repo root)
├─ css/styles.css ← professional navy + teal design system
├─ js/
│ ├─ app.js ← plans, needs, maps, translation, live web-mining, a11y
│ └─ data.js ← generated data bundle the page reads (window.AM_DATA)
├─ api/
│ └─ live.js ← Vercel serverless function for dynamic web-mining
├─ data/ ← the "database" (source of truth, JSON)
│ ├─ plans/<plan>.json ← one file per Medi-Cal plan (11 files)
│ ├─ barriers.json ← access barriers + how to get past them
│ ├─ state-resources.json ← California statewide resources (any plan)
│ ├─ meta.json ← categories + metadata
│ └─ index.json ← manifest: plans grouped by county + brand colors
├─ scripts/build-data.mjs ← compiles data/ → js/data.js
├─ vercel.json ← static-hosting config (Vercel)
└─ README.md
```

The data lives as JSON in `data/` (the database). The site reads a single generated
bundle, `js/data.js`, built from those JSON files, so the static site works by
**simply double-clicking `index.html`** - no server or build tools required. Because
`index.html` is at the repo root, it deploys zero-config to Vercel / GitHub Pages / Netlify.

## Key features

- **Find your plan, grouped by county** - pick from 11 plans across 5 service areas, or
 "I'm not sure / show me everything."
- **Task-first needs** - tap "get a ride," "talk to a nurse," "renew my Medi-Cal," etc.,
 or search. Click-to-call numbers everywhere.
- **🔴 Live web-mining** - when you choose a topic, the site calls `/api/live`, which
 fetches that plan's **official page server-side** and shows the latest title, phone
 numbers, and a snippet with a "pulled live" badge and timestamp. Degrades gracefully to
 the curated copy if offline or opened as a local file.
- **🗺️ Find care near you** - type a ZIP (or use your location) and pick urgent care, ER,
 pharmacy, clinic, dentist, mental health, or your plan's doctors; an embedded Google Map
 updates live (no API key needed).
- **🌐 Whole-page translation** - a language menu (16 languages) translates the entire page
 via Google Translate, plus a reminder that every plan must provide a free interpreter.
- **Accessibility & care-first design** - always-on 911/988 safety strip, "Get help now"
 button, text-size controls, read-aloud, print/Save-as-PDF, dark-mode & reduced-motion
 aware, 48px touch targets, semantic HTML, ARIA, ~6th-grade reading level, no tracking.

## How it was built

Assembled by teams of research agents (Claude Team Orchestration) over two rounds - first
the LA County plans, barriers, and statewide resources; then the specialty + greater-region
plans (PHC, CalOptima, IEHP, Gold Coast, Kern). One agent per plan visited the official
website and organized member resources into the database. Every fact carries a `verified`
flag and source URLs; anything that couldn't be confirmed on an official site this run is
marked **"Please confirm."**

## Run it

Open `index.html` in a browser for the full static experience. To exercise the **live
web-mining** endpoint locally you need the Vercel runtime:

```powershell
npm i -g vercel
vercel dev # serves the site + /api/live at http://localhost:3000
```

Or just deploy to Vercel - the `/api/live` function and static site work out of the box.

## Updating the data

Edit the JSON in `data/`, then run `node scripts/build-data.mjs` to regenerate `js/data.js`.
Plan grouping and brand colors live in `data/index.json`. Keep phone numbers and URLs
confirmed against official sites, and set `verified: true` only for facts you re-checked.
