
import { TradingSignal } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, TrendingUp, TrendingDown, History, BarChart3 } from "lucide-react";

interface SignalHistorySummaryProps {
  signal: TradingSignal | null;
}

export default function SignalHistorySummary({ signal }: SignalHistorySummaryProps) {
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

  // Calculate success rate for the pair
  const successRate = Math.random() * 100; // In a real app, this would come from historical data
  const isSuccessful = successRate > 50;

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
                {successRate.toFixed(1)}%
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
                {Math.floor(Math.random() * 10) + 1} sinais
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Lucro Médio</span>
              <Badge
                variant="outline"
                className={`${
                  isSuccessful ? "text-green-500" : "text-red-500"
                }`}
              >
                {isSuccessful ? "+" : "-"}{(Math.random() * 5 + 1).toFixed(2)}%
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Resultados Recentes</h4>
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => {
              const win = Math.random() > 0.4;
              return (
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
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
