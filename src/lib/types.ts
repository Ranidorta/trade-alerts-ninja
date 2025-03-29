
export type SignalType = "LONG" | "SHORT";
export type SignalDirection = "BUY" | "SELL";
export type SignalStatus = "ACTIVE" | "COMPLETED" | "WAITING";

export interface PriceTarget {
  level: number;
  price: number;
  hit?: boolean;
}

export interface TechnicalIndicators {
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  shortMa?: number;
  longMa?: number;
  upperBand?: number;
  lowerBand?: number;
  signal?: number; // 1 for buy, -1 for sell, 0 for neutral
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
  updatedAt?: string;
  completedAt?: string;
  profit?: number;
  notes?: string;
  currentPrice?: number;
  timeframe?: string;
  reason?: string;
  type?: SignalType;
  technicalIndicators?: TechnicalIndicators;
  result?: number; // Added result property
  strategy?: string; // Added strategy property
  performance?: StrategyPerformance; // Added performance metrics
  tpHit?: number; // Added tpHit property to track how many targets were hit
}

export interface StrategyPerformance {
  strategy?: string;
  totalTrades?: number;
  wins?: number;
  losses?: number;
  winRate?: number;
  avgProfit?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  total_signals?: number; // For backward compatibility
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

export interface CryptoChartDataPoint {
  time: number;
  price: number;
  shortMa?: number;
  longMa?: number;
  signal?: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  name?: string;
  isAuthenticated: boolean;
  token?: string;
  password?: string; // Only for mocking - would never store this in a real app
  photoURL?: string; // Adicionando o campo photoURL como opcional
}

export interface PerformanceMetrics {
  totalSignals: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  symbolsData: SymbolPerformance[];
  signalTypesData: StrategyTypePerformance[];
  strategyData: StrategyTypePerformance[];
  dailyData: DailyPerformance[];
  strategyPerformance?: StrategyDetailedPerformance[];
  avgProfit?: number;
}

export interface SymbolPerformance {
  symbol: string;
  count: number;
  wins: number;
  losses: number;
  winRate: number;
}

export interface StrategyTypePerformance {
  strategy: string;
  count: number;
  wins: number;
  losses: number;
  winRate: number;
  profit?: number;
  avgTradeProfit?: number;
}

export interface StrategyDetailedPerformance {
  strategy: string;
  total_signals: number;
  wins: number;
  losses: number;
  winRate: number;
  profit: number;
  sharpe_ratio?: number;
  max_drawdown?: number;
}

export interface DailyPerformance {
  date: string;
  total: number;
  wins: number;
  losses: number;
}
