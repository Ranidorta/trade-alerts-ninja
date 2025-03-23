
import React, { useState, useEffect, useMemo } from "react";
import { TradingSignal } from "@/lib/types";
import SignalCard from "@/components/SignalCard";
import { Calendar, Filter, SortDesc, TrendingUp, TrendingDown, LineChart, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import TradingSignalInsights from "@/components/TradingSignalInsights";

const SignalsHistory = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedSignal, setSelectedSignal] = useState<TradingSignal | null>(null);
  const { toast } = useToast();

  // Load signals from localStorage on component mount
  useEffect(() => {
    // Try to get historical signals first
    const savedHistorical = localStorage.getItem('historicalSignals');
    if (savedHistorical) {
      try {
        const historicalSignals = JSON.parse(savedHistorical);
        setSignals(historicalSignals);
      } catch (e) {
        console.error("Error parsing historical signals:", e);
        // Fallback to completed signals from active signals
        loadCompletedFromActive();
      }
    } else {
      // If no historical signals, try to get completed signals from active signals
      loadCompletedFromActive();
    }
  }, []);

  // Load completed signals from active signals (fallback)
  const loadCompletedFromActive = () => {
    const savedActive = localStorage.getItem('tradingSignals');
    if (savedActive) {
      try {
        const activeSignals = JSON.parse(savedActive);
        const completedSignals = activeSignals.filter((signal: TradingSignal) => 
          signal.status === "COMPLETED"
        );
        
        if (completedSignals.length > 0) {
          setSignals(completedSignals);
        }
      } catch (e) {
        console.error("Error parsing active signals:", e);
        toast({
          title: "Error loading historical data",
          description: "Could not load signal history. Using sample data instead.",
          variant: "destructive"
        });
      }
    }
  };

  // Calculate summary statistics
  const summary = useMemo(() => {
    const profitSignals = signals.filter(signal => signal.profit !== undefined && signal.profit > 0);
    const lossSignals = signals.filter(signal => signal.profit !== undefined && signal.profit < 0);
    
    const totalProfit = profitSignals.reduce((sum, signal) => sum + (signal.profit || 0), 0);
    const totalLoss = lossSignals.reduce((sum, signal) => sum + (signal.profit || 0), 0);
    
    return {
      totalSignals: signals.length,
      profitSignals: profitSignals.length,
      lossSignals: lossSignals.length,
      totalProfit: totalProfit.toFixed(2),
      totalLoss: totalLoss.toFixed(2),
      winRate: signals.length > 0 ? ((profitSignals.length / signals.length) * 100).toFixed(2) : "0.00"
    };
  }, [signals]);

  // Filter signals based on active tab
  const filteredSignals = useMemo(() => {
    return signals.filter(signal => {
      if (activeTab === "all") return true;
      if (activeTab === "profit") return signal.profit !== undefined && signal.profit > 0;
      if (activeTab === "loss") return signal.profit !== undefined && signal.profit < 0;
      return true;
    });
  }, [signals, activeTab]);

  const handleRefresh = () => {
    loadCompletedFromActive();
    toast({
      title: "History Refreshed",
      description: "Signal history has been updated with the latest data"
    });
  };

  const handleSignalClick = (signal: TradingSignal) => {
    setSelectedSignal(signal);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Signals History</h1>
          <p className="text-muted-foreground">View past signals and performance</p>
        </div>
        <div className="flex mt-4 md:mt-0 space-x-2">
          <Button variant="outline" asChild className="flex items-center">
            <Link to="/performance">
              <LineChart className="mr-2 h-4 w-4" />
              Performance Dashboard
            </Link>
          </Button>
          <Button variant="outline" onClick={handleRefresh} className="flex items-center">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh History
          </Button>
          <Card className="shadow-sm">
            <CardContent className="p-3 flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-primary" />
              <span className="text-sm">Filter by date</span>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3 flex items-center">
              <SortDesc className="h-4 w-4 mr-2 text-primary" />
              <span className="text-sm">Sort by</span>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Total Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.totalSignals}</p>
            <p className="text-sm text-muted-foreground">Completed signals</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-crypto-green" />
              Profitable Signals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-crypto-green">{summary.profitSignals}</p>
            <p className="text-sm text-muted-foreground">Total profit: +{summary.totalProfit}%</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <TrendingDown className="h-4 w-4 mr-2 text-crypto-red" />
              Loss Signals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-crypto-red">{summary.lossSignals}</p>
            <p className="text-sm text-muted-foreground">Total loss: {summary.totalLoss}%</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.winRate}%</p>
            <p className="text-sm text-muted-foreground">Success rate</p>
          </CardContent>
        </Card>
      </div>

      {selectedSignal && (
        <div className="mb-6">
          <TradingSignalInsights signal={selectedSignal} />
        </div>
      )}

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList>
          <TabsTrigger value="all">All Signals</TabsTrigger>
          <TabsTrigger value="profit">Profit</TabsTrigger>
          <TabsTrigger value="loss">Loss</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSignals.length > 0 ? (
          filteredSignals.map((signal) => (
            <div key={signal.id} onClick={() => handleSignalClick(signal)}>
              <SignalCard key={signal.id} signal={signal} />
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <LineChart className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-medium mb-2">No historical signals yet</h3>
            <p className="text-slate-500 max-w-md mx-auto mb-4">
              Generate signals and complete trades to build your trading history and performance metrics.
            </p>
            <Button asChild>
              <Link to="/signals">
                Generate Signals
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignalsHistory;
