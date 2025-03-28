
import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PriceTarget } from "@/lib/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from "recharts";
import { AlertCircle, TrendingUp, TrendingDown } from "lucide-react";

interface CandlestickChartProps {
  symbol: string;
  entryPrice?: number;
  stopLoss?: number;
  targets?: PriceTarget[];
}

export default function CandlestickChart({ symbol, entryPrice, stopLoss, targets }: CandlestickChartProps) {
  const [price, setPrice] = useState<number | null>(null);
  const [trend, setTrend] = useState<"UP" | "DOWN" | "NEUTRAL">("NEUTRAL");
  const [priceHistory, setPriceHistory] = useState<{time: number, price: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Generate mock price data for the demo
  useEffect(() => {
    if (!symbol) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Start with the entry price or a random price
    const basePrice = entryPrice || (Math.random() * 1000 + 100);
    setPrice(basePrice);

    // Function to update price
    const updatePrice = () => {
      // Random small change (+/- 0.5%)
      const change = basePrice * (Math.random() * 0.01 - 0.005);
      
      setPrice((prev) => {
        if (!prev) return basePrice;
        
        const newPrice = prev + change;
        
        // Update trend
        if (newPrice > prev) {
          setTrend("UP");
        } else if (newPrice < prev) {
          setTrend("DOWN");
        }
        
        // Update price history
        setPriceHistory((prev) => [
          ...prev, 
          { time: Date.now(), price: newPrice }
        ].slice(-20)); // Keep last 20 data points
        
        return newPrice;
      });
    };

    // Update price immediately
    updatePrice();
    
    // Setup interval for price updates
    intervalRef.current = window.setInterval(updatePrice, 3000);
    
    // Clear loading after initial data
    setLoading(false);

    // Cleanup function
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [symbol, entryPrice]);

  // Format price with 2 decimal places
  const formatPrice = (price: number | null) => {
    if (price === null) return "—";
    return price.toFixed(2);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center justify-between">
            <div>Carregando gráfico...</div>
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center justify-between">
            <div>Erro ao carregar gráfico</div>
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] flex flex-col items-center justify-center">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <div className="text-destructive">
            {error.message || "Ocorreu um erro ao carregar os dados do gráfico."}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!symbol) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Gráfico de Preço</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center text-muted-foreground">
          Selecione um sinal para ver o gráfico
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            {symbol} 
            <Badge variant={trend === "UP" ? "success" : trend === "DOWN" ? "destructive" : "outline"}>
              {trend === "UP" ? (
                <div className="flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Subindo
                </div>
              ) : trend === "DOWN" ? (
                <div className="flex items-center">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  Caindo
                </div>
              ) : (
                "Neutro"
              )}
            </Badge>
          </div>
          <div className="text-2xl font-bold">
            ${formatPrice(price)}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <LineChart 
            width={600} 
            height={300} 
            data={priceHistory} 
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            className="w-full"
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={false} />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip 
              labelFormatter={() => "Preço"} 
              formatter={(value: number) => [`$${value.toFixed(2)}`, "Preço"]}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#8884d8" 
              name="Preço" 
              dot={false}
              isAnimationActive={false}
            />
            
            {/* Entry price line */}
            {entryPrice && (
              <ReferenceLine 
                y={entryPrice} 
                stroke="green" 
                strokeDasharray="3 3"
                label={{ value: `Entrada: $${entryPrice.toFixed(2)}`, position: 'insideTopRight' }}
              />
            )}
            
            {/* Stop loss line */}
            {stopLoss && (
              <ReferenceLine 
                y={stopLoss} 
                stroke="red" 
                strokeDasharray="3 3"
                label={{ value: `SL: $${stopLoss.toFixed(2)}`, position: 'insideBottomRight' }}
              />
            )}
            
            {/* Target lines */}
            {targets && targets.map((target, index) => (
              <ReferenceLine 
                key={`target-${index}`}
                y={target.price} 
                stroke="blue" 
                strokeDasharray="3 3"
                label={{ value: `TP${target.level}: $${target.price.toFixed(2)}`, position: 'insideTopRight' }}
              />
            ))}
          </LineChart>
        </div>
      </CardContent>
    </Card>
  );
}
