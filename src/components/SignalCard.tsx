
import { useState, useEffect } from "react";
import { TradingSignal } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Layers, Check, BarChart } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import CryptoChart from "./CryptoChart";

interface SignalCardProps {
  signal: TradingSignal;
  refreshInterval?: number;
}

const SignalCard = ({ signal: initialSignal, refreshInterval = 60000 }: SignalCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [signal, setSignal] = useState(initialSignal);
  const [showChart, setShowChart] = useState(false);
  const { toast } = useToast();
  
  const isShort = signal.type === "SHORT";
  const typeColor = isShort ? "crypto-red" : "crypto-green";
  const typeIcon = isShort ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />;
  
  // Effect to periodically check if targets are hit based on current price
  useEffect(() => {
    const updateTargetStatus = () => {
      if (!signal.currentPrice || signal.status !== "ACTIVE") return;
      
      // Create a copy of the signal to update
      const updatedSignal = { ...signal };
      let targetsUpdated = false;
      
      // Check if any targets are hit based on current price
      if (updatedSignal.targets) {
        updatedSignal.targets = updatedSignal.targets.map(target => {
          // For SHORT positions, price needs to go DOWN to hit targets
          // For LONG positions, price needs to go UP to hit targets
          const isHit = isShort
            ? signal.currentPrice <= target.price
            : signal.currentPrice >= target.price;
            
          // Only update if status changed
          if (isHit !== !!target.hit) {
            targetsUpdated = true;
            return { ...target, hit: isHit };
          }
          
          return target;
        });
      }
      
      // Update the signal if targets were updated
      if (targetsUpdated) {
        setSignal(updatedSignal);
        
        // If all targets are hit, update status to COMPLETED
        const allTargetsHit = updatedSignal.targets?.every(t => t.hit);
        if (allTargetsHit) {
          updatedSignal.status = "COMPLETED";
          updatedSignal.completedAt = new Date().toISOString();
          
          toast({
            title: "Signal completed!",
            description: `All targets for ${signal.symbol} have been hit`,
          });
        }
      }
    };
    
    // Update on initial render
    updateTargetStatus();
    
    // Set up interval for updates
    const intervalId = setInterval(updateTargetStatus, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [signal, isShort, refreshInterval, toast]);
  
  // Calculate profit percentage from targets that were hit
  const calculateProgress = () => {
    if (!signal.targets) return 0;
    const hitTargets = signal.targets.filter(t => t.hit).length;
    const totalTargets = signal.targets.length;
    return (hitTargets / totalTargets) * 100;
  };
  
  // Format the time ago
  const timeAgo = formatDistanceToNow(new Date(signal.createdAt), { addSuffix: true });
  
  // Calculate price movement
  const getPriceMovement = () => {
    if (!signal.currentPrice || !signal.entryAvg) return null;
    
    const diff = isShort 
      ? signal.entryAvg - signal.currentPrice
      : signal.currentPrice - signal.entryAvg;
    
    const percentChange = (diff / signal.entryAvg) * 100;
    const isProfit = diff > 0;
    
    return {
      diff,
      percentChange,
      isProfit,
      icon: isProfit 
        ? (isShort ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />)
        : (isShort ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />)
    };
  };
  
  const priceMovement = getPriceMovement();

  const copySignalDetails = () => {
    // Format signal details as text
    const details = `
${signal.type} ${signal.symbol} (${signal.pair})
Entry: ${signal.entryMin} - ${signal.entryMax} (avg: ${signal.entryAvg})
SL: ${signal.stopLoss}
${signal.targets ? signal.targets.map((t, i) => `TP${i+1}: ${t.price}`).join('\n') : ''}
Leverage: ${signal.leverage}x
    `.trim();
    
    navigator.clipboard.writeText(details);
    
    toast({
      title: "Details copied!",
      description: "Signal details copied to clipboard",
    });
  };
  
  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300 hover:shadow-md border-slate-200 animate-scale-in",
      expanded ? "shadow-md" : "shadow-sm"
    )}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center space-x-2">
            <div className={`bg-${typeColor} h-7 w-7 rounded-full flex items-center justify-center text-white`}>
              {typeIcon}
            </div>
            <CardTitle className="text-lg font-bold flex items-center">
              <span className={`text-${typeColor}`}>{signal.type}</span>
              <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">
                {signal.symbol} ({signal.pair})
              </span>
            </CardTitle>
          </div>
          <StatusBadge status={signal.status} />
        </div>
        <CardDescription className="flex items-center justify-between">
          <span>Created {timeAgo}</span>
          {priceMovement && signal.status === "ACTIVE" && (
            <div className={`flex items-center text-sm ${priceMovement.isProfit ? 'text-success' : 'text-error'}`}>
              {priceMovement.icon}
              <span className="ml-1 truncate">
                {priceMovement.percentChange.toFixed(2)}% 
                ({priceMovement.isProfit ? '+' : ''}{priceMovement.diff.toFixed(isShort && signal.entryAvg < 1 ? 4 : 2)})
              </span>
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <div className="text-xs text-slate-500 dark:text-slate-400">Entry Zone</div>
            <div className="font-medium truncate">{signal.entryMin} - {signal.entryMax}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">Average: {signal.entryAvg}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-slate-500 dark:text-slate-400">Stop Loss</div>
            <div className="font-medium text-error truncate">{signal.stopLoss}</div>
            {signal.entryAvg && (
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Risk: {((Math.abs(signal.stopLoss - signal.entryAvg) / signal.entryAvg) * 100).toFixed(2)}%
              </div>
            )}
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-1">
            <div className="text-xs text-slate-500 dark:text-slate-400">Targets</div>
            {signal.status === "ACTIVE" && calculateProgress() > 0 && (
              <div className="text-xs text-success">{Math.round(calculateProgress())}% Complete</div>
            )}
          </div>
          {signal.status === "ACTIVE" && (
            <Progress value={calculateProgress()} className="h-1 mb-2" />
          )}
          
          <div className={cn("grid gap-2", expanded ? "grid-cols-1" : "grid-cols-3")}>
            {signal.targets?.map((target, index) => (
              <div 
                key={index} 
                className={cn(
                  "rounded-md border p-2 flex justify-between items-center",
                  target.hit ? "bg-success/10 border-success/30" : "bg-slate-50 dark:bg-slate-800/50"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium">{`TP${index + 1}`}</div>
                  <div className="font-medium truncate">{target.price}</div>
                </div>
                {target.hit && <Check className="h-4 w-4 text-success flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
        
        {expanded && (
          <div className="mt-4 pt-4 border-t animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Leverage</div>
                <div className="flex items-center mt-1">
                  <Layers className="h-4 w-4 mr-1 text-yellow-500" />
                  <div className="font-medium">{signal.leverage}x</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Current Price</div>
                <div className="font-medium mt-1 truncate">{signal.currentPrice || "N/A"}</div>
              </div>
            </div>
            
            {signal.technicalIndicators && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Technical Indicators</div>
                  <button 
                    onClick={() => setShowChart(!showChart)}
                    className="text-xs text-primary hover:underline flex items-center"
                  >
                    <BarChart className="h-3 w-3 mr-1" />
                    {showChart ? 'Hide Chart' : 'Show Chart'}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                  {signal.technicalIndicators.rsi && (
                    <div className="flex justify-between">
                      <span className="text-xs">RSI:</span>
                      <span className={cn(
                        "text-xs font-medium",
                        signal.technicalIndicators.rsi > 70 ? "text-crypto-red" : 
                        signal.technicalIndicators.rsi < 30 ? "text-crypto-green" : 
                        "text-slate-600"
                      )}>
                        {signal.technicalIndicators.rsi.toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  {signal.technicalIndicators.macd !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-xs">MACD:</span>
                      <span className={cn(
                        "text-xs font-medium",
                        signal.technicalIndicators.macd > 0 ? "text-crypto-green" : "text-crypto-red"
                      )}>
                        {signal.technicalIndicators.macd.toFixed(4)}
                      </span>
                    </div>
                  )}
                  
                  {signal.technicalIndicators.shortMa && signal.technicalIndicators.longMa && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-xs">Short MA:</span>
                        <span className="text-xs font-medium">
                          {signal.technicalIndicators.shortMa.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs">Long MA:</span>
                        <span className="text-xs font-medium">
                          {signal.technicalIndicators.longMa.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                
                {showChart && signal.entryAvg && signal.stopLoss && signal.targets && (
                  <div className="mt-4">
                    <CryptoChart 
                      symbol={signal.symbol}
                      type={signal.type || "LONG"}
                      entryPrice={signal.entryAvg}
                      stopLoss={signal.stopLoss}
                      targets={signal.targets}
                      showIndicators={true}
                      technicalIndicators={signal.technicalIndicators}
                    />
                  </div>
                )}
              </div>
            )}
            
            {signal.status === "COMPLETED" && signal.profit !== undefined && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-xs text-slate-500 dark:text-slate-400">Result</div>
                <div className={`flex items-center mt-1 ${signal.profit >= 0 ? 'text-success' : 'text-error'}`}>
                  {signal.profit >= 0 ? 
                    <TrendingUp className="h-4 w-4 mr-1" /> : 
                    <TrendingDown className="h-4 w-4 mr-1" />
                  }
                  <div className="font-medium">
                    {signal.profit >= 0 ? '+' : ''}{signal.profit}%
                  </div>
                </div>
              </div>
            )}
            
            {signal.analysis && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-xs text-slate-500 dark:text-slate-400">Análise do Sinal</div>
                <div className="text-sm mt-1 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md">
                  <pre className="whitespace-pre-wrap font-sans">{signal.analysis}</pre>
                </div>
              </div>
            )}
            
            {signal.notes && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-xs text-slate-500 dark:text-slate-400">Notes</div>
                <div className="text-sm mt-1">{signal.notes}</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between pt-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-primary font-medium hover:underline"
        >
          {expanded ? "Show Less" : "Show More"}
        </button>
        <button
          onClick={copySignalDetails}
          className="text-sm text-slate-500 hover:text-slate-700 font-medium"
        >
          Copy Details
        </button>
      </CardFooter>
    </Card>
  );
};

export default SignalCard;
