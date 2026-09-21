// Small helpers shared by the account page, the nav and the reviews section.

// The public nickname, cached so pages that don't load Firebase can show it in the nav.
export const NAME_HINT_KEY = 'mtUserName';

export const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

export const invalid = (key) => Object.assign(new Error(key), { key });

// Maps a Firebase or validation error to a strings.js key. `ctx` = 'delete' makes
// a wrong password read as "That password isn't right" instead of "Wrong email or password".
export function errorKey(err, ctx) {
  if (err?.key) return err.key;
  const code = err?.code || '';
  if (code === 'auth/email-already-in-use') return 'errEmailInUse';
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(code)) {
    return ctx === 'delete' ? 'errBadPassword' : 'errBadLogin';
  }
  if (code === 'auth/weak-password') return 'errWeakPassword';
  if (code === 'auth/invalid-email') return 'errInvalidEmail';
  if (code === 'auth/too-many-requests') return 'errTooMany';
  if (code === 'auth/network-request-failed' || code === 'unavailable') return 'errNetwork';
  if (code === 'permission-denied') return 'errPermission';
  console.error(err);
  return 'errGeneric';
}

// A coloured circle with the person's initial. The colour is picked from their id,
// so it stays the same everywhere.
export function avatarClass(seed) {
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `avatar avatar-${h % 4}`;
}
export const initial = (name) => (Array.from(String(name).trim())[0] || '?').toUpperCase();

// Only same-folder .html pages are allowed as a return address, so a crafted
// ?next= link can never send someone to another site.
export function safeNext(raw) {
  if (!raw) return null;
  return /^[A-Za-z0-9_-]+\.html(\?[A-Za-z0-9_\-=&%.]*)?(#[A-Za-z0-9_-]*)?$/.test(raw) ? raw : null;
}

// Link to the account page that returns here afterwards.
export function accountHref(mode) {
  const here = location.pathname.split('/').pop() + location.search + location.hash;
  const params = new URLSearchParams();
  if (safeNext(here)) params.set('next', here);
  if (mode) params.set('mode', mode);
  const query = params.toString();
  return `account.html${query ? `?${query}` : ''}`;
}
