
import React, { useEffect, memo } from "react";
import { TradingSignal } from "@/lib/types";
import SignalCard from "@/components/SignalCard";
import StrategyList from "@/components/signals/StrategyList";
import ApiConnectionError from "@/components/signals/ApiConnectionError";
import SignalHistoryTable from "@/components/signals/SignalHistoryTable";
import { config } from "@/config/env";
import { useToast } from "@/components/ui/use-toast";

interface SignalsListProps {
  signals: TradingSignal[];
  isLoading: boolean;
  error: any;
  activeStrategy: string;
  strategies: string[];
  onSelectStrategy: (strategy: string) => void;
  viewMode?: "cards" | "table";
  onRefresh?: () => void;
  autoRefresh?: boolean;
  autoRefreshInterval?: number; // in seconds
  onSignalSelect?: (signal: TradingSignal) => void;
}

// Using memo to prevent unnecessary re-renders
const SignalsList = memo(({ 
  signals, 
  isLoading, 
  error, 
  activeStrategy, 
  strategies,
  onSelectStrategy,
  viewMode = "cards",
  onRefresh,
  autoRefresh = false,
  autoRefreshInterval = 60,
  onSignalSelect
}: SignalsListProps) => {
  const { toast } = useToast();

  // Auto-refresh
  useEffect(() => {
    let intervalId: number | undefined;
    
    if (autoRefresh && onRefresh) {
      intervalId = window.setInterval(() => {
        console.log("Auto-refreshing signals list...");
        onRefresh();
        toast({
          title: "Lista atualizada",
          description: `Atualizando automaticamente a cada ${autoRefreshInterval} segundos.`,
          variant: "default",
        });
      }, autoRefreshInterval * 1000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, autoRefreshInterval, onRefresh, toast]);

  // Select first signal when signals are loaded
  useEffect(() => {
    if (signals && signals.length > 0 && onSignalSelect) {
      onSignalSelect(signals[0]);
    }
  }, [signals, onSignalSelect]);

  // Function to handle switching to local mode
  const handleLocalModeClick = () => {
    // Clear the API error by refreshing and forcing local mode
    localStorage.setItem("force_local_mode", "true");
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-lg text-muted-foreground">Carregando sinais...</p>
      </div>
    );
  }

  // Se houver erro, verifica se é erro de conexão com a API
  if (error) {
    // Erro genérico de conexão com a API
    if (error.message && (error.message.includes("fetch") || error.message.includes("network"))) {
      return <ApiConnectionError 
        apiUrl={config.signalsApiUrl || "https://trade-alerts-backend.onrender.com"} 
        onLocalModeClick={handleLocalModeClick}
      />;
    }
    
    // Tratamento especial para erros de autenticação
    if (error.message && error.message.includes("401")) {
      return (
        <div className="flex flex-col justify-center items-center h-64 gap-4">
          <p className="text-lg text-destructive">Erro de autenticação. Faça login para continuar.</p>
          <button 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
            onClick={() => window.location.href = "/login"}
          >
            Fazer Login
          </button>
        </div>
      );
    }
    
    // Erro genérico
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-lg text-destructive">Erro ao carregar sinais: {error.message || "Erro desconhecido"}</p>
      </div>
    );
  }

  // Se a estratégia atual é "ALL", mostrar a lista de estratégias
  if (activeStrategy === "ALL") {
    return (
      <StrategyList
        strategies={strategies}
        onSelectStrategy={onSelectStrategy}
      />
    );
  }

  if (signals.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-lg text-muted-foreground">
          {activeStrategy !== "ALL" 
            ? `Nenhum sinal encontrado para a estratégia "${activeStrategy}".` 
            : "Nenhum sinal encontrado para os filtros aplicados."}
        </p>
      </div>
    );
  }

  // Renderizar como tabela se viewMode for "table"
  if (viewMode === "table") {
    return <SignalHistoryTable 
      signals={signals} 
      onSignalSelect={onSignalSelect} 
    />;
  }

  // Caso contrário, renderizar como cards (default)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {signals.map((signal) => (
        <SignalCard 
          key={signal.id} 
          signal={signal}
          onSelect={() => onSignalSelect && onSignalSelect(signal)}
        />
      ))}
    </div>
  );
});

// Add display name for debugging
SignalsList.displayName = "SignalsList";

export default SignalsList;
