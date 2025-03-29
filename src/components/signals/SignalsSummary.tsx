
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { TradingSignal } from "@/lib/types";

interface SignalsSummaryProps {
  signals: TradingSignal[];
}

const SignalsSummary = ({ signals }: SignalsSummaryProps) => {
  // Calculate summary statistics
  const summary = React.useMemo(() => {
    const profitSignals = signals.filter(signal => signal.profit !== undefined && signal.profit > 0);
    const lossSignals = signals.filter(signal => signal.profit !== undefined && signal.profit < 0);
    
    const totalProfit = profitSignals.reduce((sum, signal) => sum + (signal.profit || 0), 0);
    const totalLoss = lossSignals.reduce((sum, signal) => sum + (signal.profit || 0), 0);
    
    return {
      totalSignals: signals.length,
      profitSignals: profitSignals.length,
      lossSignals: lossSignals.length,
      totalProfit: totalProfit.toFixed(2),
      totalLoss: totalLoss.toFixed(2),
      winRate: signals.length > 0 ? ((profitSignals.length / signals.length) * 100).toFixed(2) : "0.00"
    };
  }, [signals]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Total de Sinais</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{summary.totalSignals}</p>
          <p className="text-sm text-muted-foreground">Sinais completados</p>
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
          <p className="text-3xl font-bold">{summary.winRate}%</p>
          <p className="text-sm text-muted-foreground">Taxa de sucesso</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignalsSummary;
