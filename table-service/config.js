// ─────────────────────────────────────────────────────────────────────────────
//  Firebase configuration
// ─────────────────────────────────────────────────────────────────────────────
//
//  Paste the config object from your Firebase project here to turn on real,
//  cross-device live communication (guest phone ↔ staff dashboard on different
//  devices, anywhere).
//
//  How to get it (takes ~3 minutes, free):
//    1. Go to https://console.firebase.google.com and create a project.
//    2. Build → Firestore Database → Create database → Start in *production*
//       mode (we ship security rules in firestore.rules — see README).
//    3. Project settings (gear icon) → "Your apps" → Web app (</>) → register.
//    4. Copy the `firebaseConfig` values it shows you into the object below.
//
//  Until you fill this in, the app automatically runs in LOCAL mode: requests
//  sync live between browser tabs/windows on the SAME device so you can still
//  see and demo the live flow. Once these keys are real, it goes cross-device.
//
//  NOTE: these web config values are NOT secrets — they are meant to ship in the
//  browser. What protects your data is the Firestore security rules, not hiding
//  these. See firestore.rules.
// ─────────────────────────────────────────────────────────────────────────────

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// Logical venue id — lets one Firebase project serve multiple lounges later.
export const VENUE_ID = "blu";

// True once the placeholder values above have been replaced with real ones.
export const isFirebaseConfigured = !Object
  .values(firebaseConfig)
  .some(v => typeof v === "string" && v.startsWith("YOUR_"));
