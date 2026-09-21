// Data access and small helpers. Everything the site shows comes from
// data/venues.json (every venue) and data/venues/<slug>.json (that venue's
// stalls, only once someone has actually collected them). Nothing here
// invents a value: a missing field stays missing.

export const STALE_DAYS = { venue: 365, stallPick: 90, stall: 180, tombstone: 365 };

export async function loadVenues() {
  const res = await fetch('data/venues.json');
  if (!res.ok) throw new Error(`venues.json: HTTP ${res.status}`);
  return res.json();
}

export async function loadStalls(slug) {
  try {
    const res = await fetch(`data/venues/${encodeURIComponent(slug)}.json`);
    if (!res.ok) return [];
    const stalls = await res.json();
    return Array.isArray(stalls) ? stalls : [];
  } catch {
    return [];
  }
}

export function venueUrl(slug) {
  return `venue.html?v=${encodeURIComponent(slug)}`;
}

// A plain link out. We never copy Google's names, hours or reviews.
export function googleMapsUrl(venue) {
  return `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`;
}

export function daysSince(isoDate) {
  const then = new Date(`${isoDate}T00:00:00Z`).getTime();
  return Math.floor((Date.now() - then) / 86400000);
}

export function formatDate(isoDate, lang) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-SG' : 'en-SG', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(d);
}

// Every count on the site is derived from the data, never typed.
export function summarize(venues) {
  const listed = venues.length;
  const underConstruction = venues.filter((v) => v.status === 'under_construction').length;
  const closed = venues.filter((v) => v.status === 'closed').length;
  const open = venues.filter((v) => v.status === 'open').length;
  const stallsDocumented = venues.reduce((n, v) => n + (v.stalls_documented || 0), 0);
  const venuesDocumented = venues.filter((v) => v.stalls_documented > 0).length;
  return { listed, open, underConstruction, closed, stallsDocumented, venuesDocumented };
}

// Tiny DOM builder. Uses textContent, so data can never inject markup.
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}
