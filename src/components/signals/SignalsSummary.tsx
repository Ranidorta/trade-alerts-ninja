
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
import { TradingSignal } from "@/lib/types";

interface SignalsSummaryProps {
  signals: TradingSignal[];
  showDetails?: boolean;
}

const SignalsSummary = ({ signals, showDetails = false }: SignalsSummaryProps) => {
  // Calculate summary statistics
  const summary = React.useMemo(() => {
    const profitSignals = signals.filter(signal => 
      (signal.result === 1 || signal.result === "win" || signal.result === "partial") && 
      (signal.profit !== undefined && signal.profit > 0)
    );
    const lossSignals = signals.filter(signal => 
      (signal.result === 0 || signal.result === "loss") && 
      (signal.profit !== undefined && signal.profit < 0)
    );
    const pendingSignals = signals.filter(signal => 
      signal.result === undefined || signal.status !== "COMPLETED"
    );
    
    const totalProfit = profitSignals.reduce((sum, signal) => sum + (signal.profit || 0), 0);
    const totalLoss = lossSignals.reduce((sum, signal) => sum + (signal.profit || 0), 0);
    const netProfit = totalProfit + totalLoss;
    
    return {
      totalSignals: signals.length,
      profitSignals: profitSignals.length,
      lossSignals: lossSignals.length,
      pendingSignals: pendingSignals.length,
      totalProfit: totalProfit.toFixed(2),
      totalLoss: totalLoss.toFixed(2),
      netProfit: netProfit.toFixed(2),
      winRate: signals.length > 0 ? ((profitSignals.length / (profitSignals.length + lossSignals.length)) * 100).toFixed(2) : "0.00"
    };
  }, [signals]);

  // Parse winRate to number for comparison
  const winRateNumber = parseFloat(summary.winRate);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Total de Sinais</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{summary.totalSignals}</p>
          <p className="text-sm text-muted-foreground">
            {summary.pendingSignals > 0 ? 
              `${summary.pendingSignals} pendentes` : 
              "Todos os sinais avaliados"}
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center">
            <TrendingUp className="h-4 w-4 mr-2 text-crypto-green" />
            Sinais Lucrativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-crypto-green">{summary.profitSignals}</p>
          <p className="text-sm text-muted-foreground">Lucro total: +{summary.totalProfit}%</p>
        </CardContent>
      </Card>
      
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center">
            <TrendingDown className="h-4 w-4 mr-2 text-crypto-red" />
            Sinais com Perda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-crypto-red">{summary.lossSignals}</p>
          <p className="text-sm text-muted-foreground">Perda total: {summary.totalLoss}%</p>
        </CardContent>
      </Card>
      
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Taxa de Acerto</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">
            <span className={winRateNumber >= 60 ? 'text-crypto-green' : winRateNumber >= 45 ? 'text-amber-500' : 'text-crypto-red'}>
              {summary.winRate}%
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            Resultado líquido: 
            <span className={Number(summary.netProfit) >= 0 ? ' text-crypto-green' : ' text-crypto-red'}>
              {" "}{Number(summary.netProfit) >= 0 ? '+' : ''}{summary.netProfit}%
            </span>
          </p>
        </CardContent>
      </Card>

      {showDetails && (
        <>
          <Card className="bg-card md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Análise de Resultados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    <span>Vencedores:</span>
                  </div>
                  <span className="font-medium">{summary.profitSignals} ({((summary.profitSignals / summary.totalSignals) * 100).toFixed(1)}%)</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <TrendingDown className="h-4 w-4 mr-2 text-red-500" />
                    <span>Perdedores:</span>
                  </div>
                  <span className="font-medium">{summary.lossSignals} ({((summary.lossSignals / summary.totalSignals) * 100).toFixed(1)}%)</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                    <span>Pendentes:</span>
                  </div>
                  <span className="font-medium">{summary.pendingSignals} ({((summary.pendingSignals / summary.totalSignals) * 100).toFixed(1)}%)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default SignalsSummary;
