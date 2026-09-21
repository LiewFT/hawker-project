// Translation for the ES modules. Strings owned by the modules live in
// strings.js; anything else (nav, footer, venue page, ...) comes from
// script.js's dictionary, which exposes t() and getLang() as window.MT and
// fires "langchange" on toggle.
import { STRINGS } from './strings.js';

export const getLang = () => window.MT.getLang();

export function t(key, vars) {
  const entry = STRINGS[key];
  if (!entry) return window.MT.t(key, vars);
  let text = entry[getLang()] || entry.en;
  if (vars) text = text.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? vars[name] : ''));
  return text;
}
