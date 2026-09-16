// Reads every response row from the Google Form's linked Sheet, groups
// them by venue_slug, and (re)writes data/venues/<slug>.json for each --
// then recomputes stalls_documented in data/venues.json, since that count
// is derived, never hand-typed. Run nightly by
// .github/workflows/nightly-data-pr.yml, which opens a PR with whatever
// changed rather than pushing straight to main.
//
// Needs two things that only exist once pipeline/SETUP.md has been
// followed: a GOOGLE_SERVICE_ACCOUNT_KEY (JSON, full contents) and a
// SHEET_ID, both as env vars (GitHub Actions injects them from repo
// secrets). Running this locally means exporting both yourself first.
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const root = path.join(__dirname, '..');

function normaliseUnit(raw) {
  return String(raw || '').trim().replace(/^#/, '').toUpperCase();
}

function splitList(raw) {
  return String(raw || '')
    .split(/[,;]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function rowToStall(row) {
  const stall = {
    unit: normaliseUnit(row.unit),
    status: row.status || 'unknown',
    collected_by: row.collector_initials || '',
    verified: (row.timestamp || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
  };
  if (row.name) stall.name = row.name;
  const cuisine = splitList(row.cuisine);
  if (cuisine.length) stall.cuisine = cuisine;
  const tags = splitList(row.tags);
  if (tags.length) stall.tags = tags;
  const payment = splitList(row.payment);
  if (payment.length) stall.payment = payment;
  if (row.signature_dish) {
    stall.dishes = [{
      name: row.signature_dish,
      ...(row.signature_dish_price ? { price_sgd: Number(row.signature_dish_price) } : {}),
    }];
  }
  if (row.hours_today && row.day_collected) {
    stall.hours = { [row.day_collected.slice(0, 3).toLowerCase()]: row.hours_today };
  }
  if (row.direction_hint) stall.direction_hint = row.direction_hint;
  if (row.photo_url) stall.photos = [row.photo_url];
  return stall;
}

async function fetchRows(sheetId) {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Form Responses 1',
  });
  const [header, ...rows] = res.data.values || [[]];
  const keys = header.map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return rows.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i]])));
}

async function main() {
  const sheetId = process.env.SHEET_ID;
  if (!sheetId) throw new Error('SHEET_ID env var is required');
  const rows = await fetchRows(sheetId);

  const byVenue = new Map();
  for (const row of rows) {
    const slug = String(row.venue_slug || '').trim();
    if (!slug) continue; // never guess which venue a response belongs to
    if (!byVenue.has(slug)) byVenue.set(slug, []);
    byVenue.get(slug).push(rowToStall(row));
  }

  const venuesDir = path.join(root, 'data', 'venues');
  fs.mkdirSync(venuesDir, { recursive: true });

  for (const [slug, stalls] of byVenue) {
    // Last response for a given unit wins -- a re-visit supersedes the old one.
    const byUnit = new Map();
    for (const stall of stalls) byUnit.set(stall.unit, stall);
    const deduped = Array.from(byUnit.values()).sort((a, b) => a.unit.localeCompare(b.unit));
    fs.writeFileSync(path.join(venuesDir, `${slug}.json`), JSON.stringify(deduped, null, 2) + '\n');
  }

  const venuesPath = path.join(root, 'data', 'venues.json');
  const venues = JSON.parse(fs.readFileSync(venuesPath, 'utf8'));
  for (const venue of venues) {
    if (byVenue.has(venue.slug)) {
      venue.stalls_documented = byVenue.get(venue.slug).length;
    }
  }
  fs.writeFileSync(venuesPath, JSON.stringify(venues, null, 2) + '\n');

  console.log(`Synced ${rows.length} responses across ${byVenue.size} venue(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
