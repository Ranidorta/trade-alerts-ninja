
import { useEffect, useState } from "react";
import { TradingSignal } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, TrendingUp, TrendingDown, History, BarChart3 } from "lucide-react";
import { getSignalHistory } from "@/lib/signal-storage";

interface SignalHistorySummaryProps {
  signal: TradingSignal | null;
}

export default function SignalHistorySummary({ signal }: SignalHistorySummaryProps) {
  const [historicalData, setHistoricalData] = useState<{
    successRate: number;
    totalSignals: number;
    wins: number;
    losses: number;
    avgProfit: number;
    recentResults: boolean[];
  }>({
    successRate: 0,
    totalSignals: 0,
    wins: 0,
    losses: 0,
    avgProfit: 0,
    recentResults: []
  });

  useEffect(() => {
    if (!signal) return;
    
    // Obter todos os sinais para este símbolo
    const allSignals = getSignalHistory();
    const symbolSignals = allSignals.filter(s => 
      (s.symbol === signal.symbol || s.pair === signal.symbol) && 
      (s.result === 1 || s.result === 0 || s.result === "win" || s.result === "loss" || s.result === "partial")
    );
    
    if (symbolSignals.length === 0) return;
    
    // Calcular métricas
    const wins = symbolSignals.filter(s => 
      s.result === 1 || s.result === "win" || s.result === "partial"
    ).length;
    
    const losses = symbolSignals.filter(s => 
      s.result === 0 || s.result === "loss"
    ).length;
    
    const successRate = symbolSignals.length > 0 ? (wins / symbolSignals.length) * 100 : 0;
    
    // Calcular lucro médio
    const signalsWithProfit = symbolSignals.filter(s => typeof s.profit === 'number');
    const avgProfit = signalsWithProfit.length > 0 
      ? signalsWithProfit.reduce((sum, s) => sum + (s.profit || 0), 0) / signalsWithProfit.length 
      : 0;
    
    // Obter 5 resultados mais recentes (ordenados por data)
    const recentSignals = [...symbolSignals]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    
    const recentResults = recentSignals.map(s => 
      s.result === 1 || s.result === "win" || s.result === "partial"
    );
    
    setHistoricalData({
      successRate,
      totalSignals: symbolSignals.length,
      wins,
      losses,
      avgProfit,
      recentResults
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
          <h4 className="text-sm font-medium mb-2">Resultados Recentes</h4>
          <div className="flex gap-1">
            {historicalData.recentResults.length > 0 ? (
              historicalData.recentResults.map((win, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    win ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                  }`}
                >
                  {win ? 
                    <CheckCircle2 className="h-4 w-4" /> : 
                    <XCircle className="h-4 w-4" />
                  }
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Sem resultados recentes</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
