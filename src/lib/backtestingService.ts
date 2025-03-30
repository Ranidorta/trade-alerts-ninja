import { TradingSignal, BacktestResult, HistoricalSignal } from "./types";
import { fetchBinanceCandles } from "./binanceService";
import { toast } from "sonner";

/**
 * Runs a backtest for a specific strategy using historical data
 */
export async function runBacktest(
  strategyName: string,
  symbol: string,
  startDate: Date,
  endDate: Date,
  timeframe: string = "1h"
): Promise<BacktestResult | null> {
  try {
    console.log(`Running backtest for ${strategyName} on ${symbol} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Fetch historical data from Binance
    const candles = await fetchBinanceCandles(
      symbol,
      timeframe,
      startDate.getTime(),
      endDate.getTime()
    );
    
    if (candles.length === 0) {
      toast.error("No historical data available for the selected period");
      return null;
    }
    
    // Call the appropriate strategy function based on strategyName
    const trades = await simulateStrategy(strategyName, candles, symbol);
    
    // Calculate performance metrics
    const metrics = calculateBacktestMetrics(trades);
    
    // Format and return results
    return {
      strategyName,
      period: timeframe,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalTrades: trades.length,
      winRate: metrics.winRate,
      profitFactor: metrics.profitFactor,
      maxDrawdown: metrics.maxDrawdown,
      sharpeRatio: metrics.sharpeRatio,
      totalPnl: metrics.totalPnl,
      trades,
      annualizedReturn: metrics.annualizedReturn
    };
  } catch (error) {
    console.error("Error running backtest:", error);
    toast.error(`Backtest failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    return null;
  }
}

/**
 * Simulates strategy execution on historical data
 */
async function simulateStrategy(
  strategyName: string,
  candles: any[],
  symbol: string
): Promise<TradingSignal[]> {
  // Placeholder for strategy logic - in a real implementation, this would
  // dynamically load and execute different strategy algorithms
  
  const trades: TradingSignal[] = [];
  let inPosition = false;
  let entryPrice = 0;
  let entryTime = "";
  let stopLoss = 0;
  let targets: number[] = [];
  let tradeId = 0;
  
  // Implement basic strategy simulation (RSI example)
  const rsiPeriod = 14;
  const rsiOverbought = 70;
  const rsiOversold = 30;
  
  // Convert candles to processable format
  const prices = candles.map(c => parseFloat(c.close));
  
  // Calculate RSI (simplified)
  const rsiValues = calculateRSI(prices, rsiPeriod);
  
  // Simulate trades based on RSI
  for (let i = rsiPeriod + 1; i < candles.length; i++) {
    const currentCandle = candles[i];
    const previousCandle = candles[i - 1];
    const currentRSI = rsiValues[i - rsiPeriod];
    const previousRSI = rsiValues[i - rsiPeriod - 1];
    
    // Entry logic
    if (!inPosition) {
      if (strategyName.includes("RSI") && previousRSI < rsiOversold && currentRSI > rsiOversold) {
        // Buy signal
        inPosition = true;
        entryPrice = parseFloat(currentCandle.close);
        entryTime = new Date(currentCandle.timestamp).toISOString();
        stopLoss = entryPrice * 0.95; // 5% stop loss
        targets = [entryPrice * 1.03, entryPrice * 1.05, entryPrice * 1.08]; // 3%, 5%, 8% targets
      }
    } 
    // Exit logic
    else {
      const currentPrice = parseFloat(currentCandle.close);
      const exitTime = new Date(currentCandle.timestamp).toISOString();
      
      // Check if stop loss hit
      if (currentPrice <= stopLoss) {
        const pnlPercentage = ((currentPrice - entryPrice) / entryPrice) * 100;
        trades.push({
          id: `backtest-${symbol}-${tradeId++}`,
          symbol,
          pair: symbol,
          direction: "BUY",
          entryPrice,
          entryTime,
          exitPrice: currentPrice,
          exitTime,
          stopLoss,
          takeProfit: targets,
          targets: targets.map((t, idx) => ({ level: idx + 1, price: t, hit: false })),
          leverage: 1,
          status: "COMPLETED",
          createdAt: entryTime,
          completedAt: exitTime,
          profit: pnlPercentage,
          result: "loss",
          strategy: strategyName,
          pnlPercentage,
          maxDrawdown: pnlPercentage // For simplicity
        });
        inPosition = false;
      }
      // Check if take profit hit
      else if (currentPrice >= targets[0]) {
        const hitTargets = [currentPrice >= targets[0], currentPrice >= targets[1], currentPrice >= targets[2]];
        const pnlPercentage = ((currentPrice - entryPrice) / entryPrice) * 100;
        trades.push({
          id: `backtest-${symbol}-${tradeId++}`,
          symbol,
          pair: symbol,
          direction: "BUY",
          entryPrice,
          entryTime,
          exitPrice: currentPrice,
          exitTime,
          stopLoss,
          takeProfit: targets,
          targets: targets.map((t, idx) => ({ level: idx + 1, price: t, hit: hitTargets[idx] })),
          leverage: 1,
          status: "COMPLETED",
          createdAt: entryTime,
          completedAt: exitTime,
          profit: pnlPercentage,
          result: "win",
          strategy: strategyName,
          hitTargets,
          pnlPercentage,
          maxDrawdown: -2.5 // Mock value, would be calculated in real implementation
        });
        inPosition = false;
      }
      // Check if RSI overbought exit condition
      else if (currentRSI > rsiOverbought) {
        const pnlPercentage = ((currentPrice - entryPrice) / entryPrice) * 100;
        trades.push({
          id: `backtest-${symbol}-${tradeId++}`,
          symbol,
          pair: symbol,
          direction: "BUY",
          entryPrice,
          entryTime,
          exitPrice: currentPrice,
          exitTime,
          stopLoss,
          takeProfit: targets,
          targets: targets.map((t, idx) => ({ level: idx + 1, price: t, hit: false })),
          leverage: 1,
          status: "COMPLETED",
          createdAt: entryTime,
          completedAt: exitTime,
          profit: pnlPercentage,
          result: pnlPercentage > 0 ? "win" : "loss",
          strategy: strategyName,
          pnlPercentage,
          maxDrawdown: pnlPercentage < 0 ? pnlPercentage : -2.0 // Mock value
        });
        inPosition = false;
      }
    }
  }
  
  return trades;
}

/**
 * Simple RSI calculation (for demonstration purposes)
 */
function calculateRSI(prices: number[], period: number): number[] {
  if (prices.length <= period) {
    return [];
  }
  
  const rsi = [];
  let gains = 0;
  let losses = 0;
  
  // First average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // First RSI value
  let rs = avgGain / avgLoss;
  let rsiValue = 100 - (100 / (1 + rs));
  rsi.push(rsiValue);
  
  // Rest of the RSI values
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    let currentGain = 0;
    let currentLoss = 0;
    
    if (change >= 0) {
      currentGain = change;
    } else {
      currentLoss = -change;
    }
    
    avgGain = ((avgGain * (period - 1)) + currentGain) / period;
    avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;
    
    rs = avgGain / avgLoss;
    rsiValue = 100 - (100 / (1 + rs));
    rsi.push(rsiValue);
  }
  
  return rsi;
}

