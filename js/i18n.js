// The venue page shares script.js's dictionary and language toggle. script.js
// exposes t() and getLang() as window.MT, and fires "langchange" on toggle.
export const t = (key, vars) => window.MT.t(key, vars);
export const getLang = () => window.MT.getLang();
