
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
    winRate: Number(strategy.winRate || 0).toFixed(1),
    profit: Number(strategy.avgProfit || 0).toFixed(2)
  }));

  return (
    <div className="w-full h-[400px] bg-card rounded-md border p-4">
      <h3 className="text-lg font-semibold mb-4">Performance por Estratégia</h3>
      {strategies.length > 0 ? (
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
              formatter={(value, name) => {
                return [`${value}${name === "winRate" ? "%" : "%"}`, 
                  name === "winRate" ? "Taxa de Sucesso" : "Lucro Médio"];
              }}
            />
            <Legend 
              formatter={(value) => {
                return value === "winRate" ? "Taxa de Sucesso (%)" : "Lucro Médio (%)";
              }}
            />
            <Bar yAxisId="left" dataKey="winRate" name="winRate" fill="#82ca9d" />
            <Bar yAxisId="right" dataKey="profit" name="profit" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-muted-foreground">Sem dados disponíveis</p>
        </div>
      )}
    </div>
  );
};

export default StrategyPerformanceChart;
