
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
}

// Memoized SignalCard para evitar re-renderizações desnecessárias
const MemoizedSignalCard = memo(SignalCard);

const SignalsList = ({ 
  signals, 
  isLoading, 
  error, 
  activeStrategy, 
  strategies,
  onSelectStrategy,
  viewMode = "cards",
  onRefresh,
  autoRefresh = false,
  autoRefreshInterval = 60
}: SignalsListProps) => {
  const { toast } = useToast();

  // Auto-refresh com limitação de frequência
  useEffect(() => {
    let intervalId: number | undefined;
    
    if (autoRefresh && onRefresh) {
      intervalId = window.setInterval(() => {
        console.log("Auto-refreshing signals list...");
        onRefresh();
        // Remova notificação toast para cada refresh para reduzir sobrecarga
      }, autoRefreshInterval * 1000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, autoRefreshInterval, onRefresh]);

  // Function to handle switching to local mode
  const handleLocalModeClick = () => {
    // Clear the API error by refreshing and forcing local mode
    localStorage.setItem("force_local_mode", "true");
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
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
    return <SignalHistoryTable signals={signals} />;
  }

  // Usar virtualized list para renderização de muitos itens
  // Caso contrário, renderizar como cards (default)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {signals.slice(0, 30).map((signal) => (
        <MemoizedSignalCard key={signal.id} signal={signal} />
      ))}
      {signals.length > 30 && (
        <div className="col-span-full text-center mt-4">
          <button 
            onClick={() => {
              // Código para carregar mais sinais se necessário
              toast({
                title: "Limite de exibição",
                description: "Apenas os 30 sinais mais recentes são mostrados para melhor desempenho.",
              });
            }} 
            className="text-primary hover:underline"
          >
            Mostrando 30 de {signals.length} sinais
          </button>
        </div>
      )}
    </div>
  );
};

export default memo(SignalsList);
