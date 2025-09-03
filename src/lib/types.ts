export type SignalType = "LONG" | "SHORT";
export type SignalDirection = "BUY" | "SELL";
export type SignalStatus = "ACTIVE" | "COMPLETED" | "WAITING";
export type SignalResult = "WINNER" | "LOSER" | "PARTIAL" | "FALSE" | "PENDING" | "win" | "loss" | "partial" | "missed" | 0 | 1;

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
  asset?: string;          // Added for hybrid signals
  pair?: string;
  direction?: SignalDirection;
  entryPrice?: number;
  entry_price?: number;    // Added for hybrid signals
  entryMin?: number;
  entryMax?: number;
  entryAvg?: number;
  stopLoss: number;
  sl?: number;             // Added for hybrid signals
  takeProfit?: number[];
  tp?: number;             // Added for hybrid signals
  targets?: PriceTarget[];
  leverage?: number;
  status: SignalStatus;
  createdAt: string;
  timestamp?: string;      // Added for hybrid signals
  updatedAt?: string;
  completedAt?: string;
  profit?: number;
  notes?: string;
  currentPrice?: number;
  timeframe?: string;
  reason?: string;
  type?: SignalType;
  technicalIndicators?: TechnicalIndicators;
  result?: SignalResult; 
  strategy?: string;
  performance?: StrategyTypePerformance;
  tpHit?: number;
  hitTargets?: boolean[]; 
  verifiedAt?: string;   
  error?: string;        
  confidence?: number;   
  score?: number;         // Added for hybrid signals
  conf_nivel?: string;   
  tp1?: number;         
  tp2?: number;          
  tp3?: number;
  size?: number;          // Added to fix the build error
  rsi?: number;           // Added for technical indicators
  atr?: number;           // Added for technical indicators
  success_prob?: number;  // Added for monster signals success probability
  validationDetails?: string; // Added for validation information
  analysis?: string;      // Added for signal analysis details
  // New risk management properties
  risk_reward_ratio?: number;
  position_size?: number;
  risk_amount?: number;
  current_price?: number;
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

export interface PerformanceData {
  total: number;
  vencedor: { quantidade: number; percentual: number };
  parcial: { quantidade: number; percentual: number };
  perdedor: { quantidade: number; percentual: number };
  falso: { quantidade: number; percentual: number };
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
