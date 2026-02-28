// Firebase configuration for Active Recovery 360
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDSXNmLxpA_-Y2d8LueMTr9XXqXnt1pp2A",
  authDomain: "active-recovey-360.firebaseapp.com",
  projectId: "active-recovey-360",
};

// Initialize Firebase (singleton pattern)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
