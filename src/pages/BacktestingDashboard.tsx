
import React, { useState } from "react";
import BacktestingForm from "@/components/backtesting/BacktestingForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BacktestResult, HistoricalSignal } from "@/lib/types";
import { Download, FileText, BarChart2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { convertToHistoricalSignal, saveHistoricalSignals } from "@/lib/backtestingService";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import SignalHistoryTable from "@/components/signals/SignalHistoryTable";

export default function BacktestingDashboard() {
  const [activeTab, setActiveTab] = useState("backtest");
  const [historicalSignals, setHistoricalSignals] = useState<HistoricalSignal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistoricalSignals = async () => {
    setIsLoading(true);
    try {
      const signalsRef = collection(db, "historical_signals");
      const q = query(signalsRef, orderBy("entryTime", "desc"), limit(100));
      const querySnapshot = await getDocs(q);
      
      const signals: HistoricalSignal[] = [];
      querySnapshot.forEach((doc) => {
        signals.push({ id: doc.id, ...doc.data() } as HistoricalSignal);
      });
      
      setHistoricalSignals(signals);
      toast.success(`Loaded ${signals.length} historical signals`);
    } catch (error) {
      console.error("Error fetching historical signals:", error);
      toast.error("Failed to load historical signals");
    } finally {
      setIsLoading(false);
    }
  };

  const convertHistoricalSignalsToTradingSignals = (): any[] => {
    return historicalSignals.map(signal => ({
      id: signal.id,
      symbol: signal.asset,
      pair: signal.asset,
      direction: signal.direction === "long" ? "BUY" : "SELL",
      entryPrice: signal.entryPrice,
      exitPrice: signal.exitPrice,
      stopLoss: signal.entryPrice * (signal.direction === "long" ? 0.95 : 1.05), // Approximate
      leverage: signal.leverage || 1,
      status: "COMPLETED",
      createdAt: signal.entryTime,
      completedAt: signal.exitTime,
      profit: signal.pnlPercentage,
      result: signal.result === "win" ? 1 : signal.result === "loss" ? 0 : undefined,
      strategy: signal.strategy
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Backtest & Validation</h1>
          <p className="text-slate-600 dark:text-slate-300">
            Test trading strategies against historical data and validate their performance
          </p>
        </div>
      </div>

      <Tabs defaultValue="backtest" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="backtest" className="flex items-center">
            <BarChart2 className="h-4 w-4 mr-2" />
            Run Backtest
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center" onClick={() => fetchHistoricalSignals()}>
            <History className="h-4 w-4 mr-2" />
            Historical Signals
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Signal Validation
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="backtest">
          <BacktestingForm />
        </TabsContent>
        
        <TabsContent value="history">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Historical Trading Signals</h2>
              <Button 
                variant="outline" 
                onClick={fetchHistoricalSignals}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Refresh"}
              </Button>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <>
                {historicalSignals.length > 0 ? (
                  <SignalHistoryTable signals={convertHistoricalSignalsToTradingSignals()} />
                ) : (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">No historical signals found</p>
                    <p className="text-sm text-muted-foreground mt-2">Run a backtest first or import signals</p>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="validation">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Strategy Validation</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Manual Validation Checklist</h3>
                
                <div className="space-y-2">
                  <div className="flex items-start">
                    <input 
                      type="checkbox" 
                      id="validation-check-1" 
                      className="mt-1 mr-2" 
                    />
                    <label htmlFor="validation-check-1" className="text-sm">
                      <span className="font-medium">Entry/Exit Confirmation:</span> Verify that signals match chart patterns
                    </label>
                  </div>
                  
                  <div className="flex items-start">
                    <input 
                      type="checkbox" 
                      id="validation-check-2" 
                      className="mt-1 mr-2" 
                    />
                    <label htmlFor="validation-check-2" className="text-sm">
                      <span className="font-medium">Sample Size:</span> Test at least 100 trades for statistical significance
                    </label>
                  </div>
                  
                  <div className="flex items-start">
                    <input 
                      type="checkbox" 
                      id="validation-check-3" 
                      className="mt-1 mr-2" 
                    />
                    <label htmlFor="validation-check-3" className="text-sm">
                      <span className="font-medium">Multiple Time Periods:</span> Test during bull, bear, and sideways markets
                    </label>
                  </div>
                  
                  <div className="flex items-start">
                    <input 
                      type="checkbox" 
                      id="validation-check-4" 
                      className="mt-1 mr-2" 
                    />
                    <label htmlFor="validation-check-4" className="text-sm">
                      <span className="font-medium">False Signals:</span> Identify patterns where strategy fails
                    </label>
                  </div>
                  
                  <div className="flex items-start">
                    <input 
                      type="checkbox" 
                      id="validation-check-5" 
                      className="mt-1 mr-2" 
                    />
                    <label htmlFor="validation-check-5" className="text-sm">
                      <span className="font-medium">Risk Assessment:</span> Evaluate max drawdown and losing streaks
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Strategy Performance Thresholds</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Win Rate</p>
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '65%' }}></div>
                      </div>
                      <span className="ml-2 text-sm">≥65%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Profit Factor</p>
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '75%' }}></div>
                      </div>
                      <span className="ml-2 text-sm">≥1.5</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Max Drawdown</p>
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div className="bg-red-600 h-2.5 rounded-full" style={{ width: '30%' }}></div>
                      </div>
                      <span className="ml-2 text-sm">≤10%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Sharpe Ratio</p>
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '50%' }}></div>
                      </div>
                      <span className="ml-2 text-sm">≥1.0</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    <strong>Important:</strong> A strategy should be considered viable only when it meets or exceeds these performance thresholds across different market conditions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
