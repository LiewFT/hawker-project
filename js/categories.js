// Homepage "What are you after?" section. Categories come from the tags on
// real stalls (data/venues/<slug>.json), never from the demo stalls in
// script.js, so they are empty until stalls have been checked in person.
import { t } from './i18n.js';
import { stallCard } from './stalls.js';
import { CATEGORIES, CHEAP_MAX_SGD, loadVenues, loadAllStalls, el } from './data.js';

let allStalls = []; // { venue, stall } for every real stall collected
let category = null;

function stallsIn(cat) {
  return allStalls.filter(({ stall }) => (stall.tags || []).includes(cat));
}

function render() {
  const chips = document.getElementById('categoryChips');
  const results = document.getElementById('categoryResults');
  const status = document.getElementById('categoryStatus');
  if (!chips) return;

  chips.replaceChildren(...CATEGORIES.map((cat) => {
    const chip = el('button', {
      type: 'button',
      class: cat === category ? 'chip chip-active' : 'chip',
      'aria-pressed': String(cat === category),
      text: t('categoryChipLabel', { label: t('cat_' + cat), n: stallsIn(cat).length }),
    });
    chip.addEventListener('click', () => {
      category = category === cat ? null : cat;
      render();
    });
    return chip;
  }));

  results.replaceChildren();
  if (!allStalls.length) {
    results.append(el('p', { class: 'filter-empty', text: t('categoryNone') }));
    status.textContent = '';
    return;
  }
  if (!category) {
    results.append(el('p', { class: 'filter-empty', text: t('categoryPick') }));
    status.textContent = '';
    return;
  }

  const label = t('cat_' + category);
  const notes = { halal: t('categoryNoteHalal'), 'cheap-eats': t('categoryNoteCheap', { max: CHEAP_MAX_SGD }) };
  if (notes[category]) results.append(el('p', { class: 'popup-meta', text: notes[category] }));
  const found = stallsIn(category).sort((a, b) =>
    (b.stall.editorial === 'pick') - (a.stall.editorial === 'pick')
    || a.venue.name.localeCompare(b.venue.name) || a.stall.unit.localeCompare(b.stall.unit));
  if (!found.length) {
    results.append(el('p', { class: 'filter-empty', text: t('categoryEmpty', { label }) }));
    status.textContent = t('categoryEmpty', { label });
    return;
  }
  results.append(el('ul', { class: 'stall-list stall-list-wide' }, found.map(({ venue, stall }) => stallCard(stall, venue))));
  status.textContent = t('categoryShowing', { n: found.length, label });
}

document.addEventListener('langchange', render);

try {
  allStalls = await loadAllStalls(await loadVenues());
} catch (err) {
  console.error(err);
}
render();
