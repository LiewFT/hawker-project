// Firebase web-app config for the reviews feature (see firebase/SETUP.md).
// These values identify the project; they are not secrets. Access is enforced by
// firebase/firestore.rules. Set this to null to switch reviews off again.
//
// Only this object is needed here: js/backend.js loads the Firebase SDK itself,
// so do not paste the `import ... from "firebase/app"` lines from the console.
export const firebaseConfig = {
  apiKey: 'AIzaSyBbLPNZ-rtDZd3whuwKTFAKf_RwOc85-H8',
  authDomain: 'hawker-project-c1b8d.firebaseapp.com',
  projectId: 'hawker-project-c1b8d',
  appId: '1:385170043149:web:2440ef9ce8afed1c7ec044',
};

// Optional bot protection (Firebase App Check with reCAPTCHA Enterprise). Paste the
// reCAPTCHA Enterprise site key here, then turn on enforcement in the Firebase
// console only after this is deployed. Leave null to skip. See firebase/SETUP.md.
export const appCheckSiteKey = null;
