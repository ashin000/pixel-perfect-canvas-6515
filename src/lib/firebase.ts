import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";

// Firebase web config is publishable by design (access is controlled by
// Firestore security rules, not by hiding these values).
const config = {
  apiKey:
    (import.meta.env["VITE_FIREBASE_API_KEY"] as string | undefined) ??
    "AIzaSyBsLlX8Th6IC07RlzeBKnKKxdf2y-npyYQ",
  authDomain: "quiz-8bb43.firebaseapp.com",
  projectId: "quiz-8bb43",
  storageBucket: "quiz-8bb43.firebasestorage.app",
  messagingSenderId: "511077481077",
  appId: "1:511077481077:web:c477b3584b19f4a70b963c",
  measurementId: "G-QP3KBYEL6R",
};


export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

let app: FirebaseApp | null = null;
export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  if (!app) app = getApps()[0] ?? initializeApp(config as { apiKey: string; projectId: string; appId: string });
  return app;
}
export function getFirebaseAuth(): Auth | null {
  const a = getFirebaseApp();
  return a ? getAuth(a) : null;
}
let firestore: Firestore | null = null;
export function getDbFirestore(): Firestore | null {
  const a = getFirebaseApp();
  if (!a) return null;
  if (!firestore) {
    try {
      // Auto-detect long polling: some college/lab networks and proxies block the
      // default streaming transport, which makes writes hang forever.
      firestore = initializeFirestore(a, { experimentalAutoDetectLongPolling: true });
    } catch {
      firestore = getFirestore(a);
    }
  }
  return firestore;
}
