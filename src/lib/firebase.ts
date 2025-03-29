
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD5jS5CJX521o3ynuQB4zEiGJ65XxvaIkQ",
  authDomain: "trade-alerts-ninja.firebaseapp.com",
  projectId: "trade-alerts-ninja",
  storageBucket: "trade-alerts-ninja.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
