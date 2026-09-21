// account.html: sign in, create an account, verify the email, reset a password,
// and (once signed in) see your reviews, sign out or delete the account.
// ?next=<page>.html sends you back after signing in; ?mode=register opens the
// sign-up form. All text goes through textContent.
import { t, getLang } from './i18n.js';
import { el, loadVenues, venueUrl, formatDate } from './data.js';
import * as backend from './backend.js';
import {
  stars, errorKey, avatarClass, initial, safeNext,
} from './ui-common.js';

const MIN_PASSWORD = 8;
const RESEND_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const params = new URLSearchParams(location.search);
const next = safeNext(params.get('next'));
const root = document.getElementById('accountRoot');

const state = {
  user: undefined, // undefined = still checking, null = signed out
  mode: params.get('mode') === 'register' ? 'register' : 'signin', // signin | register | reset
  values: { name: '', email: '' }, // kept across language switches; passwords never are
  notice: null, // { kind: 'ok' | 'error', key }
  resendUntil: 0,
  myReviews: null,
  myReviewsFailed: false,
  venueNames: {},
};

let timers = [];
const stopTimers = () => { timers.forEach(clearInterval); timers = []; };

// ---------- small building blocks ----------
function field({ id, labelKey, hintKey, type = 'text', autocomplete, value = '', attrs = {} }) {
  const input = el('input', { id, type, autocomplete, required: true, ...attrs });
  input.value = value;
  const err = el('p', { class: 'field-error', id: `${id}-err`, role: 'alert', hidden: true });
  const wrap = el('div', { class: 'field' },
    el('label', { for: id, text: t(labelKey) }),
    input,
    hintKey ? el('p', { class: 'field-hint', text: t(hintKey) }) : null,
    err);
  const api = {
    wrap,
    input,
    setError(key) {
      err.hidden = !key;
      err.textContent = key ? t(key) : '';
      if (key) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', err.id); }
      else { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); }
    },
  };
  input.addEventListener('input', () => api.setError(null));
  return api;
}

function banner() {
  return el('p', { class: 'form-banner', role: 'alert', hidden: true });
}
function showBanner(node, key) {
  node.hidden = !key;
  node.textContent = key ? t(key) : '';
}

function noticeNode() {
  if (!state.notice) return null;
  return el('p', { class: `review-message review-message-${state.notice.kind}`, role: 'status', text: t(state.notice.key) });
}

// Wires a form: disables the button while working, and routes any error to a
// field (when `fieldFor` knows one) or to the banner at the top of the form.
function bindForm(form, button, banner$, handler, fieldFor = () => null) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const label = button.textContent;
    button.disabled = true;
    button.textContent = t('btnWait');
    showBanner(banner$, null);
    try {
      await handler();
    } catch (err) {
      const key = errorKey(err);
      const target = err.field || fieldFor(key);
      if (target) { target.setError(key); target.input.focus(); } else showBanner(banner$, key);
    } finally {
      if (button.isConnected) { button.disabled = false; button.textContent = label; }
    }
  });
}

const fail = (key, fieldApi) => Object.assign(new Error(key), { key, field: fieldApi });

function showPasswordToggle(form) {
  const box = el('input', { type: 'checkbox', id: 'showPw' });
  box.addEventListener('change', () => {
    form.querySelectorAll('input[data-pw]').forEach((i) => { i.type = box.checked ? 'text' : 'password'; });
  });
  return el('label', { class: 'show-pw' }, box, ' ', t('showPassword'));
}

function strength(password) {
  if (!password) return null;
  if (password.length < MIN_PASSWORD) return 0;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  return kinds >= 3 || password.length >= 12 ? 2 : 1;
}

function switchLine(textKey, linkKey, mode) {
  const link = el('button', { type: 'button', class: 'link-button text-link', text: t(linkKey) });
  link.addEventListener('click', () => setMode(mode));
  return el('p', { class: 'account-switch' }, `${t(textKey)} `, link);
}

function setMode(mode) {
  state.mode = mode;
  state.notice = null;
  const url = new URL(location.href);
  if (mode === 'register') url.searchParams.set('mode', 'register'); else url.searchParams.delete('mode');
  history.replaceState(null, '', url);
  render();
}

