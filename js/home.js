// Homepage: island map of every venue, a search box, and a full list.
// All venue facts come from data/venues.json.
import './common.js';
import { t, getLang } from './i18n.js';
import {
  STALE_DAYS, loadVenues, venueUrl, googleMapsUrl, daysSince, formatDate, summarize, el,
} from './data.js';

const SG_CENTER = [1.3226, 103.8636];
const SG_ZOOM = 12;
const SG_BOUNDS = L.latLngBounds([1.130, 103.55], [1.475, 104.15]);

const statsEl = document.getElementById('venueStats');
const panelEl = document.getElementById('venuePanel');
const listEl = document.getElementById('venueList');
const listEmptyEl = document.getElementById('venueListEmpty');
const listInput = document.getElementById('venueFilterInput');
const searchInput = document.getElementById('mapSearchInput');
const searchResults = document.getElementById('mapSearchResults');
const mapBack = document.getElementById('mapBack');

let venues = [];
let map;
let selected = null;
const markers = new Map(); // slug -> circleMarker
let statusFilter = 'all';

const COLORS = { open: '#2A6660', under_construction: '#B8AE96', closed: '#B8AE96', selected: '#C23B22' };

function markerStyle(venue, isSelected) {
  const open = venue.status === 'open';
  return {
    radius: isSelected ? 10 : 7,
    color: '#ffffff',
    weight: 2,
    fillColor: isSelected ? COLORS.selected : COLORS[venue.status] || COLORS.open,
    fillOpacity: open || isSelected ? 0.95 : 0.6,
  };
}

function statusLabel(venue) {
  return t(`status_${venue.status}`);
}

function stallCountText(venue) {
  return venue.stall_count_nea > 0
    ? t('cookedStalls', { n: venue.stall_count_nea })
    : t('marketStallsOnly');
}

function checkedText(venue) {
  const stale = daysSince(venue.verified) > STALE_DAYS.venue;
  return stale
    ? t('staleChecked', { date: formatDate(venue.verified, getLang()) })
    : t('checked', { date: formatDate(venue.verified, getLang()) });
}

// ---------- stats ----------
function renderStats() {
  const s = summarize(venues);
  const parts = [t('statsListed', { n: s.listed })];
  if (s.underConstruction) parts.push(t('statsUnderConstruction', { n: s.underConstruction }));
  parts.push(t('statsStalls', { n: s.stallsDocumented }));
  statsEl.textContent = parts.join(' · ');
}

// ---------- panel ----------
function renderPanel() {
  panelEl.replaceChildren();
  if (!selected) {
    panelEl.append(el('p', { class: 'map-hint', text: t('mapHint') }));
    return;
  }
  const v = selected;
  panelEl.append(
    el('p', { class: 'tag', text: `${t('typeHawker')} · ${statusLabel(v)}` }),
    el('h3', { text: v.name }),
    el('p', { class: 'popup-meta', text: `${v.address} · ${stallCountText(v)}` }),
    el('p', { class: 'popup-meta', text: checkedText(v) }),
    el('div', { class: 'panel-actions' },
      el('a', { class: 'popup-btn', href: venueUrl(v.slug), text: t('viewVenue') }),
      el('a', {
        class: 'popup-btn popup-btn-quiet', href: googleMapsUrl(v), target: '_blank', rel: 'noopener', text: t('openInGoogleMaps'),
      })),
  );
}

function select(venue, { fly = true } = {}) {
  if (selected) markers.get(selected.slug)?.setStyle(markerStyle(selected, false));
  selected = venue;
  if (venue) {
    const marker = markers.get(venue.slug);
    marker.setStyle(markerStyle(venue, true));
    marker.bringToFront();
    if (fly) map.setView([venue.lat, venue.lng], Math.max(map.getZoom(), 15));
  }
  mapBack.hidden = !venue;
  document.getElementById('mapTitle').textContent = venue ? venue.name : t('mapTitleDefault');
  renderPanel();
}

