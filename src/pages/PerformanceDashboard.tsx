import React, { useEffect } from "react";
import { useStrategyPerformance } from "@/hooks/useStrategyPerformance";
import PageHeader from "@/components/signals/PageHeader";
import StrategyPerformanceTable from "@/components/signals/StrategyPerformanceTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTradingSignals } from "@/hooks/useTradingSignals";
import { analyzeSignalsHistory } from "@/lib/signalHistoryService";
import { recalculateAllStrategiesStatistics } from "@/lib/firebaseFunctions";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface PerformanceBreakdownProps {
  title: string;
  data: { label: string; value: number }[];
  color: string;
}

const PerformanceBreakdown: React.FC<PerformanceBreakdownProps> = ({ title, data, color }) => {
  const chartData = {
    labels: data.map(item => item.label),
    datasets: [
      {
        label: title,
        data: data.map(item => item.value),
        backgroundColor: color,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        display: false,
      },
      title: {
        display: true,
        text: title,
      },
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Bar options={options} data={chartData} />
      </CardContent>
    </Card>
  );
};

const PerformanceDashboard = () => {
  const { toast } = useToast();
  const { signals, updateSignalStatuses } = useTradingSignals();
  const { strategies, loading, fetchStrategyPerformance, recalculateStatistics } = useStrategyPerformance();
  
  // Get performance metrics from local signals history
  const performanceMetrics = analyzeSignalsHistory();
  
  // Function to sync Firebase with local data
  const syncWithFirebase = async () => {
    try {
      toast({
        title: "Syncing data",
        description: "Syncing local signals with Firebase...",
      });
      
      // Update signal statuses first
      await updateSignalStatuses();
      
      // Then recalculate Firebase statistics
      await recalculateStatistics();
      
      toast({
        title: "Sync complete",
        description: "Successfully synchronized data with Firebase",
      });
    } catch (error) {
      console.error("Error syncing with Firebase:", error);
      toast({
        variant: "destructive",
        title: "Sync failed",
        description: "Failed to synchronize data with Firebase",
      });
    }
  };
  
  // Prepare data for charts
  const symbolsData = performanceMetrics.symbolsData.sort((a, b) => b.count - a.count).slice(0, 5);
  const strategyData = performanceMetrics.strategyData.sort((a, b) => b.count - a.count).slice(0, 5);
  
  return (
    <div className="container py-8">
      <PageHeader
        title="Performance Dashboard"
        description="Track your trading performance and strategy metrics"
      />
      
      <div className="mb-4 flex justify-end">
        <Button onClick={syncWithFirebase} variant="outline">
          <RefreshCcw className="h-4 w-4 mr-2" />
          Sync with Firebase
        </Button>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="time">Time Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Total Signals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performanceMetrics.totalSignals}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Winning Trades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{performanceMetrics.winningTrades}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Losing Trades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{performanceMetrics.losingTrades}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Win Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performanceMetrics.winRate.toFixed(2)}%</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="strategies" className="space-y-4">
          {/* Add Firebase Strategies Table */}
          <StrategyPerformanceTable 
            strategies={strategies}
            isLoading={loading}
            onRefresh={fetchStrategyPerformance}
          />
          
          <PerformanceBreakdown
            title="Top Strategies"
            data={strategyData.map(item => ({ label: item.strategy, value: item.count }))}
            color="#82ca9d"
          />
        </TabsContent>
        
        <TabsContent value="assets" className="space-y-4">
          <PerformanceBreakdown
            title="Top Symbols"
            data={symbolsData.map(item => ({ label: item.symbol, value: item.count }))}
            color="#8884d8"
          />
        </TabsContent>
        
        <TabsContent value="time" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Daily Performance</h3>
            {/* Add Time Analysis charts and data here */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceDashboard;
