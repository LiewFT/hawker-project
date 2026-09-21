// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBbLPNZ-rtDZd3whuwKTFAKf_RwOc85-H8",
  authDomain: "hawker-project-c1b8d.firebaseapp.com",
  databaseURL: "https://hawker-project-c1b8d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hawker-project-c1b8d",
  storageBucket: "hawker-project-c1b8d.firebasestorage.app",
  messagingSenderId: "385170043149",
  appId: "1:385170043149:web:2440ef9ce8afed1c7ec044"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// identify the project; they are not secrets. Access is enforced by
// firebase/firestore.rules. While this is null the site shows no sign-in and
// makes no Firebase requests.
//
// export const firebaseConfig = {
//   apiKey: '...',
//   authDomain: '<project-id>.firebaseapp.com',
//   projectId: '<project-id>',
//   appId: '...',
// };
export const firebaseConfig = null;