// ---------- forms ----------
function signInForm() {
  const email = field({ id: 'siEmail', labelKey: 'fldEmail', type: 'email', autocomplete: 'email', value: state.values.email });
  const password = field({ id: 'siPassword', labelKey: 'fldPassword', type: 'password', autocomplete: 'current-password', attrs: { 'data-pw': '' } });
  const forgot = el('button', { type: 'button', class: 'link-button text-link', text: t('linkForgot') });
  forgot.addEventListener('click', () => setMode('reset'));
  const submit = el('button', { type: 'submit', class: 'popup-btn popup-btn-wide', text: t('btnSignIn') });
  const b = banner();
  const form = el('form', { class: 'auth-form', novalidate: true }, b, email.wrap, password.wrap);
  form.append(el('div', { class: 'auth-row' }, showPasswordToggle(form), forgot), submit);
  email.input.addEventListener('input', () => { state.values.email = email.input.value; });

  bindForm(form, submit, b, async () => {
    const address = email.input.value.trim();
    if (!address) throw fail('errEmailRequired', email);
    if (!EMAIL_PATTERN.test(address)) throw fail('errInvalidEmail', email);
    if (!password.input.value) throw fail('errPasswordRequired', password);
    await backend.signIn(address, password.input.value);
  }, (key) => (key === 'errInvalidEmail' ? email : null));
  return form;
}

function registerForm() {
  const name = field({ id: 'reName', labelKey: 'fldNickname', hintKey: 'hintNickname', autocomplete: 'nickname', value: state.values.name, attrs: { maxlength: 30 } });
  const email = field({ id: 'reEmail', labelKey: 'fldEmail', hintKey: 'hintEmail', type: 'email', autocomplete: 'email', value: state.values.email });
  const password = field({ id: 'rePassword', labelKey: 'fldPassword', hintKey: 'hintPassword', type: 'password', autocomplete: 'new-password', attrs: { 'data-pw': '' } });
  const confirm = field({ id: 'reConfirm', labelKey: 'fldConfirm', hintKey: 'hintConfirm', type: 'password', autocomplete: 'new-password', attrs: { 'data-pw': '' } });

  const meterFill = el('span', { class: 'meter-fill' });
  const meterText = el('span', { class: 'popup-meta' });
  const meter = el('div', { class: 'pw-meter', 'aria-live': 'polite' }, el('span', { class: 'meter-track', 'aria-hidden': 'true' }, meterFill), meterText);
  password.input.addEventListener('input', () => {
    const level = strength(password.input.value);
    meter.dataset.level = level == null ? '' : String(level);
    meterText.textContent = level == null ? '' : t(['pwShort', 'pwOkay', 'pwStrong'][level]);
    updateMatch();
  });

  const matchText = el('p', { class: 'field-hint match-hint', 'aria-live': 'polite' });
  function updateMatch() {
    const a = password.input.value; const c = confirm.input.value;
    if (!c) { matchText.textContent = ''; matchText.className = 'field-hint match-hint'; return; }
    const same = a === c;
    matchText.textContent = t(same ? 'pwMatch' : 'pwMismatch');
    matchText.className = `field-hint match-hint ${same ? 'match-ok' : 'match-bad'}`;
  }
  confirm.input.addEventListener('input', updateMatch);
  name.input.addEventListener('input', () => { state.values.name = name.input.value; });
  email.input.addEventListener('input', () => { state.values.email = email.input.value; });

  const consentBox = el('input', { type: 'checkbox', id: 'reConsent' });
  const consentErr = el('p', { class: 'field-error', role: 'alert', hidden: true });
  const consent = el('div', { class: 'field' },
    el('label', { class: 'consent', for: 'reConsent' }, consentBox, ' ', t('consentBefore'),
      el('a', { class: 'text-link', href: 'privacy.html', target: '_blank', rel: 'noopener', text: t('privacyPolicy') }), t('consentAfter')),
    consentErr);
  const consentField = {
    input: consentBox,
    setError(key) { consentErr.hidden = !key; consentErr.textContent = key ? t(key) : ''; },
  };
  consentBox.addEventListener('change', () => consentField.setError(null));

  const submit = el('button', { type: 'submit', class: 'popup-btn popup-btn-wide', text: t('btnCreate') });
  const b = banner();
  const form = el('form', { class: 'auth-form', novalidate: true },
    b, name.wrap, email.wrap, password.wrap, meter, confirm.wrap, matchText);
  form.append(showPasswordToggle(form), consent, submit);

  bindForm(form, submit, b, async () => {
    const nickname = name.input.value.trim();
    const address = email.input.value.trim();
    if (nickname.length < 2 || nickname.length > 30) throw fail('errNickname', name);
    if (!address) throw fail('errEmailRequired', email);
    if (!EMAIL_PATTERN.test(address)) throw fail('errInvalidEmail', email);
    if (password.input.value.length < MIN_PASSWORD) throw fail('errPasswordShort', password);
    if (confirm.input.value !== password.input.value) throw fail('errMismatch', confirm);
    if (!consentBox.checked) throw fail('errConsent', consentField);
    // Set before registering: the verify screen renders as soon as the account exists.
    state.resendUntil = Date.now() + RESEND_SECONDS * 1000;
    try {
      await backend.register({ name: nickname, email: address, password: password.input.value });
    } catch (err) {
      state.resendUntil = 0;
      throw err;
    }
    state.values.name = '';
  }, (key) => ({ errEmailInUse: email, errInvalidEmail: email, errWeakPassword: password })[key] ?? null);
  return form;
}

