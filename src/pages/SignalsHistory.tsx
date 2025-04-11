
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSignalsHistory, fetchHybridSignals } from "@/lib/signalsApi";
import { TradingSignal } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import SignalsList from "@/components/signals/SignalsList";
import HybridSignalsTab from "@/components/signals/HybridSignalsTab";
import PageHeader from "@/components/signals/PageHeader";
import SignalHistorySummary from "@/components/signals/SignalHistorySummary";
import { History, Brain, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveSignalsToHistory, getSignalHistory } from "@/lib/signal-storage";
import { reprocessAllHistory } from "@/lib/signalHistoryService";

const SignalsHistory: React.FC = () => {
  const { toast } = useToast();
  const [signalFilter, setSignalFilter] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [localMode, setLocalMode] = useState<boolean>(false);
  const [selectedSignal, setSelectedSignal] = useState<TradingSignal | null>(null);
  
  // Load signals from API
  const {
    data: apiSignals,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["signalsHistory", signalFilter],
    queryFn: () => fetchSignalsHistory({ symbol: signalFilter }),
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

  // Set the first signal as selected when signals are loaded
  useEffect(() => {
    if (signals && signals.length > 0 && !selectedSignal) {
      setSelectedSignal(signals[0]);
    }
  }, [signals, selectedSignal]);

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

  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title="Histórico de Sinais" 
        description="Veja o histórico completo de sinais e seus resultados"
      />
      
      <div className="flex justify-between items-center mb-6">
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="all">Todos Sinais</TabsTrigger>
            <TabsTrigger value="hybrid">
              <Brain className="mr-2 h-4 w-4" />
              Híbridos Premium
            </TabsTrigger>
          </TabsList>
          
          <div className="flex justify-end my-4">
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
          
          <TabsContent value="all" className="mt-6">
            <SignalHistorySummary signal={selectedSignal} className="mb-6" />
            
            <SignalsList
              signals={signals}
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
