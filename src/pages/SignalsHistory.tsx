
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSignalsHistory, fetchHybridSignals } from "@/lib/signalsApi";
import { TradingSignal, SignalResult } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import SignalsList from "@/components/signals/SignalsList";
import HybridSignalsTab from "@/components/signals/HybridSignalsTab";
import PageHeader from "@/components/signals/PageHeader";
import SignalHistorySummary from "@/components/signals/SignalHistorySummary";
import { History, Brain, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveSignalsToHistory, getSignalHistory } from "@/lib/signal-storage";
import { reprocessAllHistory } from "@/lib/signalHistoryService";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CryptoTicker from "@/components/CryptoTicker";

const SignalsHistory: React.FC = () => {
  const { toast } = useToast();
  const [signalFilter, setSignalFilter] = useState<string | undefined>(undefined);
  const [resultFilter, setResultFilter] = useState<SignalResult | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [localMode, setLocalMode] = useState<boolean>(false);
  const [selectedSignal, setSelectedSignal] = useState<TradingSignal | null>(null);
  const [timeRange, setTimeRange] = useState<string>("");

  // Load signals from API
  const {
    data: apiSignals,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["signalsHistory", signalFilter, resultFilter],
    queryFn: () => fetchSignalsHistory({ 
      symbol: signalFilter,
      result: resultFilter 
    }),
    refetchOnWindowFocus: false,
    retry: 1,
    meta: {
      onError: (error: any) => {
        console.error("Failed to load signals:", error);
        // On API error, fall back to local storage signals
        setLocalMode(true);
      }
    }
  });
  
  // Load hybrid signals
  const {
    data: hybridSignals,
    isLoading: isLoadingHybrid,
    error: hybridError
  } = useQuery({
    queryKey: ["hybridSignals"],
    queryFn: fetchHybridSignals,
    refetchOnWindowFocus: false,
    retry: 1,
    meta: {
      onError: (error: any) => {
        console.error("Failed to load hybrid signals:", error);
      }
    }
  });

  // Get local signals from storage
  const localSignals = getSignalHistory();
  
  // Determine which signals to display
  const signals = localMode ? localSignals : (apiSignals || []);

  // Apply result filter if set
  const filteredSignals = resultFilter 
    ? signals.filter(s => {
        if (!s.result) return false;
        
        // Normalize result to handle different formats
        const normalizedResult = typeof s.result === 'number'
          ? (s.result === 1 ? "WINNER" : "LOSER")
          : String(s.result).toUpperCase();
        
        // Convert resultFilter to string for comparison
        const targetResult = String(resultFilter).toUpperCase();
        
        return normalizedResult === targetResult;
      })
    : signals;

  // Set the first signal as selected when signals are loaded
  useEffect(() => {
    if (filteredSignals && filteredSignals.length > 0 && !selectedSignal) {
      setSelectedSignal(filteredSignals[0]);
    }
  }, [filteredSignals, selectedSignal]);

  // Handle refresh
  const handleRefresh = async () => {
    if (localMode) {
      // Refresh local data by reprocessing
      const refreshedSignals = reprocessAllHistory();
      toast({
        title: "Histórico atualizado",
        description: `${refreshedSignals.length} sinais reprocessados localmente.`,
      });
    } else {
      // Refresh API data
      try {
        await refetch();
        toast({
          title: "Histórico atualizado",
          description: "Dados atualizados do servidor.",
        });
      } catch (error) {
        console.error("Error refreshing signals:", error);
        toast({
          title: "Erro ao atualizar",
          description: "Não foi possível atualizar os dados do servidor.",
          variant: "destructive",
        });
      }
    }
  };

  // Save API signals to local storage if available
  useEffect(() => {
    if (apiSignals && apiSignals.length > 0 && !localMode) {
      saveSignalsToHistory(apiSignals);
    }
  }, [apiSignals, localMode]);

  // Handle signal selection
  const handleSelectSignal = (signal: TradingSignal) => {
    setSelectedSignal(signal);
  };

  // Handle result filter
  const handleResultFilterChange = (value: string) => {
    if (value === "all") {
      setResultFilter(undefined);
    } else {
      setResultFilter(value as SignalResult);
    }
  };

  // Handle time range change
  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
  };

  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title="Histórico de Sinais" 
        description="Veja o histórico completo de sinais e seus resultados"
      />
      
      {/* Crypto Ticker - Added here for Market-like display */}
      <div className="mb-6">
        <CryptoTicker />
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="all">Todos Sinais</TabsTrigger>
              <TabsTrigger value="hybrid">
                <Brain className="mr-2 h-4 w-4" />
                Híbridos Premium
              </TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="p-2">
                    <p className="text-sm font-medium mb-2">Resultado</p>
                    <Select 
                      onValueChange={handleResultFilterChange}
                      defaultValue="all"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos resultados" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos resultados</SelectItem>
                        <SelectItem value="WINNER">✅ Winner</SelectItem>
                        <SelectItem value="PARTIAL">🟠 Parcial</SelectItem>
                        <SelectItem value="LOSER">❌ Loser</SelectItem>
                        <SelectItem value="FALSE">⚪ Falso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DropdownMenuSeparator />
                  <div className="p-2">
                    <p className="text-sm font-medium mb-2">Par</p>
                    <Select 
                      onValueChange={setSignalFilter}
                      defaultValue={signalFilter || "all"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos pares" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos pares</SelectItem>
                        {Array.from(new Set(signals.map(s => s.symbol))).map(symbol => (
                          <SelectItem key={symbol} value={symbol}>
                            {symbol}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>
          
          <TabsContent value="all" className="mt-6">
            <SignalHistorySummary signal={selectedSignal} />
            
            <SignalsList
              signals={filteredSignals}
              isLoading={isLoading}
              error={error}
              activeStrategy="ALL"
              strategies={Array.from(new Set(signals.map(s => s.strategy || "Unknown")))}
              onSelectStrategy={() => {}}
              viewMode="table"
              autoRefresh={false}
              onSignalSelect={handleSelectSignal}
            />
          </TabsContent>
          
          <TabsContent value="hybrid" className="mt-6">
            <HybridSignalsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SignalsHistory;
