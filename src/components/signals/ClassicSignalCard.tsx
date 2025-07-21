import { useState } from "react";
import { TradingSignal } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { ArrowUp, ArrowDown, Target, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface ClassicSignalCardProps {
  signal: TradingSignal;
}

const ClassicSignalCard = ({ signal }: ClassicSignalCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  const isBuy = signal.direction === "BUY";
  const confidence = signal.confidence || 0;
  const isHighConfidence = confidence >= 0.65;

  // Calculate confidence level
  const getConfidenceLevel = (conf: number) => {
    if (conf >= 0.75) return { label: "Alta", color: "bg-green-500" };
    if (conf >= 0.65) return { label: "Média", color: "bg-yellow-500" };
    return { label: "Baixa", color: "bg-red-500" };
  };

  const confidenceInfo = getConfidenceLevel(confidence);
  const timeAgo = formatDistanceToNow(new Date(signal.createdAt), { addSuffix: true });

  const copySignalDetails = () => {
    const details = `
🎯 SINAL CLASSIC ${signal.direction}
💰 ${signal.symbol}
📈 Entrada: ${signal.entryPrice || signal.entry_price}
🛡️ Stop Loss: ${signal.stopLoss}
🎯 TP1: ${signal.tp1}
🎯 TP2: ${signal.tp2}
🎯 TP3: ${signal.tp3}
⭐ Confiança: ${(confidence * 100).toFixed(1)}%
📊 Estratégia: ${signal.strategy}
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
                  {signal.direction}
                </span>
                <span className="text-slate-800 dark:text-slate-200">
                  {signal.symbol}
                </span>
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
            {signal.strategy && (
              <Badge variant="outline" className="text-xs">
                {signal.strategy}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Entry Price */}
        <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
          <div className="text-sm text-slate-600 dark:text-slate-400">Entrada</div>
          <div className="text-lg font-bold">
            {signal.entryPrice || signal.entry_price}
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

        {/* Targets */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Target className="h-4 w-4" />
            Alvos de Lucro
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {signal.tp1 && (
              <div className="p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded text-center">
                <div className="text-xs text-green-600 dark:text-green-400 font-medium">TP1</div>
                <div className="text-sm font-bold text-green-700 dark:text-green-300">
                  {signal.tp1}
                </div>
              </div>
            )}
            
            {signal.tp2 && (
              <div className="p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded text-center">
                <div className="text-xs text-green-600 dark:text-green-400 font-medium">TP2</div>
                <div className="text-sm font-bold text-green-700 dark:text-green-300">
                  {signal.tp2}
                </div>
              </div>
            )}
            
            {signal.tp3 && (
              <div className="p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded text-center">
                <div className="text-xs text-green-600 dark:text-green-400 font-medium">TP3</div>
                <div className="text-sm font-bold text-green-700 dark:text-green-300">
                  {signal.tp3}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Expanded content */}
        {expanded && signal.analysis && (
          <div className="pt-4 border-t animate-fade-in">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Análise do Sinal
                </div>
                <div className="text-sm p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                  {signal.analysis}
                </div>
              </div>
            </div>
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

export default ClassicSignalCard;