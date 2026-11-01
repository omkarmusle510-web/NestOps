// ──────────────────────────────────────
// Firebase Client Configuration
// ──────────────────────────────────────

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const isConfigured = 
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY.trim() !== '' && 
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'your_api_key_here';

const firebaseConfig = {
  apiKey: isConfigured ? process.env.NEXT_PUBLIC_FIREBASE_API_KEY : 'AIzaSyFakeKeyForPrerenderingBuildCheck123',
  authDomain: isConfigured ? process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN : 'mock-project.firebaseapp.com',
  projectId: isConfigured ? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID : 'mock-project',
  storageBucket: isConfigured ? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET : 'mock-project.appspot.com',
  messagingSenderId: isConfigured ? process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID : '123456789012',
  appId: isConfigured ? process.env.NEXT_PUBLIC_FIREBASE_APP_ID : '1:123456789012:web:a1b2c3d4e5f6',
};

// Initialize Firebase (prevent duplicate initialization in dev with hot reload)
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

export default app;
