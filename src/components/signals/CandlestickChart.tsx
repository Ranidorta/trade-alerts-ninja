
import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PriceTarget } from "@/lib/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from "recharts";
import { AlertCircle, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import CryptoChart from "@/components/CryptoChart";

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
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const isMobile = useIsMobile();

  // Fetch real price data from Bybit API
  const fetchPriceData = async () => {
    if (!symbol) return;
    
    try {
      setRefreshing(true);
      // Use the Bybit API endpoint that we're already using in network requests
      const response = await fetch(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=5&limit=50`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.retCode === 0 && data.result && data.result.list && data.result.list.length > 0) {
        // Format the data for our chart
        const candles = data.result.list.map((item: string[]) => ({
          time: parseInt(item[0]),
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
          volume: parseFloat(item[5])
        })).reverse();
        
        // Update current price
        const latestCandle = candles[candles.length - 1];
        setPrice(latestCandle.close);
        
        // Update trend
        if (candles.length > 1) {
          const previousClose = candles[candles.length - 2].close;
          if (latestCandle.close > previousClose) {
            setTrend("UP");
          } else if (latestCandle.close < previousClose) {
            setTrend("DOWN");
          } else {
            setTrend("NEUTRAL");
          }
        }
        
        // Update price history for chart
        setPriceHistory(candles.map(candle => ({
          time: candle.time,
          price: candle.close
        })));
        
        setLoading(false);
      } else {
        throw new Error("No data returned from API");
      }
    } catch (err) {
      console.error("Error fetching price data:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      
      // Fallback to mock data if API fails
      generateMockData();
    } finally {
      setRefreshing(false);
    }
  };

  // Generate mock price data for the demo or fallback
  const generateMockData = () => {
    if (!symbol) return;

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
    
    // Generate initial history data
    const initialHistory = Array.from({ length: 20 }, (_, i) => {
      const time = Date.now() - (20 - i) * 3000;
      const randomPrice = basePrice * (1 + (Math.random() * 0.04 - 0.02));
      return { time, price: randomPrice };
    });
    
    setPriceHistory(initialHistory);
    setLoading(false);
  };

  useEffect(() => {
    if (!symbol) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    // Fetch real data from Bybit API
    fetchPriceData();
    
    // Setup interval for price updates
    intervalRef.current = window.setInterval(fetchPriceData, 30000); // Update every 30 seconds
    
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
    return price < 0.1 ? price.toFixed(4) : price.toFixed(2);
  };

  const handleRefresh = () => {
    fetchPriceData();
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
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            className="mt-4"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
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

  // Use CryptoChart component for better visualization
  if (entryPrice && targets && targets.length > 0) {
    const type = targets[0].price > entryPrice ? "LONG" : "SHORT";
    
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center justify-between flex-wrap">
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
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                ${formatPrice(price)}
              </span>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8" 
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CryptoChart
            symbol={symbol}
            type={type}
            entryPrice={entryPrice}
            stopLoss={stopLoss || 0}
            targets={targets}
            className="h-[350px] w-full"
            refreshInterval={30000}
            showIndicators={true}
            technicalIndicators={{
              shortMa: price ? price * 0.998 : undefined,
              longMa: price ? price * 0.995 : undefined,
              upperBand: price ? price * 1.01 : undefined,
              lowerBand: price ? price * 0.99 : undefined
            }}
          />
        </CardContent>
      </Card>
    );
  }

  // Fallback to simple LineChart if we don't have entry price or targets
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center justify-between flex-wrap">
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
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">
              ${formatPrice(price)}
            </span>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={priceHistory} 
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                tick={false}
                domain={['auto', 'auto']}
              />
              <YAxis 
                domain={['auto', 'auto']} 
                tick={{ fontSize: 12 }} 
                width={60}
                tickFormatter={(value) => formatPrice(value)}
              />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleTimeString()} 
                formatter={(value: any) => [`$${formatPrice(value)}`, "Preço"]}
              />
              <Legend />
              
              {/* Entry price line */}
              {entryPrice && (
                <ReferenceLine 
                  y={entryPrice} 
                  stroke="green" 
                  strokeDasharray="3 3"
                  label={{ value: `Entrada: $${formatPrice(entryPrice)}`, position: 'insideTopRight' }}
                />
              )}
              
              {/* Stop loss line */}
              {stopLoss && (
                <ReferenceLine 
                  y={stopLoss} 
                  stroke="red" 
                  strokeDasharray="3 3"
                  label={{ value: `SL: $${formatPrice(stopLoss)}`, position: 'insideBottomRight' }}
                />
              )}
              
              {/* Target lines */}
              {targets && targets.map((target, index) => (
                <ReferenceLine 
                  key={`target-${index}`}
                  y={target.price} 
                  stroke={target.hit ? "#4CAF50" : "blue"} 
                  strokeDasharray="3 3"
                  label={{ 
                    value: `TP${target.level}${target.hit ? ' ✓' : ''}`, 
                    position: 'insideTopRight',
                    fill: target.hit ? "#4CAF50" : "blue"
                  }}
                />
              ))}
              
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#8884d8" 
                name="Preço" 
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
