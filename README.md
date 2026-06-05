# Access Medi-Cal LA 🧭

A free, friendly, **barrier-oriented** navigation guide that helps Medi-Cal (Medicaid)
members in **Los Angeles County** find the care and resources they need — fast.

Pick your health plan, tap what you need ("get a ride," "talk to a nurse," "renew my Medi-Cal"),
and get the right phone number or link in plain language. Built for low-bandwidth phones,
screen readers, and people who are stressed and short on time.

> ⚠️ **Not affiliated** with the State of California, DHCS, LA County, or any health plan.
> Always confirm important details with your plan's Member Services line. In an emergency, call **911**.

---

## What's here

```
AccessMedicaid/
├─ site/                     ← the website (open site/index.html in any browser)
│  ├─ index.html
│  ├─ css/styles.css
│  └─ js/
│     ├─ app.js              ← renders plans, needs, resources, barriers
│     └─ data.js             ← generated data bundle the page reads (window.AM_DATA)
├─ data/                     ← the "database" (source of truth, JSON)
│  ├─ plans/<plan>.json      ← one file per Medi-Cal plan
│  ├─ barriers.json          ← access barriers + how to get past them
│  ├─ state-resources.json   ← California statewide resources (any plan)
│  └─ index.json             ← manifest of plans + metadata
└─ README.md
```

The data lives as JSON in `data/` (the database). The site reads a single generated
bundle, `site/js/data.js`, which is built from those JSON files so the site works by
**simply double-clicking `site/index.html`** — no server, no build tools required.

## How it was built

This project was assembled by a small team of research agents (Claude Team Orchestration):

1. **Barriers agent** — mapped the most common, well-documented barriers that stop LA
   County members from reaching care (renewal paperwork, language, transportation,
   immigration fear, provider shortages, digital divide, cost fears) and paired each with
   a concrete resource.
2. **Statewide-resources agent** — confirmed California-wide help that works with any plan
   (Medi-Cal Dental, Medi-Cal Rx, Health Care Options, the Ombudsman, Health Consumer
   Alliance, 211 LA, mental-health lines).
3. **One agent per plan** — visited each plan's official website and organized member
   resources (Member Services, nurse line, find-a-doctor, rides, behavioral health,
   pharmacy, ID card/portal, renewals, grievances, CalAIM extras) into the database.

Every fact carries a `verified` flag and source URLs. Numbers that couldn't be confirmed
on an official site this run are marked **"Please confirm."**

## Run it

Just open `site/index.html` in a browser. To serve it (optional):

```powershell
# from the repo root
python -m http.server 8080 --directory site
# then visit http://localhost:8080
```

## Accessibility & care-first features

- **Task-first ("I need…") navigation** instead of bureaucratic menus
- **Plan picker** with "I'm not sure / show me everything" and a "how to find my plan" helper
- **Always-on safety strip** (911 + 988) and a floating "Get help now" button
- **Free-interpreter reminder** on every screen + browser-translate guidance
- **Text-size controls (A / A+ / A++)**, **Read-aloud**, **Print/Save-as-PDF**
- High-contrast, dark-mode aware, reduced-motion aware, 48px touch targets
- Semantic HTML, skip link, ARIA roles, keyboard friendly
- Plain-language copy aimed at a ~6th-grade reading level
- Works offline once loaded; no tracking, no accounts

## Updating the data

Edit the JSON in `data/`, then regenerate `site/js/data.js` (it's the same content assigned
to `window.AM_DATA`). Keep phone numbers and URLs confirmed against official sites, and set
`verified: true` only for facts you re-checked.
