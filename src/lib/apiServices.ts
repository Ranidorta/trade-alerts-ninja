
import { CryptoCoin, CryptoNews, MarketOverview } from "@/lib/types";
import { mockCryptoCoins, mockCryptoNews, mockMarketOverview } from "@/lib/mockData";

export async function fetchCryptoNews(): Promise<CryptoNews[]> {
  try {
    return mockCryptoNews;
  } catch (error) {
    console.error("Error fetching crypto news:", error);
    return [];
  }
}

export async function fetchTopCryptos(): Promise<CryptoCoin[]> {
  try {
    return mockCryptoCoins;
  } catch (error) {
    console.error("Error fetching top cryptocurrencies:", error);
    return [];
  }
}

export async function fetchMarketOverview(): Promise<MarketOverview> {
  try {
    return mockMarketOverview;
  } catch (error) {
    console.error("Error fetching market overview:", error);
    throw error;
  }
}