function resetForm() {
  const email = field({ id: 'rsEmail', labelKey: 'fldEmail', type: 'email', autocomplete: 'email', value: state.values.email });
  email.input.addEventListener('input', () => { state.values.email = email.input.value; });
  const submit = el('button', { type: 'submit', class: 'popup-btn popup-btn-wide', text: t('btnSendReset') });
  const b = banner();
  const sent = el('p', { class: 'review-message review-message-ok', role: 'status', hidden: true, text: t('resetSent') });
  const form = el('form', { class: 'auth-form', novalidate: true }, b, email.wrap, submit, sent);
  bindForm(form, submit, b, async () => {
    const address = email.input.value.trim();
    if (!address) throw fail('errEmailRequired', email);
    if (!EMAIL_PATTERN.test(address)) throw fail('errInvalidEmail', email);
    try { await backend.sendReset(address); } catch (err) {
      // "No such account" is not reported, so this form can't be used to probe for emails.
      if (['auth/invalid-email', 'auth/network-request-failed', 'auth/too-many-requests'].includes(err?.code)) throw err;
    }
    sent.hidden = false;
  }, (key) => (key === 'errInvalidEmail' ? email : null));
  return form;
}

// ---------- views ----------
function signedOutView() {
  const titles = { signin: ['accTitleSignIn', 'accSubSignIn'], register: ['accTitleRegister', 'accSubRegister'], reset: ['accTitleReset', 'accSubReset'] };
  const [title, sub] = titles[state.mode];

  const tabs = state.mode === 'reset' ? null : el('div', { class: 'seg-tabs', role: 'tablist' },
    ['signin', 'register'].map((mode) => {
      const tab = el('button', {
        type: 'button', role: 'tab', 'aria-selected': String(state.mode === mode),
        class: state.mode === mode ? 'seg-active' : '', text: t(mode === 'signin' ? 'accTabSignIn' : 'accTabRegister'),
      });
      tab.addEventListener('click', () => { if (state.mode !== mode) setMode(mode); });
      return tab;
    }));

  let form; let foot;
  if (state.mode === 'register') { form = registerForm(); foot = switchLine('accHaveAccount', 'btnSignIn', 'signin'); }
  else if (state.mode === 'reset') {
    form = resetForm();
    const back = el('button', { type: 'button', class: 'link-button text-link', text: t('accBackToSignIn') });
    back.addEventListener('click', () => setMode('signin'));
    foot = el('p', { class: 'account-switch' }, back);
  } else { form = signInForm(); foot = switchLine('accNewHere', 'accTabRegister', 'register'); }

  return el('div', { class: 'account-layout' },
    el('div', { class: 'account-card' },
      el('h1', { class: 'account-title', text: t(title) }),
      el('p', { class: 'account-sub', text: t(sub) }),
      next && state.mode !== 'reset' ? el('p', { class: 'popup-meta', text: t('accReturnTo') }) : null,
      noticeNode(), tabs, form, foot),
    el('aside', { class: 'account-why' },
      el('h2', { text: t('whyTitle') }),
      el('ul', {}, ['why1', 'why2', 'why3'].map((k) => el('li', { text: t(k) })))));
}

