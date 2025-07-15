
import { useEffect, useState } from "react";
import { TradingSignal } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  TrendingDown, 
  History, 
  BarChart3, 
  Target,
  AlertTriangle,
  Ban
} from "lucide-react";
import { getSignalHistory } from "@/lib/signal-storage";

interface SignalHistorySummaryProps {
  signal: TradingSignal | null;
}

export default function SignalHistorySummary({ signal }: SignalHistorySummaryProps) {
  const [historicalData, setHistoricalData] = useState<{
    successRate: number;
    totalSignals: number;
    wins: number;
    partials: number;
    losses: number;
    missed: number;
    avgProfit: number;
    recentResults: Array<"win" | "partial" | "loss" | "missed">;
    tp1Hit: number;
    tp2Hit: number;
    tp3Hit: number;
  }>({
    successRate: 0,
    totalSignals: 0,
    wins: 0,
    partials: 0,
    losses: 0,
    missed: 0,
    avgProfit: 0,
    recentResults: [],
    tp1Hit: 0,
    tp2Hit: 0,
    tp3Hit: 0
  });

  useEffect(() => {
    if (!signal) return;
    
    // Obter todos os sinais para este símbolo
    const allSignals = getSignalHistory();
    const symbolSignals = allSignals.filter(s => 
      (s.symbol === signal.symbol || s.pair === signal.symbol) && 
      (s.result !== undefined)
    );
    
    if (symbolSignals.length === 0) return;
    
    // Calcular métricas
    const wins = symbolSignals.filter(s => 
      s.result === 1 || s.result === "win" || s.result === "WINNER"
    ).length;
    
    const partials = symbolSignals.filter(s => 
      s.result === "partial" || s.result === "PARTIAL"
    ).length;
    
    const losses = symbolSignals.filter(s => 
      s.result === 0 || s.result === "loss" || s.result === "LOSER"
    ).length;
    
    const missed = symbolSignals.filter(s => 
      s.result === "missed" || s.result === "FALSE"
    ).length;
    
    // REGRA: WINNER + PARTIAL = acerto na taxa de acerto
    const validatedSignals = wins + partials + losses + missed;
    const successRate = validatedSignals > 0 ? ((wins + partials) / validatedSignals) * 100 : 0;
    
    // Calcular lucro médio
    const signalsWithProfit = symbolSignals.filter(s => typeof s.profit === 'number');
    const avgProfit = signalsWithProfit.length > 0 
      ? signalsWithProfit.reduce((sum, s) => sum + (s.profit || 0), 0) / signalsWithProfit.length 
      : 0;
    
    // Obter 5 resultados mais recentes (ordenados por data)
    const recentSignals = [...symbolSignals]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    
    const recentResults = recentSignals.map(s => {
      if (s.result === 1 || s.result === "win" || s.result === "WINNER") return "win";
      if (s.result === "partial" || s.result === "PARTIAL") return "partial";
      if (s.result === 0 || s.result === "loss" || s.result === "LOSER") return "loss";
      return "missed";
    });
    
    // Contar atingimento de targets
    const tp1Hit = symbolSignals.filter(s => 
      s.targets?.some(t => t.level === 1 && t.hit) || 
      (s.tp1 !== undefined && s.result !== 0 && s.result !== "loss" && s.result !== "LOSER")
    ).length;
    
    const tp2Hit = symbolSignals.filter(s => 
      s.targets?.some(t => t.level === 2 && t.hit) || 
      (s.tp2 !== undefined && s.result !== 0 && s.result !== "loss" && s.result !== "LOSER")
    ).length;
    
    const tp3Hit = symbolSignals.filter(s => 
      s.targets?.some(t => t.level === 3 && t.hit) || 
      (s.tp3 !== undefined && s.result !== 0 && s.result !== "loss" && s.result !== "LOSER")
    ).length;
    
    setHistoricalData({
      successRate,
      totalSignals: symbolSignals.length,
      wins,
      partials,
      losses,
      missed,
      avgProfit,
      recentResults,
      tp1Hit,
      tp2Hit,
      tp3Hit
    });
  }, [signal]);

  if (!signal) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Resumo de Histórico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Selecione um sinal para ver seu histórico
          </p>
        </CardContent>
      </Card>
    );
  }

  const isSuccessful = historicalData.successRate > 50;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5" />
          Resumo de Histórico: {signal.symbol}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Taxa de Sucesso</span>
              <Badge
                variant={isSuccessful ? "success" : "destructive"}
                className="flex items-center gap-1"
              >
                {isSuccessful ? 
                  <CheckCircle2 className="h-3 w-3" /> : 
                  <XCircle className="h-3 w-3" />
                }
                {historicalData.successRate.toFixed(1)}%
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Performance</span>
              <Badge
                variant={isSuccessful ? "outline" : "outline"}
                className="flex items-center gap-1"
              >
                {isSuccessful ? 
                  <TrendingUp className="h-3 w-3 text-green-500" /> : 
                  <TrendingDown className="h-3 w-3 text-red-500" />
                }
                {isSuccessful ? "Positiva" : "Negativa"}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Últimos Sinais</span>
              <span className="text-sm font-medium">
                {historicalData.totalSignals} sinais
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Lucro Médio</span>
              <Badge
                variant="outline"
                className={`${
                  historicalData.avgProfit >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {historicalData.avgProfit >= 0 ? "+" : ""}{historicalData.avgProfit.toFixed(2)}%
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Atingimento de Targets</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-100 dark:border-green-800/30">
              <div className="text-xs text-muted-foreground mb-1">TP1</div>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-green-100 dark:bg-green-900/40">
                  {historicalData.tp1Hit}
                </Badge>
                <Target className="h-4 w-4 text-green-500" />
              </div>
            </div>
            
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-100 dark:border-green-800/30">
              <div className="text-xs text-muted-foreground mb-1">TP2</div>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-green-100 dark:bg-green-900/40">
                  {historicalData.tp2Hit}
                </Badge>
                <Target className="h-4 w-4 text-green-500" />
              </div>
            </div>
            
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-100 dark:border-green-800/30">
              <div className="text-xs text-muted-foreground mb-1">TP3</div>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-green-100 dark:bg-green-900/40">
                  {historicalData.tp3Hit}
                </Badge>
                <Target className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Resultados Recentes</h4>
          <div className="flex gap-1">
            {historicalData.recentResults.length > 0 ? (
              historicalData.recentResults.map((result, i) => {
                let bgColor = "";
                let Icon = CheckCircle2;
                
                switch(result) {
                  case "win":
                    bgColor = "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
                    Icon = CheckCircle2;
                    break;
                  case "partial":
                    bgColor = "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400";
                    Icon = Target;
                    break;
                  case "loss":
                    bgColor = "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
                    Icon = XCircle;
                    break;
                  case "missed":
                    bgColor = "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400";
                    Icon = Ban;
                    break;
                }
                
                return (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${bgColor}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground">Sem resultados recentes</p>
            )}
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-4 gap-2">
          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-100 dark:border-green-800/30">
            <div className="text-xs text-muted-foreground text-center mb-1">Vencedor</div>
            <div className="text-center font-semibold text-green-600 dark:text-green-400">
              {historicalData.wins}
            </div>
          </div>
          
          <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-100 dark:border-amber-800/30">
            <div className="text-xs text-muted-foreground text-center mb-1">Parcial</div>
            <div className="text-center font-semibold text-amber-600 dark:text-amber-400">
              {historicalData.partials}
            </div>
          </div>
          
          <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-100 dark:border-red-800/30">
            <div className="text-xs text-muted-foreground text-center mb-1">Perdedor</div>
            <div className="text-center font-semibold text-red-600 dark:text-red-400">
              {historicalData.losses}
            </div>
          </div>
          
          <div className="p-2 bg-gray-50 dark:bg-gray-800/20 rounded-md border border-gray-100 dark:border-gray-700/30">
            <div className="text-xs text-muted-foreground text-center mb-1">Falso</div>
            <div className="text-center font-semibold text-gray-600 dark:text-gray-400">
              {historicalData.missed}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
