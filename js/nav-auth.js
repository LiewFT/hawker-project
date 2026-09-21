// Shows the signed-in nickname in the nav on every page, without loading
// Firebase: the pages that do load it keep a cached copy of the (public) nickname
// up to date. The link always goes to the account page.
import { NAME_HINT_KEY, avatarClass, initial } from './ui-common.js';
import { t } from './i18n.js';

function cachedName() {
  try { return localStorage.getItem(NAME_HINT_KEY) || ''; } catch { return ''; }
}

function apply() {
  const link = document.querySelector('[data-account-link]');
  if (!link) return;
  const name = cachedName();
  if (name && link.dataset.shownName === name && !link.dataset.langDirty) return;
  if (name) {
    link.dataset.shownName = name;
    link.removeAttribute('data-i18n'); // script.js must not overwrite the nickname
    link.classList.add('nav-account-in');
    link.setAttribute('aria-label', t('navAccountLabel', { name }));
    const dot = document.createElement('span');
    dot.className = avatarClass(name);
    dot.textContent = initial(name);
    dot.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'nav-account-name';
    label.textContent = name;
    link.replaceChildren(dot, label);
  } else if (link.classList.contains('nav-account-in')) {
    link.classList.remove('nav-account-in');
    delete link.dataset.shownName;
    link.removeAttribute('aria-label');
    link.dataset.i18n = 'navSignIn';
    link.textContent = t('navSignIn');
  }
  if (location.pathname.endsWith('/account.html')) link.setAttribute('aria-current', 'page');
}

apply();
document.addEventListener('langchange', apply);
window.addEventListener('storage', apply); // another tab signed in or out
document.addEventListener('mtnamechange', apply); // this tab did