function verifyView() {
  const checkBtn = el('button', { type: 'button', class: 'popup-btn popup-btn-wide', text: t('verCheck') });
  const resendBtn = el('button', { type: 'button', class: 'popup-btn popup-btn-quiet' });
  const out = el('button', { type: 'button', class: 'link-button text-link', text: t('btnSignOut') });
  const msg = el('p', { class: 'form-banner', role: 'status', 'aria-live': 'polite', hidden: true });
  const say = (kind, key) => { msg.hidden = !key; msg.textContent = key ? t(key) : ''; msg.className = `form-banner${kind === 'ok' ? ' form-banner-ok' : ''}`; };

  const updateResend = () => {
    const left = Math.ceil((state.resendUntil - Date.now()) / 1000);
    resendBtn.disabled = left > 0;
    resendBtn.textContent = left > 0 ? t('verResendIn', { n: left }) : t('verResend');
  };
  updateResend();
  timers.push(setInterval(updateResend, 1000));

  const check = async (manual) => {
    try {
      const done = await backend.refreshVerification();
      if (!done && manual) say('error', 'verNotYet');
    } catch (err) { if (manual) say('error', errorKey(err)); }
  };
  checkBtn.addEventListener('click', async () => {
    checkBtn.disabled = true;
    await check(true);
    if (checkBtn.isConnected) checkBtn.disabled = false;
  });
  // Coming back from the email tab, or just waiting, verifies without a click.
  timers.push(setInterval(() => check(false), 5000));
  document.addEventListener('visibilitychange', onVisible);

  resendBtn.addEventListener('click', async () => {
    resendBtn.disabled = true;
    try {
      await backend.resendVerification();
      state.resendUntil = Date.now() + RESEND_SECONDS * 1000;
      say('ok', 'verSent');
    } catch (err) { say('error', errorKey(err)); }
    updateResend();
  });
  out.addEventListener('click', () => backend.signOutUser());

  return el('div', { class: 'account-layout account-layout-single' },
    el('div', { class: 'account-card account-verify' },
      el('div', { class: 'verify-icon', 'aria-hidden': 'true', text: '✉' }),
      el('h1', { class: 'account-title', text: t('verTitle') }),
      el('p', { class: 'account-sub', text: t('verBody', { email: state.user.email }) }),
      el('p', { class: 'popup-meta', text: t('verSpam') }),
      msg,
      el('div', { class: 'verify-actions' }, checkBtn, resendBtn),
      el('p', { class: 'account-switch' }, `${t('verWrongEmail')} `, out)));
}

function onVisible() {
  if (document.visibilityState === 'visible' && state.user && !state.user.verified) {
    backend.refreshVerification().catch(() => {});
  }
}

function myReviewItem(r) {
  return el('li', { class: 'visitor-review' },
    el('div', { class: 'visitor-review-body' },
      el('div', { class: 'visitor-review-head' },
        el('a', { class: 'text-link', href: venueUrl(r.venue), text: state.venueNames[r.venue] || r.venue })),
      el('p', { class: 'visitor-review-meta' },
        el('span', { class: 'visitor-stars', role: 'img', 'aria-label': t('starsOption', { n: r.rating }), text: stars(r.rating) }),
        el('span', { class: 'popup-meta', text: ` ${formatDate(r.date, getLang())}${r.edited ? ` · ${t('rvEdited')}` : ''}` })),
      r.text ? el('p', { class: 'visitor-review-text', text: r.text }) : null));
}

