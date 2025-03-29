import { TradingSignal, CryptoCoin, CryptoNews, MarketOverview } from './types';

export const mockSignals: TradingSignal[] = [
  {
    id: "1",
    type: "SHORT",
    symbol: "PNUT",
    pair: "PNUTUSDT",
    entryMin: 0.25,
    entryMax: 0.275,
    entryAvg: 0.265,
    stopLoss: 0.2875,
    targets: [
      { level: 1, price: 0.23, hit: true },
      { level: 2, price: 0.22, hit: false },
      { level: 3, price: 0.21, hit: false }
    ],
    leverage: 5,
    status: "ACTIVE",
    createdAt: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
    updatedAt: new Date().toISOString(),
    currentPrice: 0.242
  },
  {
    id: "2",
    type: "LONG",
    symbol: "BTC",
    pair: "BTCUSDT",
    entryMin: 62800,
    entryMax: 63200,
    entryAvg: 63000,
    stopLoss: 61500,
    targets: [
      { level: 1, price: 64000, hit: true },
      { level: 2, price: 65000, hit: false },
      { level: 3, price: 66000, hit: false }
    ],
    leverage: 10,
    status: "ACTIVE",
    createdAt: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
    updatedAt: new Date().toISOString(),
    currentPrice: 64100
  },
  {
    id: "3",
    type: "LONG",
    symbol: "ETH",
    pair: "ETHUSDT",
    entryMin: 3100,
    entryMax: 3150,
    entryAvg: 3125,
    stopLoss: 3050,
    targets: [
      { level: 1, price: 3200, hit: true },
      { level: 2, price: 3300, hit: false },
      { level: 3, price: 3400, hit: false }
    ],
    leverage: 5,
    status: "WAITING",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentPrice: 3110
  },
  {
    id: "4",
    type: "SHORT",
    symbol: "SOL",
    pair: "SOLUSDT",
    entryMin: 145,
    entryMax: 148,
    entryAvg: 146.5,
    stopLoss: 152,
    targets: [
      { level: 1, price: 140, hit: true },
      { level: 2, price: 135, hit: true },
      { level: 3, price: 130, hit: false }
    ],
    leverage: 5,
    status: "COMPLETED",
    createdAt: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(),
    completedAt: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(),
    profit: 8.5,
    currentPrice: 137
  },
  {
    id: "5",
    type: "LONG",
    symbol: "XRP",
    pair: "XRPUSDT",
    entryMin: 0.51,
    entryMax: 0.54,
    entryAvg: 0.525,
    stopLoss: 0.49,
    targets: [
      { level: 1, price: 0.56, hit: true },
      { level: 2, price: 0.58, hit: false },
      { level: 3, price: 0.60, hit: false }
    ],
    leverage: 10,
    status: "ACTIVE",
    createdAt: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(),
    updatedAt: new Date().toISOString(),
    currentPrice: 0.57
  }
];

export const mockHistoricalSignals: TradingSignal[] = [
  {
    id: "6",
    type: "SHORT",
    symbol: "ADA",
    pair: "ADAUSDT",
    entryMin: 0.48,
    entryMax: 0.50,
    entryAvg: 0.49,
    stopLoss: 0.52,
    targets: [
      { level: 1, price: 0.46, hit: true },
      { level: 2, price: 0.44, hit: true },
      { level: 3, price: 0.42, hit: true }
    ],
    leverage: 5,
    status: "COMPLETED",
    createdAt: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString(),
    completedAt: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString(),
    profit: 14.3,
    currentPrice: 0.42
  },
  {
    id: "7",
    type: "LONG",
    symbol: "DOT",
    pair: "DOTUSDT",
    entryMin: 7.2,
    entryMax: 7.5,
    entryAvg: 7.35,
    stopLoss: 6.9,
    targets: [
      { level: 1, price: 7.8, hit: true },
      { level: 2, price: 8.2, hit: false },
      { level: 3, price: 8.5, hit: false }
    ],
    leverage: 10,
    status: "COMPLETED",
    createdAt: new Date(new Date().setDate(new Date().getDate() - 15)).toISOString(),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 12)).toISOString(),
    completedAt: new Date(new Date().setDate(new Date().getDate() - 12)).toISOString(),
    profit: -6.8,
    currentPrice: 7.0
  },
  {
    id: "8",
    type: "SHORT",
    symbol: "DOGE",
    pair: "DOGEUSDT",
    entryMin: 0.12,
    entryMax: 0.125,
    entryAvg: 0.1225,
    stopLoss: 0.13,
    targets: [
      { level: 1, price: 0.115, hit: true },
      { level: 2, price: 0.11, hit: true },
      { level: 3, price: 0.105, hit: false }
    ],
    leverage: 5,
    status: "COMPLETED",
    createdAt: new Date(new Date().setDate(new Date().getDate() - 20)).toISOString(),
    updatedAt: new Date(new Date().setDate(new Date().getDate() - 18)).toISOString(),
    completedAt: new Date(new Date().setDate(new Date().getDate() - 18)).toISOString(),
    profit: 10.2,
    currentPrice: 0.109
  }
];

