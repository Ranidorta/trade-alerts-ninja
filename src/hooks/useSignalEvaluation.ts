
import { useState, useCallback } from 'react';
import { TradingSignal } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { evaluateSignalRealtime } from '@/lib/signalEvaluator';
import { evaluateSingleSignal, evaluateMultipleSignals } from '@/lib/signalsApi';

export function useSignalEvaluation(refetch: () => void) {
  const { toast } = useToast();
  const [evaluatingSignalId, setEvaluatingSignalId] = useState<string | null>(null);
  const [isEvaluatingAll, setIsEvaluatingAll] = useState(false);
  
  // Function to evaluate a single signal
  const evaluateSignal = useCallback(async (signal: TradingSignal) => {
    // Skip already evaluated signals
    if (signal.result || signal.verifiedAt) {
      console.log(`Signal ${signal.id} already evaluated: ${signal.result}`);
      return signal;
    }
    
    // Skip signals less than 15 minutes old
    const createdAt = new Date(signal.createdAt || Date.now());
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (createdAt > fifteenMinutesAgo) {
      console.log(`Signal ${signal.id} is too recent (less than 15 minutes old)`);
      return signal;
    }

    try {
      // First try to evaluate in real-time
      const result = await evaluateSignalRealtime(signal);
      
      if (result) {
        // If we got a result from real-time evaluation, update directly
        const updatedSignal = { 
          ...signal, 
          result, 
          verifiedAt: new Date().toISOString(),
          status: "COMPLETED"
        };
        
        // Save the result to the backend
        await evaluateSingleSignal(signal.id);
        
        return updatedSignal;
      } else {
        // Fall back to backend evaluation if real-time fails
        const updatedSignal = await evaluateSingleSignal(signal.id);
        return updatedSignal || signal;
      }
    } catch (error) {
      console.error(`Error evaluating signal ${signal.id}:`, error);
      return signal;
    }
  }, []);

  // Function to handle evaluation button click
  const handleEvaluateSignal = useCallback(async (signalId: string, signals: TradingSignal[]) => {
    setEvaluatingSignalId(signalId);
    
    try {
      const signal = signals.find(s => s.id === signalId);
      if (!signal) {
        toast({
          title: "Sinal não encontrado",
          description: `Não foi possível encontrar o sinal com ID ${signalId}`,
          variant: "destructive"
        });
        return;
      }
      
      // Evaluate the signal
      await evaluateSignal(signal);
      
      toast({
        title: "Avaliação concluída",
        description: "O sinal foi avaliado com sucesso."
      });
      
      // Refresh the signal list
      refetch();
    } catch (error) {
      console.error("Erro ao avaliar sinal:", error);
      toast({
        title: "Erro na avaliação",
        description: "Não foi possível avaliar o sinal. Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setEvaluatingSignalId(null);
    }
  }, [evaluateSignal, toast, refetch]);

  // Function to handle evaluation of all signals
  const handleEvaluateAllSignals = useCallback(async (signals: TradingSignal[]) => {
    if (!signals || signals.length === 0) {
      toast({
        title: "Nenhum sinal disponível",
        description: "Não há sinais para avaliar.",
        variant: "default"
      });
      return;
    }

    setIsEvaluatingAll(true);
    try {
      // Get signals that need evaluation and are older than 15 minutes
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const signalsToEvaluate = signals.filter(s => 
        (!s.verifiedAt || !s.result || s.status !== 'COMPLETED') &&
        new Date(s.createdAt || Date.now()) <= fifteenMinutesAgo
      );

      if (signalsToEvaluate.length === 0) {
        toast({
          title: "Nenhum sinal a avaliar",
          description: "Não há sinais que precisem ser avaliados ou que tenham mais de 15 minutos.",
          variant: "default"
        });
        setIsEvaluatingAll(false);
        return;
      }

      toast({
        title: "Avaliando sinais",
        description: `Avaliando ${signalsToEvaluate.length} sinais em tempo real...`,
      });

      // First try real-time evaluation for each signal
      const evaluationPromises = signalsToEvaluate.map(evaluateSignal);
      await Promise.allSettled(evaluationPromises);
      
      // Then use backend evaluation for any remaining signals
      await evaluateMultipleSignals(signals);
      
      // Refresh the signal list
      refetch();
      
      toast({
        title: "Avaliação concluída",
        description: `${signalsToEvaluate.length} sinais foram avaliados.`,
      });
    } catch (error) {
      console.error("Erro ao avaliar todos os sinais:", error);
      toast({
        title: "Erro na avaliação em lote",
        description: "Ocorreu um erro ao avaliar os sinais. Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsEvaluatingAll(false);
    }
  }, [evaluateSignal, toast, refetch]);

  return {
    evaluatingSignalId,
    isEvaluatingAll,
    handleEvaluateSignal,
    handleEvaluateAllSignals
  };
}
