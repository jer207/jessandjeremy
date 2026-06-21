# HANDOFF — Jess & Jeremy Wedding Site

For an AI agent and a human picking up this project mid-stream on a new machine. The README is the setup-from-scratch guide; this file is the "what you need to know to start working" guide.

---

## Overview

A small wedding website for Jess & Jeremy's October 2026 wedding at Tops'l Farm in Waldoboro, Maine. Guests look themselves up by name or email, see a personalized invitation page, RSVP via a multi-step modal, and the couple sees responses on an admin dashboard. There are about 12 sample households in demo data; the real guest list lives in a Google Sheet.

- **Live URL:** https://jessandjeremy.com (custom domain on GitHub Pages, see `CNAME`).
- **Repo:** https://github.com/jer207/jessandjeremy
- **Git author identity used for commits:** `jer207 <jeremyhammond207@gmail.com>`
- **Default branch:** `main`. Pushing to `main` is the deploy.

---

## Architecture

### Frontend — static, multi-page, vanilla JS

Three HTML entry points, each a separate page (no SPA, no router):

- `index.html` — landing + lookup form
- `invitation.html` — personalized invitation page; hosts both the RSVP modal and the Contact modal
- `admin.html` — table of RSVPs, CSV export

All three pull from the same `assets/*.js` files. No bundler, no build step, no framework. The browser loads the `<script>` tags in source order.

Shared scripts (loaded by every page): `assets/data.js`, `assets/store.js`. Page-specific scripts: `lookup.js`, `invitation.js` (loads `rsvp.js` too), `admin.js`.

The visual system lives in `assets/style.css` (~1700 lines, hand-written, no preprocessor). Two custom fonts in `assets/fonts/`: J9 Poem (display, all headings) and Nunito (body).

### Data flow

The frontend has two modes, controlled by a constant at the top of `assets/store.js`:

```js
const MODE = 'remote';     // or 'demo'
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/.../exec';
```

- **Demo mode** uses the in-file `HOUSEHOLDS` and `ADMINS` arrays in `data.js` plus `localStorage` for RSVP storage. Useful for working offline or against a fresh clone.
- **Remote mode** (currently in production) POSTs every read/write to a Google Apps Script web app. The frontend never touches Google Sheets directly — Apps Script is the only thing with sheet access.

Four operations make up the entire data contract:

| Function | Purpose |
|---|---|
| `findGuest(query)` | Resolves a name/email to a household, an admin, an ambiguous match, or null. |
| `getHousehold(id)` | Returns a household with its current `rsvp` (or null). |
| `submitRsvp(id, rsvpData)` | Writes/overwrites all RSVP rows for that household. |
| `getAllHouseholdsForAdmin()` | Returns every household + RSVP for the admin dashboard. |

Both modes implement the same four functions. The dispatcher at the top of `store.js` picks demo or remote per call.

### Backend — Google Apps Script + Google Sheet

The backend is a single `Code.gs` file deployed as a Google Apps Script Web App. The repo copy lives at `apps-script/Code.gs` but **that file is not the source of truth for what's running** — the live code lives in the Apps Script editor attached to the Sheet. Treat the repo copy as the canonical version: changes go from the repo into Apps Script via copy-paste + redeploy.

