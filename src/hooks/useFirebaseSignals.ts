import { useState } from "react";
import { TradingSignal, SignalResult } from "@/lib/types";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";

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
    try {
      if (!user) {
        console.warn("No authenticated user found");
        return false;
      }

      setIsLoading(true);

      // Convert TradingSignal to Firebase format
      const firebaseSignal = {
        user_id: user.uid,
        symbol: signal.symbol,
        direction: signal.direction || "BUY",
        entry_price: signal.entryPrice || signal.entry_price,
        stop_loss: signal.stopLoss || signal.sl,
        take_profit: signal.takeProfit || signal.tp,
        tp1: signal.tp1,
        tp2: signal.tp2,
        tp3: signal.tp3,
        leverage: signal.leverage || 1,
        status: signal.status,
        result: convertResultToNumber(signal.result),
        result_text: signal.result,
        strategy: signal.strategy || "default",
        timeframe: signal.timeframe || "1h",
        profit: signal.profit,
        confidence: signal.confidence,
        score: signal.score,
        notes: signal.notes,
        reason: signal.reason,
        hit_targets: signal.hitTargets || [],
        verified_at: signal.verifiedAt ? Timestamp.fromDate(new Date(signal.verifiedAt)) : null,
        created_at: Timestamp.fromDate(new Date(signal.createdAt)),
        updated_at: Timestamp.fromDate(new Date())
      };

      const docRef = await addDoc(collection(db, "trading_signals"), firebaseSignal);
      
      console.log("Signal saved to Firebase:", docRef.id);
      return true;
    } catch (error) {
      console.error("Error saving signal to Firebase:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
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
    try {
      if (!user) {
        console.warn("No authenticated user found");
        return false;
      }

      if (!signal.id) {
        console.warn("Signal ID is required for update");
        return false;
      }

      setIsLoading(true);

      const updateData = {
        result: convertResultToNumber(signal.result),
        result_text: signal.result,
        profit: signal.profit,
        status: signal.status,
        hit_targets: signal.hitTargets || [],
        verified_at: signal.verifiedAt ? Timestamp.fromDate(new Date(signal.verifiedAt)) : null,
        updated_at: Timestamp.fromDate(new Date())
      };

      await updateDoc(doc(db, "trading_signals", signal.id), updateData);
      
      console.log("Signal updated in Firebase:", signal.id);
      return true;
    } catch (error) {
      console.error("Error updating signal in Firebase:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getSignalsFromFirebase = async (): Promise<TradingSignal[]> => {
    try {
      if (!user) {
        console.warn("No authenticated user found");
        return [];
      }

      setIsLoading(true);

      const q = query(
        collection(db, "trading_signals"),
        where("user_id", "==", user.uid),
        orderBy("created_at", "desc")
      );

      const querySnapshot = await getDocs(q);
      const signals: TradingSignal[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const signal: TradingSignal = {
          id: doc.id,
          symbol: data.symbol,
          direction: data.direction,
          entryPrice: data.entry_price,
          stopLoss: data.stop_loss,
          takeProfit: data.take_profit,
          tp1: data.tp1,
          tp2: data.tp2,
          tp3: data.tp3,
          leverage: data.leverage,
          status: data.status,
          result: data.result_text,
          strategy: data.strategy,
          timeframe: data.timeframe,
          profit: data.profit,
          confidence: data.confidence,
          score: data.score,
          notes: data.notes,
          reason: data.reason,
          hitTargets: data.hit_targets,
          verifiedAt: data.verified_at?.toDate()?.toISOString(),
          createdAt: data.created_at?.toDate()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updated_at?.toDate()?.toISOString()
        };
        signals.push(signal);
      });

      return signals;
    } catch (error) {
      console.error("Error fetching signals from Firebase:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    saveSignalToFirebase,
    saveSignalsToFirebase,
    updateSignalInFirebase,
    getSignalsFromFirebase,
    isLoading
  };
};