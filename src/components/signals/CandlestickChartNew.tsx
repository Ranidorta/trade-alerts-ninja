
import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PriceTarget } from "@/lib/types";
import { 
  ResponsiveContainer, 
  XAxis, YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { AlertCircle, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlestickChartProps {
  symbol: string;
  entryPrice?: number;
  stopLoss?: number;
  targets?: PriceTarget[];
}

// Utility function to determine candle color
const getCandleColor = (open: number, close: number) => {
  return close >= open ? "rgba(0, 255, 136, 0.8)" : "rgba(255, 0, 93, 0.8)";
};

export default function CandlestickChartNew({ symbol, entryPrice, stopLoss, targets }: CandlestickChartProps) {
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [trend, setTrend] = useState<"UP" | "DOWN" | "NEUTRAL">("NEUTRAL");
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Fetch candle data from Bybit API
  const fetchCandleData = async () => {
    if (!symbol) return;
    
    try {
      setRefreshing(true);
      // Use the Bybit API endpoint for kline/candlestick data
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
        
        setCandleData(candles);
        
        // Update current price and trend
        const latestCandle = candles[candles.length - 1];
        setCurrentPrice(latestCandle.close);
        
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
        
        setLoading(false);
      } else {
        throw new Error("No data returned from API");
      }
    } catch (err) {
      console.error("Error fetching candle data:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      
      // Fallback to mock data if API fails
      generateMockCandleData();
    } finally {
      setRefreshing(false);
    }
  };

  // Generate mock candle data for the demo or fallback
  const generateMockCandleData = () => {
    if (!symbol) return;

    // Start with the entry price or a random price
    const basePrice = entryPrice || (Math.random() * 1000 + 100);
    setCurrentPrice(basePrice);

    // Create mock candle data
    const mockCandles: CandleData[] = [];
    let currentTime = Date.now() - (20 * 5 * 60 * 1000); // Start 20 candles ago (5 min each)
    let lastClose = basePrice;
    
    for (let i = 0; i < 20; i++) {
      // Create some volatility
      const changePercent = (Math.random() * 2 - 1) * 0.01; // -1% to +1%
      const open = lastClose;
      const close = open * (1 + changePercent);
      const high = Math.max(open, close) * (1 + Math.random() * 0.005); // Up to 0.5% higher
      const low = Math.min(open, close) * (1 - Math.random() * 0.005); // Up to 0.5% lower
      const volume = Math.random() * 1000000;
      
      mockCandles.push({
        time: currentTime,
        open,
        high,
        low,
        close,
        volume
      });
      
      currentTime += 5 * 60 * 1000; // Add 5 minutes
      lastClose = close;
    }
    
    setCandleData(mockCandles);
    setLoading(false);
    
    // Set trend based on last two candles
    if (mockCandles.length >= 2) {
      const lastCandle = mockCandles[mockCandles.length - 1];
      const prevCandle = mockCandles[mockCandles.length - 2];
      
      if (lastCandle.close > prevCandle.close) {
        setTrend("UP");
      } else if (lastCandle.close < prevCandle.close) {
        setTrend("DOWN");
      } else {
        setTrend("NEUTRAL");
      }
    }
  };

  useEffect(() => {
    if (!symbol) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    // Fetch candle data
    fetchCandleData();
    
    // Setup interval for updates
    intervalRef.current = window.setInterval(fetchCandleData, 30000); // Update every 30 seconds
    
    // Cleanup function
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [symbol, entryPrice]);

  // Format price with appropriate decimal places
  const formatPrice = (price: number | null) => {
    if (price === null) return "—";
    return price < 0.1 ? price.toFixed(4) : price.toFixed(2);
  };

  const handleRefresh = () => {
    fetchCandleData();
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
              ${formatPrice(currentPrice)}
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
            <BarChart 
              data={candleData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              barCategoryGap={1}
              barGap={0}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis 
                dataKey="time" 
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                minTickGap={30}
                tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 11 }}
              />
              <YAxis 
                domain={['auto', 'auto']} 
                tickFormatter={(value) => formatPrice(value)}
                tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 11 }}
                width={60}
              />
              <Tooltip
                labelFormatter={(value) => new Date(Number(value)).toLocaleString()}
                formatter={(value, name) => {
                  if (name === 'candle') return [`${formatPrice(Number(value))}`, 'Preço'];
                  return [formatPrice(Number(value)), name === 'open' ? 'Abertura' : 
                                                      name === 'close' ? 'Fechamento' : 
                                                      name === 'high' ? 'Máxima' : 'Mínima'];
                }}
                contentStyle={{ 
                  backgroundColor: 'rgba(10, 10, 20, 0.9)',
                  borderColor: 'rgba(0, 255, 255, 0.3)',
                  color: 'white'
                }}
              />
              
              {/* Candle bodies */}
              <Bar 
                dataKey="candle" 
                name="Candle"
                fill="rgba(255, 255, 255, 0.8)" 
                stroke="rgba(255, 255, 255, 0.8)"
              >
                {candleData.map((entry, index) => {
                  // Create a custom data value for the candle body
                  const height = Math.abs(entry.close - entry.open);
                  const y = Math.min(entry.open, entry.close);
                  entry.candle = height;
                  
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getCandleColor(entry.open, entry.close)} 
                      stroke={getCandleColor(entry.open, entry.close)}
                    />
                  );
                })}
              </Bar>
              
              {/* High-low wicks (we'll simulate these with reference lines) */}
              {candleData.map((entry, index) => (
                <ReferenceLine
                  key={`wick-${index}`}
                  x={entry.time}
                  y1={entry.low}
                  y2={entry.high}
                  stroke={getCandleColor(entry.open, entry.close)}
                  strokeWidth={1}
                  isFront={false}
                />
              ))}
              
              {/* Entry price line */}
              {entryPrice && (
                <ReferenceLine 
                  y={entryPrice} 
                  stroke="#3361FF" 
                  strokeDasharray="3 3" 
                  label={{ 
                    value: `Entrada: $${formatPrice(entryPrice)}`, 
                    position: 'insideTopRight', 
                    fill: "#3361FF",
                    fontSize: 10
                  }} 
                />
              )}
              
              {/* Stop loss line */}
              {stopLoss && (
                <ReferenceLine 
                  y={stopLoss} 
                  stroke="#FF3361" 
                  strokeDasharray="3 3" 
                  label={{ 
                    value: `SL: $${formatPrice(stopLoss)}`, 
                    position: 'insideBottomRight', 
                    fill: "#FF3361",
                    fontSize: 10
                  }} 
                />
              )}
              
              {/* Target lines */}
              {targets && targets.map((target, index) => (
                <ReferenceLine 
                  key={`target-${index}`}
                  y={target.price} 
                  stroke={target.hit ? "#4CAF50" : "#7E57FF"} 
                  strokeDasharray="3 3" 
                  label={{ 
                    value: `TP${target.level}${target.hit ? ' ✓' : ''}`, 
                    position: 'insideTopRight', 
                    fill: target.hit ? "#4CAF50" : "#7E57FF",
                    fontSize: 10
                  }} 
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
