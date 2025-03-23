
// Environment variables accessible via import.meta.env in Vite
// All environment variables prefixed with VITE_ are automatically exposed
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || "https://api.bybit.com/v5/market/kline",
  
  // Add additional environment variables as needed
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};
