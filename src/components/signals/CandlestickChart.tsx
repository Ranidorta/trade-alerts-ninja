
import React from "react";
import { PriceTarget } from "@/lib/types";
import CandlestickChartNew from "./CandlestickChartNew";

interface CandlestickChartProps {
  symbol: string;
  entryPrice?: number;
  stopLoss?: number;
  targets?: PriceTarget[];
}

// This component is a wrapper for the new candlestick chart component
export default function CandlestickChart({ symbol, entryPrice, stopLoss, targets }: CandlestickChartProps) {
  return (
    <CandlestickChartNew 
      symbol={symbol}
      entryPrice={entryPrice}
      stopLoss={stopLoss}
      targets={targets}
    />
  );
}
