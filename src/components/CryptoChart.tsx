
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CryptoChartDataPoint, TechnicalIndicators } from "@/lib/types";

export interface CryptoChartProps {
  symbol: string;
  type: "LONG" | "SHORT";
  entryPrice: number;
  stopLoss: number;
  targets: Array<{level: number, price: number, hit?: boolean}>;
  className?: string;
  refreshInterval?: number;
  showIndicators?: boolean;
  technicalIndicators?: TechnicalIndicators;
}

// Generate mock data points with more realistic price movement based on target hits and technical indicators
const generateMockData = (
  type: "LONG" | "SHORT", 
  entryPrice: number, 
  targets: Array<{level: number, price: number, hit?: boolean}>, 
  indicators?: TechnicalIndicators,
  length: number = 24
): CryptoChartDataPoint[] => {
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
  
  // Create price data
  const data: CryptoChartDataPoint[] = Array.from({ length }).map((_, i) => {
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
      price: Math.max(0, adjustedPrice),
    };
  });
  
  // Add moving averages if indicators exist
  if (indicators?.shortMa && indicators?.longMa) {
    // Generate moving averages with a slight lag
    const shortMaData = data.map((point, i) => {
      // First few points don't have enough history for MA
      if (i < 5) return null;
      
      // Calculate simple MA from previous prices (with some noise to look realistic)
      const prevPrices = data.slice(Math.max(0, i-5), i).map(p => p.price);
      const ma = prevPrices.reduce((sum, p) => sum + p, 0) / prevPrices.length;
      return ma + (Math.random() - 0.5) * entryPrice * 0.001; // Small random variation
    });
    
    const longMaData = data.map((point, i) => {
      // First several points don't have enough history for MA
      if (i < 10) return null;
      
      // Calculate simple MA from previous prices
      const prevPrices = data.slice(Math.max(0, i-10), i).map(p => p.price);
      const ma = prevPrices.reduce((sum, p) => sum + p, 0) / prevPrices.length;
      return ma + (Math.random() - 0.5) * entryPrice * 0.001; // Small random variation
    });
    
    // Add MAs to data
    data.forEach((point, i) => {
      point.shortMa = shortMaData[i] || undefined;
      point.longMa = longMaData[i] || undefined;
      
      // Add trading signal based on MA crossover
      if (point.shortMa && point.longMa) {
        point.signal = point.shortMa > point.longMa ? 1 : -1;
      }
    });
  }
  
  return data;
};

const CryptoChart = ({ 
  symbol, 
  type, 
  entryPrice, 
  stopLoss, 
  targets, 
  className,
  refreshInterval = 60000,
  showIndicators = false,
  technicalIndicators
}: CryptoChartProps) => {
  const [data, setData] = useState<CryptoChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Simulate data loading
    setLoading(true);
    const generateData = () => {
      const newData = generateMockData(type, entryPrice, targets, technicalIndicators);
      setData(newData);
      setLoading(false);
    };
    
    generateData();
    
    // Periodically refresh data
    const intervalId = setInterval(generateData, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [type, entryPrice, targets, refreshInterval, technicalIndicators]);
  
  // Determine chart domain based on entry, SL and targets
  const prices = [entryPrice, stopLoss, ...targets.map(t => t.price)];
  if (showIndicators && technicalIndicators) {
    if (technicalIndicators.upperBand) prices.push(technicalIndicators.upperBand);
    if (technicalIndicators.lowerBand) prices.push(technicalIndicators.lowerBand);
    if (technicalIndicators.shortMa) prices.push(technicalIndicators.shortMa);
    if (technicalIndicators.longMa) prices.push(technicalIndicators.longMa);
  }
  
  const minPrice = Math.min(...prices) * 0.99;
  const maxPrice = Math.max(...prices) * 1.01;
  
  if (loading) {
    return <Skeleton className={cn("w-full h-52", className)} />;
  }
  
  // Format values for tooltip
  const formatValue = (value: number) => {
    if (value === undefined) return '-';
    return value.toFixed(entryPrice < 1 ? 4 : 2);
  };
  
  return (
    <div className={cn("w-full h-60 p-2", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
          <XAxis dataKey="time" tick={false} stroke="rgba(0,0,0,0.1)" />
          <YAxis domain={[minPrice, maxPrice]} tick={{ fontSize: 12 }} />
          <Tooltip 
            formatter={(value: any, name: string) => {
              if (name === 'price') return [formatValue(value), 'Price'];
              if (name === 'shortMa') return [formatValue(value), 'Short MA'];
              if (name === 'longMa') return [formatValue(value), 'Long MA'];
              return [value, name];
            }}
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
          
          {/* Technical indicators */}
          {showIndicators && technicalIndicators && technicalIndicators.upperBand && (
            <ReferenceLine 
              y={technicalIndicators.upperBand} 
              stroke="#888888" 
              strokeDasharray="2 2" 
              label={{ value: "Upper Band", position: "left", fill: "#888888" }} 
            />
          )}
          
          {showIndicators && technicalIndicators && technicalIndicators.lowerBand && (
            <ReferenceLine 
              y={technicalIndicators.lowerBand} 
              stroke="#888888" 
              strokeDasharray="2 2" 
              label={{ value: "Lower Band", position: "left", fill: "#888888" }} 
            />
          )}
          
          {/* Moving average lines */}
          {showIndicators && (
            <>
              <Line 
                type="monotone" 
                dataKey="shortMa" 
                stroke="#FF9800" 
                dot={false} 
                strokeWidth={1.5} 
                strokeDasharray="3 3"
                connectNulls={true}
              />
              <Line 
                type="monotone" 
                dataKey="longMa" 
                stroke="#9C27B0" 
                dot={false} 
                strokeWidth={1.5} 
                strokeDasharray="3 3"
                connectNulls={true}
              />
            </>
          )}
          
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke={type === "LONG" ? "#4CAF50" : "#FF3361"} 
            strokeWidth={2}
            dot={false} 
            activeDot={{ r: 6 }} 
            animationDuration={1500}
          />
          
          {/* Buy/Sell signal dots */}
          {showIndicators && data.filter(d => d.signal === 1).map((d, i) => (
            <ReferenceLine 
              key={`buy-${i}`}
              x={d.time} 
              stroke="#4CAF50" 
              strokeWidth={0}
              ifOverflow="hidden"
              label={{ 
                value: "B", 
                position: "top",
                fill: "#4CAF50",
                fontSize: 10 
              }}
            />
          ))}
          
          {showIndicators && data.filter(d => d.signal === -1).map((d, i) => (
            <ReferenceLine 
              key={`sell-${i}`}
              x={d.time} 
              stroke="#FF3361" 
              strokeWidth={0}
              ifOverflow="hidden"
              label={{ 
                value: "S", 
                position: "bottom",
                fill: "#FF3361",
                fontSize: 10
              }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CryptoChart;