function deleteSection() {
  const password = field({ id: 'delPassword', labelKey: 'fldPassword', type: 'password', autocomplete: 'current-password', attrs: { 'data-pw': '' } });
  const submit = el('button', { type: 'submit', class: 'popup-btn popup-btn-danger', text: t('deleteConfirm') });
  const b = banner();
  const form = el('form', { class: 'auth-form', novalidate: true },
    el('p', { class: 'popup-meta', text: t('deleteHelp') }), b, password.wrap, submit);
  bindForm(form, submit, b, async () => {
    if (!password.input.value) throw fail('errPasswordRequired', password);
    try { await backend.deleteAccount(password.input.value); } catch (err) {
      throw Object.assign(new Error('x'), { key: errorKey(err, 'delete'), field: password });
    }
    state.notice = { kind: 'ok', key: 'deleted' };
    state.mode = 'signin';
    render(); // the sign-out render above ran before the notice existed
  });
  return el('details', { class: 'delete-account' }, el('summary', { text: t('deleteAccount') }), form);
}

function profileView() {
  const out = el('button', { type: 'button', class: 'popup-btn popup-btn-quiet', text: t('btnSignOut') });
  out.addEventListener('click', () => backend.signOutUser());

  let reviews;
  if (state.myReviewsFailed) reviews = el('p', { class: 'popup-meta', text: t('myReviewsError') });
  else if (!state.myReviews) reviews = el('p', { class: 'popup-meta', text: t('rvLoading') });
  else if (!state.myReviews.length) {
    reviews = el('div', { class: 'reviews-empty' },
      el('p', { text: t('myReviewsNone') }),
      el('a', { class: 'popup-btn', href: 'index.html#browse', text: t('myReviewsBrowse') }));
  } else reviews = el('ul', { class: 'visitor-reviews' }, state.myReviews.map(myReviewItem));

  return el('div', { class: 'account-profile' },
    el('div', { class: 'profile-head' },
      el('span', { class: `${avatarClass(state.user.uid)} avatar-lg`, 'aria-hidden': 'true', text: initial(state.user.name) }),
      el('div', {},
        el('h1', { class: 'account-title', text: state.user.name }),
        el('p', { class: 'popup-meta', text: state.user.email }),
        el('span', { class: 'badge badge-verified', text: `✓ ${t('verifiedBadge')}` })),
      out),
    noticeNode(),
    el('h2', { class: 'profile-section', text: t('myReviews') }),
    reviews,
    deleteSection());
}

function loadingView() {
  return el('p', { class: 'popup-meta', text: t('rvLoading') });
}

// ---------- render ----------
async function loadMyReviews(uid) {
  try {
    const [reviews, venues] = await Promise.all([backend.fetchMyReviews(uid), loadVenues().catch(() => [])]);
    venues.forEach((v) => { state.venueNames[v.slug] = v.name; });
    state.myReviews = reviews;
    state.myReviewsFailed = false;
  } catch (err) {
    console.error(err);
    state.myReviewsFailed = true;
  }
  if (state.user?.uid === uid) render();
}

function render() {
  stopTimers();
  document.removeEventListener('visibilitychange', onVisible);

  if (!backend.enabled) {
    root.replaceChildren(el('p', { class: 'popup-meta', text: t('rvOff') }));
    return;
  }
  let view;
  if (state.user === undefined) view = loadingView();
  else if (state.user === null) view = signedOutView();
  else if (!state.user.verified) view = verifyView();
  else if (next) {
    view = el('p', { class: 'review-message review-message-ok', role: 'status', text: t('redirecting') });
    setTimeout(() => location.replace(next), 600);
  } else {
    if (!state.myReviews && !state.myReviewsFailed) loadMyReviews(state.user.uid);
    view = profileView();
  }
  root.replaceChildren(view);
}

document.addEventListener('langchange', render);
render();

if (backend.enabled) {
  let lastSig = null;
  backend.watchUser((user) => {
    const sig = user ? `${user.uid}|${user.verified}|${user.name}` : 'out';
    if (sig === lastSig) return; // e.g. a background re-check that changed nothing
    lastSig = sig;
    if (!user) { state.myReviews = null; state.myReviewsFailed = false; }
    state.user = user;
    render();
  }).catch((err) => {
    console.error(err);
    state.user = null;
    state.notice = { kind: 'error', key: 'errNetwork' };
    render();
  });
}
