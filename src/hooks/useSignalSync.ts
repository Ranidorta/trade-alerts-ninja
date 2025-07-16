import { useEffect, useState, useRef, useCallback } from 'react';
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
import { toast } from '@/hooks/use-toast';

export const useSignalSync = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('🌐 [CONNECTIVITY] Back online, attempting Firebase reconnection...');
      if (user && !isFirebaseConnected) {
        setupFirebaseListener();
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setIsFirebaseConnected(false);
      console.log('🌐 [CONNECTIVITY] Gone offline');
      toast({
        title: "Conexão perdida",
        description: "Trabalhando offline. Os dados serão sincronizados quando a conexão for restaurada.",
        variant: "destructive"
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, isFirebaseConnected]);
  
  // Setup Firebase listener with error handling and reconnection
  const setupFirebaseListener = useCallback(() => {
    if (!user || !isOnline) return;
    
    // Clean up existing listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    const signalsRef = collection(db, 'user_signals');
    const q = query(
      signalsRef, 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    
    console.log('🔥 [FIREBASE] Setting up real-time listener...');
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log(`🔥 [FIREBASE_LISTENER] Recebidos ${snapshot.docs.length} documentos do Firebase`);
        const userSignals = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TradingSignal[];
        console.log(`🔥 [FIREBASE_LISTENER] Sinais processados:`, userSignals.map(s => ({ id: s.id, symbol: s.symbol, result: s.result })));
        setSignals(userSignals);
        setIsFirebaseConnected(true);
        
        // Clear any pending reconnection attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      },
      (error) => {
        console.error('❌ [FIREBASE] Real-time listener error:', error);
        setIsFirebaseConnected(false);
        
        // Show connection error toast
        toast({
          title: "Erro de conexão Firebase",
          description: "Tentando reconectar... Os dados podem não estar atualizados.",
          variant: "destructive"
        });
        
        // Attempt to reconnect after delay
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 [FIREBASE] Attempting to reconnect...');
            setupFirebaseListener();
          }, 5000); // Retry after 5 seconds
        }
      }
    );
    
    unsubscribeRef.current = unsubscribe;
  }, [user, isOnline]);

  // Load and sync signals when user changes
  useEffect(() => {
    if (user) {
      loadSignals();
      setupFirebaseListener();
    } else {
      // Clean up listener if logging out
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      // Load from localStorage if not authenticated
      setSignals(getSignalHistory());
    }
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [user, setupFirebaseListener]);

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
    isOnline,
    isFirebaseConnected,
  };
};