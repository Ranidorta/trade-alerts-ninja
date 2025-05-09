import { TradingSignal } from './types';

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

// Historical signals
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

// All signals combined
export const allSignals = [...mockSignals, ...mockHistoricalSignals];

export const getMockSignals = (): any[] => {
  const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "DOGEUSDT"];
  const strategies = ["RSI Divergence", "MACD Cross", "Bollinger Bands", "EMA Cross", "Support/Resistance", "Trend Line Break"];
  const results = ["WINNER", "LOSER", "PARTIAL", "FALSE"];
  const resultWeights = [0.45, 0.35, 0.15, 0.05]; // Higher probability for winners and losers
  
  const getRandomResult = () => {
    const rand = Math.random();
    let sum = 0;
    for (let i = 0; i < resultWeights.length; i++) {
      sum += resultWeights[i];
      if (rand < sum) return results[i];
    }
    return results[0];
  };
  
  const signals = [];
  const now = new Date();
  
  for (let i = 0; i < 50; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const direction = Math.random() > 0.5 ? "BUY" : "SELL";
    const entryPrice = Math.round(Math.random() * 10000 + 100) / 10;
    const stopLoss = direction === "BUY" 
      ? Math.round((entryPrice * (1 - Math.random() * 0.05)) * 10) / 10
      : Math.round((entryPrice * (1 + Math.random() * 0.05)) * 10) / 10;
    const takeProfit = direction === "BUY"
      ? [
          Math.round((entryPrice * (1 + Math.random() * 0.03)) * 10) / 10,
          Math.round((entryPrice * (1 + Math.random() * 0.05)) * 10) / 10,
          Math.round((entryPrice * (1 + Math.random() * 0.08)) * 10) / 10
        ]
      : [
          Math.round((entryPrice * (1 - Math.random() * 0.03)) * 10) / 10,
          Math.round((entryPrice * (1 - Math.random() * 0.05)) * 10) / 10,
          Math.round((entryPrice * (1 - Math.random() * 0.08)) * 10) / 10
        ];
    
    const result = getRandomResult();
    const profit = result === "WINNER" 
      ? Math.round(Math.random() * 50 + 10) / 10
      : result === "LOSER" 
        ? -Math.round(Math.random() * 30 + 5) / 10
        : result === "PARTIAL"
          ? Math.round(Math.random() * 20 + 5) / 10
          : 0;
          
    const createdDate = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    
    signals.push({
      id: `mock-${i}-${Date.now()}`,
      symbol,
      direction,
      entryPrice,
      stopLoss,
      takeProfit,
      strategy: strategies[Math.floor(Math.random() * strategies.length)],
      result,
      profit,
      status: Math.random() > 0.2 ? "COMPLETED" : "ACTIVE",
      createdAt: createdDate.toISOString(),
      completedAt: Math.random() > 0.2 ? new Date(createdDate.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      leverage: Math.round(Math.random() * 10 + 1)
    });
  }
  
  return signals;
};

// For backward compatibility
export const getMockSignalHistory = getMockSignals;
