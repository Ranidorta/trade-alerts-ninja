
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CryptoChartDataPoint } from "@/lib/types";

export interface GamerCryptoChartProps {
  symbol: string;
  type: "LONG" | "SHORT";
  entryPrice: number;
  stopLoss: number;
  targets: Array<{level: number, price: number, hit?: boolean}>;
  className?: string;
  refreshInterval?: number;
}

// Generate mock data points with more realistic price movement based on target hits
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
  
  // Find the highest hit target to ensure our chart shows it being hit
  const hitTargets = targets.filter(t => t.hit);
  const highestHitTargetIndex = hitTargets.length 
    ? Math.max(...hitTargets.map(t => targets.indexOf(t)))
    : -1;
  
  return Array.from({ length }).map((_, i) => {
    // Calculate how far we've moved through the chart (0 to 1)
    const progress = i / length;
    
    // For long positions, we want to trend upward, for short positions downward
    // The trend intensity increases as we move through the chart
    const baseChange = progress * maxPriceChange * trend;
    
    // Add some random noise around the trend
    const randomWalk = (Math.random() - 0.5) * volatility * (1 + progress);
    
    // If we have hit targets, make sure our chart shows prices reaching them
    let adjustedPrice = entryPrice + baseChange + randomWalk;
    
    // For targets that are hit, ensure the chart shows prices reaching that level
    if (highestHitTargetIndex >= 0 && progress > 0.6) {
      const hitTarget = targets[highestHitTargetIndex];
      // Make the price fluctuate around the highest hit target
      if (type === "LONG") {
        adjustedPrice = Math.max(adjustedPrice, hitTarget.price * (0.995 + 0.01 * Math.random()));
      } else {
        adjustedPrice = Math.min(adjustedPrice, hitTarget.price * (1.005 - 0.01 * Math.random()));
      }
    }
    
    return {
      time: i,
      price: Math.max(0, adjustedPrice)
    };
  });
};

const GamerCryptoChart = ({ 
  symbol, 
  type, 
  entryPrice, 
  stopLoss, 
  targets, 
  className,
  refreshInterval = 60000
}: GamerCryptoChartProps) => {
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
    return <Skeleton className={cn("w-full h-52 bg-[#221F26] opacity-70", className)} />;
  }
  
  return (
    <div className={cn("w-full h-60 p-2 relative cyber-corners", className)}>
      <div className="absolute top-0 left-0 right-0 bottom-0 z-0 bg-[#1A1F2C] border border-[#8B5CF6] rounded-lg overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ 
          backgroundImage: 'radial-gradient(circle at 15% 50%, rgba(139, 92, 246, 0.8) 0%, transparent 25%), radial-gradient(circle at 85% 30%, rgba(217, 70, 239, 0.8) 0%, transparent 25%)',
          backgroundSize: '100% 100%'
        }}></div>
      </div>
      
      <div className="relative z-10 w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.15)" />
            <XAxis dataKey="time" tick={false} stroke="rgba(139, 92, 246, 0.2)" />
            <YAxis 
              domain={[minPrice, maxPrice]} 
              tick={{ fontSize: 12, fill: "#c8c8ff" }} 
              stroke="rgba(139, 92, 246, 0.2)"
            />
            <Tooltip 
              formatter={(value: any) => [`${value.toFixed(entryPrice < 1 ? 4 : 2)}`, 'Price']}
              labelFormatter={() => symbol}
              contentStyle={{ 
                backgroundColor: 'rgba(34, 31, 38, 0.95)', 
                border: '1px solid #8B5CF6',
                borderRadius: '4px',
                color: '#e0e0ff',
                boxShadow: '0 0 10px rgba(139, 92, 246, 0.3)'
              }}
            />
            
            {/* Entry price line */}
            <ReferenceLine 
              y={entryPrice} 
              stroke="#8B5CF6" 
              strokeDasharray="3 3" 
              label={{ 
                value: "Entry", 
                position: "right", 
                fill: "#8B5CF6",
                fontSize: 12,
              }} 
            />
            
            {/* Stop loss line */}
            <ReferenceLine 
              y={stopLoss} 
              stroke="#FF3361" 
              strokeDasharray="3 3" 
              label={{ 
                value: "SL", 
                position: "right", 
                fill: "#FF3361",
                fontSize: 12,
              }} 
            />
            
            {/* Target lines */}
            {targets.map((target, index) => (
              <ReferenceLine 
                key={index}
                y={target.price} 
                stroke={target.hit ? "#4CAF50" : "#D946EF"} 
                strokeDasharray="3 3" 
                label={{ 
                  value: `TP${target.level}${target.hit ? ' ✓' : ''}`, 
                  position: "right", 
                  fill: target.hit ? "#4CAF50" : "#D946EF",
                  fontSize: 12,
                }} 
              />
            ))}
            
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke={type === "LONG" ? "#4CAF50" : "#FF3361"} 
              strokeWidth={2}
              dot={false} 
              activeDot={{ r: 6, fill: type === "LONG" ? "#4CAF50" : "#FF3361", stroke: "#e0e0ff" }} 
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Add gaming UI corner elements */}
      <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-[#8B5CF6]"></div>
      <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-[#D946EF]"></div>
      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-[#D946EF]"></div>
      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-[#8B5CF6]"></div>
    </div>
  );
};

export default GamerCryptoChart;
