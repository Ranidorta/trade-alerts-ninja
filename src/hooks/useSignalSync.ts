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
        await updateDoc(signalRef, updates);
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

  const updateMultipleSignals = async (updatedSignals: TradingSignal[]) => {
    try {
      if (user) {
        // Update each signal in Firestore if authenticated
        const updatePromises = updatedSignals.map(signal => {
          const signalRef = doc(db, 'user_signals', signal.id);
          // Prepare signal data for Firestore (remove undefined values and non-serializable fields)
          const signalData = {
            ...signal,
            userId: user.uid,
            userEmail: user.email
          };
          // Remove undefined values that could cause issues
          Object.keys(signalData).forEach(key => {
            if ((signalData as any)[key] === undefined) {
              delete (signalData as any)[key];
            }
          });
          return updateDoc(signalRef, signalData as any);
        });
        await Promise.all(updatePromises);
        console.log('✅ Multiple signals updated in Firestore');
      } else {
        // Update localStorage if not authenticated
        localStorage.setItem('trade_signal_history', JSON.stringify(updatedSignals));
        setSignals(updatedSignals);
        console.log('✅ Multiple signals updated in localStorage');
      }
    } catch (error) {
      console.error('Error updating multiple signals:', error);
      // Fallback to localStorage update
      localStorage.setItem('trade_signal_history', JSON.stringify(updatedSignals));
      setSignals(updatedSignals);
      console.log('⚠️ Fallback: Multiple signals saved to localStorage');
    }
  };

  return {
    signals,
    isLoading,
    saveSignal,
    updateSignal,
    updateMultipleSignals,
    loadSignals,
  };
};