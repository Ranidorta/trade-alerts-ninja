import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Ban, Target } from "lucide-react";
import { TradingSignal } from "@/lib/types";

interface SignalsSummaryProps {
  signals: TradingSignal[];
  showDetails?: boolean;
}

const SignalsSummary = ({ signals, showDetails = false }: SignalsSummaryProps) => {
  // Calcula estatísticas de resumo
  const summary = React.useMemo(() => {
    const vencedorSignals = signals.filter(signal => 
      signal.result === "WINNER" || signal.result === "win" ||
      (typeof signal.result === "number" && signal.result === 1)
    );
    
    const parcialSignals = signals.filter(signal => 
      signal.result === "PARTIAL" || signal.result === "partial"
    );
    
    const perdedorSignals = signals.filter(signal => 
      signal.result === "LOSER" || signal.result === "loss" ||
      (typeof signal.result === "number" && signal.result === 0)
    );
    
    const falsoSignals = signals.filter(signal => 
      signal.result === "FALSE" || signal.result === "missed" 
    );
    
    const pendingSignals = signals.filter(signal => 
      signal.result === undefined || 
      signal.status !== "COMPLETED"
    );
    
    const vencedorProfit = vencedorSignals.reduce((sum, signal) => sum + (signal.profit || 0), 0);
    const parcialProfit = parcialSignals.reduce((sum, signal) => sum + (signal.profit || 0), 0);
    const perdedorProfit = perdedorSignals.reduce((sum, signal) => sum + (signal.profit || 0), 0);
    
    const netProfit = vencedorProfit + parcialProfit + perdedorProfit;
    
    const completedSignals = vencedorSignals.length + parcialSignals.length + perdedorSignals.length + falsoSignals.length;
    const winRate = completedSignals > 0 ? 
      ((vencedorSignals.length + parcialSignals.length) / completedSignals * 100).toFixed(2) : "0.00";
    
    return {
      totalSignals: signals.length,
      vencedorSignals: vencedorSignals.length,
      parcialSignals: parcialSignals.length,
      perdedorSignals: perdedorSignals.length,
      falsoSignals: falsoSignals.length,
      pendingSignals: pendingSignals.length,
      vencedorProfit: vencedorProfit.toFixed(2),
      parcialProfit: parcialProfit.toFixed(2),
      perdedorProfit: perdedorProfit.toFixed(2),
      netProfit: netProfit.toFixed(2),
      winRate
    };
  }, [signals]);

  return (
    <div className="space-y-6">
      {/* Sumário principal de sinais */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
        
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center text-green-700 dark:text-green-400">
              <CheckCircle className="h-4 w-4 mr-2" />
              Vencedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{summary.vencedorSignals}</p>
            <p className="text-sm text-green-700 dark:text-green-400">Lucro: +{summary.vencedorProfit}%</p>
          </CardContent>
        </Card>
        
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center text-amber-700 dark:text-amber-400">
              <Target className="h-4 w-4 mr-2" />
              Parcial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{summary.parcialSignals}</p>
            <p className="text-sm text-amber-700 dark:text-amber-400">Lucro: +{summary.parcialProfit}%</p>
          </CardContent>
        </Card>
        
        <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center text-red-700 dark:text-red-400">
              <TrendingDown className="h-4 w-4 mr-2" />
              Perdedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{summary.perdedorSignals}</p>
            <p className="text-sm text-red-700 dark:text-red-400">Perda: {summary.perdedorProfit}%</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-50 dark:bg-gray-800/20 border-gray-200 dark:border-gray-700/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center text-gray-700 dark:text-gray-400">
              <Ban className="h-4 w-4 mr-2" />
              Falso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{summary.falsoSignals}</p>
            <p className="text-sm text-gray-700 dark:text-gray-400">Sinais inválidos</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Taxa de acerto e resultado líquido */}
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Desempenho Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Taxa de Acerto</p>
              <p className="text-3xl font-bold">
                <span className={
                  parseFloat(summary.winRate) >= 60 ? 'text-green-600 dark:text-green-400' : 
                  parseFloat(summary.winRate) >= 45 ? 'text-amber-600 dark:text-amber-400' : 
                  'text-red-600 dark:text-red-400'
                }>
                  {summary.winRate}%
                </span>
              </p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground mb-1">Resultado Líquido</p>
              <p className="text-3xl font-bold">
                <span className={Number(summary.netProfit) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {Number(summary.netProfit) >= 0 ? '+' : ''}{summary.netProfit}%
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {showDetails && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Detalhes dos Alvos</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border px-4 py-2 text-left">Tipo</th>
                  <th className="border px-4 py-2 text-left">Quantidade</th>
                  <th className="border px-4 py-2 text-left">TP1 atingido</th>
                  <th className="border px-4 py-2 text-left">TP2 atingido</th>
                  <th className="border px-4 py-2 text-left">TP3 atingido</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-4 py-2">
                    <span className="flex items-center">
                      <span className="h-3 w-3 rounded-full bg-green-500 mr-2"></span>
                      Vencedor
                    </span>
                  </td>
                  <td className="border px-4 py-2">{summary.vencedorSignals}</td>
                  <td className="border px-4 py-2">
                    {signals
                      .filter(s => s.result === "WINNER" || s.result === "win" || (typeof s.result === "number" && s.result === 1))
                      .filter(s => s.targets?.some(t => t.level === 1 && t.hit))
                      .length}
                  </td>
                  <td className="border px-4 py-2">
                    {signals
                      .filter(s => s.result === "WINNER" || s.result === "win" || (typeof s.result === "number" && s.result === 1))
                      .filter(s => s.targets?.some(t => t.level === 2 && t.hit))
                      .length}
                  </td>
                  <td className="border px-4 py-2">
                    {signals
                      .filter(s => s.result === "WINNER" || s.result === "win" || (typeof s.result === "number" && s.result === 1))
                      .filter(s => s.targets?.some(t => t.level === 3 && t.hit))
                      .length}
                  </td>
                </tr>
                <tr>
                  <td className="border px-4 py-2">
                    <span className="flex items-center">
                      <span className="h-3 w-3 rounded-full bg-amber-500 mr-2"></span>
                      Parcial
                    </span>
                  </td>
                  <td className="border px-4 py-2">{summary.parcialSignals}</td>
                  <td className="border px-4 py-2">
                    {signals
                      .filter(s => s.result === "PARTIAL" || s.result === "partial")
                      .filter(s => s.targets?.some(t => t.level === 1 && t.hit))
                      .length}
                  </td>
                  <td className="border px-4 py-2">
                    {signals
                      .filter(s => s.result === "PARTIAL" || s.result === "partial")
                      .filter(s => s.targets?.some(t => t.level === 2 && t.hit))
                      .length}
                  </td>
                  <td className="border px-4 py-2">
                    {signals
                      .filter(s => s.result === "PARTIAL" || s.result === "partial")
                      .filter(s => s.targets?.some(t => t.level === 3 && t.hit))
                      .length}
                  </td>
                </tr>
                <tr>
                  <td className="border px-4 py-2">
                    <span className="flex items-center">
                      <span className="h-3 w-3 rounded-full bg-red-500 mr-2"></span>
                      Perdedor
                    </span>
                  </td>
                  <td className="border px-4 py-2">{summary.perdedorSignals}</td>
                  <td className="border px-4 py-2">0</td>
                  <td className="border px-4 py-2">0</td>
                  <td className="border px-4 py-2">0</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignalsSummary;
