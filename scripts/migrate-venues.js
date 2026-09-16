// One-off migration: reads the hawkerCentres and directoryCentres arrays
// straight out of script.js (trusted, our own file) and writes
// data/venues.json in the new schema. Run again any time script.js's map
// data changes -- this is not meant to be hand-edited afterwards; edit
// script.js (or, once the real pipeline exists, the source of truth there)
// and re-run this instead.
const fs = require('fs');
const path = require('path');

const scriptSrc = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');

function extractArrayLiteral(src, constName) {
  const startMarker = `const ${constName} = [`;
  const start = src.indexOf(startMarker);
  if (start === -1) throw new Error(`Could not find ${constName} in script.js`);
  const arrayStart = start + startMarker.length - 1; // include the opening [
  let depth = 0;
  let i = arrayStart;
  for (; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') {
      depth--;
      if (depth === 0) { i++; break; }
    }
  }
  const literal = src.slice(arrayStart, i);
  // eslint-disable-next-line no-eval -- trusted, our own source file
  return eval(literal);
}

const hawkerCentres = extractArrayLiteral(scriptSrc, 'hawkerCentres');
const directoryCentres = extractArrayLiteral(scriptSrc, 'directoryCentres');

// Flagged in an earlier PR: this legacy entry is technically "Under
// Construction" per NEA's latest snapshot (a separate interim centre
// nearby is the one actually operating). The new schema gives us an
// honest way to say so instead of just a code comment.
const UNDER_CONSTRUCTION_NAMES = new Set(['Bukit Timah Market']);

const VERIFIED_DATE = '2026-09-14'; // date this NEA snapshot was fetched and checked in this repo

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const venues = [];

for (const hc of hawkerCentres) {
  venues.push({
    slug: hc.id,
    name: hc.name,
    type: 'hawker',
    lat: hc.lat,
    lng: hc.lng,
    address: hc.address,
    stall_count_nea: hc.stallCount,
    stalls_documented: 0,
    status: UNDER_CONSTRUCTION_NAMES.has(hc.name) ? 'under_construction' : 'open',
    verified: VERIFIED_DATE,
  });
}

for (const [name, lat, lng, address, stallCount] of directoryCentres) {
  venues.push({
    slug: slugify(name),
    name,
    type: 'hawker',
    lat,
    lng,
    address,
    stall_count_nea: stallCount,
    stalls_documented: 0,
    status: UNDER_CONSTRUCTION_NAMES.has(name) ? 'under_construction' : 'open',
    verified: VERIFIED_DATE,
  });
}

venues.sort((a, b) => a.slug.localeCompare(b.slug));

const outPath = path.join(__dirname, '..', 'data', 'venues.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(venues, null, 2) + '\n');
console.log(`Wrote ${venues.length} venues to ${outPath}`);
