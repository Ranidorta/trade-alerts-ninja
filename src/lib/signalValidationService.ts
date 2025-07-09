
import { TradingSignal, SignalResult } from "./types";
import { fetchBybitKlines } from "./apiServices";

export interface ValidationResult {
  signalId: string;
  result: SignalResult;
  profit?: number;
  validationDetails: string;
  hitTargets: number[];
}

/**
 * Valida um sinal específico consultando dados históricos da Bybit
 */
export async function validateSignalWithHistoricalData(signal: TradingSignal): Promise<ValidationResult> {
  console.log(`🔍 [VALIDATION] Validating signal ${signal.id} - ${signal.symbol}`);
  
  try {
    // Calcular período de validação (24h após criação do sinal)
    const signalTime = new Date(signal.createdAt);
    const endTime = new Date(signalTime.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const actualEndTime = endTime > now ? now : endTime;
    
    console.log(`📅 [VALIDATION] Período: ${signalTime.toISOString()} até ${actualEndTime.toISOString()}`);
    
    // Buscar dados históricos da Bybit
    const klines = await fetchBybitKlines(
      signal.symbol,
      '5', // 5 minutos
      Math.floor(signalTime.getTime() / 1000), // timestamp em segundos
      200 // máximo permitido pela Bybit
    );
    
    if (!klines || klines.length === 0) {
      return {
        signalId: signal.id,
        result: "PENDING",
        validationDetails: "Dados históricos não disponíveis",
        hitTargets: []
      };
    }
    
    // Processar dados de preço
    const prices = klines.map(k => ({
      time: new Date(parseInt(k[0])),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4])
    })).filter(p => p.time >= signalTime).sort((a, b) => a.time.getTime() - b.time.getTime());
    
    if (prices.length === 0) {
      return {
        signalId: signal.id,
        result: "PENDING",
        validationDetails: "Nenhum dado de preço encontrado após criação do sinal",
        hitTargets: []
      };
    }
    
    // Extrair parâmetros do sinal
    const entryPrice = signal.entryPrice || signal.entry_price || 0;
    const stopLoss = signal.stopLoss || signal.sl || 0;
    const direction = (signal.direction || 'BUY').toUpperCase();
    
    // Obter preços dos targets
    const tp1 = signal.tp1 || (signal.targets && signal.targets[0]?.price) || 0;
    const tp2 = signal.tp2 || (signal.targets && signal.targets[1]?.price) || 0;
    const tp3 = signal.tp3 || (signal.targets && signal.targets[2]?.price) || 0;
    
    console.log(`🎯 [VALIDATION] Parâmetros: ${direction} ${signal.symbol} @ ${entryPrice}, SL: ${stopLoss}, TPs: ${tp1}/${tp2}/${tp3}`);
    
    // Validar sinal
    const validation = validateSignalLogic(prices, entryPrice, stopLoss, tp1, tp2, tp3, direction);
    
    console.log(`✅ [VALIDATION] Resultado: ${validation.result} para ${signal.id}`);
    
    return {
      signalId: signal.id,
      result: validation.result,
      profit: validation.profit,
      validationDetails: validation.details,
      hitTargets: validation.hitTargets
    };
    
  } catch (error) {
    console.error(`❌ [VALIDATION] Erro validando sinal ${signal.id}:`, error);
    return {
      signalId: signal.id,
      result: "PENDING",
      validationDetails: `Erro na validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      hitTargets: []
    };
  }
}

/**
 * Lógica de validação do sinal baseada nos preços históricos
 */
function validateSignalLogic(
  prices: Array<{time: Date, high: number, low: number, close: number}>,
  entryPrice: number,
  stopLoss: number,
  tp1: number,
  tp2: number,
  tp3: number,
  direction: string
) {
  let hitTargets: number[] = [];
  let result: SignalResult = "PENDING";
  let profit: number | undefined;
  let details = "";
  
  const maxPrice = Math.max(...prices.map(p => p.high));
  const minPrice = Math.min(...prices.map(p => p.low));
  
  if (direction === 'BUY') {
    // Para sinais de COMPRA
    
    // Verificar stop loss primeiro
    const hitStopLoss = prices.some(p => p.low <= stopLoss);
    
    if (hitStopLoss) {
      result = "LOSER";
      profit = ((stopLoss - entryPrice) / entryPrice) * 100;
      details = `Stop Loss atingido em ${stopLoss.toFixed(4)}. Preço mínimo: ${minPrice.toFixed(4)}`;
    } else {
      // Verificar targets
      if (tp3 > 0 && prices.some(p => p.high >= tp3)) {
        hitTargets = [1, 2, 3];
        result = "WINNER";
        profit = ((tp3 - entryPrice) / entryPrice) * 100;
        details = `Todos os targets atingidos! TP3: ${tp3.toFixed(4)}. Preço máximo: ${maxPrice.toFixed(4)}`;
      } else if (tp2 > 0 && prices.some(p => p.high >= tp2)) {
        hitTargets = [1, 2];
        result = "PARTIAL";
        profit = ((tp2 - entryPrice) / entryPrice) * 100;
        details = `TP2 atingido em ${tp2.toFixed(4)}. Preço máximo: ${maxPrice.toFixed(4)}`;
      } else if (tp1 > 0 && prices.some(p => p.high >= tp1)) {
        hitTargets = [1];
        result = "PARTIAL";
        profit = ((tp1 - entryPrice) / entryPrice) * 100;
        details = `TP1 atingido em ${tp1.toFixed(4)}. Preço máximo: ${maxPrice.toFixed(4)}`;
      } else {
        // Verificar se sinal expirou
        const now = new Date();
        const signalAge = now.getTime() - prices[0].time.getTime();
        
        if (signalAge > 24 * 60 * 60 * 1000) {
          result = "FALSE";
          details = `Sinal expirou após 24h sem atingir targets. Preço máximo: ${maxPrice.toFixed(4)}`;
        } else {
          result = "PENDING";
          details = `Ainda pendente. Preço máximo atual: ${maxPrice.toFixed(4)}`;
        }
      }
    }
  } else {
    // Para sinais de VENDA
    
    // Verificar stop loss primeiro
    const hitStopLoss = prices.some(p => p.high >= stopLoss);
    
    if (hitStopLoss) {
      result = "LOSER";
      profit = ((entryPrice - stopLoss) / entryPrice) * 100;
      details = `Stop Loss atingido em ${stopLoss.toFixed(4)}. Preço máximo: ${maxPrice.toFixed(4)}`;
    } else {
      // Verificar targets (para VENDA, targets são abaixo da entrada)
      if (tp3 > 0 && prices.some(p => p.low <= tp3)) {
        hitTargets = [1, 2, 3];
        result = "WINNER";
        profit = ((entryPrice - tp3) / entryPrice) * 100;
        details = `Todos os targets atingidos! TP3: ${tp3.toFixed(4)}. Preço mínimo: ${minPrice.toFixed(4)}`;
      } else if (tp2 > 0 && prices.some(p => p.low <= tp2)) {
        hitTargets = [1, 2];
        result = "PARTIAL";
        profit = ((entryPrice - tp2) / entryPrice) * 100;
        details = `TP2 atingido em ${tp2.toFixed(4)}. Preço mínimo: ${minPrice.toFixed(4)}`;
      } else if (tp1 > 0 && prices.some(p => p.low <= tp1)) {
        hitTargets = [1];
        result = "PARTIAL";
        profit = ((entryPrice - tp1) / entryPrice) * 100;
        details = `TP1 atingido em ${tp1.toFixed(4)}. Preço mínimo: ${minPrice.toFixed(4)}`;
      } else {
        // Verificar se sinal expirou
        const now = new Date();
        const signalAge = now.getTime() - prices[0].time.getTime();
        
        if (signalAge > 24 * 60 * 60 * 1000) {
          result = "FALSE";
          details = `Sinal expirou após 24h sem atingir targets. Preço mínimo: ${minPrice.toFixed(4)}`;
        } else {
          result = "PENDING";
          details = `Ainda pendente. Preço mínimo atual: ${minPrice.toFixed(4)}`;
        }
      }
    }
  }
  
  return { result, profit, details, hitTargets };
}

/**
 * Valida múltiplos sinais em lote
 */
export async function validateMultipleSignalsFromBackend(signals: TradingSignal[]): Promise<ValidationResult[]> {
  console.log(`🚀 [BATCH_VALIDATION] Iniciando validação de ${signals.length} sinais`);
  
  const results: ValidationResult[] = [];
  
  // Processar em lotes pequenos para não sobrecarregar a API
  const batchSize = 3;
  for (let i = 0; i < signals.length; i += batchSize) {
    const batch = signals.slice(i, i + batchSize);
    console.log(`📦 [BATCH_VALIDATION] Processando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(signals.length/batchSize)}`);
    
    const batchResults = await Promise.all(
      batch.map(signal => validateSignalWithHistoricalData(signal))
    );
    
    results.push(...batchResults);
    
    // Pausa entre lotes
    if (i + batchSize < signals.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`✅ [BATCH_VALIDATION] Validação concluída: ${results.length} sinais processados`);
  return results;
}
