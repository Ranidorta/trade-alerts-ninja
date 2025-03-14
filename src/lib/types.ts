export type SignalType = "LONG" | "SHORT";
export type SignalDirection = "BUY" | "SELL";
export type SignalStatus = "ACTIVE" | "COMPLETED" | "WAITING";

export interface PriceTarget {
  level: number;
  price: number;
  hit?: boolean;
}

export interface TradingSignal {
  id: string;
  symbol: string;
  pair: string;
  direction?: SignalDirection;
  entryPrice?: number;
  entryMin?: number;
  entryMax?: number;
  entryAvg?: number;
  stopLoss: number;
  takeProfit?: number[];
  targets?: PriceTarget[];
  leverage: number;
  status: SignalStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  profit?: number;
  notes?: string;
  currentPrice?: number;
  timeframe?: string;
  reason?: string;
  type?: SignalType;
}

export interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export interface CryptoCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  marketCap: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  lastUpdated: Date;
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
}

export interface CryptoNews {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: {
    name: string;
  };
  urlToImage?: string;
}

export interface MarketOverview {
  activeCryptocurrencies: number;
  totalMarketCap: number;
  totalVolume24h: number;
  marketCapPercentage: {
    btc: number;
    eth: number;
  };
  marketCapChangePercentage24hUsd: number;
  lastUpdated: Date;
}

export interface MarketOverviewProps {
  data: MarketOverview | null;
  isLoading: boolean;
}

// Define the expected interface for CryptoChartProps to match CryptoChart component
export interface CryptoChartDataPoint {
  time: number;
  price: number;
}
