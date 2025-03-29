
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCSL3bHoaf0f9hOqVs0RX6K_CyHagWtYk8",
  authDomain: "trade-alerts-ninja.firebaseapp.com",
  projectId: "trade-alerts-ninja",
  storageBucket: "trade-alerts-ninja.firebasestorage.app",
  messagingSenderId: "584965799917",
  appId: "1:584965799917:web:774adcdbaa1e54e9d631e4",
  measurementId: "G-1W1L6PTZS5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
