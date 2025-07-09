import { TradingSignal, PerformanceData } from './types';

const PERFORMANCE_STORAGE_KEY = 'performance_data';
const VALIDATED_SIGNALS_KEY = 'validated_signals';

export interface ValidatedSignal extends TradingSignal {
  validatedAt: string;
  validationResult: 'vencedor' | 'parcial' | 'perdedor' | 'falso';
}

// Save validated signal result
export const saveValidatedSignal = (signal: ValidatedSignal) => {
  const existing = getValidatedSignals();
  
  // Remove if already exists (update)
  const filtered = existing.filter(s => s.id !== signal.id);
  
  // Add new/updated signal
  filtered.unshift(signal);
  
  // Keep only last 1000 signals
  const toSave = filtered.slice(0, 1000);
  
  localStorage.setItem(VALIDATED_SIGNALS_KEY, JSON.stringify(toSave));
  
  // Update performance data
  updatePerformanceData();
  
  console.log(`💾 Saved validated signal: ${signal.symbol} - ${signal.validationResult}`);
};

// Get all validated signals
export const getValidatedSignals = (): ValidatedSignal[] => {
  try {
    const data = localStorage.getItem(VALIDATED_SIGNALS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading validated signals:', error);
    return [];
  }
};

// Calculate and update performance data
export const updatePerformanceData = () => {
  const signals = getValidatedSignals();
  
  const total = signals.length;
  const vencedor = signals.filter(s => s.validationResult === 'vencedor').length;
  const parcial = signals.filter(s => s.validationResult === 'parcial').length;
  const perdedor = signals.filter(s => s.validationResult === 'perdedor').length;
  const falso = signals.filter(s => s.validationResult === 'falso').length;
  
  const performanceData: PerformanceData = {
    total,
    vencedor: {
      quantidade: vencedor,
      percentual: total > 0 ? (vencedor / total) * 100 : 0
    },
    parcial: {
      quantidade: parcial,
      percentual: total > 0 ? (parcial / total) * 100 : 0
    },
    perdedor: {
      quantidade: perdedor,
      percentual: total > 0 ? (perdedor / total) * 100 : 0
    },
    falso: {
      quantidade: falso,
      percentual: total > 0 ? (falso / total) * 100 : 0
    }
  };
  
  localStorage.setItem(PERFORMANCE_STORAGE_KEY, JSON.stringify(performanceData));
  
  return performanceData;
};

// Get current performance data
export const getPerformanceData = (): PerformanceData => {
  try {
    const data = localStorage.getItem(PERFORMANCE_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading performance data:', error);
  }
  
  // If no data exists, calculate from validated signals
  return updatePerformanceData();
};

// Validate signal and save result
export const validateAndSaveSignal = (signal: TradingSignal, result: 'vencedor' | 'parcial' | 'perdedor' | 'falso') => {
  const validatedSignal: ValidatedSignal = {
    ...signal,
    validatedAt: new Date().toISOString(),
    validationResult: result
  };
  
  saveValidatedSignal(validatedSignal);
  return validatedSignal;
};

// Auto-validate signals based on their current data
export const autoValidateSignal = (signal: TradingSignal): 'vencedor' | 'parcial' | 'perdedor' | 'falso' | null => {
  // If signal doesn't have result, can't validate
  if (!signal.result && signal.result !== 0) return null;
  
  // Map existing results to our validation format
  if (signal.result === 1 || signal.result === 'win' || signal.result === 'WINNER') {
    return 'vencedor';
  }
  
  if (signal.result === 'partial' || signal.result === 'PARTIAL') {
    return 'parcial';
  }
  
  if (signal.result === 0 || signal.result === 'loss' || signal.result === 'LOSER') {
    return 'perdedor';
  }
  
  if (signal.result === 'FALSE' || signal.result === 'missed') {
    return 'falso';
  }
  
  return null;
};

// Process signals from history and validate them
export const processSignalsHistory = () => {
  try {
    // Import dynamically to avoid require in browser
    const signals = JSON.parse(localStorage.getItem('trade_signal_history') || '[]');
    
    let validatedCount = 0;
    
    signals.forEach((signal: TradingSignal) => {
      const validationResult = autoValidateSignal(signal);
      
      if (validationResult) {
        // Check if already validated
        const existing = getValidatedSignals();
        const alreadyValidated = existing.find(v => v.id === signal.id);
        
        if (!alreadyValidated) {
          validateAndSaveSignal(signal, validationResult);
          validatedCount++;
        }
      }
    });
    
    console.log(`🔄 Processed ${validatedCount} new validated signals from history`);
    return validatedCount;
    
  } catch (error) {
    console.error('Error processing signals history:', error);
    return 0;
  }
};

// Clear all performance data (admin function)
export const clearPerformanceData = () => {
  localStorage.removeItem(PERFORMANCE_STORAGE_KEY);
  localStorage.removeItem(VALIDATED_SIGNALS_KEY);
  console.log('🗑️ Cleared all performance data');
};

// Get performance by symbol
export const getPerformanceBySymbol = () => {
  const signals = getValidatedSignals();
  const symbolStats: Record<string, { total: number; vencedor: number; parcial: number; perdedor: number; falso: number }> = {};
  
  signals.forEach(signal => {
    const symbol = signal.symbol || 'UNKNOWN';
    
    if (!symbolStats[symbol]) {
      symbolStats[symbol] = { total: 0, vencedor: 0, parcial: 0, perdedor: 0, falso: 0 };
    }
    
    symbolStats[symbol].total++;
    symbolStats[symbol][signal.validationResult]++;
  });
  
  return Object.entries(symbolStats).map(([symbol, stats]) => ({
    symbol,
    ...stats,
    sucessoRate: stats.total > 0 ? ((stats.vencedor + stats.parcial) / stats.total) * 100 : 0
  }));
};

// Get performance by date
export const getPerformanceByDate = () => {
  const signals = getValidatedSignals();
  const dateStats: Record<string, { total: number; vencedor: number; parcial: number; perdedor: number; falso: number }> = {};
  
  signals.forEach(signal => {
    const date = new Date(signal.validatedAt).toISOString().split('T')[0];
    
    if (!dateStats[date]) {
      dateStats[date] = { total: 0, vencedor: 0, parcial: 0, perdedor: 0, falso: 0 };
    }
    
    dateStats[date].total++;
    dateStats[date][signal.validationResult]++;
  });
  
  return Object.entries(dateStats)
    .map(([date, stats]) => ({
      date,
      ...stats,
      sucessoRate: stats.total > 0 ? ((stats.vencedor + stats.parcial) / stats.total) * 100 : 0
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};
