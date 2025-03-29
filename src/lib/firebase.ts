
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase configuration with fallback to environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD5jS5CJX521o3ynuQB4zEiGJ65XxvaIkQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "trade-alerts-ninja.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "trade-alerts-ninja",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "trade-alerts-ninja.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
