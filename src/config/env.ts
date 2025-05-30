
// Environment variables accessible via import.meta.env in Vite
// All environment variables prefixed with VITE_ are automatically exposed
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:5000",
  signalsApiUrl: import.meta.env.VITE_SIGNALS_API_URL || "http://localhost:5000/api",
  signalsHistoryUrl: import.meta.env.VITE_SIGNALS_HISTORY_URL || "http://localhost:5000/api/signals/history",
  interval: import.meta.env.VITE_INTERVAL || "15m",
  
  // Firebase Configuration
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    recaptchaSiteKey: import.meta.env.VITE_FIREBASE_RECAPTCHA_SITE_KEY
  },
  
  // Add additional environment variables as needed
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  
  // ML Signal Generator Config
  mlSignalSymbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
  mlSignalInterval: "15",
  
  // Debug flag for API connections
  enableApiDebug: true
};
