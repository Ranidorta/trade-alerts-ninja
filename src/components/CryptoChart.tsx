
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CryptoChartDataPoint } from "@/lib/types";

export interface CryptoChartProps {
  symbol: string;
  type: "LONG" | "SHORT";
  entryPrice: number;
  stopLoss: number;
  targets: Array<{level: number, price: number, hit?: boolean}>;
  className?: string;
  refreshInterval?: number;
}

// Generate mock data points
const generateMockData = (type: "LONG" | "SHORT", entryPrice: number, targets: Array<{level: number, price: number, hit?: boolean}>, length: number = 24): CryptoChartDataPoint[] => {
  const trend = type === "LONG" ? 1 : -1;
  const volatility = entryPrice * 0.005; // 0.5% volatility
  
  // Calculate max target price to ensure chart shows all targets
  const maxTargetPrice = Math.max(...targets.map(t => t.price));
  const minTargetPrice = Math.min(...targets.map(t => t.price));
  
  // Calculate max price change to ensure hit targets are shown on chart
  const maxPriceChange = type === "LONG" 
    ? Math.max(maxTargetPrice - entryPrice, entryPrice * 0.1) 
    : Math.max(entryPrice - minTargetPrice, entryPrice * 0.1);
  
  return Array.from({ length }).map((_, i) => {
    // Calculate how far we've moved through the chart (0 to 1)
    const progress = i / length;
    
    // For long positions, we want to trend upward, for short positions downward
    // The trend intensity increases as we move through the chart
    const baseChange = progress * maxPriceChange * trend;
    
    // Add some random noise around the trend
    const randomWalk = (Math.random() - 0.5) * volatility * (1 + progress);
    
    // Calculate price at this point
    const price = Math.max(0, entryPrice + baseChange + randomWalk);
    
    return {
      time: i,
      price: price
    };
  });
};

const CryptoChart = ({ 
  symbol, 
  type, 
  entryPrice, 
  stopLoss, 
  targets, 
  className,
  refreshInterval = 60000
}: CryptoChartProps) => {
  const [data, setData] = useState<CryptoChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Simulate data loading
    setLoading(true);
    const generateData = () => {
      const newData = generateMockData(type, entryPrice, targets);
      setData(newData);
      setLoading(false);
    };
    
    generateData();
    
    // Periodically refresh data
    const intervalId = setInterval(generateData, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [type, entryPrice, targets, refreshInterval]);
  
  // Determine chart domain based on entry, SL and targets
  const prices = [entryPrice, stopLoss, ...targets.map(t => t.price)];
  const minPrice = Math.min(...prices) * 0.99;
  const maxPrice = Math.max(...prices) * 1.01;
  
  if (loading) {
    return <Skeleton className={cn("w-full h-52", className)} />;
  }
  
  return (
    <div className={cn("w-full h-60 p-2", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
          <XAxis dataKey="time" tick={false} stroke="rgba(0,0,0,0.1)" />
          <YAxis domain={[minPrice, maxPrice]} tick={{ fontSize: 12 }} />
          <Tooltip 
            formatter={(value: any) => [`${value.toFixed(entryPrice < 1 ? 4 : 2)}`, 'Price']}
            labelFormatter={() => symbol}
          />
          
          {/* Entry price line */}
          <ReferenceLine 
            y={entryPrice} 
            stroke="#3361FF" 
            strokeDasharray="3 3" 
            label={{ value: "Entry", position: "right", fill: "#3361FF" }} 
          />
          
          {/* Stop loss line */}
          <ReferenceLine 
            y={stopLoss} 
            stroke="#FF3361" 
            strokeDasharray="3 3" 
            label={{ value: "SL", position: "right", fill: "#FF3361" }} 
          />
          
          {/* Target lines */}
          {targets.map((target, index) => (
            <ReferenceLine 
              key={index}
              y={target.price} 
              stroke={target.hit ? "#4CAF50" : "#7E57FF"} 
              strokeDasharray="3 3" 
              label={{ 
                value: `TP${target.level}${target.hit ? ' ✓' : ''}`, 
                position: "right", 
                fill: target.hit ? "#4CAF50" : "#7E57FF" 
              }} 
            />
          ))}
          
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke={type === "LONG" ? "#4CAF50" : "#FF3361"} 
            strokeWidth={2}
            dot={false} 
            activeDot={{ r: 6 }} 
            animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CryptoChart;
