
// Environment variables accessible via import.meta.env in Vite
// All environment variables prefixed with VITE_ are automatically exposed
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || "https://api.bybit.com/v5/market/kline",
  signalsApiUrl: import.meta.env.VITE_SIGNALS_API_URL || "http://localhost:5000/api",
  
  // Firebase Configuration
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  },
  
  // Add additional environment variables as needed
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};
