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

// Bot protection (Firebase App Check with reCAPTCHA Enterprise). This is the
// reCAPTCHA Enterprise site key, which is public. Turn on enforcement in the
// Firebase console only after this is deployed. Set to null to skip. See firebase/SETUP.md.
export const appCheckSiteKey = '6Ld8xd8tAAAAAN1NKkRoU3LlCvNiA71L9kzeeVzD';
