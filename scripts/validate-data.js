// Validates every file under data/ against its schema. Run locally with
// `npm run validate-data`; runs automatically in CI on every PR that
// touches data/** or schema/** (see .github/workflows/validate-data.yml).
// A record missing a required field (verified, collected_by, etc.) fails
// the build here rather than reaching the site silently incomplete.
const fs = require('fs');
const path = require('path');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const root = path.join(__dirname, '..');
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

const venueSchema = JSON.parse(fs.readFileSync(path.join(root, 'schema', 'venue.schema.json'), 'utf8'));
const stallSchema = JSON.parse(fs.readFileSync(path.join(root, 'schema', 'stall.schema.json'), 'utf8'));
const validateVenue = ajv.compile(venueSchema);
const validateStall = ajv.compile(stallSchema);

let failures = 0;

function fail(file, index, errors) {
  failures++;
  const where = index === null ? file : `${file} [index ${index}]`;
  console.error(`\nINVALID: ${where}`);
  for (const err of errors) {
    console.error(`  ${err.instancePath || '(root)'} ${err.message}`);
  }
}

// data/venues.json -- a single array of venue records.
const venuesPath = path.join(root, 'data', 'venues.json');
if (fs.existsSync(venuesPath)) {
  const venues = JSON.parse(fs.readFileSync(venuesPath, 'utf8'));
  if (!Array.isArray(venues)) {
    console.error('data/venues.json must be a JSON array');
    failures++;
  } else {
    const seenSlugs = new Set();
    venues.forEach((venue, i) => {
      if (!validateVenue(venue)) fail('data/venues.json', i, validateVenue.errors);
      if (seenSlugs.has(venue.slug)) {
        fail('data/venues.json', i, [{ instancePath: '/slug', message: `duplicate slug "${venue.slug}"` }]);
      }
      seenSlugs.add(venue.slug);
    });
    console.log(`Checked ${venues.length} venue records in data/venues.json`);
  }
} else {
  console.log('data/venues.json not found -- skipping (nothing to validate yet)');
}

// data/venues/<slug>.json -- each one an array of stall records for that venue.
const venuesDir = path.join(root, 'data', 'venues');
if (fs.existsSync(venuesDir)) {
  const files = fs.readdirSync(venuesDir).filter((f) => f.endsWith('.json'));
  let stallCount = 0;
  for (const file of files) {
    const stalls = JSON.parse(fs.readFileSync(path.join(venuesDir, file), 'utf8'));
    if (!Array.isArray(stalls)) {
      console.error(`data/venues/${file} must be a JSON array`);
      failures++;
      continue;
    }
    const seenUnits = new Set();
    stalls.forEach((stall, i) => {
      if (!validateStall(stall)) fail(`data/venues/${file}`, i, validateStall.errors);
      if (stall.status === 'open' && !stall.name) {
        fail(`data/venues/${file}`, i, [{ instancePath: '/name', message: 'is required when status is "open"' }]);
      }
      if (seenUnits.has(stall.unit)) {
        fail(`data/venues/${file}`, i, [{ instancePath: '/unit', message: `duplicate unit "${stall.unit}" in this venue` }]);
      }
      seenUnits.add(stall.unit);
      stallCount++;
    });
  }
  console.log(`Checked ${stallCount} stall records across ${files.length} venue files in data/venues/`);
} else {
  console.log('data/venues/ not found -- skipping (no stall-level data collected yet)');
}

if (failures > 0) {
  console.error(`\n${failures} validation failure(s).`);
  process.exit(1);
}
console.log('\nAll data files valid.');
