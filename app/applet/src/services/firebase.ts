import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyC9BPz9TcSSJ5g30sBG_Zc_UXKFDNZyC2o",
  authDomain: "gestao-de-puxada.firebaseapp.com",
  projectId: "gestao-de-puxada",
  storageBucket: "gestao-de-puxada.firebasestorage.app",
  messagingSenderId: "1070983249641",
  appId: "1:1070983249641:web:b4c2c891ba655fca37ba78"
};

// Initialize Firebase safely preventing duplicate initialization
export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const firebaseAuth = getAuth(firebaseApp);
export const firestoreDb = getFirestore(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);

// Automatically sign in anonymously to satisfy Firestore security rules
signInAnonymously(firebaseAuth).catch((err) => {
  console.warn('[Firebase] Anonymous sign-in warning:', err);
});

export default firebaseApp;
