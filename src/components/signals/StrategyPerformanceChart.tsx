
import React from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { StrategyTypePerformance } from "@/lib/types";

interface StrategyPerformanceChartProps {
  strategies: StrategyTypePerformance[];
}

const StrategyPerformanceChart: React.FC<StrategyPerformanceChartProps> = ({ strategies }) => {
  // Format data for the chart
  const chartData = strategies.map(strategy => ({
    name: strategy.strategy,
    winRate: strategy.winRate || 0,
    profit: strategy.avgProfit || 0
  }));

  return (
    <div className="w-full h-[400px] bg-card rounded-md border p-4">
      <h3 className="text-lg font-semibold mb-4">Strategy Performance</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end" 
            height={70} 
            tick={{ fontSize: 12 }}
          />
          <YAxis yAxisId="left" orientation="left" stroke="#82ca9d" />
          <YAxis yAxisId="right" orientation="right" stroke="#8884d8" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "rgba(0, 0, 0, 0.8)", 
              borderRadius: "8px", 
              border: "none",
              color: "white" 
            }} 
          />
          <Legend />
          <Bar yAxisId="left" dataKey="winRate" name="Win Rate (%)" fill="#82ca9d" />
          <Bar yAxisId="right" dataKey="profit" name="Avg Profit (%)" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StrategyPerformanceChart;
