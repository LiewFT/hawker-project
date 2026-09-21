# Makan Trail

A map of every hawker centre in Singapore, plus a demo layer of sample stalls.

## Two kinds of content
- **Real:** all 124 NEA hawker centres in `data/venues.json` (name, address,
  location, NEA stall count, status, checked date). Each has a page at
  `venue.html?v=<slug>`. Facts come from NEA's dataset on data.gov.sg
  (Open Data Licence). `stalls_documented` is computed, never typed.
- **Demo:** the six featured centres (red pins) carry fictional sample stalls
  with dish illustrations, the stall detail pages, and the homepage
  "Latest tastings" cards. They are labelled **Demo** in the map panel and
  under a DEMO CONTENT banner on the homepage, and are not counted as real
  stalls. They live in `hawkerCentres` in `script.js`.

## Pages
- `index.html` — clustered map (real venues + demo centres), search, demo sections
- `venue.html?v=<slug>` — a real venue: facts, mini map, Google Maps link, checked
  date (stale label past its deadline), coverage line, and a stall list once
  `data/venues/<slug>.json` exists (hidden below 30% coverage)
- `account.html` — sign in, create an account (nickname, email, password + confirm), verify
  email, reset password, your reviews, delete account. `?next=<page>.html` returns you
  to where you came from.
- `stall.html?hc=<id>&stall=<slug>` — demo stall page
- `about.html`, `privacy.html` (placeholder, needs legal review), `404.html`

Static site (GitHub Pages), currently `noindex`.

## Code
- `script.js` — map, search, EN/中文 dictionary (`I18N`), demo stall page. Exposes
  `window.MT = { t, getLang }` and fires `langchange` so the ES modules can share
  the same dictionary.
- `js/venue.js` (venue page), `js/stalls.js` (stall card), `js/data.js`, `js/i18n.js` —
  ES modules; DOM built with `textContent`
- `js/reviews-ui.js` (visitor reviews on venue pages: write, ⋯ menu to edit or delete),
  `js/account.js` (account page), `js/nav-auth.js` (nickname in the nav), `js/backend.js`
  (Firebase Auth + Firestore), `js/firebase-config.js`, `js/strings.js` (EN/中文 text for
  the account and review screens), `js/ui-common.js`

## Visitor reviews
Visitors review a real hawker centre on its venue page. They register on `account.html` with a
nickname, email and password (typed twice) and verify the email first. Backed by Firebase Authentication +
Firestore (encrypted in transit and at rest by Google; passwords are hashed and never
reach our code; emails are not stored with reviews). **Switches on when
`js/firebase-config.js` is filled in** (see `firebase/SETUP.md`); rules are in
`firebase/firestore.rules`.
Demo stalls have no reviews.

## Data (`data/`, validated in CI against `schema/`)
- `npm run validate-data` runs the same check CI runs.
- `data/venues/<slug>.json` — real stalls, added only after being checked in
  person. None exist yet.
- Stall `tags` (must-try, cheap-eats, breakfast, halal, drinks) need their evidence
  or CI fails: `halal` needs `halal: true` and a
  `muis_cert` number; `cheap-eats` needs a dish at or under $5 (`CHEAP_MAX_SGD`,
  in `scripts/validate-data.js` and `js/data.js`).
- `pipeline/SETUP.md` — Google Form → Sheet → nightly PR pipeline (needs a Google account).

## Map
Leaflet with OneMap raster tiles (no API key), locked to Singapore.
Attribution to NEA / data.gov.sg and OneMap / SLA stays visible.
