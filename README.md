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
├─ api/ ← Vercel serverless functions
│ ├─ live.js ← web-mining of a plan's official page
│ ├─ nearby.js ← public map POIs (OpenStreetMap/Overpass, optional Google Places)
│ ├─ innetwork.js ← in-network providers from FHIR / Health Net directories
│ ├─ geocode.js ← address → lat/lng     isochrone.js ← travel-time areas
│ └─ verify.js ← data health check (cron)   feedback.js ← member feedback inbox
├─ data/ ← the "database" (source of truth, JSON)
│ ├─ plans/<plan>.json ← one file per Medi-Cal plan (11 files)
│ ├─ fhir-endpoints.json ← per-plan FHIR Provider Directory base URL + geo mode
│ ├─ healthnet-providers.json ← Health Net in-network dataset (generated)
│ ├─ zip-centroids.json ← CA ZIP centroids (for ZIP-area pins)
│ ├─ barriers.json ← access barriers + how to get past them
│ ├─ state-resources.json ← California statewide resources (any plan)
│ ├─ meta.json ← categories + metadata
│ └─ index.json ← manifest: plans grouped by county + brand colors
├─ scripts/
│ ├─ build-data.mjs ← compiles data/ → js/data.js
│ ├─ build-healthnet.mjs ← builds the Health Net in-network dataset
│ └─ verify-data.mjs ← link/phone checker (cron)
├─ vercel.json ← hosting config + function file bundling (Vercel)
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
- **🔥 In-network providers (FHIR)** - for several plans the map shows providers pulled from
 the plan's **official provider directory** (CMS interoperability / FHIR), with specialty
 and language filters. See [In-network provider directories](#in-network-provider-directories-fhir--cms-interoperability) below.
- **🌐 Whole-page translation** - a language menu (16 languages) translates the entire page
 via Google Translate, plus a reminder that every plan must provide a free interpreter.
- **Accessibility & care-first design** - always-on 911/988 safety strip, "Get help now"
 button, text-size controls, read-aloud, print/Save-as-PDF, dark-mode & reduced-motion
 aware, 48px touch targets, semantic HTML, ARIA, ~6th-grade reading level, no tracking.

## In-network provider directories (FHIR / CMS interoperability)

The **"Find care near you"** map can show **in-network** providers for several plans, pulled
from each plan's official **provider directory**. Under the CMS Interoperability & Patient
Access rule (CMS-9115-F), Medi-Cal managed care plans must publish a public, no-auth
**Provider Directory API in HL7 FHIR R4** (Da Vinci PDEX Plan-Net). The serverless function
`api/innetwork.js` queries the selected plan's directory; the map falls back to public map
data (Google/OpenStreetMap) when a plan has no usable endpoint. When in-network data is used
the map shows a green frame, a **🔥 FHIR** source badge, and green dots; otherwise neutral
dots with a "not filtered by insurance" note.

### A key finding about coordinates

A live probe of the FHIR servers found that **most directories don't store geocoordinates** -
`Location.position` is empty for **L.A. Care, CalOptima, and IEHP**, so a FHIR `near=` (geo)
search returns nothing (IEHP rejects `near` outright). **Only Blue Shield Promise** returns
real coordinates. So the map uses two strategies, set per endpoint in
`data/fhir-endpoints.json` (`geo`):

- **`near`** - exact coordinates from the server (Blue Shield Promise).
- **`postal`** - query by the ZIP codes within the search radius (from
 `data/zip-centroids.json`) and place pins at the **ZIP centroid** - *approximate to the
 provider's ZIP area* (same approach as Health Net). Used for the coordinate-less directories.
 `coordsFor()` prefers a real `Location.position` and falls back to the ZIP centroid.

### Per-plan status

| Plan | In-network source | Pin accuracy | Status |
|---|---|---|---|
| L.A. Care | FHIR R4 (Edifecs/HAPI), public no-auth | ZIP-area (no coords in directory) | ✅ live |
| CalOptima | FHIR R4 (Edifecs/HAPI), public no-auth | ZIP-area | ✅ live |
| IEHP | FHIR R4 (HAPI, self-hosted), public no-auth | ZIP-area (`near` unsupported) | ✅ live |
| Molina | FHIR R4 (HealthEdge/Sapphire), public no-auth | ZIP-area (`near` returns 500) | ✅ live |
| Blue Shield Promise | FHIR R4 (Smile CDR), public no-auth | **Exact** (has coordinates) | ✅ live |
| **Health Net** | **Public JSON directory** (FHIR base URL is portal-gated) | ZIP-area | ✅ live (see below) |
| Anthem | FHIR R4 (Elevance HealthOS) | - | ⛔ needs OAuth / API-key registration |
| Gold Coast | FHIR R4 (Edifecs) | - | ⛔ host IP-allowlisted; base URL not public |
| Kaiser | none (PDF directories only) | - | ⛔ no Provider Directory FHIR endpoint |
| Kern | none confirmed (member Patient-Access API only) | - | ⛔ no public Provider Directory endpoint |
| PHC California (Positive Healthcare / AHF) | unconfirmed | - | ⛔ no public endpoint verified |

Plans marked ⛔ fall back to a deep-link to the plan's official "Find a Doctor" tool + public
map data. (Note: `phc` here is **PHC California / Positive Healthcare (AIDS Healthcare
Foundation)** - *not* Partnership HealthPlan of California, whose Edifecs endpoint must not be
used for this plan.)

### Health Net - FHIR status (special case)

Health Net (a Centene plan) **does** have a CMS-mandated FHIR Provider Directory, but its
**base URL is gated behind the Centene developer portal login** (`partners.centene.com`), so
it can't be queried anonymously like the others. Health Net **also publishes public,
machine-readable per-county provider-directory JSON** (no auth), so we use those:

- `scripts/build-healthnet.mjs` downloads Health Net's LA Medi-Cal directory JSON (~40 MB, no
 coordinates), flattens its heterogeneous sections, merges each provider's specialties +
 languages, and **ZIP-centroid geocodes** them into `data/healthnet-providers.json`
 (~14k provider-locations).
