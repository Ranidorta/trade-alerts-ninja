import { useState, useEffect } from "react";
import { TradingSignal } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Layers, Check, BarChart, Target } from "lucide-react";
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
  
  useEffect(() => {
    const updateTargetStatus = () => {
      if (!signal.currentPrice || signal.status !== "ACTIVE") return;
      
      const updatedSignal = { ...signal };
      let targetsUpdated = false;
      
      if (updatedSignal.targets) {
        updatedSignal.targets = updatedSignal.targets.map(target => {
          const isHit = isShort
            ? signal.currentPrice <= target.price
            : signal.currentPrice >= target.price;
            
          if (isHit !== !!target.hit) {
            targetsUpdated = true;
            return { ...target, hit: isHit };
          }
          
          return target;
        });
      }
      
      if (targetsUpdated) {
        setSignal(updatedSignal);
        
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
    
    updateTargetStatus();
    
    const intervalId = setInterval(updateTargetStatus, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [signal, isShort, refreshInterval, toast]);
  
  const calculateProgress = () => {
    if (!signal.targets) return 0;
    const hitTargets = signal.targets.filter(t => t.hit).length;
    const totalTargets = signal.targets.length;
    return (hitTargets / totalTargets) * 100;
  };
  
  const timeAgo = formatDistanceToNow(new Date(signal.createdAt), { addSuffix: true });
  
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

  const getTargetStatusColor = (target, index) => {
    if (target.hit) return "bg-green-500 text-white";
    
    if (signal.currentPrice) {
      const distance = Math.abs((target.price - signal.currentPrice) / signal.currentPrice) * 100;
      
      if (distance < 0.5) return "bg-yellow-400 text-white";
      
      if (distance < 1) return "bg-yellow-300 text-gray-800";
    }
    
    return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300";
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
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center">
              <Target className="h-4 w-4 mr-1 text-primary" />
              <span className="font-medium text-sm">Price Targets</span>
            </div>
            {signal.status === "ACTIVE" && calculateProgress() > 0 && (
              <div className="text-xs text-success">{Math.round(calculateProgress())}% Complete</div>
            )}
          </div>
          
          {signal.status === "ACTIVE" && (
            <Progress value={calculateProgress()} className="h-2 mb-4" />
          )}
          
          <div className="grid grid-cols-3 gap-2 mb-4">
            {signal.targets?.map((target, index) => (
              <div 
                key={index} 
                className={cn(
                  "rounded-md px-3 py-2 flex flex-col items-center justify-center text-center transition-all duration-200 border",
                  target.hit 
                    ? "bg-green-500/10 border-green-500/30" 
                    : "border-slate-200 dark:border-slate-700"
                )}
              >
                <div className="flex items-center justify-center mb-1">
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full",
                    getTargetStatusColor(target, index)
                  )}>
                    TP{index + 1}
                  </span>
                </div>
                <div className="font-medium text-sm">
                  {target.price}
                </div>
                <div className="text-xs mt-1 text-slate-500 dark:text-slate-400">
                  {signal.entryAvg && (
                    <>
                      {isShort 
                        ? ((signal.entryAvg - target.price) / signal.entryAvg * 100).toFixed(2)
                        : ((target.price - signal.entryAvg) / signal.entryAvg * 100).toFixed(2)
                      }%
                    </>
                  )}
                </div>
                {target.hit && <Check className="h-3 w-3 text-green-500 mt-1" />}
              </div>
            ))}
          </div>
          
          {signal.currentPrice && signal.entryAvg && (
            <div className="relative w-full h-8 bg-slate-100 dark:bg-slate-800 rounded-md mb-4 overflow-hidden">
              <div className="absolute inset-0 flex items-center">
                {signal.targets?.map((target, index) => (
                  <div 
                    key={`marker-${index}`}
                    className="absolute h-full w-0.5 flex flex-col items-center"
                    style={{ 
                      left: `${Math.min(Math.max(((target.price - Math.min(signal.entryAvg, signal.stopLoss)) / 
                        (Math.max(signal.targets[signal.targets.length - 1].price, signal.entryAvg) - 
                        Math.min(signal.entryAvg, signal.stopLoss))) * 100, 0), 100)}%` 
                    }}
                  >
                    <div className={`h-full w-0.5 ${target.hit ? 'bg-green-500' : 'bg-blue-400'}`}></div>
                    <span className="absolute top-0 -mt-6 -translate-x-1/2 text-xs font-medium">
                      TP{index + 1}
                    </span>
                  </div>
                ))}
                
                <div 
                  className="absolute h-full w-0.5 bg-red-500 flex flex-col items-center"
                  style={{ 
                    left: '0%'
                  }}
                >
                  <span className="absolute top-0 -mt-6 -translate-x-1/2 text-xs font-medium text-red-500">
                    SL
                  </span>
                </div>
                
                <div 
                  className="absolute h-full w-1 bg-primary flex flex-col items-center"
                  style={{ 
                    left: `${Math.min(Math.max(((signal.currentPrice - Math.min(signal.entryAvg, signal.stopLoss)) / 
                      (Math.max(signal.targets[signal.targets.length - 1].price, signal.entryAvg) - 
                      Math.min(signal.entryAvg, signal.stopLoss))) * 100, 0), 100)}%` 
                  }}
                >
                  <span className="absolute bottom-0 -mb-6 -translate-x-1/2 text-xs font-medium">
                    {signal.currentPrice}
                  </span>
                </div>
              </div>
            </div>
          )}
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
