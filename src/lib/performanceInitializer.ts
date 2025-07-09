import { processSignalsHistory, getPerformanceData } from './performanceStorage';

/**
 * Initialize performance data on app startup
 */
export const initializePerformanceData = () => {
  try {
    console.log('🚀 Initializing performance data...');
    
    // Process any signals from history
    const newValidated = processSignalsHistory();
    
    // Get current performance data
    const performanceData = getPerformanceData();
    
    console.log(`✅ Performance data initialized: ${performanceData.total} total signals, ${newValidated} newly validated`);
    
    return {
      success: true,
      totalSignals: performanceData.total,
      newValidated
    };
  } catch (error) {
    console.error('❌ Error initializing performance data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Auto-initialize when the module is imported
let initialized = false;

export const ensurePerformanceDataInitialized = () => {
  if (!initialized) {
    initializePerformanceData();
    initialized = true;
  }
};