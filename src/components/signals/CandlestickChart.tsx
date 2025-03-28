
import { useEffect, useState, useCallback } from "react";
import { fetchBybitKlines } from "@/lib/apiServices";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  ReferenceLine
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp, TrendingDown, Loader2 } from "lucide-react";

interface CandlestickChartProps {
  symbol: string;
  entryPrice?: number;
  stopLoss?: number;
  targets?: { level: number; price: number; hit?: boolean }[];
}

export default function CandlestickChart({ symbol, entryPrice, stopLoss, targets }: CandlestickChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<string>("15");
  const [trend, setTrend] = useState<"BULLISH" | "BEARISH" | "NEUTRAL">("NEUTRAL");

  const fetchChartData = useCallback(async () => {
    if (!symbol) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const klineData = await fetchBybitKlines(symbol, interval, 100);
      
      if (!klineData || klineData.length === 0) {
        setError("Não foi possível carregar os dados do gráfico");
        return;
      }
      
      // Transform Bybit data to format that Recharts can use
      const transformedData = klineData.map((candle: any) => {
        const timestamp = parseInt(candle[0]);
        const open = parseFloat(candle[1]);
        const high = parseFloat(candle[2]);
        const low = parseFloat(candle[3]);
        const close = parseFloat(candle[4]);
        const volume = parseFloat(candle[5]);
        
        const increasing = close >= open;
        
        return {
          timestamp,
          time: new Date(timestamp).toLocaleTimeString(),
          date: new Date(timestamp).toLocaleDateString(),
          open,
          high,
          low,
          close,
          volume,
          increasing,
          color: increasing ? "#16a34a" : "#dc2626",
          barSize: Math.abs(close - open),
          barPosition: Math.min(open, close),
        };
      });
      
      // Determine overall trend
      const latestCandle = transformedData[0];
      if (latestCandle) {
        // Look at the last 5 candles to determine trend
        const lastFiveCandles = transformedData.slice(0, 5);
        const increasingCandles = lastFiveCandles.filter(candle => candle.increasing).length;
        
        if (increasingCandles >= 3) {
          setTrend("BULLISH");
        } else if (increasingCandles <= 2) {
          setTrend("BEARISH");
        } else {
          setTrend("NEUTRAL");
        }
      }
      
      // Sort data chronologically for the chart
      setChartData(transformedData.reverse());
    } catch (err) {
      console.error("Error fetching candlestick data:", err);
      setError("Erro ao carregar dados do gráfico");
    } finally {
      setIsLoading(false);
    }
  }, [symbol, interval]);

  useEffect(() => {
    if (symbol) {
      fetchChartData();
    }
  }, [symbol, fetchChartData]);

  // Autorefresh every 60 seconds
  useEffect(() => {
    if (!symbol) return;
    
    const intervalId = setInterval(() => {
      fetchChartData();
    }, 60000); // Refresh every 60 seconds
    
    return () => clearInterval(intervalId);
  }, [symbol, fetchChartData]);

  if (isLoading && chartData.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="p-6 h-full flex items-center justify-center">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">Carregando dados do gráfico...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && chartData.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="p-6 h-full flex items-center justify-center">
          <div className="flex flex-col items-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm font-medium mb-1">Erro ao carregar o gráfico</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>{symbol} - Gráfico</CardTitle>
            <Badge
              variant={
                trend === "BULLISH" ? "success" : 
                trend === "BEARISH" ? "destructive" : 
                "outline"
              }
              className="flex items-center gap-1"
            >
              {trend === "BULLISH" && <TrendingUp className="h-3 w-3" />}
              {trend === "BEARISH" && <TrendingDown className="h-3 w-3" />}
              {trend}
            </Badge>
          </div>
          <div className="flex gap-1">
            {["5", "15", "30", "60", "240"].map((timeframe) => (
              <Badge
                key={timeframe}
                variant={interval === timeframe ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setInterval(timeframe)}
              >
                {timeframe}m
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 pt-2">
        {chartData.length > 0 ? (
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  scale="auto" 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => value.split('/').slice(0, 2).join('/')}
                />
                <YAxis 
                  domain={['auto', 'auto']} 
                  tickFormatter={(value) => value.toFixed(2)}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value: any) => value.toFixed(4)}
                  labelFormatter={(label) => `Data: ${label}`}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend />
                <Bar
                  dataKey="barSize"
                  name="Candle"
                  fill="var(--color)"
                  stroke="var(--color)"
                  yAxisId={0}
                  barSize={6}
                  isAnimationActive={false}
                  shape={(props) => {
                    const { x, y, width, height, color } = props;
                    return (
                      <g>
                        <line
                          x1={x + width / 2}
                          y1={y}
                          x2={x + width / 2}
                          y2={y + height}
                          stroke={color}
                          strokeWidth={width}
                        />
                      </g>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="high"
                  name="Máxima"
                  stroke="#16a34a"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="low"
                  name="Mínima"
                  stroke="#dc2626"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
                
                {/* Reference lines for signal information */}
                {entryPrice && (
                  <ReferenceLine 
                    y={entryPrice} 
                    stroke="#2563eb" 
                    strokeDasharray="3 3"
                    label={{ value: 'Entrada', position: 'insideBottomRight', fill: '#2563eb', fontSize: 10 }}
                  />
                )}
                {stopLoss && (
                  <ReferenceLine 
                    y={stopLoss} 
                    stroke="#dc2626" 
                    strokeDasharray="3 3"
                    label={{ value: 'Stop', position: 'insideBottomRight', fill: '#dc2626', fontSize: 10 }}
                  />
                )}
                {targets && targets.map((target, index) => (
                  <ReferenceLine 
                    key={`target-${index}`}
                    y={target.price} 
                    stroke={target.hit ? "#16a34a" : "#f59e0b"} 
                    strokeDasharray="3 3"
                    label={{ 
                      value: `TP${target.level}`, 
                      position: 'insideBottomRight', 
                      fill: target.hit ? "#16a34a" : "#f59e0b",
                      fontSize: 10
                    }}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">Nenhum dado disponível</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