/**
 * Calculate performance metrics for the backtest
 */
function calculateBacktestMetrics(trades: TradingSignal[]): {
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  totalPnl: number;
  annualizedReturn: number;
} {
  if (trades.length === 0) {
    return {
      winRate: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      totalPnl: 0,
      annualizedReturn: 0
    };
  }
  
  // Calculate win rate
  const winningTrades = trades.filter(t => t.result === "win" || t.profit! > 0);
  const winRate = (winningTrades.length / trades.length) * 100;
  
  // Calculate profit factor
  const grossProfit = winningTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
  const losingTrades = trades.filter(t => t.result === "loss" || t.profit! < 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profit || 0), 0));
  const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;
  
  // Calculate total PnL
  const totalPnl = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
  
  // Approximate max drawdown (simplified)
  const maxDrawdown = Math.min(...trades.map(t => t.maxDrawdown || 0));
  
  // Simplified Sharpe ratio calculation
  const returns = trades.map(t => t.profit || 0);
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const stdDev = Math.sqrt(
    returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  );
  const sharpeRatio = stdDev === 0 ? 0 : (avgReturn - 0.5) / stdDev; // Assuming risk-free rate of 0.5%
  
  // Simple annualized return calculation
  let annualizedReturn = 0;
  if (trades.length > 1) {
    const firstTradeDate = new Date(trades[0].entryTime || trades[0].createdAt);
    const lastTradeDate = new Date(trades[trades.length - 1].exitTime || trades[trades.length - 1].completedAt || "");
    const yearFraction = (lastTradeDate.getTime() - firstTradeDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
    if (yearFraction > 0) {
      // Convert total PnL to annualized return
      annualizedReturn = Math.pow(1 + totalPnl / 100, 1 / yearFraction) - 1;
      annualizedReturn *= 100; // Convert to percentage
    }
  }
  
  return {
    winRate,
    profitFactor,
    maxDrawdown,
    sharpeRatio,
    totalPnl,
    annualizedReturn
  };
}

