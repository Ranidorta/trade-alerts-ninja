
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSignals, fetchStrategies } from "@/lib/signalsApi";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { config } from "@/config/env";

// Componentes refatorados
import PageHeader from "@/components/signals/PageHeader";
import ApiConnectionError from "@/components/signals/ApiConnectionError";
import SignalsSummary from "@/components/signals/SignalsSummary";
import StrategiesTabList from "@/components/signals/StrategiesTabList";
import ResultsTabSelector from "@/components/signals/ResultsTabSelector";
import SignalsList from "@/components/signals/SignalsList";

const SignalsHistory = () => {
  const [resultTab, setResultTab] = useState("all");
  const [activeStrategy, setActiveStrategy] = useState<string>("ALL");
  const { toast } = useToast();
  const [apiConnectivityIssue, setApiConnectivityIssue] = useState(false);
  
  // Fetch available strategies
  const { data: strategies = [], isLoading: strategiesLoading, error: strategiesError } = useQuery({
    queryKey: ['strategies'],
    queryFn: fetchStrategies,
    retry: 1,
    meta: {
      onSettled: (data: any, error: any) => {
        if (error) {
          console.error("Error fetching strategies:", error);
          setApiConnectivityIssue(true);
          toast({
            title: "Erro ao carregar estratégias",
            description: "Não foi possível conectar ao backend. Verifique se o servidor está rodando.",
            variant: "destructive"
          });
        } else {
          setApiConnectivityIssue(false);
        }
      }
    }
  });
  
  // Fetch signals from API with strategy filtering
  const { data: signals = [], isLoading, error } = useQuery({
    queryKey: ['signals', 'history', activeStrategy],
    queryFn: () => {
      const params: any = { days: 30 };
      if (activeStrategy !== "ALL") {
        params.strategy = activeStrategy;
      }
      return fetchSignals(params);
    },
    retry: 1,
    enabled: !apiConnectivityIssue,
    meta: {
      onSettled: (data: any, error: any) => {
        if (error) {
          toast({
            title: "Erro ao carregar sinais",
            description: "Não foi possível carregar o histórico de sinais. Tente novamente mais tarde.",
            variant: "destructive",
          });
        }
      }
    }
  });

  // Filter signals based on active tab
  const filteredSignals = signals.filter(signal => {
    if (resultTab === "all") return true;
    if (resultTab === "profit") return signal.profit !== undefined && signal.profit > 0;
    if (resultTab === "loss") return signal.profit !== undefined && signal.profit < 0;
    return true;
  });

  // Handle strategy change
  const handleStrategyChange = (value: string) => {
    setActiveStrategy(value);
  };

  // Show API connectivity issue message
  if (apiConnectivityIssue) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader />
        <ApiConnectionError apiUrl={config.signalsApiUrl} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader />

      {/* Summary Section */}
      <SignalsSummary signals={signals} />

      {/* Estratégias em abas */}
      <Tabs 
        defaultValue="ALL" 
        value={activeStrategy} 
        onValueChange={handleStrategyChange}
        className="mb-8"
      >
        <StrategiesTabList 
          strategies={strategies} 
          activeStrategy={activeStrategy}
          isLoading={strategiesLoading}
        />
        
        <TabsContent value={activeStrategy} className="mt-0">
          {/* Resultados em abas (profit/loss) */}
          <ResultsTabSelector 
            resultTab={resultTab} 
            onValueChange={setResultTab} 
          />

          <SignalsList 
            signals={filteredSignals}
            isLoading={isLoading}
            error={error}
            activeStrategy={activeStrategy}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SignalsHistory;
