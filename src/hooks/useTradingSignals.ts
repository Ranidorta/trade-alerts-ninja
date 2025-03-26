
import { useState, useCallback } from "react";
import { TradingSignal } from "@/lib/types";
import { fetchSignals } from "@/lib/signalsApi";
import { useToast } from "@/hooks/use-toast";

export const useTradingSignals = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSignals = useCallback(async (params?: { 
    strategy?: string;
    symbol?: string;
    days?: number;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const fetchedSignals = await fetchSignals(params);
      setSignals(fetchedSignals);
      
      if (fetchedSignals.length === 0) {
        toast({
          title: "Nenhum sinal encontrado",
          description: "Não foram encontrados sinais com os filtros atuais.",
        });
      }
    } catch (err: any) {
      console.error("Error fetching trading signals:", err);
      setError(err.message || "Erro ao carregar sinais");
      toast({
        title: "Erro ao carregar sinais",
        description: "Não foi possível conectar ao servidor de sinais.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return { signals, loading, error, fetchSignals };
};
