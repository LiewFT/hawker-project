// Shared stall rendering, used by the venue page and the category browser.
import { t, getLang } from './i18n.js';
import { STALE_DAYS, daysSince, formatDate, venueUrl, el } from './data.js';

export function stallDeadline(stall) {
  if (stall.status === 'closed') return STALE_DAYS.tombstone;
  return stall.editorial === 'pick' ? STALE_DAYS.stallPick : STALE_DAYS.stall;
}

export function stamp(isoDate, days) {
  const stale = daysSince(isoDate) > days;
  return el('span', { class: stale ? 'stamp stamp-stale' : 'stamp' },
    t(stale ? 'staleChecked' : 'checked', { date: formatDate(isoDate, getLang()) }));
}

// venue is passed only where the card is shown outside its own venue page.
export function stallCard(stall, venue = null) {
  const closed = stall.status === 'closed';
  const title = stall.name || (closed ? t('stallClosedNoName') : t('stallUnknown'));
  const hours = stall.hours
    ? Object.entries(stall.hours).map(([day, range]) => `${t(`day_${day}`)} ${range}`).join(' · ')
    : null;
  return el('li', { class: closed ? 'stall-card stall-card-closed' : 'stall-card' },
    el('div', { class: 'stall-card-head' },
      el('span', { class: 'stall-unit', text: `#${stall.unit}` }),
      stall.editorial === 'pick' ? el('span', { class: 'badge badge-pick', text: t('pick') }) : null,
      stall.halal ? el('span', { class: 'badge badge-halal', text: `${t('cat_halal')} · MUIS ${stall.muis_cert}` }) : null,
      closed ? el('span', { class: 'badge badge-muted', text: t('status_closed') }) : null,
      stall.status === 'unknown' ? el('span', { class: 'badge badge-muted', text: t('status_unknown') }) : null),
    el('h3', { text: title }),
    venue ? el('p', { class: 'popup-meta' }, el('a', { class: 'text-link', href: venueUrl(venue.slug), text: venue.name })) : null,
    stall.cuisine?.length ? el('p', { class: 'chip-line', text: stall.cuisine.join(' · ') }) : null,
    stall.dishes?.length
      ? el('p', { class: 'stall-dishes', text: stall.dishes.map((d) => (d.price_sgd != null ? `${d.name} $${d.price_sgd}` : d.name)).join(' · ') })
      : null,
    stall.direction_hint ? el('p', { class: 'stall-direction', text: stall.direction_hint }) : null,
    hours ? el('p', { class: 'popup-meta', text: hours }) : null,
    stall.payment?.length ? el('p', { class: 'popup-meta', text: `${t('payment')}: ${stall.payment.join(', ')}` }) : null,
    stamp(stall.verified, stallDeadline(stall)));
}
