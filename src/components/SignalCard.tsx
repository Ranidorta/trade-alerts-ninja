
import { useState } from "react";
import { TradingSignal } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Layers } from "lucide-react";
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

interface SignalCardProps {
  signal: TradingSignal;
}

const SignalCard = ({ signal }: SignalCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  
  const isShort = signal.type === "SHORT";
  const typeColor = isShort ? "crypto-red" : "crypto-green";
  const typeIcon = isShort ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />;
  
  // Calculate profit percentage from targets that were hit
  const calculateProgress = () => {
    const hitTargets = signal.targets.filter(t => t.hit).length;
    const totalTargets = signal.targets.length;
    return (hitTargets / totalTargets) * 100;
  };
  
  // Format the time ago
  const timeAgo = formatDistanceToNow(new Date(signal.createdAt), { addSuffix: true });
  
  // Calculate price movement
  const getPriceMovement = () => {
    if (!signal.currentPrice) return null;
    
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
${signal.targets.map((t, i) => `TP${i+1}: ${t.price}`).join('\n')}
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
              <span className="ml-1">
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
            <p className="text-xs text-slate-500 dark:text-slate-400">Entry Zone</p>
            <p className="font-medium">{signal.entryMin} - {signal.entryMax}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Average: {signal.entryAvg}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">Stop Loss</p>
            <p className="font-medium text-error">{signal.stopLoss}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Risk: {((Math.abs(signal.stopLoss - signal.entryAvg) / signal.entryAvg) * 100).toFixed(2)}%
            </p>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">Targets</p>
            {signal.status === "ACTIVE" && calculateProgress() > 0 && (
              <p className="text-xs text-success">{Math.round(calculateProgress())}% Complete</p>
            )}
          </div>
          {signal.status === "ACTIVE" && (
            <Progress value={calculateProgress()} className="h-1 mb-2" />
          )}
          
          <div className={cn("grid gap-2", expanded ? "grid-cols-1" : "grid-cols-3")}>
            {signal.targets.map((target, index) => (
              <div 
                key={index} 
                className={cn(
                  "rounded-md border p-2 flex justify-between items-center",
                  target.hit ? "bg-success/10 border-success/30" : "bg-slate-50 dark:bg-slate-800/50"
                )}
              >
                <div>
                  <p className="text-xs font-medium">{`TP${index + 1}`}</p>
                  <p className="font-medium">{target.price}</p>
                </div>
                {target.hit && <Check className="h-4 w-4 text-success" />}
              </div>
            ))}
          </div>
        </div>
        
        {expanded && (
          <div className="mt-4 pt-4 border-t animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Leverage</p>
                <div className="flex items-center mt-1">
                  <Layers className="h-4 w-4 mr-1 text-yellow-500" />
                  <p className="font-medium">{signal.leverage}x</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Current Price</p>
                <p className="font-medium mt-1">{signal.currentPrice || "N/A"}</p>
              </div>
            </div>
            
            {signal.status === "COMPLETED" && signal.profit !== undefined && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-slate-500 dark:text-slate-400">Result</p>
                <div className={`flex items-center mt-1 ${signal.profit >= 0 ? 'text-success' : 'text-error'}`}>
                  {signal.profit >= 0 ? 
                    <TrendingUp className="h-4 w-4 mr-1" /> : 
                    <TrendingDown className="h-4 w-4 mr-1" />
                  }
                  <p className="font-medium">
                    {signal.profit >= 0 ? '+' : ''}{signal.profit}%
                  </p>
                </div>
              </div>
            )}
            
            {signal.notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-slate-500 dark:text-slate-400">Notes</p>
                <p className="text-sm mt-1">{signal.notes}</p>
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
