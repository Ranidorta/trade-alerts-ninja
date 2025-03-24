
import React from "react";
import { TradingSignal } from "@/lib/types";
import SignalCard from "@/components/SignalCard";

interface SignalsListProps {
  signals: TradingSignal[];
  isLoading: boolean;
  error: any;
  activeStrategy: string;
}

const SignalsList = ({ signals, isLoading, error, activeStrategy }: SignalsListProps) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-lg text-muted-foreground">Carregando sinais...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-lg text-destructive">Erro ao carregar sinais. Tente novamente mais tarde.</p>
      </div>
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
