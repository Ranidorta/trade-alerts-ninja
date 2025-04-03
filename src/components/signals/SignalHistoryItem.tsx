import React from "react";
import { TradingSignal } from "@/lib/types";
import { format } from "date-fns";
import { Check, X, Clock, TrendingUp, TrendingDown, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignalHistoryItemProps {
  signal: TradingSignal;
}

export const SignalHistoryItem = ({ signal }: SignalHistoryItemProps) => {
  const isWin = signal.result === 1 || signal.result === "win";
  const isLoss = signal.result === 0 || signal.result === "loss";
  const isPending = signal.result === undefined || signal.status !== "COMPLETED";
  
  const formatPrice = (price?: number) => {
    if (price === undefined) return "N/A";
    return price.toFixed(price < 0.1 ? 6 : price < 1 ? 4 : 2);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Data desconhecida";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm");
    } catch (e) {
      return "Data inválida";
    }
  };

  const calculateProfit = () => {
    if (signal.profit !== undefined) return signal.profit.toFixed(2) + "%";
    
    if (signal.status !== "COMPLETED" || !signal.entryPrice) return "Pendente";
    
    if (isLoss && signal.stopLoss) {
      const profitVal = signal.direction === "BUY" 
        ? ((signal.stopLoss / signal.entryPrice) - 1) * 100
        : ((signal.entryPrice / signal.stopLoss) - 1) * 100;
      return profitVal.toFixed(2) + "%";
    }
    
    if (isWin && signal.targets && signal.targets.some(t => t.hit)) {
      const hitTargets = signal.targets.filter(t => t.hit);
      const highestHit = hitTargets.reduce(
        (max, target) => target.level > max.level ? target : max, 
        hitTargets[0]
      );
      
      const profitVal = signal.direction === "BUY" 
        ? ((highestHit.price / signal.entryPrice) - 1) * 100
        : ((signal.entryPrice / highestHit.price) - 1) * 100;
      return profitVal.toFixed(2) + "%";
    }
    
    return "Pendente";
  };

  return (
    <div className={cn(
      "border rounded-lg p-4 shadow-sm transition-all",
      isWin ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900/30" : 
      isLoss ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/30" :
      "bg-card border-border hover:border-primary/30"
    )}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "font-bold text-lg",
            signal.direction === "BUY" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {signal.symbol}
          </div>
          <div className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            signal.direction === "BUY" 
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
          )}>
            {signal.direction}
          </div>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDate(signal.createdAt)}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-sm">
          <div className="text-muted-foreground mb-1">Entrada</div>
          <div className="font-medium">{formatPrice(signal.entryPrice)}</div>
        </div>
        <div className="text-sm">
          <div className="text-muted-foreground mb-1">Stop Loss</div>
          <div className="font-medium text-red-600 dark:text-red-400">{formatPrice(signal.stopLoss)}</div>
        </div>
      </div>
      
      <div className="mb-3">
        <div className="text-sm text-muted-foreground mb-2">Alvos de Preço</div>
        <div className="flex gap-2">
          {signal.targets?.map((target, index) => (
            <div 
              key={`${signal.id}-target-${index}`}
              className={cn(
                "flex-1 rounded-md p-2 text-center text-sm border",
                target.hit
                  ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900/30"
                  : isLoss
                  ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/30"
                  : "bg-muted/30 border-muted"
              )}
            >
              <div className="font-medium mb-1">TP{target.level}</div>
              <div className="text-xs">{formatPrice(target.price)}</div>
              <div className="mt-1">
                {target.hit ? (
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400 inline" />
                ) : isLoss ? (
                  <X className="h-4 w-4 text-red-600 dark:text-red-400 inline" />
                ) : (
                  <Target className="h-4 w-4 text-muted-foreground inline" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-4">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Status</div>
          <div className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1",
            signal.status === "COMPLETED"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
          )}>
            {signal.status === "COMPLETED" ? "Concluído" : signal.status || "Pendente"}
          </div>
        </div>
        
        <div>
          <div className="text-xs text-muted-foreground mb-1">Resultado</div>
          <div className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1",
            isWin
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : isLoss
              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
              : "bg-muted text-muted-foreground"
          )}>
            {isWin ? (
              <>
                <TrendingUp className="h-3 w-3" />
                {calculateProfit()}
              </>
            ) : isLoss ? (
              <>
                <TrendingDown className="h-3 w-3" />
                {calculateProfit()}
              </>
            ) : (
              "Pendente"
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignalHistoryItem;
