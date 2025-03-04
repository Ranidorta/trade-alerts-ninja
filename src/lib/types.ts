
export type SignalType = "LONG" | "SHORT";

export type SignalStatus = "ACTIVE" | "COMPLETED" | "WAITING";

export interface PriceTarget {
  level: number;
  price: number;
  hit?: boolean;
}

export interface TradingSignal {
  id: string;
  type: SignalType;
  symbol: string;
  pair: string;
  entryMin: number;
  entryMax: number;
  entryAvg: number;
  stopLoss: number;
  targets: PriceTarget[];
  leverage: number;
  status: SignalStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  profit?: number;
  notes?: string;
  currentPrice?: number;
}

export interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
}
