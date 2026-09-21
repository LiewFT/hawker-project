// The visitor-reviews section of a venue page: read reviews, register / sign in,
// and post, update or delete your own review. All text goes through textContent.
import { t, getLang } from './i18n.js';
import { el, formatDate } from './data.js';
import * as backend from './backend.js';

const MAX_TEXT = 1000;
const MIN_PASSWORD = 8;

const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

function errorKey(err) {
  if (err?.key) return err.key;
  const code = err?.code || '';
  if (code === 'auth/email-already-in-use') return 'errEmailInUse';
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(code)) return 'errBadLogin';
  if (code === 'auth/weak-password') return 'errWeakPassword';
  if (code === 'auth/invalid-email') return 'errInvalidEmail';
  if (code === 'auth/too-many-requests') return 'errTooMany';
  if (code === 'auth/network-request-failed' || code === 'unavailable') return 'errNetwork';
  if (code === 'permission-denied') return 'errPermission';
  console.error(err);
  return 'errGeneric';
}

const invalid = (key) => Object.assign(new Error(key), { key });

function field(id, labelKey, attrs) {
  return el('div', { class: 'field' },
    el('label', { for: id, text: t(labelKey) }),
    el('input', { id, required: true, ...attrs }));
}

export function createReviewsSection(venue) {
  const section = el('section', { class: 'venue-reviews', 'aria-labelledby': 'reviewsTitle' });
  const state = {
    user: undefined, // undefined = still checking, null = signed out
    reviews: null,
    loadFailed: false,
    mode: 'signin', // signin | register | reset
    message: null, // { kind, key }
    draft: null, // the review being typed; survives re-renders
  };

  const mineOf = () => (state.user ? state.reviews?.find((r) => r.uid === state.user.uid) : null);
  const draftFor = (mine) => state.draft ?? { rating: mine?.rating ?? 0, text: mine?.text ?? '' };

  function setMessage(kind, key) {
    state.message = key ? { kind, key } : null;
    const node = section.querySelector('#reviewMessage');
    if (node) {
      node.textContent = key ? t(key) : '';
      node.className = `review-message ${kind === 'error' ? 'review-message-error' : ''}`;
    }
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

  // --- pieces ---
  function summary() {
    const list = state.reviews;
    if (state.loadFailed) return t('reviewsLoadError');
    if (!list) return t('reviewsLoading');
    if (!list.length) return t('reviewsNone');
    const avg = (list.reduce((s, r) => s + r.rating, 0) / list.length).toFixed(1);
    return t(list.length === 1 ? 'reviewsSummaryOne' : 'reviewsSummary', { avg, n: list.length });
  }

  function reviewItem(r) {
    return el('li', { class: `visitor-review${state.user?.uid === r.uid ? ' visitor-review-mine' : ''}` },
      el('div', { class: 'visitor-review-head' },
        el('strong', { text: r.name }),
        el('span', { class: 'visitor-stars', role: 'img', 'aria-label': t('reviewStarsOption', { n: r.rating }), text: stars(r.rating) }),
        el('span', { class: 'popup-meta', text: formatDate(r.date, getLang()) })),
      r.text ? el('p', { class: 'visitor-review-text', text: r.text }) : null);
  }

  function authForm() {
    const tabs = el('div', { class: 'panel-actions' },
      ['signin', 'register'].map((mode) => el('button', {
        type: 'button',
        class: `popup-btn${state.mode === mode ? '' : ' popup-btn-quiet'}`,
        'aria-pressed': String(state.mode === mode),
        text: t(mode === 'signin' ? 'authSignIn' : 'authRegister'),
      })));
    tabs.children[0].addEventListener('click', () => { state.mode = 'signin'; state.message = null; render(); });
    tabs.children[1].addEventListener('click', () => { state.mode = 'register'; state.message = null; render(); });

    const form = el('form', { class: 'auth-form', novalidate: true });
    let onSubmit;

    if (state.mode === 'register') {
      form.append(
        field('authName', 'authNickname', { type: 'text', autocomplete: 'nickname', minlength: 2, maxlength: 30 }),
        field('authEmail', 'authEmail', { type: 'email', autocomplete: 'email' }),
        field('authPassword', 'authPassword', { type: 'password', autocomplete: 'new-password', minlength: MIN_PASSWORD }),
        el('p', { class: 'popup-meta', text: t('authPasswordHint') }),
        el('label', { class: 'consent' },
          el('input', { type: 'checkbox', id: 'authConsent' }), ' ',
          t('authConsentBefore'), ' ',
          el('a', { class: 'text-link', href: 'privacy.html', target: '_blank', rel: 'noopener', text: t('footerPrivacy') }),
          t('authConsentAfter')),
        el('button', { type: 'submit', class: 'popup-btn', text: t('authRegister') }));
      onSubmit = () => {
        const name = form.querySelector('#authName').value.trim();
        const email = form.querySelector('#authEmail').value.trim();
        const password = form.querySelector('#authPassword').value;
        if (name.length < 2 || name.length > 30) throw invalid('errNickname');
        if (!email) throw invalid('errInvalidEmail');
        if (password.length < MIN_PASSWORD) throw invalid('errWeakPassword');
        if (!form.querySelector('#authConsent').checked) throw invalid('errConsent');
        return backend.register({ name, email, password });
      };
    } else if (state.mode === 'reset') {
      form.append(
        field('authEmail', 'authEmail', { type: 'email', autocomplete: 'email' }),
        el('button', { type: 'submit', class: 'popup-btn', text: t('authResetSend') }));
      onSubmit = async () => {
        const email = form.querySelector('#authEmail').value.trim();
        if (!email) throw invalid('errInvalidEmail');
        try { await backend.sendReset(email); } catch (err) {
          if (['auth/invalid-email', 'auth/network-request-failed'].includes(err?.code)) throw err;
        }
      };
    } else {
      form.append(
        field('authEmail', 'authEmail', { type: 'email', autocomplete: 'email' }),
        field('authPassword', 'authPassword', { type: 'password', autocomplete: 'current-password' }),
        el('button', { type: 'submit', class: 'popup-btn', text: t('authSignIn') }),
        el('button', { type: 'button', class: 'text-link link-button', id: 'authForgot', text: t('authForgot') }));
      form.querySelector('#authForgot').addEventListener('click', () => { state.mode = 'reset'; state.message = null; render(); });
      onSubmit = () => {
        const email = form.querySelector('#authEmail').value.trim();
        const password = form.querySelector('#authPassword').value;
        if (!email || !password) throw invalid('errBadLogin');
        return backend.signIn(email, password);
      };
    }

    const okKey = state.mode === 'register' ? 'authVerifySent' : state.mode === 'reset' ? 'authResetSent' : null;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      run(async () => onSubmit(), okKey);
    });
    return el('div', { class: 'auth-panel' }, el('p', { text: t('authPrompt') }), tabs, form);
  }

  function verifyPanel() {
    const checkBtn = el('button', { type: 'button', class: 'popup-btn', text: t('authVerifiedBtn') });
    const resendBtn = el('button', { type: 'button', class: 'popup-btn popup-btn-quiet', text: t('authResend') });
    checkBtn.addEventListener('click', () => run(async () => {
      if (!(await backend.refreshVerification())) throw invalid('authNotYetVerified');
    }));
    resendBtn.addEventListener('click', () => run(() => backend.resendVerification(), 'authVerifySent'));
    return el('div', { class: 'auth-panel' },
      el('p', { text: t('authVerifyNeeded', { email: state.user.email }) }),
      el('div', { class: 'panel-actions' }, checkBtn, resendBtn));
  }

  function reviewForm() {
    const mine = mineOf();
    const draft = draftFor(mine);
    const picks = [1, 2, 3, 4, 5].map((n) => el('label', { class: 'star-pick' },
      el('input', { type: 'radio', name: 'rating', value: String(n), checked: draft.rating === n }),
      el('span', {},
        el('span', { 'aria-hidden': 'true', text: `${n}★` }),
        el('span', { class: 'visually-hidden', text: t('reviewStarsOption', { n }) }))));
    const box = el('textarea', { id: 'reviewText', maxlength: MAX_TEXT, rows: 4 });
    box.value = draft.text;

    const form = el('form', { class: 'review-form' },
      el('h3', { text: t(mine ? 'reviewYours' : 'reviewWrite') }),
      el('fieldset', { class: 'rating-pick' }, el('legend', { text: t('reviewRatingLabel') }), picks),
      el('div', { class: 'field' }, el('label', { for: 'reviewText', text: t('reviewTextLabel') }), box),
      el('div', { class: 'panel-actions' },
        el('button', { type: 'submit', class: 'popup-btn', text: t(mine ? 'reviewUpdate' : 'reviewPost') }),
        mine ? el('button', { type: 'button', class: 'popup-btn popup-btn-quiet', id: 'reviewDelete', text: t('reviewDelete') }) : null));

    form.addEventListener('input', () => {
      state.draft = {
        rating: Number(form.querySelector('input[name="rating"]:checked')?.value || 0),
        text: box.value,
      };
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const d = draftFor(mine);
      if (!d.rating) { setMessage('error', 'reviewNeedRating'); return; }
      run(async () => {
        await backend.saveReview(venue.slug, { rating: d.rating, text: d.text.trim() });
        state.draft = null;
        await loadReviews();
      }, 'reviewPosted');
    });
    form.querySelector('#reviewDelete')?.addEventListener('click', () => {
      if (!window.confirm(t('reviewDeleteConfirm'))) return;
      run(async () => {
        await backend.removeReview(venue.slug);
        state.draft = null;
        await loadReviews();
      }, 'reviewRemoved');
    });
    return form;
  }

  function accountBar() {
    const out = el('button', { type: 'button', class: 'popup-btn popup-btn-quiet', text: t('authSignOut') });
    out.addEventListener('click', () => run(() => backend.signOutUser()));

    const pw = el('input', { type: 'password', id: 'deletePassword', autocomplete: 'current-password' });
    const confirmBtn = el('button', { type: 'submit', class: 'popup-btn popup-btn-quiet', text: t('authDeleteConfirmBtn') });
    const del = el('form', { class: 'auth-form' },
      el('p', { class: 'popup-meta', text: t('authDeleteHelp') }),
      el('div', { class: 'field' }, el('label', { for: 'deletePassword', text: t('authPassword') }), pw),
      confirmBtn);
    del.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!pw.value) { setMessage('error', 'errBadLogin'); return; }
      run(async () => {
        await backend.deleteAccount(pw.value);
        state.draft = null;
        await loadReviews();
      }, 'authDeleted');
    });
    return el('div', { class: 'account-bar' },
      el('p', { class: 'popup-meta', text: t('authSignedInAs', { name: state.user.name }) }),
      out,
      el('details', {}, el('summary', { text: t('authDelete') }), del));
  }

  function authArea() {
    if (state.user === undefined) return el('p', { class: 'popup-meta', text: t('reviewsLoading') });
    if (state.user === null) return authForm();
    if (!state.user.verified) return el('div', {}, verifyPanel(), accountBar());
    return el('div', {}, reviewForm(), accountBar());
  }

  function render() {
    const parts = [el('h2', { id: 'reviewsTitle', text: t('reviewsTitle') })];
    if (!backend.enabled) {
      parts.push(el('p', { class: 'popup-meta', text: t('reviewsOff') }));
    } else {
      const list = state.reviews ?? [];
      parts.push(
        el('p', { class: 'coverage-line', text: summary() }),
        el('p', { class: 'popup-meta', text: t('reviewsNote') }),
        list.length ? el('ul', { class: 'visitor-reviews' }, list.map(reviewItem)) : null,
        authArea(),
        el('p', { id: 'reviewMessage', role: 'status', 'aria-live': 'polite' }));
    }
    section.replaceChildren(...parts.filter(Boolean));
    if (state.message) setMessage(state.message.kind, state.message.key);
  }

  document.addEventListener('langchange', render);
  render();

  if (backend.enabled) {
    loadReviews();
    backend.watchUser((user) => {
      if (state.user?.uid !== user?.uid) state.draft = null;
      if (user) state.mode = 'signin'; // after sign-out, start from the sign-in form
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
