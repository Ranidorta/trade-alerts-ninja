
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, BarChart2, History, Brain, Zap } from "lucide-react";
import { prefetchCommonData } from "@/lib/signalsApi";
import { useTradingSignals } from "@/hooks/useTradingSignals";
import PageHeader from "@/components/signals/PageHeader";
import SignalsList from "@/components/signals/SignalsList";
import HybridSignalsTab from "@/components/signals/HybridSignalsTab";

const SignalsDashboard = () => {
  const [activeTab, setActiveTab] = useState("active-signals");
  const [activeStrategy, setActiveStrategy] = useState("ALL");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { signals, loading, error, fetchSignals } = useTradingSignals();
  
  // Get unique strategies for filtering
  const strategies = Array.from(new Set(signals.map(signal => signal.strategy || "Unknown"))).sort();

  // Filter signals based on active strategy
  const filteredSignals = activeStrategy === "ALL" 
    ? signals 
    : signals.filter(signal => signal.strategy === activeStrategy);

  // Prefetch data when component mounts
  useEffect(() => {
    prefetchCommonData();
  }, []);

  // Initial signals load
  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  // Handle strategy selection
  const handleStrategySelect = (strategy: string) => {
    setActiveStrategy(strategy);
  };

  // Handle view mode change
  const handleViewModeChange = (mode: "cards" | "table") => {
    setViewMode(mode);
  };

  // Calculate signal counts for badges
  const activeSignalsCount = signals.filter(s => s.status !== "COMPLETED").length;
  const completedSignalsCount = signals.filter(s => s.status === "COMPLETED").length;
  
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader 
        title="Painel de Sinais" 
        description="Acompanhe sinais de trading em tempo real"
      />
      
      <Tabs defaultValue="active-signals" value={activeTab} onValueChange={setActiveTab} className="mt-8">
        <TabsList className="mb-6">
          <TabsTrigger value="active-signals" className="flex items-center">
            <Zap className="w-4 h-4 mr-2" />
            Sinais Ativos
            <Badge variant="secondary" className="ml-2 bg-primary/10">{activeSignalsCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center">
            <History className="w-4 h-4 mr-2" />
            Histórico
            <Badge variant="secondary" className="ml-2 bg-primary/10">{completedSignalsCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center">
            <BarChart2 className="w-4 h-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="hybrid-signals" className="flex items-center">
            <Brain className="w-4 h-4 mr-2" />
            Sinais Híbridos
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active-signals" className="space-y-6">
          <SignalsList 
            signals={filteredSignals.filter(s => s.status !== "COMPLETED")}
            isLoading={loading}
            error={error}
            activeStrategy={activeStrategy}
            strategies={strategies}
            onSelectStrategy={handleStrategySelect}
            viewMode={viewMode}
            onRefresh={fetchSignals}
            autoRefresh={autoRefresh}
            autoRefreshInterval={60}
          />
        </TabsContent>
        
        <TabsContent value="history" className="space-y-6">
          <SignalsList 
            signals={filteredSignals.filter(s => s.status === "COMPLETED")}
            isLoading={loading}
            error={error}
            activeStrategy={activeStrategy}
            strategies={strategies}
            onSelectStrategy={handleStrategySelect}
            viewMode={viewMode}
            onRefresh={fetchSignals}
            autoRefresh={false}
          />
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance de Sinais</CardTitle>
              <CardDescription>
                Análise detalhada do desempenho dos sinais de trading
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                A análise de performance estará disponível em breve.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="hybrid-signals" className="space-y-6">
          <HybridSignalsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SignalsDashboard;
