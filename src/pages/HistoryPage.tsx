import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSignalsHistory, evaluateSingleSignal, evaluateMultipleSignals, canEvaluateSignal } from "@/lib/signalsApi";
import { TradingSignal } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Filter, Download, Check, Search, Info, Clock } from "lucide-react";
import SignalHistoryTable from "@/components/signals/SignalHistoryTable";
import PageHeader from "@/components/signals/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getSignalHistory } from "@/lib/signal-storage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const HistoryPage = () => {
  const { toast } = useToast();
  const [filterSymbol, setFilterSymbol] = useState<string>("");
  const [filterResult, setFilterResult] = useState<string>("");
  const [isEvaluatingAll, setIsEvaluatingAll] = useState(false);
  const [verifyingSignal, setVerifyingSignal] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ symbol?: string; result?: string }>({});

  // Fetch signals history with filters
  const {
    data: signals,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ["signalsHistory", filters],
    queryFn: async () => {
      try {
        // Try to fetch from API first
        const apiSignals = await fetchSignalsHistory(filters);
        return apiSignals;
      } catch (apiError) {
        console.error("API error, using local signals:", apiError);
        
        // Fall back to local storage if API fails
        const localSignals = getSignalHistory();
        
        // Apply filters to local signals
        if (filters.symbol || filters.result) {
          return localSignals.filter(signal => {
            const matchesSymbol = !filters.symbol || signal.symbol === filters.symbol;
            
            const matchesResult = !filters.result || 
              (filters.result === 'win' && (signal.result === 'win' || signal.result === 1 || signal.result === 'WINNER')) ||
              (filters.result === 'loss' && (signal.result === 'loss' || signal.result === 0 || signal.result === 'LOSER')) ||
              (filters.result === 'partial' && signal.result === 'partial');
            
            return matchesSymbol && matchesResult;
          });
        }
        
        return localSignals;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });

  // Handle API connection errors
  React.useEffect(() => {
    if (isError) {
      console.error("Error fetching signals history:", error);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar o histórico de sinais. Usando dados em cache.",
        variant: "destructive"
      });
    }
  }, [isError, error, toast]);

  // Apply filters
  const handleApplyFilters = () => {
    const newFilters: { symbol?: string; result?: string } = {};
    if (filterSymbol) newFilters.symbol = filterSymbol;
    if (filterResult) newFilters.result = filterResult;
    setFilters(newFilters);
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilterSymbol("");
    setFilterResult("");
    setFilters({});
  };

  // Handler for manual refetch
  const handleRefetch = () => {
    refetch();
  };

  // Verify a single signal
  const handleVerifySingleSignal = async (signalId: string) => {
    setVerifyingSignal(signalId);
    try {
      // Find the signal in our data
      const signal = signals?.find(s => s.id === signalId);
      
      if (!signal) {
        toast({
          title: "Sinal não encontrado",
          description: "Não foi possível encontrar o sinal para avaliação.",
          variant: "destructive"
        });
        return;
      }
      
      // Check if the signal can be evaluated
      const { canEvaluate, reason } = canEvaluateSignal(signal);
      
      if (!canEvaluate) {
        toast({
          title: "Não é possível avaliar este sinal",
          description: reason,
          variant: "destructive"
        });
        return;
      }
      
      // Proceed with evaluation
      const result = await evaluateSingleSignal(signalId);
      if (result) {
        toast({
          title: "Sinal avaliado com sucesso",
          description: `Resultado: ${result.result === 'win' ? 'Vencedor' : 
                                    result.result === 'loss' ? 'Perdedor' : 
                                    result.result === 'partial' ? 'Parcial' : 
                                    'Falso'}`,
        });
        refetch(); // Refetch signals after evaluation
      } else {
        toast({
          title: "Avaliação inconclusiva",
          description: "Não foi possível determinar o resultado do sinal.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error verifying signal:", error);
      toast({
        title: "Erro na avaliação",
        description: "Não foi possível avaliar o sinal. Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setVerifyingSignal(null);
    }
  };

  // Evaluate all signals that need evaluation
  const handleEvaluateAllSignals = async () => {
    if (!signals || signals.length === 0) {
      toast({
        title: "Nenhum sinal disponível",
        description: "Não há sinais para avaliar.",
        variant: "default"
      });
      return;
    }

    setIsEvaluatingAll(true);
    try {
      // Get signals that can be evaluated
      const signalsToEvaluate = signals.filter(s => {
        const { canEvaluate } = canEvaluateSignal(s);
        return canEvaluate;
      });

      if (signalsToEvaluate.length === 0) {
        toast({
          title: "Nenhum sinal disponível para avaliação",
          description: "Não há sinais que possam ser avaliados neste momento.",
          variant: "default"
        });
        setIsEvaluatingAll(false);
        return;
      }

      toast({
        title: "Avaliando sinais",
        description: `Avaliando ${signalsToEvaluate.length} sinais...`,
      });

      const updatedSignals = await evaluateMultipleSignals(signals);
      refetch(); // Refetch all signals after evaluation
      
      toast({
        title: "Avaliação concluída",
        description: `${signalsToEvaluate.length} sinais foram avaliados.`,
      });
    } catch (error) {
      console.error("Error evaluating all signals:", error);
      toast({
        title: "Erro na avaliação em lote",
        description: "Ocorreu um erro ao avaliar os sinais. Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsEvaluatingAll(false);
    }
  };

  // Export signals to CSV
  const handleExportToCSV = () => {
    if (!signals || signals.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Não há sinais para exportar para CSV.",
        variant: "default"
      });
      return;
    }

    try {
      // Create CSV headers
      const headers = [
        "ID",
        "Symbol",
        "Direction",
        "Entry Price",
        "Stop Loss",
        "TP1",
        "TP2", 
        "TP3",
        "Result",
        "Status",
        "Created At",
        "Verified At"
      ];

      // Convert signals to CSV rows
      const rows = signals.map(signal => [
        signal.id,
        signal.symbol,
        signal.direction,
        signal.entryPrice,
        signal.stopLoss,
        signal.tp1 || (signal.targets && signal.targets[0]?.price),
        signal.tp2 || (signal.targets && signal.targets[1]?.price),
        signal.tp3 || (signal.targets && signal.targets[2]?.price),
        signal.result,
        signal.status,
        signal.createdAt,
        signal.verifiedAt
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `signals_history_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Exportação concluída",
        description: `${signals.length} sinais exportados para CSV.`,
      });
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os sinais para CSV.",
        variant: "destructive"
      });
    }
  };

  // Get unique symbols for filter dropdown
  const uniqueSymbols = React.useMemo(() => {
    if (!signals) return [];
    
    const symbolsSet = new Set<string>();
    signals.forEach(signal => {
      if (signal.symbol) {
        symbolsSet.add(signal.symbol);
      }
    });
    
    return Array.from(symbolsSet).sort();
  }, [signals]);

  // Count signals that are eligible for evaluation
  const signalsReadyForEvaluation = React.useMemo(() => {
    if (!signals) return 0;
    return signals.filter(s => {
      const { canEvaluate } = canEvaluateSignal(s);
      return canEvaluate;
    }).length;
  }, [signals]);

  // Count signals waiting for the 15-minute cooldown
  const signalsWaiting = React.useMemo(() => {
    if (!signals) return 0;
    
    return signals.filter(s => {
      if (s.verifiedAt || s.result) return false;
      
      // Check if signal is newer than 15 minutes
      if (s.createdAt) {
        const createdAt = new Date(s.createdAt);
        const now = new Date();
        const fifteenMinutesInMs = 15 * 60 * 1000;
        return now.getTime() - createdAt.getTime() < fifteenMinutesInMs;
      }
      
      return false;
    }).length;
  }, [signals]);

  return (
    <div className="container py-8">
      <PageHeader 
        title="Histórico de Sinais" 
        description="Visualize e analise o histórico completo de sinais de trading"
      />
      
      <Alert className="mb-4">
        <Info className="h-4 w-4" />
        <AlertTitle>Regras de Avaliação de Sinais</AlertTitle>
        <AlertDescription>
          Os sinais só podem ser avaliados uma vez. Sinais novos precisam aguardar 15 minutos antes de poderem ser avaliados.
        </AlertDescription>
      </Alert>

      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col space-y-2">
              <label htmlFor="symbolFilter" className="text-sm font-medium">
                Filtrar por Ativo
              </label>
              <Select value={filterSymbol} onValueChange={setFilterSymbol}>
                <SelectTrigger id="symbolFilter">
                  <SelectValue placeholder="Selecione um ativo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os ativos</SelectItem>
                  {uniqueSymbols.map(symbol => (
                    <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col space-y-2">
              <label htmlFor="resultFilter" className="text-sm font-medium">
                Filtrar por Resultado
              </label>
              <Select 
                value={filterResult} 
                onValueChange={setFilterResult}
              >
                <SelectTrigger id="resultFilter">
                  <SelectValue placeholder="Selecione um resultado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="win">Vencedor</SelectItem>
                  <SelectItem value="loss">Perdedor</SelectItem>
                  <SelectItem value="partial">Parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end space-x-2">
              <Button variant="outline" onClick={handleApplyFilters} className="flex-1">
                <Filter className="mr-2 h-4 w-4" />
                Aplicar Filtros
              </Button>
              <Button variant="secondary" onClick={handleClearFilters}>
                Limpar
              </Button>
              <Button variant="ghost" onClick={() => handleRefetch()}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">
          {isLoading ? "Carregando sinais..." : `${signals?.length || 0} sinais encontrados`}
        </h2>
        <div className="flex space-x-2">
          {signalsReadyForEvaluation > 0 && (
            <Button 
              variant="outline"
              onClick={() => handleEvaluateAllSignals()}
              disabled={isEvaluatingAll || isLoading}
              className="gap-2"
            >
              {isEvaluatingAll ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Avaliando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Avaliar Todos ({signalsReadyForEvaluation})
                </>
              )}
            </Button>
          )}
          <Button onClick={handleExportToCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>
      
      {signalsWaiting > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <Clock className="h-4 w-4 inline mr-1" />
            {signalsWaiting} sinais novos estão aguardando o período de 15 minutos antes de poderem ser avaliados.
          </p>
        </div>
      )}

      <Tabs defaultValue="table">
        <TabsList className="mb-4">
          <TabsTrigger value="table">Tabela</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : signals && signals.length > 0 ? (
            <SignalHistoryTable 
              signals={signals} 
              onVerifySingleSignal={handleVerifySingleSignal}
              onEvaluateAllSignals={handleEvaluateAllSignals}
            />
          ) : (
            <div className="text-center py-12 border rounded-md">
              <p className="text-lg text-muted-foreground">Nenhum sinal encontrado</p>
              <p className="text-sm text-muted-foreground mt-2">
                Tente remover os filtros ou atualize a página
              </p>
              <Button variant="outline" onClick={() => handleRefetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats">
          {signals && signals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Estatísticas Gerais</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total de sinais:</span>
                      <span className="font-medium">{signals.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sinais vencedores:</span>
                      <span className="font-medium text-green-600">
                        {signals.filter(s => 
                          s.result === 'WINNER' || 
                          s.result === 'win' || 
                          s.result === 1
                        ).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sinais perdedores:</span>
                      <span className="font-medium text-red-600">
                        {signals.filter(s => 
                          s.result === 'LOSER' || 
                          s.result === 'loss' || 
                          s.result === 0
                        ).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sinais parciais:</span>
                      <span className="font-medium text-amber-600">
                        {signals.filter(s => 
                          s.result === 'PARTIAL' || 
                          s.result === 'partial'
                        ).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sinais pendentes:</span>
                      <span className="font-medium">
                        {signals.filter(s => !s.result || s.result === 'FALSE' || s.result === 'false').length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Taxa de Sucesso</h3>
                  {(() => {
                    const totalEvaluated = signals.filter(s => 
                      s.result && 
                      s.result !== 'FALSE' && 
                      s.result !== 'false'
                    ).length;
                    
                    const winners = signals.filter(s => 
                      s.result === 'WINNER' || 
                      s.result === 'win' || 
                      s.result === 1 ||
                      s.result === 'PARTIAL' || 
                      s.result === 'partial'
                    ).length;
                    
                    const winRate = totalEvaluated > 0 ? (winners / totalEvaluated) * 100 : 0;
                    
                    return (
                      <div className="flex items-center justify-between">
                        <div className="text-3xl font-bold">
                          {winRate.toFixed(1)}%
                        </div>
                        <div 
                          className={`h-24 w-24 rounded-full border-8 flex items-center justify-center ${
                            winRate >= 50 ? 'border-green-500' : 'border-red-500'
                          }`}
                        >
                          <span className="text-2xl">
                            {winRate >= 50 ? '✓' : '✗'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Desempenho por Ativo</h3>
                  {(() => {
                    const symbolStats = new Map<string, {
                      total: number;
                      wins: number;
                      losses: number;
                      partials: number;
                    }>();
                    
                    signals.forEach(signal => {
                      const symbol = signal.symbol || 'unknown';
                      
                      if (!symbolStats.has(symbol)) {
                        symbolStats.set(symbol, {
                          total: 0,
                          wins: 0,
                          losses: 0,
                          partials: 0
                        });
                      }
                      
                      const stats = symbolStats.get(symbol)!;
                      stats.total++;
                      
                      if (signal.result === 'win' || signal.result === 'WINNER' || signal.result === 1) {
                        stats.wins++;
                      } else if (signal.result === 'loss' || signal.result === 'LOSER' || signal.result === 0) {
                        stats.losses++;
                      } else if (signal.result === 'partial' || signal.result === 'PARTIAL') {
                        stats.partials++;
                      }
                    });
                    
                    const sortedSymbols = Array.from(symbolStats.entries())
                      .sort((a, b) => b[1].total - a[1].total)
                      .slice(0, 10); // Top 10 symbols
                    
                    return (
                      <div className="space-y-4">
                        {sortedSymbols.map(([symbol, stats]) => {
                          const winRate = (stats.total > 0) 
                            ? ((stats.wins + stats.partials) / stats.total) * 100 
                            : 0;
                            
                          return (
                            <div key={symbol} className="border rounded-md p-3">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline">{symbol}</Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {stats.total} sinais
                                  </span>
                                </div>
                                <div>
                                  <span 
                                    className={`text-sm font-medium ${
                                      winRate >= 50 ? 'text-green-600' : 'text-red-600'
                                    }`}
                                  >
                                    {winRate.toFixed(1)}% taxa de sucesso
                                  </span>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-2 mt-2">
                                <div className="text-center">
                                  <div className="text-xs text-muted-foreground">Vitórias</div>
                                  <div className="text-green-600 font-medium">{stats.wins}</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs text-muted-foreground">Parciais</div>
                                  <div className="text-amber-600 font-medium">{stats.partials}</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs text-muted-foreground">Derrotas</div>
                                  <div className="text-red-600 font-medium">{stats.losses}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12 border rounded-md">
              <p className="text-lg text-muted-foreground">
                Nenhum dado disponível para análise
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Carregue sinais primeiro para visualizar estatísticas
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HistoryPage;
