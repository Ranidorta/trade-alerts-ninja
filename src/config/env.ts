
// Environment variables accessible via import.meta.env in Vite
// All environment variables prefixed with VITE_ are automatically exposed
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || "https://api.bybit.com/v5/market/kline",
  signalsApiUrl: import.meta.env.VITE_SIGNALS_API_URL || "http://localhost:5000/api",
  backendUrl: import.meta.env.VITE_BACKEND_URL || "http://localhost:5000",
  
  // Remove mock API option to ensure we're always using real data
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  
  // Backend GitHub repository URL
  backendRepoUrl: "https://github.com/Ranidorta/trade-alerts-backend-2",
};
