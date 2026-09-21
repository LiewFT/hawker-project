// Accounts and visitor reviews, on Firebase Authentication + Cloud Firestore.
// The SDK is loaded only when firebase-config.js is filled in, so an
// unconfigured site makes no third-party requests. Passwords go straight to
// Firebase Auth (stored only as a hash); emails stay in Auth and are never
// written to the reviews collection.
import { firebaseConfig, appCheckSiteKey } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1';

export const enabled = Boolean(firebaseConfig);

let sdk = null;
function load() {
  if (!sdk) {
    sdk = (async () => {
      const [app, A, F] = await Promise.all([
        import(`${SDK}/firebase-app.js`),
        import(`${SDK}/firebase-auth.js`),
        import(`${SDK}/firebase-firestore.js`),
      ]);
      const instance = app.initializeApp(firebaseConfig);
      if (appCheckSiteKey) {
        // Must run before Auth and Firestore are used, so their requests carry the token.
        const AC = await import(`${SDK}/firebase-app-check.js`);
        AC.initializeAppCheck(instance, {
          provider: new AC.ReCaptchaEnterpriseProvider(appCheckSiteKey),
          isTokenAutoRefreshEnabled: true,
        });
      }
      return { auth: A.getAuth(instance), db: F.getFirestore(instance), A, F };
    })().catch((err) => { sdk = null; throw err; });
  }
  return sdk;
}

let onChange = () => {};
const snapshot = (u) => u && {
  uid: u.uid, name: u.displayName || '', email: u.email || '', verified: u.emailVerified,
};

// cb(user | null) fires on load and after every sign-in, sign-out or profile change.
export async function watchUser(cb) {
  onChange = cb;
  const { auth, A } = await load();
  A.onAuthStateChanged(auth, (u) => onChange(snapshot(u)));
}

async function notify() {
  const { auth } = await load();
  onChange(snapshot(auth.currentUser));
}

export async function register({ name, email, password }) {
  const { auth, A } = await load();
  const cred = await A.createUserWithEmailAndPassword(auth, email, password);
  await A.updateProfile(cred.user, { displayName: name });
  await notify();
  await A.sendEmailVerification(cred.user);
}

export async function signIn(email, password) {
  const { auth, A } = await load();
  await A.signInWithEmailAndPassword(auth, email, password);
}

export async function signOutUser() {
  const { auth, A } = await load();
  await A.signOut(auth);
}

export async function sendReset(email) {
  const { auth, A } = await load();
  await A.sendPasswordResetEmail(auth, email);
}

export async function resendVerification() {
  const { auth, A } = await load();
  await A.sendEmailVerification(auth.currentUser);
}

// Firestore rules read email_verified from the ID token, so force a new token.
export async function refreshVerification() {
  const { auth } = await load();
  await auth.currentUser.reload();
  await auth.currentUser.getIdToken(true);
  await notify();
  return auth.currentUser.emailVerified;
}

// Deletes the person's reviews first (the rules need them signed in), then the account.
export async function deleteAccount(password) {
  const { auth, db, A, F } = await load();
  const user = auth.currentUser;
  await A.reauthenticateWithCredential(user, A.EmailAuthProvider.credential(user.email, password));
  const mine = await F.getDocs(F.query(F.collection(db, 'reviews'), F.where('uid', '==', user.uid)));
  const batch = F.writeBatch(db);
  mine.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  await A.deleteUser(user);
}

export async function fetchReviews(venueSlug) {
  const { db, F } = await load();
  const snap = await F.getDocs(F.query(
    F.collection(db, 'reviews'), F.where('venue', '==', venueSlug), F.limit(200)));
  return snap.docs.map((d) => {
    const x = d.data();
    const when = x.createdAt?.toDate?.() ?? new Date();
    return {
      uid: String(x.uid),
      name: String(x.name || ''),
      rating: Math.min(5, Math.max(1, Number(x.rating) || 1)),
      text: String(x.text || ''),
      date: when.toISOString().slice(0, 10),
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveReview(venueSlug, { rating, text }) {
  const { auth, db, F } = await load();
  const user = auth.currentUser;
  const ref = F.doc(db, 'reviews', `${venueSlug}__${user.uid}`);
  if ((await F.getDoc(ref)).exists()) {
    await F.updateDoc(ref, { rating, text, updatedAt: F.serverTimestamp() });
  } else {
    await F.setDoc(ref, {
      venue: venueSlug,
      uid: user.uid,
      name: user.displayName,
      rating,
      text,
      createdAt: F.serverTimestamp(),
      updatedAt: F.serverTimestamp(),
    });
  }
}

export async function removeReview(venueSlug) {
  const { auth, db, F } = await load();
  await F.deleteDoc(F.doc(db, 'reviews', `${venueSlug}__${auth.currentUser.uid}`));
}
