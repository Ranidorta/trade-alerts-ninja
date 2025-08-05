import { useState } from "react";
import { TradingSignal, SignalResult } from "@/lib/types";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Helper function to convert SignalResult to number
const convertResultToNumber = (result: SignalResult | undefined): number | null => {
  if (result === undefined || result === null) return null;
  if (result === "WINNER" || result === "win" || result === 1) return 1;
  if (result === "LOSER" || result === "loss" || result === 0) return 0;
  if (result === "PARTIAL" || result === "partial") return 0.5;
  return null;
};

export const useFirebaseSignals = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const saveSignalToFirebase = async (signal: TradingSignal): Promise<boolean> => {
    // This function is deprecated - signals are now handled by Supabase
    console.warn("saveSignalToFirebase is deprecated");
    return false;
  };

  const saveSignalsToFirebase = async (signals: TradingSignal[]): Promise<number> => {
    let savedCount = 0;
    
    for (const signal of signals) {
      const success = await saveSignalToFirebase(signal);
      if (success) savedCount++;
    }

    if (savedCount > 0) {
      toast({
        title: "Sinais salvos",
        description: `${savedCount} sinais foram salvos com sucesso!`,
      });
    } else {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar os sinais.",
        variant: "destructive",
      });
    }

    return savedCount;
  };

  const updateSignalInFirebase = async (signal: TradingSignal): Promise<boolean> => {
    // This function is deprecated - signals are now handled by Supabase
    console.warn("updateSignalInFirebase is deprecated");
    return false;
  };

  const getSignalsFromFirebase = async (): Promise<TradingSignal[]> => {
    // This function is deprecated - signals are now handled by Supabase
    console.warn("getSignalsFromFirebase is deprecated");
    return [];
  };

  return {
    saveSignalToFirebase,
    saveSignalsToFirebase,
    updateSignalInFirebase,
    getSignalsFromFirebase,
    isLoading
  };
};