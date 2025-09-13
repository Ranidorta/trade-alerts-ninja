import { useEffect, useRef } from 'react';
import { TradingSignal } from '@/lib/types';
import { saveSignalsToHistory } from '@/lib/signal-storage';

/**
 * Hook para garantir persistência automática de sinais validados
 * Salva automaticamente quando sinais são atualizados
 */
export const useSignalPersistence = (signals: TradingSignal[]) => {
  const previousSignalsRef = useRef<TradingSignal[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Detectar mudanças nos resultados dos sinais
    const hasValidationChanges = signals.some((signal, index) => {
      const previousSignal = previousSignalsRef.current[index];
      if (!previousSignal) return true;
      
      // Verificar se houve mudança no resultado de validação
      return (
        signal.result !== previousSignal.result ||
        signal.verifiedAt !== previousSignal.verifiedAt ||
        signal.profit !== previousSignal.profit ||
        signal.completedAt !== previousSignal.completedAt
      );
    });

    if (hasValidationChanges && signals.length > 0) {
      console.log('🔄 [PERSISTENCE] Detectada mudança nos sinais, salvando...');
      
      // Debounce para evitar salvamentos excessivos
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        try {
          saveSignalsToHistory(signals);
          console.log('✅ [PERSISTENCE] Sinais salvos automaticamente no localStorage');
        } catch (error) {
          console.error('❌ [PERSISTENCE] Erro ao salvar sinais:', error);
        }
      }, 500); // 500ms de debounce
    }

    // Atualizar referência para próxima comparação
    previousSignalsRef.current = [...signals];

    // Cleanup do timeout ao desmontar
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [signals]);

  // Salvar antes da página ser fechada ou aba trocada
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (signals.length > 0) {
        try {
          saveSignalsToHistory(signals);
          console.log('💾 [PERSISTENCE] Sinais salvos antes de fechar/trocar aba');
        } catch (error) {
          console.error('❌ [PERSISTENCE] Erro ao salvar antes de fechar:', error);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && signals.length > 0) {
        try {
          saveSignalsToHistory(signals);
          console.log('👁️ [PERSISTENCE] Sinais salvos ao trocar aba');
        } catch (error) {
          console.error('❌ [PERSISTENCE] Erro ao salvar ao trocar aba:', error);
        }
      }
    };

    // Adicionar event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [signals]);
};