import { useState, useEffect } from "react";
import { TradingSignal } from "@/lib/types";
import { Calendar, TrendingUp, TrendingDown, Target, Award, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const ClassicSignalsHistory = () => {
  const [classicHistory, setClassicHistory] = useState<TradingSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Performance metrics for classic signals only
  const [metrics, setMetrics] = useState({
    totalSignals: 0,
    winningSignals: 0,
    losingSignals: 0,
    winRate: 0,
    avgConfidence: 0
  });

  useEffect(() => {
    loadClassicHistory();
  }, []);

  const loadClassicHistory = async () => {
    setIsLoading(true);
    try {
      // Load classic signals from localStorage
      const storedHistory = localStorage.getItem('classic_signals_history');
      if (storedHistory) {
        const history: TradingSignal[] = JSON.parse(storedHistory);
        
        // Filter only classic strategy signals
        const classicSignals = history.filter(signal => 
          signal.strategy?.includes('classic') || signal.strategy === 'classic_ai'
        );
        
        setClassicHistory(classicSignals);
        calculateMetrics(classicSignals);
      }
    } catch (error) {
      console.error('Error loading classic history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMetrics = (signals: TradingSignal[]) => {
    if (signals.length === 0) {
      setMetrics({
        totalSignals: 0,
        winningSignals: 0,
        losingSignals: 0,
        winRate: 0,
        avgConfidence: 0
      });
      return;
    }

    const completedSignals = signals.filter(s => s.result === 'WINNER' || s.result === 'LOSER');
    const winningSignals = signals.filter(s => s.result === 'WINNER').length;
    const losingSignals = signals.filter(s => s.result === 'LOSER').length;
    const winRate = completedSignals.length > 0 ? (winningSignals / completedSignals.length) * 100 : 0;
    
    const totalConfidence = signals.reduce((sum, signal) => sum + (signal.confidence || 0), 0);
    const avgConfidence = signals.length > 0 ? (totalConfidence / signals.length) * 100 : 0;

    setMetrics({
      totalSignals: signals.length,
      winningSignals,
      losingSignals,
      winRate,
      avgConfidence
    });
  };

  const getSignalStatusColor = (signal: TradingSignal) => {
    if (signal.result === 'WINNER') return 'text-green-600 bg-green-50 border-green-200';
    if (signal.result === 'LOSER') return 'text-red-600 bg-red-50 border-red-200';
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  };

  const getSignalStatusIcon = (signal: TradingSignal) => {
    if (signal.result === 'WINNER') return <TrendingUp className="h-4 w-4" />;
    if (signal.result === 'LOSER') return <TrendingDown className="h-4 w-4" />;
    return <Target className="h-4 w-4" />;
  };

  const getSignalStatusText = (signal: TradingSignal) => {
    if (signal.result === 'WINNER') return 'Vencedor';
    if (signal.result === 'LOSER') return 'Perdedor';
    return 'Pendente';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Histórico Classic</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Performance e histórico completo dos sinais Classic AI
        </p>
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Sinais</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSignals}</div>
            <p className="text-xs text-muted-foreground">Sinais Classic gerados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Acerto</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics.winRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.winningSignals} vitórias de {metrics.winningSignals + metrics.losingSignals} finalizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencedores</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.winningSignals}</div>
            <p className="text-xs text-muted-foreground">Sinais com lucro</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confiança Média</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics.avgConfidence.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Nível médio de confiança</p>
          </CardContent>
        </Card>
      </div>

      {/* Signals History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Histórico de Sinais Classic
          </CardTitle>
          <CardDescription>
            Todos os sinais Classic AI gerados e seus resultados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {classicHistory.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-2">
                Nenhum sinal classic encontrado
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                Gere alguns sinais classic para ver o histórico aqui
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {classicHistory.map((signal) => (
                <div
                  key={signal.id}
                  className={cn(
                    "p-4 rounded-lg border transition-all",
                    signal.direction === 'BUY' 
                      ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                      : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                  )}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm",
                        signal.direction === 'BUY' ? "bg-blue-500" : "bg-red-500"
                      )}>
                        {signal.direction === 'BUY' ? 'B' : 'S'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg">
                          {signal.direction} {signal.symbol}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {formatDistanceToNow(new Date(signal.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={getSignalStatusColor(signal)}>
                        {getSignalStatusIcon(signal)}
                        <span className="ml-1">{getSignalStatusText(signal)}</span>
                      </Badge>
                      <Badge variant="outline">
                        {((signal.confidence || 0) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Entrada:</span>
                      <div className="font-medium">
                        {signal.entryPrice || signal.entry_price}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Stop Loss:</span>
                      <div className="font-medium text-red-600">
                        {signal.stopLoss}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">TP1:</span>
                      <div className="font-medium text-green-600">
                        {signal.tp1 || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Estratégia:</span>
                      <div className="font-medium">
                        {signal.strategy || 'classic_ai'}
                      </div>
                    </div>
                  </div>

                  {signal.analysis && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {signal.analysis}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassicSignalsHistory;