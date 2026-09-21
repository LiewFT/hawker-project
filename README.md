# Makan Trail

Every hawker centre in Singapore on one map. Each record shows the date it was
last checked; anything past its re-check deadline is labelled stale instead of
being shown as current. No ratings, no reader reviews, nothing invented.

## Pages
- `index.html` — map of all venues, search, and a filterable list
- `venue.html?v=<slug>` — one venue: facts, mini map, Google Maps link, and its
  stall list once stalls have been collected
- `about.html`, `privacy.html` (placeholder, needs legal review), `404.html`

The site is static (GitHub Pages) and currently `noindex` until launch.

## Code layout
- `js/data.js` — loads and derives everything from `data/`; no invented values
- `js/home.js`, `js/venue.js` — page logic; `js/stalls.js` — stall card shared by both
- `js/i18n.js`, `js/dictionary.js` — EN / 中文 toggle (every string in the dictionary)
- `js/common.js` — language toggle and mobile menu, on every page

## Data (`data/`, validated in CI against `schema/`)
- `data/venues.json` — all 124 NEA hawker centres. Facts from NEA's dataset on
  data.gov.sg (Open Data Licence). `stalls_documented` is computed, never typed.
- `data/venues/<slug>.json` — stalls for one venue, added only after being checked
  in person. Absent for every venue today. Until a venue has at least 30% of its
  stalls logged, its page shows the coverage line but no stall list.
- Categories (Must try, Cheap eats, Breakfast, Halal, Drinks) come from stall `tags`, so they are empty until stalls are collected. A tag needs its evidence or CI fails: `halal` needs `halal: true` and a `muis_cert` number; `cheap-eats` needs a dish at or under $5 (`CHEAP_MAX_SGD`, in `scripts/validate-data.js` and `js/data.js`).
- `npm run validate-data` runs the same check CI runs.
- `pipeline/SETUP.md` — Google Form → Sheet → nightly PR pipeline (needs a Google account).

## Map
OneMap raster tiles (no API key needed), locked to Singapore. Attribution to
NEA / data.gov.sg and OneMap / SLA stays visible.

## Not built yet
Region filter (needs official planning-region boundaries), dish-first search
(needs stall data), Makan Trails, closure tracker, tip line, per-page share
images, and the MustGoToEat rebrand and domain (ownership decisions are open).
