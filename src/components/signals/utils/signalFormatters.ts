
import { TradingSignal } from "@/lib/types";
import { format } from "date-fns";

/**
 * Formats date string to a readable format
 */
export const formatDate = (dateString: string) => {
  try {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm");
  } catch {
    return dateString;
  }
};

/**
 * Gets the appropriate result color for styling
 */
export const getResultColor = (result: any): string => {
  if (!result) return "bg-gray-100 text-gray-800";
  
  const resultStr = typeof result === 'number' ? 
    (result === 1 ? "win" : "loss") : result.toString().toLowerCase();
  
  switch(resultStr) {
    case "winner":
    case "win":
    case "1":
      return "bg-green-100 text-green-800 border-green-300";
    case "partial":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "loser":
    case "loss":
    case "0":
      return "bg-red-100 text-red-800 border-red-300";
    case "false":
    case "missed":
      return "bg-gray-100 text-gray-800 border-gray-300";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

/**
 * Formats result text for display
 */
export const formatResultText = (result: any): string => {
  if (!result) return "PENDENTE";
  
  if (typeof result === 'number') {
    return result === 1 ? "WINNER" : "LOSER";
  }
  
  const resultMap: Record<string, string> = {
    "win": "WINNER",
    "loss": "LOSER",
    "partial": "PARTIAL",
    "missed": "FALSE",
    "winner": "WINNER",
    "loser": "LOSER",
    "false": "FALSE"
  };
  
  return resultMap[result.toString().toLowerCase()] || result.toString().toUpperCase();
};

/**
 * Formats take profit values for display
 */
export const formatTakeProfit = (signal: TradingSignal): string => {
  // Verificar se temos um array de takeProfit
  if (signal.takeProfit && signal.takeProfit.length > 0) {
    return signal.takeProfit.map(tp => Number(tp).toFixed(2)).join(', ');
  }
  
  // Verificar se temos targets estruturados
  if (signal.targets && signal.targets.length > 0) {
    return signal.targets.map(t => Number(t.price).toFixed(2)).join(', ');
  }
  
  // Verificar campos específicos para sinais híbridos (tp1, tp2, tp3)
  if (signal.tp1 !== undefined) {
    let tpArray = [signal.tp1];
    if (signal.tp2 !== undefined) tpArray.push(signal.tp2);
    if (signal.tp3 !== undefined) tpArray.push(signal.tp3);
    return tpArray.map(tp => Number(tp).toFixed(2)).join(', ');
  }
  
  // Verificar campo tp genérico (pode ser um array ou número)
  if (signal.tp !== undefined) {
    if (Array.isArray(signal.tp)) {
      return signal.tp.map(t => Number(t).toFixed(2)).join(', ');
    }
    return Number(signal.tp).toFixed(2);
  }
  
  return 'N/A';
};

/**
 * Gets entry price from different possible properties
 */
export const getEntryPrice = (signal: TradingSignal): string => {
  if (signal.entryPrice !== undefined) {
    return Number(signal.entryPrice).toFixed(2);
  }
  
  if (signal.entry_price !== undefined) {
    return Number(signal.entry_price).toFixed(2);
  }
  
  return 'N/A';
};

/**
 * Gets stop loss from different possible properties
 */
export const getStopLoss = (signal: TradingSignal): string => {
  if (signal.stopLoss !== undefined) {
    return Number(signal.stopLoss).toFixed(2);
  }
  
  if (signal.sl !== undefined) {
    return Number(signal.sl).toFixed(2);
  }
  
  return 'N/A';
};

/**
 * Gets timestamp from different possible properties
 */
export const getTimestamp = (signal: TradingSignal): string => {
  return signal.timestamp || signal.createdAt;
};
