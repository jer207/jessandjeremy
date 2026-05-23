# Jess & Jeremy — Wedding Site

Static site, hosted on GitHub Pages. RSVPs go to a Google Sheet via a tiny Apps Script backend. Until you flip the switch to remote mode, it runs in demo mode with mock data stored in your browser.

## How the parts fit together

```
Browser  →  GitHub Pages (HTML/CSS/JS)  →  Apps Script Web App  →  Google Sheet
                                                                ↓
                                                              Email
```

GitHub Pages just serves the files. When someone submits an RSVP, the browser POSTs JSON to your Apps Script URL, which writes to the sheet and emails you. No server to rent, no database to manage.

---

## Production setup

### 1. Get the code into GitHub

1. Create a new repo (private is fine — GitHub Pages can publish from private repos on free accounts now).
2. Push the contents of this folder to the `main` branch.
3. Repo Settings → Pages → Source: "Deploy from branch", Branch: `main`, Folder: `/ (root)`. Save.
4. Wait a minute, then visit `https://<your-username>.github.io/<repo-name>` to confirm it's live.
5. Custom domain: add a file called `CNAME` in the repo root with just your domain on one line (e.g. `jessandjeremy.com`). Then point your DNS at GitHub Pages per [GitHub's docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site). It usually means setting four `A` records on the apex and a `CNAME` on `www`.

At this point the site is live but still in demo mode. Time to wire up the backend.

### 2. Set up the Google Sheet (you've started this)

The sheet should have three tabs. Headers go in row 1; the script looks them up by name.

**Households**
```
id | tier | adult1_first | adult1_last | adult1_email | adult2_first | adult2_last | adult2_email | children | plus_one_allowed | topsl_lodging_note
```

- `id` — short slug, lowercase, no spaces (e.g. `carroll`, `brennan`).
- `tier` — `both` or `day2`. Nothing else.
- Adult 2 columns blank for single adults.
- `children` — semicolon-separated first names: `Sophie; Theo`.
- `plus_one_allowed` — `1` or `0`. Only mark `1` for guests who can bring a plus-one.
- `topsl_lodging_note` — optional. Filling this in tells the site this household has a reserved on-site site at Tops'l Farm. Format is `Heading; Body text` — everything before the first semicolon becomes the card heading (e.g. "Woodland A-Frame Cabin"), everything after is the body copy used in both the invitation's accommodations card and the RSVP form's accommodations step. Leave blank for households who aren't being assigned a site — they'll see the off-site recommendations list instead and won't be asked the on-site/off-site question during RSVP.

**RSVPs** (leave empty — the script writes here)
```
submitted_at | household_id | person_name | person_role | attending_day1 | attending_day2 | dietary | accommodations | notes | contact_email
```

- `accommodations` — set to `onsite` or `offsite` per household (same value on every row of that household). Empty for households who weren't asked the question (i.e., no `topsl_lodging_note` on their Households row).

**Admins**
```
name
------
Jess
Jeremy
```

### 3. Deploy the Apps Script

1. Open the spreadsheet. **Extensions → Apps Script**.
2. Delete whatever's in `Code.gs` and paste in the contents of `apps-script/Code.gs` from this repo.
3. **Project Settings (gear icon) → Script Properties → Add script property** three times:

| Property | Value |
|---|---|
| `SHEET_ID` | `1xFsgCZi_a8_O_7_douQFI-3U0Hd5Ot7eKmXuufOWpF8` |
| `ADMIN_EMAIL` | Your email — where RSVP alerts go |
| `COUPLE_NAMES` | `Jess & Jeremy` |

4. **Deploy → New deployment**. Click the gear next to "Select type" and choose **Web app**.
   - **Description**: `wedding-rsvp-v1` (anything you want)
   - **Execute as**: **Me**
   - **Who has access**: **Anyone**

5. Click **Deploy**. Google will ask for authorization. You'll see a scary-looking "Google hasn't verified this app" screen — that's because the script is written by you (not by a verified developer), and it accesses your Sheet and your Gmail. Click **Advanced → Go to (project name) (unsafe)**. Review the permissions, click Allow. (It's authorizing your own script to do things on your own account. Not unsafe in this case.)

6. Copy the **Web app URL** from the deployment success screen. It looks like:
   ```
   https://script.google.com/macros/s/AKfycby...long_string.../exec
   ```

### 4. Point the site at the backend

Open `assets/store.js` and change the top two lines:

```js
const MODE = 'remote';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfy.../exec';
```

Commit, push. The site is now live with real data.

### 5. Test the round trip

1. Open the live site. The demo banner at the bottom should be gone.
2. Look yourself up by full name — you should land on the admin dashboard (since `Jess` is in the Admins tab).
3. Sign out, look up one of your test guests. You should see their invitation.
4. RSVP for them. Check that the data lands in the `RSVPs` tab of the sheet, and that you got an email at `ADMIN_EMAIL`.
5. Reload the invitation page — it should now show the "RSVP received" confirmation.

To reset between tests, just delete the data rows in the `RSVPs` tab (leave the headers).

### Updating later

- **Add/edit guests**: edit the `Households` tab directly. Changes are live immediately — no redeploy needed.
- **Change site code (copy, styling, accommodations, etc.)**: edit the files, commit, push.
- **Change the Apps Script**: paste in the new code, then **Deploy → Manage deployments → pencil icon → Version: New version → Deploy**. (Don't create a new deployment — that gives you a new URL. Update the existing one to keep the same URL.)

---

## Demo mode (current default)

Open `index.html` directly, or:
```
python3 -m http.server 8000
# open http://localhost:8000
```

In demo mode (`MODE = 'demo'` in `assets/store.js`) RSVPs save to `localStorage` only. There's a banner at the bottom; the "Reset demo" button clears everything.

The mock guest list (`assets/data.js`) has 12 households representing every combination — both-day vs day-2, with/without kids, with/without plus-one allowance. The Carroll household has a sample `topslLodgingNote` so you can see how that field renders.

Type any **full name** (first and last together) or email to look up your invitation. A first name or last name alone works if it's unique across the guest list; if not, the system will prompt you to enter your full name.

To reach the admin dashboard, type `Jess` or `Jeremy`.

---

## Security model

The lookup is a guest list filter, not authentication. Someone who knows a guest's name can look up their invitation and RSVP for them. That matches what nearly every wedding platform does (Zola, The Knot, Joy, etc.) and the realistic threat is benign.

If you want stronger protection later, the cleanest add is an invitation code printed on each physical invite (e.g. `RSVP-A47K`). Store it in a new column and require it alongside the name. Happy to wire it up.

The Apps Script URL is "public" in the sense that anyone with it can POST, but the URL itself is long and unguessable, and the script only does the four things in the code: lookup, get one household, submit an RSVP for a real household ID, and (with admin verification) get the full list.

---

## What lives where

- **`assets/data.js`** holds the static site copy in `WEDDING` (couple names, event details, registry URL, off-site lodging list, things-to-do list, RSVP deadline, contact email). Edit and push to change this content. The `HOUSEHOLDS` and `ADMINS` arrays in this file are only used in demo mode — in remote mode they're ignored, and the script reads guests from the Google Sheet instead.
- **The Google Sheet** holds the dynamic data: who's invited, who's responded, and any per-household lodging notes.

## File layout

```
wedding-site/
├── index.html              landing + lookup
├── invitation.html         personalized invitation page (hosts the RSVP modal)
├── admin.html              admin dashboard
├── assets/
│   ├── style.css
│   ├── fonts/              J9 Poem + Nunito
│   ├── data.js             mock guest list (demo mode only — safe to leave in remote mode)
│   ├── store.js            data layer (demo + remote, switch at top)
│   ├── lookup.js
│   ├── invitation.js
│   ├── rsvp.js             RsvpModal.open(household, opts) — loaded by invitation.html
│   └── admin.js
├── apps-script/
│   └── Code.gs             paste into Google Apps Script
└── README.md
```

## Customizing copy

Everything is in `assets/data.js` under the `WEDDING` object: couple names, dates, venue copy, RSVP deadline, registry URL, off-site accommodations, things-to-do list. Edit and push.
