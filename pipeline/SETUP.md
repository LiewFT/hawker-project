# Stall data collection pipeline — setup

This is the "Form → Sheet → PR" pipeline described in the MustGoToEat plan
(section 05). The code side (sync script + GitHub Action) is written and
ready. The Google-account side needs to be created by hand — nobody else
can do that step for you, the same way the OneMap and Firebase setup did
earlier in this project.

## What you need to create

### 1. The Google Form

One submission per stall. Fields, in tap order (matches the plan exactly):

| Field | Type | Notes |
|---|---|---|
| venue_slug | Short answer, pre-filled | See "pre-filling" below — never let the collector free-type this |
| unit | Short answer | e.g. `01-23` |
| name | Short answer | Required unless status is closed/unknown |
| status | Dropdown | `open`, `closed`, `unknown` |
| cuisine | Dropdown (allow multiple) | Controlled list — start with: local, chinese, malay, indian, teochew, hokkien, drinks, dessert |
| tags | Checkboxes | `must-try`, `cheap-eats`, `breakfast`, `halal`, `drinks`. The site's category filters come from these. `halal` needs the MUIS number below; `cheap-eats` needs a dish at or under $5 (change the threshold in `scripts/validate-data.js`). CI rejects a record that breaks either rule. |
| muis_cert | Short answer | MUIS halal certificate number as seen on the stall. Leave blank if there is none — never tick halal without it |
| hours_today | Short answer | e.g. `11:00-19:30` — the sync script only fills in the day it was collected on; leave other days for a return visit |
| payment | Checkboxes | `cash`, `paynow`, `card`, `nets` |
| signature_dish | Short answer | Optional |
| signature_dish_price | Short answer | Optional, SGD |
| direction_hint | Paragraph | "Level 1, aisle nearest Maxwell Road, opposite the drinks stall" |
| photo | File upload | Optional — only ever a photo the collector took themselves |
| collector_initials | Short answer | Required |

### 2. Pre-filling `venue_slug` (so it's never free-typed)

Google Forms supports pre-filled links. Once the form exists:
1. Open the form → ⋮ menu → **Get pre-filled link**
2. Fill in `venue_slug` with a real slug (e.g. `maxwell`), leave everything else blank
3. Click **Get link** — it gives you a URL like
   `https://docs.google.com/forms/d/e/.../viewform?usp=pp_url&entry.123456789=maxwell`
4. Build one bookmark per venue by swapping the slug at the end. This is the
   "opened from a bookmark that pre-fills venue_slug" step from the plan —
   the collector taps the Maxwell bookmark while standing in Maxwell, never
   types the venue name.

### 3. Link the Form to a Sheet

Form → Responses tab → the green Sheets icon → **Create spreadsheet**.
Note the Sheet's ID from its URL — you'll need it in step 5:
`https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`

### 4. A Google Cloud service account (read-only on the Sheet)

The sync script (`scripts/sync-sheet-to-json.js`) authenticates as a
service account, not as you — so a leaked GitHub secret can only ever
read this one sheet, never your whole Google account.

1. In [Google Cloud Console](https://console.cloud.google.com), create a
   project (or reuse one), enable the **Google Sheets API**.
2. **IAM & Admin → Service Accounts → Create service account.** No roles
   needed at the project level — access is granted per-sheet in step 5.
3. Create a JSON key for it and download it. This file is a credential —
   never commit it.
4. Open the response Sheet → **Share** → paste the service account's
   `...@...iam.gserviceaccount.com` email → give it **Viewer** access.

### 5. GitHub repo secrets

Repo → Settings → Secrets and variables → Actions → **New repository secret**:

| Secret name | Value |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | the entire contents of the JSON key file from step 4 |
| `SHEET_ID` | the Sheet ID from step 3 |

## What happens once this is set up

`.github/workflows/nightly-data-pr.yml` runs `scripts/sync-sheet-to-json.js`
every night. The script:

1. Reads every response row from the Sheet
2. Groups rows by `venue_slug`, converts each into a stall record matching
   `schema/stall.schema.json`
3. Writes `data/venues/<slug>.json` for every venue that has at least one
   response
4. Recomputes `stalls_documented` in `data/venues.json` for those venues
   (never hand-typed, per the plan)
5. Opens a PR with the diff, if there is one, for a teammate to review —
   nothing merges automatically

Until the secrets above exist, the workflow will simply fail at the
"authenticate" step — that's expected and safe; it does not touch `main`
until someone approves the PR it opens anyway.
