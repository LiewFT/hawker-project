// Venue page: /venue.html?v=<slug>. Shows the real venue facts from
// data/venues.json and, once stalls have been collected, that venue's stall
// list from data/venues/<slug>.json. Every record shows its checked date;
// past its re-check deadline it is labelled stale, never shown as current.
import { t } from './i18n.js';
import { stallCard, stamp } from './stalls.js';
import {
  STALE_DAYS, loadVenues, loadStalls, googleMapsUrl, daysSince, el,
} from './data.js';

const root = document.getElementById('venueRoot');
const slug = new URLSearchParams(location.search).get('v');

// Below this share of a venue's stalls logged, we show the venue but not a
// stall list: a handful of entries would read as if it were the whole centre.
const MIN_COVERAGE_FOR_LIST = 0.3;

let venue = null;
let stalls = [];
let mapInstance = null;

function infoRow(label, value) {
  return el('div', { class: 'info-row' }, el('span', { text: label }), el('span', { text: value }));
}

function renderStallSection() {
  const documented = stalls.length || venue.stalls_documented || 0;
  const total = venue.stall_count_nea;
  const coverage = total > 0 ? documented / total : 1; // unknown total: nothing to compare against
  const line = total > 0
    ? t('coverageLine', { n: documented, total })
    : t('coverageLineNoTotal', { n: documented });

  const children = [
    el('h2', { text: t('stallsHeading') }),
    el('p', { class: 'coverage-line', text: line }),
    el('p', { class: 'popup-meta', text: t('missingNotAbsent') }),
  ];
  if (stalls.length && coverage >= MIN_COVERAGE_FOR_LIST) {
    const ordered = [...stalls].sort((a, b) =>
      (b.editorial === 'pick') - (a.editorial === 'pick') || a.unit.localeCompare(b.unit));
    children.push(el('ul', { class: 'stall-list' }, ordered.map((s) => stallCard(s))));
  } else if (stalls.length) {
    children.push(el('p', { class: 'popup-meta', text: t('belowCoverage') }));
  } else {
    children.push(el('p', { class: 'popup-meta', text: t('noStallsYet') }));
  }
  return el('section', { class: 'venue-stalls' }, children);
}

function render() {
  root.replaceChildren();
  if (!venue) {
    root.append(
      el('h1', { class: 'page-title', text: t('venueNotFound') }),
      el('p', { class: 'hero-text' }, el('a', { class: 'text-link', href: 'index.html', text: t('backToMap') })));
    return;
  }
  document.title = `${venue.name}｜Makan Trail`;
  const tooOld = daysSince(venue.verified) > STALE_DAYS.venue;

  root.append(
    el('p', { class: 'breadcrumb' },
      el('a', { href: 'index.html', text: t('breadcrumbHome') }), ' / ', venue.name),
    el('p', { class: 'tag', text: `${t('typeHawker')} · ${t(`status_${venue.status}`)}` }),
    el('h1', { class: 'venue-title', text: venue.name }),
    el('p', { class: 'popup-meta' }, stamp(venue.verified, STALE_DAYS.venue),
      tooOld ? ` ${t('staleWarning')}` : ''),
    el('div', { class: 'venue-layout' },
      el('div', {},
        el('div', { id: 'venueMap', class: 'venue-map', role: 'img', 'aria-label': t('venueMapLabel', { name: venue.name }) }),
        el('p', { class: 'map-credit', text: t('venueMapCredit') })),
      el('aside', { class: 'info-card' },
        el('h3', { text: t('atAGlance') }),
        infoRow(t('address'), venue.address),
        venue.postal ? infoRow(t('postal'), venue.postal) : null,
        venue.nearest_mrt ? infoRow(t('nearestMrt'), venue.nearest_mrt) : null,
        infoRow(t('nea'), venue.stall_count_nea > 0 ? t('cookedStalls', { n: venue.stall_count_nea }) : t('marketStallsOnly')),
        infoRow(t('statusLabel'), t(`status_${venue.status}`)),
        el('div', { class: 'panel-actions' },
          el('a', { class: 'popup-btn', href: googleMapsUrl(venue), target: '_blank', rel: 'noopener', text: t('openInGoogleMaps') }),
          el('button', { type: 'button', class: 'popup-btn popup-btn-quiet', id: 'shareBtn', text: t('share') })))),
    renderStallSection(),
  );

  document.getElementById('shareBtn').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const data = { title: `${venue.name}｜Makan Trail`, url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(data.url);
        button.textContent = t('linkCopied');
        setTimeout(() => { button.textContent = t('share'); }, 2000);
      }
    } catch { /* cancelled */ }
  });

  drawMap();
}

function drawMap() {
  if (!window.L) return;
  mapInstance?.remove();
  mapInstance = L.map('venueMap', { scrollWheelZoom: false }).setView([venue.lat, venue.lng], 16);
  L.tileLayer('https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png', {
    attribution: '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener">OneMap</a> &copy; contributors | Powered by SLA',
    minZoom: 11,
    maxZoom: 18,
  }).addTo(mapInstance);
  mapInstance.attributionControl.setPrefix(false);
  L.circleMarker([venue.lat, venue.lng], {
    radius: 10, color: '#fff', weight: 2, fillColor: '#C23B22', fillOpacity: 0.95,
  }).addTo(mapInstance);
}

document.addEventListener('langchange', () => { if (root.childElementCount) render(); });

try {
  const venues = await loadVenues();
  venue = venues.find((v) => v.slug === slug) || null;
  if (venue) stalls = await loadStalls(venue.slug);
} catch (err) {
  console.error(err);
}
render();
