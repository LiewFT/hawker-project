// The visitor-reviews section of a venue page: read reviews, write one, and
// edit or delete your own from the ⋯ menu on it. Signing in and registering
// happen on account.html; this section only links there. All text goes through
// textContent.
import { t, getLang } from './i18n.js';
import { el, formatDate } from './data.js';
import * as backend from './backend.js';
import {
  stars, errorKey, avatarClass, initial, accountHref,
} from './ui-common.js';

const MAX_TEXT = 1000;

// Five radio buttons drawn as stars. They are in the DOM from 5 down to 1 and
// laid out in reverse, so "checked star and every star before it" is a CSS sibling rule.
function ratingInput(prefix, value, onPick) {
  const word = el('span', { class: 'rating-word', 'aria-hidden': 'true', text: value ? t(`rate${value}`) : '' });
  const row = el('div', { class: 'star-input' });
  for (let n = 5; n >= 1; n--) {
    row.append(
      el('input', { type: 'radio', name: `${prefix}-rating`, id: `${prefix}-star${n}`, value: String(n), checked: value === n }),
      el('label', { for: `${prefix}-star${n}`, title: t(`rate${n}`) },
        el('span', { 'aria-hidden': 'true', text: '★' }),
        el('span', { class: 'visually-hidden', text: t('starsOption', { n }) })));
  }
  row.addEventListener('change', (event) => {
    const n = Number(event.target.value);
    word.textContent = t(`rate${n}`);
    onPick(n);
  });
  return el('fieldset', { class: 'rating-pick' },
    el('legend', { text: t('rateLabel') }), el('div', { class: 'rating-row' }, row, word));
}

function textInput(prefix, value, onType) {
  const box = el('textarea', {
    id: `${prefix}-text`, maxlength: MAX_TEXT, rows: 4, placeholder: t('textPlaceholder'),
  });
  box.value = value;
  const count = el('span', { class: 'char-count popup-meta', text: `${value.length} / ${MAX_TEXT}` });
  box.addEventListener('input', () => {
    count.textContent = `${box.value.length} / ${MAX_TEXT}`;
    onType(box.value);
  });
  return el('div', { class: 'field' },
    el('label', { for: `${prefix}-text`, text: t('textLabel') }), box, count);
}