The Sheet (titled "Jeremy & Jess RSVPs" in the GUI, separate from the repo's "Jess & Jeremy" branding) has three tabs:

- **Households** — guest list. One row per invited household. Columns: `id`, `tier` (`both` or `day2`), `adult1_first`, `adult1_last`, `adult1_email`, `adult2_first`, `adult2_last`, `adult2_email`, `children` (semicolon-separated first names), `plus_one_allowed` (1 or 0), `topsl_lodging_note` (see below). The script reads this on every request — edits go live immediately, no redeploy needed.
- **RSVPs** — script writes here. Column order: `submitted_at`, `household_id`, `person_name`, `person_role`, `attending_day1`, `attending_day2`, `dietary`, `accommodations`, `notes`, `contact_email`. **The `accommodations` column was added late;** see the gotcha section below.
- **Admins** — single column `name`. Admins log in with just their first name. Currently `Jess` and `Jeremy`.

The Apps Script reads three Script Properties (set via Apps Script → Project Settings → Script Properties):
- `SHEET_ID` — the long ID from the Sheet's URL.
- `ADMIN_EMAIL` — where RSVP alert emails go.
- `COUPLE_NAMES` — currently `"Jess & Jeremy"`. Only used as fallback in the alert email logic; the value is loaded but not actually rendered into emails in the current code.

The `APPS_SCRIPT_URL` in `assets/store.js` is the deployment endpoint. It's **hardcoded and committed to the repo**. That's intentional and matches what every wedding-RSVP backend does — the URL is unguessable and the script only does the four whitelisted operations, but anyone with the URL can POST to it. Treat it as low-stakes-public, not as a secret.

CORS sidestep: the frontend POSTs with `Content-Type: text/plain;charset=utf-8` so the browser treats it as a "simple" request and skips the preflight. Apps Script doesn't set `Access-Control-Allow-*` headers for `OPTIONS`, so any preflight would fail. Apps Script parses the JSON body itself.

---

## Tech stack & dependencies

There is no `package.json`, no Node, no npm, no bundler, no transpiler, no PostCSS, no linter config. The site is intentionally framework-free.

Browser requirements: modern evergreen (uses `IntersectionObserver`, `backdrop-filter`, CSS `clamp()`, `text-wrap: pretty`). Tested informally against current Chrome and Safari.

To run anything locally you only need:
- A web browser
- Optionally Python 3 (for the dev server)
- `git`

No `node`, no `pnpm`, no install step. If you `git clone` and open `index.html`, the demo mode will work (though some browsers require a real server for fetch/font loading, see next section).

---

## Local development

```bash
git clone https://github.com/jer207/jessandjeremy.git
cd jessandjeremy
python3 -m http.server 8000
# open http://localhost:8000
```

To work without hitting the production Sheet:

1. Open `assets/store.js`, change `const MODE = 'remote'` to `const MODE = 'demo'`.
2. The page now reads from `HOUSEHOLDS` and `ADMINS` in `data.js` and writes RSVPs to `localStorage`. A "Demo mode" banner appears at the bottom of every page, with a "Reset demo" button.
3. Try `Margaret Carroll` (both-day + kids + lodging note), `Frank Lemieux` (day-2-only, no plus-one), `Rachel Brennan` (both-day, plus-one), `Priya Chakraborty` (day-2, plus-one). Type `Jess` or `Jeremy` to land on the admin dashboard.
4. **Switch back to `'remote'` before committing.** A demo-mode commit shipped to production would break the live site.

There are no environment variables, no `.env` file, no secrets to load. The only "secret" is the Apps Script URL committed to `store.js`, which (see above) is treated as low-stakes-public.

`assets/data.js` has *both* the static site copy (`WEDDING` object — used in both modes) *and* the demo guest list (`HOUSEHOLDS`/`ADMINS` arrays — ignored in remote mode). Editing the `WEDDING` object changes copy on the live site after push.

---

## Deployment

The deploy is `git push origin main`. No CI, no Actions, no build.

GitHub Pages is configured to serve the root of `main`. After a push, the deploy usually completes within 1–2 minutes. There is no `.github/workflows/` directory — Pages handles everything.

The custom domain (`jessandjeremy.com`) is wired up via the `CNAME` file at the repo root. The user has been editing CNAME via the GitHub web UI a few times, which means local pulls before pushing are a good habit (see gotcha #3 below).

**The Apps Script does NOT redeploy with `git push`.** It's a separate Google Apps Script project. To ship a change to `apps-script/Code.gs`:

1. Open the Sheet → Extensions → Apps Script.
2. Paste the new `Code.gs` contents over the entire file in the editor.
3. **Deploy → Manage deployments** (NOT "New deployment" — that would create a new URL and break the frontend).
4. Pencil icon on the existing deployment → Version: **New version** → Description → **Deploy**.
5. The URL must be unchanged.

If you ever see RSVPs landing in the wrong sheet columns, it's almost certainly because the Apps Script wasn't redeployed after a backend change.

---

## Project structure

```
jessandjeremy/
├── CNAME                    custom domain (jessandjeremy.com)
├── README.md                from-scratch setup guide
├── HANDOFF.md               this file
├── index.html               landing + lookup form
├── invitation.html          personalized invitation, hosts modals
├── admin.html               admin dashboard
├── apps-script/
│   └── Code.gs              backend, source of truth for what should run in Apps Script
├── assets/
│   ├── style.css            entire design system, hand-written
│   ├── fonts/
│   │   ├── J9Poem3.otf                  display font (headings)
│   │   └── Nunito-VariableFont_wght.ttf  body font
│   ├── data.js              WEDDING copy object + demo HOUSEHOLDS/ADMINS arrays
│   ├── store.js             demo + remote dispatcher, MODE constant, APPS_SCRIPT_URL
│   ├── lookup.js            index.html: lookup form + redirect
│   ├── invitation.js        invitation.html: renders all sections, owns Contact modal
│   ├── rsvp.js              RsvpModal.open(household, opts) library
│   └── admin.js             admin.html: stats, table, CSV export
└── .claude/
    └── settings.local.json  per-machine Claude Code permission allowlist (gitignored conceptually but currently tracked)
```

A few things to know about the JS files:

- **`store.js`** — the data layer. Top-of-file `MODE` and `APPS_SCRIPT_URL` are the only knobs. `localStorage` keys (`wedding.session.v1`, `wedding.rsvps.v1`) are versioned so we can rev the schema without breaking older browsers.
- **`invitation.js`** — owns the whole invitation page render: sticky pill nav, hero (with confirmed card if RSVP submitted), itinerary cards, directions, accommodations (two paths: cabin assignment vs off-site grid), registry, things-to-do accordion, FAQ accordion, footer. Also owns the Contact modal that replaces the RSVP button after submission.
- **`rsvp.js`** — exports `window.RsvpModal.open(household, { onSuccess })`. The modal handles its own state, step navigation, and submit. After the success screen, `onSuccess` is called and the invitation page reloads. No `rsvp.html` page exists — the modal mounts on top of `invitation.html`.
- **`admin.js`** — reads `getAllHouseholdsForAdmin()`, renders stats cards, the table, and the CSV export. The dashboard does not check the session beyond confirming it's an admin; the Apps Script re-verifies admin status server-side.

---

## Gotchas & non-obvious decisions

### 1. The Apps Script redeploy dance

This bit us twice. **Pasting new code into the Apps Script editor doesn't ship it.** You must redeploy. And you must redeploy via *Manage deployments → New version*, not *New deployment*. New deployment gives you a new URL; the frontend still calls the old URL which still serves the old code. Symptom: data lands in the wrong columns, or the new field you added is silently dropped.

If the live site stops behaving like the repo, check the deployment version in Apps Script first.

### 2. Sheet column order matters

The Apps Script writes rows via `sh.appendRow(values)`, which appends to columns A, B, C, ... in order. The sheet header names are only consulted on *read* (`loadRsvps` reads by header name). If you add a column to the sheet without updating the appendRow value order, every new row will be off by one. The current order is: `submitted_at, household_id, person_name, person_role, attending_day1, attending_day2, dietary, accommodations, notes, contact_email`.

Existing rows in the sheet that pre-date the `accommodations` column have notes in column H and emails in column I (where accommodations and notes now live). They need to be manually shifted or deleted — there's no migration script.

### 3. CNAME drift from the GitHub web UI

The user has been adding/deleting CNAME directly on GitHub a few times. If you push and get rejected with "fetch first", run `git pull --rebase origin main` before retrying. Your code commits won't conflict with CNAME edits.

### 4. The `topsl_lodging_note` field is a parser

It's not just text. The first `;` splits heading from body. Everything before becomes the card heading on the invitation page (e.g. "Woodland A-Frame Cabin"). Everything after is the body — reused both on the invitation card and inside the RSVP form's accommodations step. If a household has no value in this column, the entire on-site-cabin UX disappears (no card on invitation, no accommodations step in the RSVP form) and they see the off-site recommendation grid instead.

The parser is duplicated in `assets/invitation.js` and `assets/rsvp.js`. If you change the format, change both.

### 5. The all-regret shortcut mutates state

If every adult in a household clicks "Sadly no" on the RSVP form, the form skips past child steps, plus-one, accommodations, and notes — it jumps straight to the review. As part of that jump, it sets each child's `attending` to `{day1: false, day2: false}` AND `_answered: true` on the in-memory state. If the user then navigates back and changes an adult to "Yes", the children's attendance flags persist as `false` and the child steps preselect "Sadly no". The user can still flip them, but it's a one-extra-click cost. Documented intentionally; the alternative (resetting children on back-nav) felt worse.

### 6. Coral is rationed

The coral accent (`rgb(243, 131, 117)`) appears in exactly three places: the RSVP button in the sticky nav, the Day Two itinerary card (pill background, heading, place), and the Registry section (eyebrow, heading, "View registry" button). Plus, by user addition, the "X of Y attending …" line on the RSVP-received confirmed card. Don't sprinkle it elsewhere — the design intentionally uses olive (`#384c02`) as the dominant heading color.

### 7. `git` commits need an author identity

The repo has no committer config. Commits use environment variables:

```bash
GIT_AUTHOR_NAME="jer207" GIT_AUTHOR_EMAIL="jeremyhammond207@gmail.com" \
GIT_COMMITTER_NAME="jer207" GIT_COMMITTER_EMAIL="jeremyhammond207@gmail.com" \
git commit -m "..."
```

On the new machine you can either set `git config user.name` / `user.email` once, or keep using the env-var prefix. Past commits use the author shown above; matching it keeps the history visually clean.

### 8. CRLF warnings on Windows

Every commit on the original (Windows) machine produced `warning: in the working copy of '<file>', LF will be replaced by CRLF the next time Git touches it`. Harmless. The repo has no `.gitattributes`; git is autoconverting line endings on checkout.

### 9. The Apps Script frontend URL is hardcoded

`APPS_SCRIPT_URL` is committed to `assets/store.js`. If you ever rotate it (only happens if you do *New deployment* by accident), update the constant and push.

### 10. Demo-mode commits would break production

Before every push, confirm `MODE = 'remote'` in `assets/store.js`. There's no automated check.

### 11. The contact modal "Send" opens a mailto

There's no contact-form backend. The Contact modal collects fields and then opens the user's mail client via `mailto:` with the message pre-filled. The on-screen "Got it!" success step assumes they hit send; we have no signal that they did.

### 12. The RSVP `accommodations` value is per-household, written per-row

When a household submits, the Apps Script writes one sheet row per attendee (and one for the plus-one if present). Each of those rows gets the same `accommodations`, `notes`, and `contact_email` values. This denormalization keeps the sheet flat and easy to scan but means if you ever edit a row by hand you should edit the others in the same household consistently.

### 13. Children attendance defaults

Children default to attending all days the household is invited to. There's no per-child opt-in step before the RSVP form is opened — the parent has to actively click "Sadly no" for any child they want marked absent.

---

## Current state & open items

### Shipped and live

- Full Jess & Jeremy design system (J9 Poem + Nunito, olive on cream, coral accent in three places).
- Three-page site (index, invitation, admin) with sticky pill nav, scroll-spy, mobile burger menu.
- RSVP modal with per-guest steps, optional plus-one, conditional accommodations step, message, review, success. Mount-the-shell-once architecture for smooth Continue transitions. All-regret shortcut.
- Contact modal post-submission.
- Admin dashboard with stats, table including a Lodging column, CSV export.
- Apps Script backend with the `accommodations` column wired through (paste + redeploy required on Apps Script side — see gotcha #1).
- Custom domain `jessandjeremy.com` live.

### Known TODOs and placeholders

- `WEDDING.registryUrl` in `data.js` is `'#'`. Needs the real registry link before launch.
- FAQ items in `data.js` (`faqBoth`, `faqDay2`) are seed copy; the couple will refine over time. The structure is array of `{title, body}` objects.
- The two FAQ arrays currently share most items — diverge as needed for tier-specific concerns.
- A user message on the previous session referenced "For weekend guests, update " — the bullet was cut off mid-sentence. Whatever they intended to update was never resolved; worth re-asking next time they're around.
- Old RSVP rows that pre-date the `accommodations` column have notes in column H and emails in column I. They need to be manually shifted right by one or deleted. No migration script.

### Not yet built (potential future work)

- The contact modal "Send" path opens `mailto:` only. If we want a real server-side contact handler, we'd add a `contact` action to the Apps Script.
- No real authentication. Lookup is a guest-list filter, not a login. The README's "Security model" section is accurate; the couple is aware.
- No automated test suite. All verification is manual via demo mode in the browser.
- No `.github/workflows/` — fully relying on GitHub Pages' built-in `main` deploy.

### Useful exploratory commands

```bash
# Confirm we're in remote mode and pointed at production
grep -E "^const (MODE|APPS_SCRIPT_URL)" assets/store.js

# All places the contact email appears (should be exactly one canonical spot in data.js + references)
grep -rn "hello@jessandjeremy.com" --include='*.html' --include='*.js' --include='*.gs'

# All places coral is referenced (should be small)
grep -rn "coral\|rgb(243\|rgb(212" assets/

# Find any stale references to the dropped rsvp.html
grep -rn "rsvp\.html" .
```
