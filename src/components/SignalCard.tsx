
import { useState, useEffect } from "react";
import { TradingSignal } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Layers, Check, BarChart, Target, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const isBuy = !isShort;
  const confidence = signal.confidence || 0.75;
  const isHighConfidence = confidence >= 0.65;
  
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

  // Calculate confidence level
  const getConfidenceLevel = (conf: number) => {
    if (conf >= 0.75) return { label: "Alta", color: "bg-green-500" };
    if (conf >= 0.65) return { label: "Média", color: "bg-yellow-500" };
    return { label: "Baixa", color: "bg-red-500" };
  };

  const confidenceInfo = getConfidenceLevel(confidence);

  const copySignalDetails = () => {
    const details = `
🎯 SINAL ${signal.type}
💰 ${signal.symbol} (${signal.pair})
📈 Entrada: ${signal.entryMin} - ${signal.entryMax} (avg: ${signal.entryAvg})
🛡️ Stop Loss: ${signal.stopLoss}
${signal.targets ? signal.targets.map((t, i) => `🎯 TP${i+1}: ${t.price}`).join('\n') : ''}
⚡ Leverage: ${signal.leverage}x
⭐ Status: ${signal.status}
    `.trim();
    
    navigator.clipboard.writeText(details);
    
    toast({
      title: "Sinal copiado!",
      description: "Detalhes do sinal copiados para área de transferência",
    });
  };
  
  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-300 hover:shadow-md animate-scale-in",
        // Background colors based on direction
        isBuy 
          ? "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800" 
          : "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-red-200 dark:border-red-800",
        // Low confidence transparency
        !isHighConfidence && "opacity-60",
        expanded ? "shadow-lg" : "shadow-sm"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center space-x-3">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center text-white font-bold",
              isBuy ? "bg-blue-500" : "bg-red-500"
            )}>
              {isBuy ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <span className={isBuy ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}>
                  {signal.type}
                </span>
                <span className="text-slate-800 dark:text-slate-200">
                  {signal.symbol}
                </span>
                {signal.pair && (
                  <span className="text-slate-600 dark:text-slate-400 text-sm">
                    ({signal.pair})
                  </span>
                )}
              </CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {timeAgo}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <Badge 
              className={cn(
                "text-white font-medium",
                confidenceInfo.color
              )}
            >
              <Zap className="h-3 w-3 mr-1" />
              {confidenceInfo.label} {(confidence * 100).toFixed(1)}%
            </Badge>
            <Badge 
              variant={
                signal.status === "COMPLETED" ? "secondary" : 
                signal.status === "ACTIVE" ? "default" : 
                "outline"
              }
              className="text-xs"
            >
              {signal.status}
            </Badge>
            {priceMovement && signal.status === "ACTIVE" && (
              <div className={`flex items-center text-xs ${priceMovement.isProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {priceMovement.icon}
                <span className="ml-1">
                  {priceMovement.percentChange.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Entry Zone */}
        <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
          <div className="text-sm text-slate-600 dark:text-slate-400">Zona de Entrada</div>
          <div className="text-right">
            <div className="text-lg font-bold">
              {signal.entryMin} - {signal.entryMax}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Média: {signal.entryAvg}
            </div>
          </div>
        </div>

        {/* Stop Loss */}
        <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Shield className="h-4 w-4" />
            Stop Loss
          </div>
          <div className="text-lg font-bold text-red-600 dark:text-red-400">
            {signal.stopLoss}
          </div>
        </div>

        {/* Progress bar for active signals */}
        {signal.status === "ACTIVE" && signal.targets && calculateProgress() > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Progresso</span>
              <span className="text-green-600 dark:text-green-400 font-medium">
                {Math.round(calculateProgress())}% Completo
              </span>
            </div>
            <Progress value={calculateProgress()} className="h-2" />
          </div>
        )}

        {/* Targets */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Target className="h-4 w-4" />
            Alvos de Lucro
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {signal.targets?.map((target, index) => (
              <div 
                key={index}
                className={cn(
                  "p-2 border rounded text-center transition-all duration-200",
                  target.hit 
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" 
                    : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                )}
              >
                <div className={cn(
                  "text-xs font-medium mb-1",
                  target.hit ? "text-green-600 dark:text-green-400" : "text-slate-600 dark:text-slate-400"
                )}>
                  TP{index + 1}
                </div>
                <div className={cn(
                  "text-sm font-bold",
                  target.hit ? "text-green-700 dark:text-green-300" : "text-slate-800 dark:text-slate-200"
                )}>
                  {target.price}
                </div>
                {target.hit && (
                  <Check className="h-3 w-3 text-green-600 dark:text-green-400 mx-auto mt-1" />
                )}
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

        {/* Action buttons */}
        <div className="flex justify-between pt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
          >
            {expanded ? "Ocultar detalhes" : "Ver detalhes"}
          </button>
          <button
            onClick={copySignalDetails}
            className={cn(
              "text-sm font-medium hover:underline",
              isBuy ? "text-blue-600 hover:text-blue-800" : "text-red-600 hover:text-red-800"
            )}
          >
            Copiar sinal
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SignalCard;
