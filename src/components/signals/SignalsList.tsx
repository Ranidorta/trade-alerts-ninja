
import React from "react";
import { TradingSignal } from "@/lib/types";
import SignalCard from "@/components/SignalCard";
import StrategyList from "@/components/signals/StrategyList";

interface SignalsListProps {
  signals: TradingSignal[];
  isLoading: boolean;
  error: any;
  activeStrategy: string;
  strategies: string[];
  onSelectStrategy: (strategy: string) => void;
}

const SignalsList = ({ 
  signals, 
  isLoading, 
  error, 
  activeStrategy, 
  strategies,
  onSelectStrategy 
}: SignalsListProps) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-lg text-muted-foreground">Carregando sinais...</p>
      </div>
    );
  }

  if (error) {
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
    
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-lg text-destructive">Erro ao carregar sinais. Tente novamente mais tarde.</p>
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {signals.map((signal) => (
        <SignalCard key={signal.id} signal={signal} />
      ))}
    </div>
  );
};

export default SignalsList;
