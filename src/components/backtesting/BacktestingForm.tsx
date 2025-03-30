
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { runBacktest, exportBacktestToCSV, downloadCSV } from "@/lib/backtestingService";
import { BacktestResult } from "@/lib/types";
import { CalendarIcon, Download, PlayCircle } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function BacktestingForm() {
  const [strategyName, setStrategyName] = useState("RSI_30");
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("1h");
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // 30 days ago
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const handleRunBacktest = async () => {
    if (!strategyName || !symbol || !startDate || !endDate) {
      toast.error("Please fill in all fields");
      return;
    }

    if (startDate >= endDate) {
      toast.error("Start date must be before end date");
      return;
    }

    setIsRunning(true);
    try {
      const backtestResult = await runBacktest(
        strategyName,
        symbol,
        startDate,
        endDate,
        timeframe
      );
      
      if (backtestResult) {
        setResult(backtestResult);
        toast.success("Backtest completed successfully");
      }
    } catch (error) {
      console.error("Error running backtest:", error);
      toast.error("Failed to run backtest");
    } finally {
      setIsRunning(false);
    }
  };

  const handleExport = () => {
    if (!result) return;
    
    const csv = exportBacktestToCSV(result);
    const filename = `backtest_${result.strategyName}_${symbol}_${format(new Date(result.startDate), 'yyyy-MM-dd')}.csv`;
    downloadCSV(csv, filename);
    toast.success("Backtest results exported to CSV");
  };

  const strategies = [
    { id: "RSI_30", name: "RSI (30/70)" },
    { id: "MEAN_REVERSION", name: "Mean Reversion" },
    { id: "BOLLINGER_BANDS", name: "Bollinger Bands" },
    { id: "MACD", name: "MACD Crossover" },
    { id: "CLASSIC", name: "Classic Strategy" }
  ];

  const symbols = [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "ADAUSDT", 
    "DOGEUSDT", "XRPUSDT", "AVAXUSDT", "DOTUSDT", "LTCUSDT"
  ];

  const timeframes = [
    { value: "1m", label: "1 minute" },
    { value: "5m", label: "5 minutes" },
    { value: "15m", label: "15 minutes" },
    { value: "30m", label: "30 minutes" },
    { value: "1h", label: "1 hour" },
    { value: "4h", label: "4 hours" },
    { value: "1d", label: "1 day" }
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Backtest Trading Strategy</CardTitle>
          <CardDescription>
            Test your trading strategy against historical data to evaluate its performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="strategy">Strategy</Label>
              <Select
                value={strategyName}
                onValueChange={setStrategyName}
              >
                <SelectTrigger id="strategy">
                  <SelectValue placeholder="Select a strategy" />
                </SelectTrigger>
                <SelectContent>
                  {strategies.map((strategy) => (
                    <SelectItem key={strategy.id} value={strategy.id}>
                      {strategy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbol">Trading Pair</Label>
              <Select
                value={symbol}
                onValueChange={setSymbol}
              >
                <SelectTrigger id="symbol">
                  <SelectValue placeholder="Select a trading pair" />
                </SelectTrigger>
                <SelectContent>
                  {symbols.map((sym) => (
                    <SelectItem key={sym} value={sym}>
                      {sym}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeframe">Timeframe</Label>
              <Select
                value={timeframe}
                onValueChange={setTimeframe}
              >
                <SelectTrigger id="timeframe">
                  <SelectValue placeholder="Select a timeframe" />
                </SelectTrigger>
                <SelectContent>
                  {timeframes.map((tf) => (
                    <SelectItem key={tf.value} value={tf.value}>
                      {tf.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <Button onClick={handleRunBacktest} disabled={isRunning}>
            <PlayCircle className="mr-2 h-4 w-4" />
            {isRunning ? "Running Backtest..." : "Run Backtest"}
          </Button>
          {result && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export Results
            </Button>
          )}
        </CardFooter>
      </Card>

      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Backtest Results</CardTitle>
            <CardDescription>
              Performance metrics for {result.strategyName} on {symbol} from {format(new Date(result.startDate), "PP")} to {format(new Date(result.endDate), "PP")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Trades</p>
                <p className="text-2xl font-semibold">{result.totalTrades}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className={`text-2xl font-semibold ${result.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                  {result.winRate.toFixed(2)}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Profit Factor</p>
                <p className={`text-2xl font-semibold ${result.profitFactor >= 1.5 ? 'text-green-600' : result.profitFactor >= 1 ? 'text-amber-600' : 'text-red-600'}`}>
                  {result.profitFactor.toFixed(2)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Max Drawdown</p>
                <p className="text-2xl font-semibold text-red-600">
                  {result.maxDrawdown.toFixed(2)}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                <p className={`text-2xl font-semibold ${result.sharpeRatio >= 1 ? 'text-green-600' : 'text-amber-600'}`}>
                  {result.sharpeRatio.toFixed(2)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total PnL</p>
                <p className={`text-2xl font-semibold ${result.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {result.totalPnl.toFixed(2)}%
                </p>
              </div>
            </div>

            {result.trades.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Recent Trades ({Math.min(5, result.trades.length)} of {result.trades.length})</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asset</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Direction</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Entry</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Exit</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Result</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">PnL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {result.trades.slice(0, 5).map((trade, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{trade.symbol}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                            <span className={trade.direction === "BUY" ? "text-green-600" : "text-red-600"}>
                              {trade.direction}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">${trade.entryPrice?.toFixed(2)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">${trade.exitPrice?.toFixed(2)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                            <span className={
                              trade.result === "win" ? "text-green-600" : 
                              trade.result === "loss" ? "text-red-600" : "text-gray-500"
                            }>
                              {trade.result}
                            </span>
                          </td>
                          <td className={`px-3 py-2 whitespace-nowrap text-sm text-right ${
                            trade.profit && trade.profit > 0 ? "text-green-600" : "text-red-600"
                          }`}>
                            {trade.profit ? (trade.profit > 0 ? "+" : "") + trade.profit?.toFixed(2) + "%" : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
