import React from 'react';
import { validateMultipleSignalsWithBybit } from './lib/signalValidationService';
import { TradingSignal } from './lib/types';

// Componente de teste para validação
const TestValidation = () => {
  const testValidation = async () => {
    console.log('🧪 [TEST] Iniciando teste de validação...');
    
    const testSignal: TradingSignal = {
      id: 'test-1',
      symbol: 'BTCUSDT',
      direction: 'BUY',
      entryPrice: 118000,
      stopLoss: 117000,
      tp1: 119000,
      tp2: 120000,
      tp3: 121000,
      strategy: 'test',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 horas atrás
      status: 'WAITING',
      result: null,
      profit: null
    };
    
    try {
      console.log('🧪 [TEST] Chamando validateMultipleSignalsWithBybit...');
      const results = await validateMultipleSignalsWithBybit([testSignal]);
      console.log('🧪 [TEST] Resultados:', results);
    } catch (error) {
      console.error('🧪 [TEST] Erro:', error);
    }
  };

  return (
    <div className="p-4">
      <button 
        onClick={testValidation}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Testar Validação
      </button>
    </div>
  );
};

export default TestValidation;