export function createReviewsSection(venue) {
  const section = el('section', { class: 'venue-reviews', 'aria-labelledby': 'reviewsTitle' });
  const state = {
    user: undefined, // undefined = still checking, null = signed out
    reviews: null,
    loadFailed: false,
    message: null, // { kind, key }
    draft: { rating: 0, text: '' }, // the new review being typed
    editing: false, // editing my existing review
    editDraft: null,
    confirmingDelete: false,
  };

  const mineOf = () => (state.user ? state.reviews?.find((r) => r.uid === state.user.uid) : null);

  function setMessage(kind, key) {
    state.message = key ? { kind, key } : null;
    const node = section.querySelector('#reviewMessage');
    if (!node) return;
    node.textContent = key ? t(key) : '';
    node.className = `review-message${key ? ` review-message-${kind}` : ''}`;
    if (key) node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function setBusy(flag) {
    section.querySelectorAll('button').forEach((b) => { b.disabled = flag; });
  }

  async function run(action, okKey) {
    setBusy(true);
    setMessage('ok', null);
    try {
      await action();
      if (okKey) setMessage('ok', okKey);
    } catch (err) {
      setMessage('error', errorKey(err));
    } finally {
      setBusy(false);
    }
  }

  async function loadReviews() {
    try {
      state.reviews = await backend.fetchReviews(venue.slug);
      state.loadFailed = false;
    } catch (err) {
      console.error(err);
      state.loadFailed = true;
      state.reviews ??= [];
    }
    render();
  }

  const focusSoon = (selector) => setTimeout(() => section.querySelector(selector)?.focus(), 0);

  // --- summary ---
  function summary() {
    const list = state.reviews;
    const counts = [0, 0, 0, 0, 0, 0];
    list.forEach((r) => { counts[r.rating] += 1; });
    const avg = (list.reduce((s, r) => s + r.rating, 0) / list.length).toFixed(1);
    return el('div', { class: 'rating-summary' },
      el('div', { class: 'rating-big', role: 'img', 'aria-label': t('rvAvgLabel', { avg }) },
        el('strong', { text: avg }),
        el('span', { class: 'visitor-stars', 'aria-hidden': 'true', text: stars(Math.round(Number(avg))) }),
        el('span', { class: 'popup-meta', text: list.length === 1 ? t('rvCountOne') : t('rvCount', { n: list.length }) })),
      el('div', { class: 'rating-bars' },
        [5, 4, 3, 2, 1].map((n) => el('div', { class: 'rating-bar', role: 'img', 'aria-label': t('rvBarLabel', { n, count: counts[n] }) },
          el('span', { 'aria-hidden': 'true', text: `${n}★` }),
          el('span', { class: 'bar-track', 'aria-hidden': 'true' },
            el('span', { class: 'bar-fill', style: `width:${Math.round((counts[n] / list.length) * 100)}%` })),
          el('span', { class: 'popup-meta', 'aria-hidden': 'true', text: String(counts[n]) })))));
  }

  // --- one review ---
  function editForm(review) {
    state.editDraft ??= { rating: review.rating, text: review.text };
    const form = el('form', { class: 'review-form review-edit' },
      ratingInput('edit', state.editDraft.rating, (n) => { state.editDraft.rating = n; }),
      textInput('edit', state.editDraft.text, (v) => { state.editDraft.text = v; }),
      el('div', { class: 'panel-actions' },
        el('button', { type: 'submit', class: 'popup-btn', text: t('btnSave') }),
        el('button', { type: 'button', class: 'popup-btn popup-btn-quiet', id: 'editCancel', text: t('btnCancel') })));
    form.querySelector('#editCancel').addEventListener('click', () => {
      state.editing = false;
      state.editDraft = null;
      render();
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const d = state.editDraft;
      if (!d.rating) { setMessage('error', 'needRating'); return; }
      run(async () => {
        await backend.saveReview(venue.slug, { rating: d.rating, text: d.text.trim() });
        state.editing = false;
        state.editDraft = null;
        await loadReviews();
      }, 'updatedOk');
    });
    return form;
  }

  function deleteConfirm() {
    const yes = el('button', { type: 'button', class: 'popup-btn popup-btn-danger', text: t('rvDeleteYes') });
    const no = el('button', { type: 'button', class: 'popup-btn popup-btn-quiet', id: 'deleteCancel', text: t('btnCancel') });
    yes.addEventListener('click', () => run(async () => {
      await backend.removeReview(venue.slug);
      state.confirmingDelete = false;
      state.draft = { rating: 0, text: '' };
      await loadReviews();
    }, 'removed'));
    no.addEventListener('click', () => { state.confirmingDelete = false; render(); });
    return el('div', { class: 'confirm-row', role: 'alertdialog', 'aria-label': t('rvDeleteAsk') },
      el('p', { text: t('rvDeleteAsk') }), el('div', { class: 'panel-actions' }, yes, no));
  }

  // The ⋯ menu. Only my own review has one; a "Report" item can be added here later.
  function reviewMenu() {
    const trigger = el('button', {
      type: 'button', class: 'kebab', 'aria-haspopup': 'menu', 'aria-expanded': 'false',
      'aria-label': t('rvMenu'), text: '⋯',
    });
    const edit = el('button', { type: 'button', role: 'menuitem', text: t('rvMenuEdit') });
    const del = el('button', { type: 'button', role: 'menuitem', class: 'menu-danger', text: t('rvMenuDelete') });
    const menu = el('div', { class: 'review-menu', role: 'menu', hidden: true }, edit, del);

    const close = () => { menu.hidden = true; trigger.setAttribute('aria-expanded', 'false'); };
    trigger.addEventListener('click', () => {
      const opening = menu.hidden;
      menu.hidden = !opening;
      trigger.setAttribute('aria-expanded', String(opening));
      if (opening) edit.focus();
    });
    menu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { close(); trigger.focus(); }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        (document.activeElement === edit ? del : edit).focus();
      }
    });
    edit.addEventListener('click', () => {
      state.editing = true; state.confirmingDelete = false; state.editDraft = null;
      render();
      focusSoon('#edit-text');
    });
    del.addEventListener('click', () => {
      state.confirmingDelete = true; state.editing = false;
      render();
      focusSoon('#deleteCancel');
    });
    return el('div', { class: 'review-menu-wrap' }, trigger, menu);
  }

  function reviewItem(r) {
    const mine = state.user?.uid === r.uid;
    const editing = mine && state.editing;
    return el('li', { class: `visitor-review${mine ? ' visitor-review-mine' : ''}` },
      el('span', { class: avatarClass(r.uid), 'aria-hidden': 'true', text: initial(r.name) }),
      el('div', { class: 'visitor-review-body' },
        el('div', { class: 'visitor-review-head' },
          el('strong', { text: r.name }),
          mine ? el('span', { class: 'badge badge-you', text: t('rvYou') }) : null),
        editing ? null : el('p', { class: 'visitor-review-meta' },
          el('span', { class: 'visitor-stars', role: 'img', 'aria-label': t('starsOption', { n: r.rating }), text: stars(r.rating) }),
          el('span', { class: 'popup-meta', text: ` ${formatDate(r.date, getLang())}${r.edited ? ` · ${t('rvEdited')}` : ''}` })),
        editing ? editForm(r) : (r.text ? el('p', { class: 'visitor-review-text', text: r.text }) : null),
        mine && state.confirmingDelete ? deleteConfirm() : null),
      mine && !editing && !state.confirmingDelete ? reviewMenu() : null);
  }

  // --- the card beside the list ---
  function composeCard() {
    const form = el('form', { class: 'review-form' },
      el('h3', { text: t('composeTitle') }),
      el('p', { class: 'popup-meta', text: t('composeAs', { name: state.user.name }) }),
      ratingInput('new', state.draft.rating, (n) => { state.draft.rating = n; form.querySelector('.field-error')?.remove(); }),
      textInput('new', state.draft.text, (v) => { state.draft.text = v; }),
      el('button', { type: 'submit', class: 'popup-btn popup-btn-wide', text: t('btnPost') }));
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const d = state.draft;
      if (!d.rating) {
        if (!form.querySelector('.field-error')) {
          form.querySelector('.rating-pick').append(el('p', { class: 'field-error', role: 'alert', text: t('needRating') }));
        }
        form.querySelector('input[name="new-rating"]').focus();
        return;
      }
      run(async () => {
        await backend.saveReview(venue.slug, { rating: d.rating, text: d.text.trim() });
        state.draft = { rating: 0, text: '' };
        await loadReviews();
      }, 'posted');
    });
    return el('aside', { class: 'review-side-card' }, form);
  }

  function promptCard(title, text, actions) {
    return el('aside', { class: 'review-side-card' },
      el('h3', { text: title }), el('p', { text }), el('div', { class: 'panel-actions' }, actions));
  }

  function sideCard() {
    if (state.user === undefined) return el('aside', { class: 'review-side-card' }, el('p', { class: 'popup-meta', text: t('rvLoading') }));
    if (state.user === null) {
      return promptCard(t('ctaTitle'), t('ctaText'), [
        el('a', { class: 'popup-btn', href: accountHref('register'), text: t('btnCreate') }),
        el('a', { class: 'popup-btn popup-btn-quiet', href: accountHref(), text: t('btnSignIn') }),
      ]);
    }
    if (!state.user.verified) {
      return promptCard(t('verifyCtaTitle'), t('verifyCtaText'), [
        el('a', { class: 'popup-btn', href: accountHref(), text: t('verifyCtaBtn') }),
      ]);
    }
    if (mineOf()) return el('aside', { class: 'review-side-card' }, el('p', { class: 'popup-meta', text: t('rvYourHint') }));
    return composeCard();
  }

  // --- whole section ---
  function render() {
    const parts = [el('h2', { id: 'reviewsTitle', text: t('rvTitle') })];
    if (!backend.enabled) {
      parts.push(el('p', { class: 'popup-meta', text: t('rvOff') }));
    } else {
      const list = state.reviews;
      let main;
      if (state.loadFailed) main = el('p', { class: 'popup-meta', text: t('rvLoadError') });
      else if (!list) main = el('p', { class: 'popup-meta', text: t('rvLoading') });
      else if (!list.length) main = el('p', { class: 'reviews-empty', text: t('rvNone') });
      else main = el('div', {}, summary(), el('ul', { class: 'visitor-reviews' }, list.map(reviewItem)));

      parts.push(
        el('p', { class: 'popup-meta reviews-note', text: t('rvNote') }),
        el('p', { id: 'reviewMessage', role: 'status', 'aria-live': 'polite' }),
        el('div', { class: 'reviews-layout' }, el('div', { class: 'reviews-main' }, main), sideCard()));
    }
    section.replaceChildren(...parts);
    if (state.message) setMessage(state.message.kind, state.message.key);
  }

  // Click outside, or Escape, closes an open ⋯ menu.
  document.addEventListener('click', (event) => {
    section.querySelectorAll('.review-menu:not([hidden])').forEach((menu) => {
      if (!menu.parentElement.contains(event.target)) {
        menu.hidden = true;
        menu.parentElement.querySelector('.kebab')?.setAttribute('aria-expanded', 'false');
      }
    });
  });
  document.addEventListener('langchange', render);
  render();

  if (backend.enabled) {
    loadReviews();
    backend.watchUser((user) => {
      if (state.user?.uid !== user?.uid) {
        state.draft = { rating: 0, text: '' };
        state.editing = false;
        state.confirmingDelete = false;
      }
      state.user = user;
      render();
    }).catch((err) => {
      console.error(err);
      state.user = null;
      state.loadFailed = true;
      render();
    });
  }

  return section;
}
