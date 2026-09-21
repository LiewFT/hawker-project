// EN / 中文 toggle. Static text carries data-i18n="key" (or
// data-i18n-placeholder); dynamic text calls t("key"). Pages that render
// content in JS listen for the "langchange" event and re-render.
import { DICT } from './dictionary.js';

const LANG_KEY = 'makanTrailLang';
let lang = 'en';

export const getLang = () => lang;

export function t(key, vars) {
  const entry = DICT[key];
  let text = entry ? (entry[lang] ?? entry.en) : key;
  if (vars) text = text.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? vars[name] : ''));
  return text;
}

export function applyLanguage(next) {
  lang = next === 'zh' ? 'zh' : 'en';
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const entry = DICT[node.dataset.i18n];
    if (entry) node.innerHTML = entry[lang] ?? entry.en; // dictionary is our own trusted text
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    const entry = DICT[node.dataset.i18nPlaceholder];
    if (entry) node.placeholder = entry[lang] ?? entry.en;
  });
  document.documentElement.lang = lang === 'zh' ? 'zh-SG' : 'en';
  document.querySelectorAll('.lang-toggle').forEach((btn) => {
    btn.textContent = lang === 'zh' ? 'EN' : '中文';
    btn.setAttribute('aria-label', lang === 'zh' ? 'Switch to English' : 'Switch to Chinese');
  });
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* private mode: fine */ }
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

export function initI18n() {
  let saved = 'en';
  try { saved = localStorage.getItem(LANG_KEY) === 'zh' ? 'zh' : 'en'; } catch { /* ignore */ }
  applyLanguage(saved);
  document.querySelectorAll('.lang-toggle').forEach((btn) => {
    btn.addEventListener('click', () => applyLanguage(lang === 'zh' ? 'en' : 'zh'));
  });
}