/**
 * Save historical signals to Firestore
 */
export async function saveHistoricalSignals(signals: HistoricalSignal[]): Promise<boolean> {
  try {
    const { db } = await import("./firebase");
    const { collection, addDoc } = await import("firebase/firestore");
    
    const batch = [];
    for (const signal of signals) {
      const docRef = collection(db, "historical_signals");
      batch.push(addDoc(docRef, signal));
    }
    
    await Promise.all(batch);
    console.log(`Saved ${signals.length} historical signals to Firestore`);
    return true;
  } catch (error) {
    console.error("Error saving historical signals:", error);
    return false;
  }
}

/**
 * Convert TradingSignal to HistoricalSignal format for storage
 */
export function convertToHistoricalSignal(signal: TradingSignal): HistoricalSignal {
  return {
    id: signal.id,
    asset: signal.symbol,
    entryPrice: signal.entryPrice || 0,
    entryTime: signal.entryTime || signal.createdAt,
    exitPrice: signal.exitPrice,
    exitTime: signal.exitTime || signal.completedAt,
    direction: signal.direction === "BUY" ? "long" : "short",
    strategy: signal.strategy || "unknown",
    result: typeof signal.result === "number" 
      ? (signal.result > 0 ? "win" : "loss") 
      : (signal.result as "win" | "loss" | "neutral" | undefined),
    pnlPercentage: signal.profit,
    hitTPs: signal.hitTargets || signal.targets?.map(t => t.hit || false),
    maxDrawdown: signal.maxDrawdown,
    leverage: signal.leverage,
    notes: signal.notes
  };
}

/**
 * Export backtest results to CSV format
 */
export function exportBacktestToCSV(backtest: BacktestResult): string {
  // Create CSV header
  let csv = "Symbol,Entry Price,Entry Time,Exit Price,Exit Time,Direction,Result,PnL%,Strategy\n";
  
  // Add each trade as a row
  backtest.trades.forEach(trade => {
    csv += `${trade.symbol},`;
    csv += `${trade.entryPrice},`;
    csv += `${trade.entryTime || trade.createdAt},`;
    csv += `${trade.exitPrice || ""},`;
    csv += `${trade.exitTime || trade.completedAt || ""},`;
    csv += `${trade.direction},`;
    csv += `${trade.result},`;
    csv += `${trade.profit},`;
    csv += `${trade.strategy}\n`;
  });
  
  // Add summary at the end
  csv += `\nSummary,,,,,,,\n`;
  csv += `Strategy,${backtest.strategyName},,,,,,,\n`;
  csv += `Period,${backtest.period},,,,,,,\n`;
  csv += `Date Range,${new Date(backtest.startDate).toLocaleDateString()} to ${new Date(backtest.endDate).toLocaleDateString()},,,,,,,\n`;
  csv += `Total Trades,${backtest.totalTrades},,,,,,,\n`;
  csv += `Win Rate,${backtest.winRate.toFixed(2)}%,,,,,,,\n`;
  csv += `Profit Factor,${backtest.profitFactor.toFixed(2)},,,,,,,\n`;
  csv += `Max Drawdown,${backtest.maxDrawdown.toFixed(2)}%,,,,,,,\n`;
  csv += `Sharpe Ratio,${backtest.sharpeRatio.toFixed(2)},,,,,,,\n`;
  csv += `Total PnL,${backtest.totalPnl.toFixed(2)}%,,,,,,,\n`;
  
  return csv;
}

/**
 * Download the CSV file
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
