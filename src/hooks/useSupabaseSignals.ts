import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TradingSignal, SignalResult, SignalDirection, SignalStatus } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export const useSupabaseSignals = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const convertResultToNumber = (result: SignalResult | undefined): number | null => {
    if (!result) return null;
    
    if (result === "WINNER" || result === "win" || result === 1) return 1;
    if (result === "LOSER" || result === "loss") return 0;
    return null;
  };

  const saveSignalToSupabase = async (signal: TradingSignal): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("User not authenticated");
        return false;
      }

      const signalData = {
        signal_id: signal.id,
        symbol: signal.symbol,
        direction: signal.direction,
        entry_price: signal.entryPrice || (signal as any).entry_price || 0,
        stop_loss: signal.stopLoss || 0,
        targets: JSON.parse(JSON.stringify(signal.targets || [])),
        confidence_score: signal.confidence || 0,
        strategy_name: signal.strategy || 'classic_ai',
        timeframe: '15m',
        status: signal.status || 'ACTIVE',
        user_id: user.id,
        leverage: 1,
        risk_reward_ratio: (signal as any).riskRewardRatio || null,
        result: convertResultToNumber(signal.result),
        profit: signal.profit || null,
        completed_at: signal.completedAt ? new Date(signal.completedAt).toISOString() : null,
        verified_at: signal.verifiedAt ? new Date(signal.verifiedAt).toISOString() : null
      };

      const { error } = await supabase
        .from('trading_signals')
        .insert(signalData);

      if (error) {
        console.error("Error saving signal to Supabase:", error);
        return false;
      }

      console.log(`✅ Signal ${signal.id} saved to Supabase`);
      return true;
    } catch (error) {
      console.error("Error in saveSignalToSupabase:", error);
      return false;
    }
  };

  const saveSignalsToSupabase = async (signals: TradingSignal[]): Promise<number> => {
    setIsLoading(true);
    let savedCount = 0;

    try {
      for (const signal of signals) {
        const success = await saveSignalToSupabase(signal);
        if (success) {
          savedCount++;
        }
      }

      if (savedCount > 0) {
        toast({
          title: "Sinais salvos",
          description: `${savedCount} sinais foram salvos no banco de dados`
        });
      }

      return savedCount;
    } catch (error) {
      console.error("Error saving signals to Supabase:", error);
      toast({
        title: "Erro ao salvar sinais",
        description: "Falha ao salvar sinais no banco de dados",
        variant: "destructive"
      });
      return savedCount;
    } finally {
      setIsLoading(false);
    }
  };

  const updateSignalInSupabase = async (signal: TradingSignal): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("User not authenticated");
        return false;
      }

      const updateData = {
        status: signal.status,
        result: convertResultToNumber(signal.result),
        profit: signal.profit || null,
        targets: JSON.parse(JSON.stringify(signal.targets || [])),
        completed_at: signal.completedAt ? new Date(signal.completedAt).toISOString() : null,
        verified_at: signal.verifiedAt ? new Date(signal.verifiedAt).toISOString() : null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('trading_signals')
        .update(updateData)
        .eq('signal_id', signal.id)
        .eq('user_id', user.id);

      if (error) {
        console.error("Error updating signal in Supabase:", error);
        return false;
      }

      console.log(`✅ Signal ${signal.id} updated in Supabase`);
      return true;
    } catch (error) {
      console.error("Error in updateSignalInSupabase:", error);
      return false;
    }
  };

  const getSignalsFromSupabase = async (): Promise<TradingSignal[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("User not authenticated");
        return [];
      }

      const { data, error } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching signals from Supabase:", error);
        return [];
      }

      // Convert Supabase data back to TradingSignal format
      return data.map(signal => ({
        id: signal.signal_id,
        symbol: signal.symbol,
        direction: signal.direction as SignalDirection,
        entryPrice: signal.entry_price || 0,
        entry_price: signal.entry_price || 0,
        stopLoss: signal.stop_loss || 0,
        targets: Array.isArray(signal.targets) ? signal.targets.map((t: any) => ({
          level: t.level || 0,
          price: t.price || 0,
          hit: t.hit || false
        })) : [],
        confidence: signal.confidence_score || 0,
        strategy: signal.strategy_name || 'classic_ai',
        status: signal.status as SignalStatus,
        result: signal.result as SignalResult,
        profit: signal.profit,
        createdAt: signal.created_at,
        completedAt: signal.completed_at,
        verifiedAt: signal.verified_at,
        riskRewardRatio: signal.risk_reward_ratio
      }));
    } catch (error) {
      console.error("Error in getSignalsFromSupabase:", error);
      return [];
    }
  };

  return {
    saveSignalToSupabase,
    saveSignalsToSupabase,
    updateSignalInSupabase,
    getSignalsFromSupabase,
    isLoading
  };
};