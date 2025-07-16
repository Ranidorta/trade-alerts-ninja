import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { getSignalHistory, saveSignalToHistory } from '@/lib/signal-storage';
import { TradingSignal } from '@/lib/types';

export const useSignalSync = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [signals, setSignals] = useState<TradingSignal[]>([]);

  // Load and sync signals when user changes
  useEffect(() => {
    if (user) {
      loadSignals();
      // Set up real-time listener for user's signals
      const signalsRef = collection(db, 'user_signals');
      const q = query(
        signalsRef, 
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const userSignals = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TradingSignal[];
        setSignals(userSignals);
      });

      return () => unsubscribe();
    } else {
      // Load from localStorage if not authenticated
      setSignals(getSignalHistory());
    }
  }, [user]);

  const loadSignals = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const signalsRef = collection(db, 'user_signals');
      const q = query(
        signalsRef, 
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const userSignals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TradingSignal[];
      
      setSignals(userSignals);
    } catch (error) {
      console.error('Error loading signals:', error);
      // Fallback to localStorage
      setSignals(getSignalHistory());
    } finally {
      setIsLoading(false);
    }
  };

  const saveSignal = async (signal: TradingSignal) => {
    try {
      if (user) {
        // Save to Firestore if authenticated
        const signalWithUserId = {
          ...signal,
          userId: user.uid,
          userEmail: user.email
        };
        
        await addDoc(collection(db, 'user_signals'), signalWithUserId);
        // Signals will be updated automatically via the real-time listener
      } else {
        // Save to localStorage if not authenticated
        saveSignalToHistory(signal);
        setSignals(getSignalHistory());
      }
    } catch (error) {
      console.error('Error saving signal:', error);
      // Fallback to localStorage
      saveSignalToHistory(signal);
      setSignals(getSignalHistory());
    }
  };

  const updateSignal = async (signalId: string, updates: Partial<TradingSignal>) => {
    try {
      if (user) {
        // Update in Firestore if authenticated
        const signalRef = doc(db, 'user_signals', signalId);
        console.log(`🔥 [FIREBASE] Atualizando sinal ${signalId} no Firebase:`, updates);
        await updateDoc(signalRef, {
          ...updates,
          updatedAt: new Date().toISOString()
        });
        console.log(`✅ [FIREBASE] Sinal ${signalId} atualizado no Firebase com sucesso`);
        // Signals will be updated automatically via the real-time listener
      } else {
        // Update in localStorage if not authenticated
        const localSignals = getSignalHistory();
        const updatedSignals = localSignals.map(signal =>
          signal.id === signalId ? { ...signal, ...updates } : signal
        );
        localStorage.setItem('trade_signal_history', JSON.stringify(updatedSignals));
        setSignals(updatedSignals);
      }
    } catch (error) {
      console.error('Error updating signal:', error);
      // Fallback to localStorage update
      const localSignals = getSignalHistory();
      const updatedSignals = localSignals.map(signal =>
        signal.id === signalId ? { ...signal, ...updates } : signal
      );
      localStorage.setItem('trade_signal_history', JSON.stringify(updatedSignals));
      setSignals(updatedSignals);
    }
  };

  return {
    signals,
    isLoading,
    saveSignal,
    updateSignal,
    loadSignals,
  };
};