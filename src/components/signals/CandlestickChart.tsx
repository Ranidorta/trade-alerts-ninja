
import React from "react";
import { PriceTarget } from "@/lib/types";
import CandlestickChartNew from "./CandlestickChartNew";

interface CandlestickChartProps {
  symbol: string;
  entryPrice?: number;
  stopLoss?: number;
  targets?: PriceTarget[];
}

// Agora este componente é apenas um wrapper para o novo componente de gráfico de candle
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
