
import { useState } from "react";
import { TradingSignal } from "@/lib/types";
import { evaluateSingleSignal, evaluateMultipleSignals, canEvaluateSignal } from "@/lib/signalsApi";
import { useToast } from "@/components/ui/use-toast";

export function useSignalEvaluation(signals: TradingSignal[] | undefined, refetch: () => void) {
  const { toast } = useToast();
  const [verifyingSignal, setVerifyingSignal] = useState<string | null>(null);
  const [isEvaluatingAll, setIsEvaluatingAll] = useState(false);

  // Verify a single signal
  const handleVerifySingleSignal = async (signalId: string) => {
    setVerifyingSignal(signalId);
    try {
      // Find the signal in our data
      const signal = signals?.find(s => s.id === signalId);
      
      if (!signal) {
        toast({
          title: "Sinal não encontrado",
          description: "Não foi possível encontrar o sinal para avaliação.",
          variant: "destructive"
        });
        return;
      }
      
      // Check if the signal can be evaluated
      const { canEvaluate, reason } = canEvaluateSignal(signal);
      
      if (!canEvaluate) {
        toast({
          title: "Não é possível avaliar este sinal",
          description: reason,
          variant: "destructive"
        });
        return;
      }
      
      // Proceed with evaluation
      const result = await evaluateSingleSignal(signalId);
      if (result) {
        toast({
          title: "Sinal avaliado com sucesso",
          description: `Resultado: ${result.result === 'win' ? 'Vencedor' : 
                                    result.result === 'loss' ? 'Perdedor' : 
                                    result.result === 'partial' ? 'Parcial' : 
                                    'Falso'}`,
        });
        refetch(); // Refetch signals after evaluation
      } else {
        toast({
          title: "Avaliação inconclusiva",
          description: "Não foi possível determinar o resultado do sinal.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error verifying signal:", error);
      toast({
        title: "Erro na avaliação",
        description: "Não foi possível avaliar o sinal. Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setVerifyingSignal(null);
    }
  };

  // Evaluate all signals that need evaluation
  const handleEvaluateAllSignals = async () => {
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
      // Get signals that can be evaluated
      const signalsToEvaluate = signals.filter(s => {
        const { canEvaluate } = canEvaluateSignal(s);
        return canEvaluate;
      });

      if (signalsToEvaluate.length === 0) {
        toast({
          title: "Nenhum sinal disponível para avaliação",
          description: "Não há sinais que possam ser avaliados neste momento.",
          variant: "default"
        });
        setIsEvaluatingAll(false);
        return;
      }

      toast({
        title: "Avaliando sinais",
        description: `Avaliando ${signalsToEvaluate.length} sinais...`,
      });

      const updatedSignals = await evaluateMultipleSignals(signals);
      refetch(); // Refetch all signals after evaluation
      
      toast({
        title: "Avaliação concluída",
        description: `${signalsToEvaluate.length} sinais foram avaliados.`,
      });
    } catch (error) {
      console.error("Error evaluating all signals:", error);
      toast({
        title: "Erro na avaliação em lote",
        description: "Ocorreu um erro ao avaliar os sinais. Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsEvaluatingAll(false);
    }
  };

  return {
    verifyingSignal,
    isEvaluatingAll,
    handleVerifySingleSignal,
    handleEvaluateAllSignals
  };
}

export default useSignalEvaluation;
