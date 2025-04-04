export type SignalType = "LONG" | "SHORT";
export type SignalDirection = "BUY" | "SELL";
export type SignalStatus = "ACTIVE" | "COMPLETED" | "WAITING";
export type SignalResult = "win" | "loss" | "partial" | "missed";

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
  result?: number | SignalResult; // Updated to support string result types
  strategy?: string;
  performance?: StrategyTypePerformance;
  tpHit?: number;
  hitTargets?: boolean[]; // Added for Binance verification
  verifiedAt?: string;   // Added for Binance verification
  error?: string;        // Added for error tracking
  confidence?: number;   // Added for ML signal confidence
  conf_nivel?: string;   // Added for confidence level (alta, média, baixa)
  tp1?: number;          // Added for target price 1
  tp2?: number;          // Added for target price 2
  tp3?: number;          // Added for target price 3
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
  name: string;
  photoURL?: string | null;
  isAuthenticated: boolean;
  token?: string;
  role?: 'user' | 'admin' | 'premium';
  assinaturaAtiva?: boolean;
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
  totalTrades?: number;
  avgProfit?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
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

export interface MLSignal {
  symbol: string;
  timestamp: string;
  entry: number;
  direction: "long" | "short";
  confidence: number;
  conf_nivel: "alta" | "média" | "baixa";
  tp1: number;
  tp2: number;
  tp3: number;
  stop_loss: number;
  resultado?: string | null;
}