export const allSignals = [...mockSignals, ...mockHistoricalSignals];

export const mockCryptoCoins: CryptoCoin[] = [
  {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    currentPrice: 62548.32,
    priceChange24h: 1245.67,
    priceChangePercentage24h: 2.12,
    marketCap: 1234567890123,
    volume24h: 45678901234,
    high24h: 63500.21,
    low24h: 61200.45,
    lastUpdated: new Date(),
    trend: "BULLISH"
  },
  {
    id: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    currentPrice: 3246.18,
    priceChange24h: 86.43,
    priceChangePercentage24h: 2.74,
    marketCap: 387654321098,
    volume24h: 19876543210,
    high24h: 3280.12,
    low24h: 3150.56,
    lastUpdated: new Date(),
    trend: "BULLISH"
  },
  {
    id: "solana",
    symbol: "SOL",
    name: "Solana",
    image: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
    currentPrice: 139.72,
    priceChange24h: -5.89,
    priceChangePercentage24h: -4.04,
    marketCap: 58765432109,
    volume24h: 8765432109,
    high24h: 146.21,
    low24h: 138.56,
    lastUpdated: new Date(),
    trend: "BEARISH"
  },
  {
    id: "cardano",
    symbol: "ADA",
    name: "Cardano",
    image: "https://assets.coingecko.com/coins/images/975/large/cardano.png",
    currentPrice: 0.45,
    priceChange24h: 0.02,
    priceChangePercentage24h: 4.65,
    marketCap: 15765432109,
    volume24h: 876543210,
    high24h: 0.46,
    low24h: 0.42,
    lastUpdated: new Date(),
    trend: "BULLISH"
  },
  {
    id: "binancecoin",
    symbol: "BNB",
    name: "Binance Coin",
    image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
    currentPrice: 562.78,
    priceChange24h: -12.34,
    priceChangePercentage24h: -2.15,
    marketCap: 87654321098,
    volume24h: 5678901234,
    high24h: 578.32,
    low24h: 559.87,
    lastUpdated: new Date(),
    trend: "BEARISH"
  }
];

export const mockCryptoNews: CryptoNews[] = [
  {
    id: "1",
    title: "Bitcoin Hits New All-Time High Amid Institutional Adoption",
    summary: "Bitcoin has reached a new record price as major financial institutions continue to invest.",
    url: "https://example.com/news/bitcoin-ath",
    publishedAt: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
    source: "CryptoNews",
    image: "https://example.com/images/bitcoin-news.jpg",
    relatedCoins: ["BTC"]
  },
  {
    id: "2",
    title: "Ethereum 2.0 Upgrade On Schedule For Q3 Launch",
    summary: "The long-awaited Ethereum upgrade is proceeding as planned according to developers.",
    url: "https://example.com/news/ethereum-upgrade",
    publishedAt: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
    source: "BlockchainReport",
    image: "https://example.com/images/ethereum-news.jpg",
    relatedCoins: ["ETH"]
  },
  {
    id: "3",
    title: "Regulatory Framework for Cryptocurrencies Proposed by EU Commission",
    summary: "New regulations aim to provide clarity while protecting investors in the crypto space.",
    url: "https://example.com/news/crypto-regulations",
    publishedAt: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(),
    source: "FinanceDaily",
    image: "https://example.com/images/regulation-news.jpg",
    relatedCoins: ["BTC", "ETH", "XRP"]
  },
  {
    id: "4",
    title: "Solana Network Experiences Brief Outage, Quickly Recovers",
    summary: "The Solana blockchain faced technical issues but was restored within hours.",
    url: "https://example.com/news/solana-outage",
    publishedAt: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
    source: "CryptoInsider",
    image: "https://example.com/images/solana-news.jpg",
    relatedCoins: ["SOL"]
  },
  {
    id: "5",
    title: "Major Bank Launches Cryptocurrency Custody Service for Institutional Clients",
    summary: "Banking giant enters the crypto space with new services for large investors.",
    url: "https://example.com/news/bank-crypto-service",
    publishedAt: new Date().toISOString(),
    source: "BusinessCrypto",
    image: "https://example.com/images/bank-news.jpg",
    relatedCoins: ["BTC", "ETH"]
  }
];

export const mockMarketOverview: MarketOverview = {
  activeCryptocurrencies: 12874,
  totalMarketCap: 2346789012345,
  totalVolume24h: 98765432101,
  marketCapPercentage: {
    btc: 47.2,
    eth: 18.5
  },
  marketCapChangePercentage24hUsd: 2.4,
  lastUpdated: new Date()
};

const formatPercentage = (value: number): string => {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
};
