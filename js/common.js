// Runs on every page: language toggle + mobile menu.
import { initI18n } from './i18n.js';

const menuButton = document.getElementById('menuToggle');
const nav = document.getElementById('mainNav');

function setMenuOpen(open) {
  if (!nav) return;
  nav.dataset.open = String(open);
  menuButton?.setAttribute('aria-expanded', String(open));
}

menuButton?.addEventListener('click', () => setMenuOpen(nav.dataset.open !== 'true'));
nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenuOpen(false)));

initI18n();