// ---------- map ----------
function initMap() {
  map = L.map('hawkerMap', {
    maxBounds: SG_BOUNDS,
    maxBoundsViscosity: 1.0,
    minZoom: 11,
    maxZoom: 18,
    scrollWheelZoom: true,
    renderer: L.canvas({ padding: 0.5, tolerance: 10 }), // tolerance: forgiving touch targets
  }).setView(SG_CENTER, SG_ZOOM);

  L.tileLayer('https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png', {
    attribution: '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener">OneMap</a> &copy; contributors | Powered by SLA',
    minZoom: 11,
    maxZoom: 18,
    updateWhenIdle: true,
  }).addTo(map);
  map.attributionControl.setPrefix(false);

  for (const venue of venues) {
    const marker = L.circleMarker([venue.lat, venue.lng], markerStyle(venue, false)).addTo(map);
    marker.bindTooltip(venue.name, { direction: 'top', offset: [0, -6] });
    marker.on('click', () => select(venue));
    markers.set(venue.slug, marker);
  }

  mapBack.addEventListener('click', () => {
    select(null);
    map.setView(SG_CENTER, SG_ZOOM);
  });
}

// ---------- map search ----------
function matches(venue, query) {
  const q = query.trim().toLowerCase();
  return !q || venue.name.toLowerCase().includes(q) || venue.address.toLowerCase().includes(q);
}

function renderSearchResults(query) {
  searchResults.replaceChildren();
  if (!query.trim()) { searchResults.hidden = true; return; }
  const q = query.trim().toLowerCase();
  const found = venues
    .filter((v) => matches(v, query))
    .sort((a, b) => Number(b.name.toLowerCase().includes(q)) - Number(a.name.toLowerCase().includes(q)))
    .slice(0, 6);
  if (!found.length) {
    searchResults.append(el('div', { class: 'map-search-empty', text: t('searchNoMatch') }));
  }
  for (const v of found) {
    searchResults.append(el('button', {
      type: 'button',
      class: 'map-search-item',
    }, el('strong', { text: v.name }), el('span', { text: v.address })));
    searchResults.lastChild.addEventListener('click', () => {
      select(v);
      searchResults.hidden = true;
      searchInput.value = v.name;
    });
  }
  searchResults.hidden = false;
}

let searchTimer;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  const value = e.target.value;
  searchTimer = setTimeout(() => renderSearchResults(value), 150);
});
searchInput.addEventListener('focus', (e) => { if (e.target.value) renderSearchResults(e.target.value); });
document.addEventListener('click', (e) => {
  if (!searchResults.contains(e.target) && e.target !== searchInput) searchResults.hidden = true;
});

// ---------- full list ----------
function renderList() {
  const query = listInput.value;
  const shown = venues
    .filter((v) => matches(v, query) && (statusFilter === 'all' || v.status === statusFilter))
    .sort((a, b) => a.name.localeCompare(b.name));
  listEl.replaceChildren(...shown.map((v) => el('li', { class: 'venue-card' },
    el('a', { class: 'venue-card-link', href: venueUrl(v.slug) },
      el('strong', { text: v.name }),
      el('span', { class: 'venue-card-meta', text: `${v.address} · ${stallCountText(v)}` }),
      v.status !== 'open' ? el('span', { class: 'badge badge-muted', text: statusLabel(v) }) : null,
      el('span', { class: 'venue-card-checked', text: checkedText(v) })))));
  listEmptyEl.hidden = shown.length > 0;
  document.getElementById('venueListStatus').textContent = t('showingVenues', { n: shown.length, total: venues.length });
}

listInput.addEventListener('input', renderList);
document.querySelectorAll('[data-status-filter]').forEach((chip) => {
  chip.addEventListener('click', () => {
    statusFilter = chip.dataset.statusFilter;
    document.querySelectorAll('[data-status-filter]').forEach((c) => c.classList.toggle('chip-active', c === chip));
    renderList();
  });
});

// ---------- boot ----------
function rerender() {
  renderStats();
  renderPanel();
  renderList();
  if (!selected) document.getElementById('mapTitle').textContent = t('mapTitleDefault');
}

document.addEventListener('langchange', () => { if (venues.length) rerender(); });

try {
  venues = await loadVenues();
  initMap();
  rerender();
} catch (err) {
  console.error(err);
  statsEl.textContent = t('loadError');
}
