import { supabase } from '@/integrations/supabase/client';
import { TradingSignal } from './types';

// Convert TradingSignal to database format
const signalToDbFormat = (signal: TradingSignal, userId: string) => ({
  user_id: userId,
  signal_id: signal.id,
  symbol: signal.symbol,
  direction: signal.direction,
  entry_price: signal.entryPrice,
  stop_loss: signal.stopLoss,
  targets: JSON.stringify(signal.targets || []), // Convert to JSON string
  leverage: signal.leverage || 1,
  status: signal.status || 'ACTIVE',
  result: typeof signal.result === 'number' ? signal.result : null,
  profit: signal.profit,
  strategy_name: signal.strategy,
  confidence_score: signal.confidence,
  risk_reward_ratio: 0,
  timeframe: signal.timeframe,
  completed_at: signal.completedAt,
  verified_at: signal.verifiedAt,
});

// Convert database format to TradingSignal
const dbToSignalFormat = (dbSignal: any): TradingSignal => ({
  id: dbSignal.signal_id,
  symbol: dbSignal.symbol,
  direction: dbSignal.direction,
  entryPrice: dbSignal.entry_price,
  stopLoss: dbSignal.stop_loss,
  targets: typeof dbSignal.targets === 'string' ? JSON.parse(dbSignal.targets) : (dbSignal.targets || []),
  leverage: dbSignal.leverage,
  status: dbSignal.status,
  result: dbSignal.result,
  profit: dbSignal.profit,
  strategy: dbSignal.strategy_name,
  confidence: dbSignal.confidence_score,
  timeframe: dbSignal.timeframe,
  createdAt: dbSignal.created_at,
  timestamp: dbSignal.created_at,
  completedAt: dbSignal.completed_at,
  verifiedAt: dbSignal.verified_at,
});

// Save or update a signal in Supabase
export const saveSignalToSupabase = async (signal: TradingSignal) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const dbSignal = signalToDbFormat(signal, user.id);

  const { error } = await supabase
    .from('trading_signals')
    .upsert(dbSignal, { 
      onConflict: 'user_id,signal_id',
      ignoreDuplicates: false 
    });

  if (error) throw error;
};

// Save multiple signals to Supabase
export const saveSignalsToSupabase = async (signals: TradingSignal[]) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const dbSignals = signals.map(signal => signalToDbFormat(signal, user.id));

  const { error } = await supabase
    .from('trading_signals')
    .upsert(dbSignals, { 
      onConflict: 'user_id,signal_id',
      ignoreDuplicates: false 
    });

  if (error) throw error;
};

// Get all signals from Supabase
export const getSignalsFromSupabase = async (): Promise<TradingSignal[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('trading_signals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  return (data || []).map(dbToSignalFormat);
};

// Migrate localStorage signals to Supabase
export const migrateLocalSignalsToSupabase = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Get signals from localStorage
  const localSignals = JSON.parse(localStorage.getItem('trade_signal_history') || '[]');
  
  if (localSignals.length === 0) return;

  // Check which signals already exist in Supabase
  const { data: existingSignals } = await supabase
    .from('trading_signals')
    .select('signal_id')
    .eq('user_id', user.id);

  const existingIds = new Set(existingSignals?.map(s => s.signal_id) || []);
  
  // Filter out signals that already exist
  const newSignals = localSignals.filter((signal: TradingSignal) => 
    !existingIds.has(signal.id)
  );

  if (newSignals.length > 0) {
    await saveSignalsToSupabase(newSignals);
  }

  // Clear localStorage after successful migration
  localStorage.removeItem('trade_signal_history');
};

// Sync signals between localStorage and Supabase
export const syncSignals = async () => {
  try {
    // First, migrate any local signals
    await migrateLocalSignalsToSupabase();
    
    // Then get all signals from Supabase
    return await getSignalsFromSupabase();
  } catch (error) {
    console.error('Error syncing signals:', error);
    
    // Fallback to localStorage if Supabase fails
    return JSON.parse(localStorage.getItem('trade_signal_history') || '[]');
  }
};

// Update signal with current price data
export const updateSignalInSupabase = async (signalId: string, updates: Partial<TradingSignal>) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Convert updates to database format
  const dbUpdates: any = {};
  if (updates.result !== undefined) dbUpdates.result = typeof updates.result === 'number' ? updates.result : null;
  if (updates.profit !== undefined) dbUpdates.profit = updates.profit;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.targets !== undefined) dbUpdates.targets = JSON.stringify(updates.targets);
  if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
  
  dbUpdates.updated_at = new Date().toISOString();
  dbUpdates.verified_at = new Date().toISOString();

  const { error } = await supabase
    .from('trading_signals')
    .update(dbUpdates)
    .eq('user_id', user.id)
    .eq('signal_id', signalId);

  if (error) throw error;
};