- `api/innetwork.js` serves Health Net from that committed dataset (no external call at
 request time). `vercel.json` bundles `data/**` with the function so the dataset deploys.
- The weekly **`refresh-providers`** job in `.github/workflows/verify-data.yml` re-downloads
 and rebuilds it; the in-network note shows a "Directory last refreshed" date.

Refresh manually:

```powershell
node scripts/build-healthnet.mjs   # needs internet; aborts WITHOUT overwriting if the download fails
node scripts/build-data.mjs
git add data/healthnet-providers.json js/data.js && git commit -m "refresh Health Net directory" && git push
```

### Filters & honesty

One unified filter ("What do you need?") covers care types (clinic, pharmacy, ER, …) and, for
in-network plans, provider specialties (Pediatrics, OB-GYN, …) plus an optional
preferred-language filter. Provider directories are CMS-audited at roughly **50% accuracy**, so
even in-network results say **"call ahead to confirm,"** and ZIP-area pins are labeled
approximate.

Check any plan's live status: `…/api/innetwork?plan=<id>&lat=34.0614&lng=-118.2385&type=doctor&radius=8047&debug=1`.

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

## Keeping it updated on Vercel

The Vercel project is connected to this GitHub repo, so **every push to `main`
auto-deploys to production**. The normal loop is just:

```powershell
git add -A
git commit -m "your change"
git push            # Vercel builds & deploys automatically
```

Watch the deploy go green in Vercel - Deployments. (If the project is NOT Git-connected,
deploy manually with `npm i -g vercel` then `vercel --prod`.)

**1. Change wording, design, or features** - edit the file(s), commit, push. Done.

**2. Change a phone number / link / resource** - edit the JSON in `data/`, then
**regenerate the bundle and commit it**:

```powershell
node scripts/build-data.mjs    # rewrites js/data.js from data/
git add -A && git commit -m "update <plan> numbers" && git push
```

(The site reads `js/data.js`, so it must be rebuilt and committed - don't edit it by hand.)

**3. Make returning visitors get the update right away (PWA cache).** The app installs a
service worker, so repeat visitors are served from cache and pick up changes on their *next*
visit. To push an update immediately, bump the cache name in `sw.js` (e.g. `amla-v2` ->
`amla-v3`) when you ship a notable change; the old cache is cleared on next load.

**4. Set environment variables** (optional) in Vercel - Settings - Environment Variables,
then redeploy:
- `FEEDBACK_WEBHOOK_URL` - route member feedback to a Slack/Discord/Make inbox.
- `GOOGLE_MAPS_API_KEY` - optional. If set, the "Find care near you" search uses
  Google Places (higher-quality clinic data + phone numbers) instead of OpenStreetMap.
  Enable the **Places API (New)** for the key. Note: Google's Places terms generally
  expect results to be shown on a Google map, so enabling this is the owner's call;
  leaving it unset keeps the resilient, key-free OpenStreetMap/Overpass path.

**5. Automatic data checks (no action needed).** Crons keep the data honest:
- **GitHub Action** (`.github/workflows/verify-data.yml`) runs weekly. The `verify` job checks
  every link is reachable and every phone still appears on its page (emails you if red); the
  `refresh-providers` job re-downloads Health Net's directory and rebuilds
  `data/healthnet-providers.json` + `js/data.js`, committing any changes. Run either anytime
  from the repo's **Actions** tab - "Run workflow." (The 6 in-network plans that use live FHIR
  need no refresh - they're queried per request.)
- **Vercel Cron** (`/api/verify` in `vercel.json`) does a lightweight weekly sample; results
  appear in Vercel - Logs. Confirm it's listed under Vercel - Settings - Cron Jobs.

The crons **verify** the data; they don't rewrite it. When a check flags something, fix it
with step 2 above.
