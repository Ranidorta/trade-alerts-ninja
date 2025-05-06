
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSignalsHistory, evaluateSingleSignal, evaluateMultipleSignals } from "@/lib/signalsApi";
import { TradingSignal } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Filter, Download, Check, ChevronDown } from "lucide-react";
import SignalHistoryTable from "@/components/signals/SignalHistoryTable";
import PageHeader from "@/components/signals/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
    queryFn: () => fetchSignalsHistory(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });

  // Handle API connection errors
  useEffect(() => {
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

  // Verify a single signal
  const handleVerifySingleSignal = async (signalId: string) => {
    setVerifyingSignal(signalId);
    try {
      const result = await evaluateSingleSignal(signalId);
      if (result) {
        toast({
          title: "Sinal avaliado com sucesso",
          description: `Resultado: ${result.result}`,
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
      // Get signals that need evaluation
      const signalsToEvaluate = signals.filter(s => 
        !s.verifiedAt || 
        !s.result || 
        s.status !== 'COMPLETED'
      );

      if (signalsToEvaluate.length === 0) {
        toast({
          title: "Sinais já avaliados",
          description: "Todos os sinais já foram avaliados.",
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

  return (
    <div className="container py-8">
      <PageHeader 
        title="Histórico de Sinais" 
        description="Visualize e analise o histórico completo de sinais de trading"
      />

      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col space-y-2">
              <label htmlFor="symbolFilter" className="text-sm font-medium">
                Filtrar por Ativo
              </label>
              <div className="flex space-x-2">
                <Input
                  id="symbolFilter"
                  placeholder="Ex: BTCUSDT"
                  value={filterSymbol}
                  onChange={(e) => setFilterSymbol(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label htmlFor="resultFilter" className="text-sm font-medium">
                Filtrar por Resultado
              </label>
              <Select 
                value={filterResult} 
                onValueChange={setFilterResult}
              >
                <SelectTrigger id="resultFilter" className="w-full">
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
              <Button variant="ghost" onClick={refetch}>
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
          <Button 
            variant="outline"
            onClick={handleEvaluateAllSignals}
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
                Avaliar Todos
              </>
            )}
          </Button>
          <Button onClick={handleExportToCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

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
              <Button variant="outline" onClick={refetch} className="mt-4">
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
                  <h3 className="text-lg font-semibold mb-4">Sinais por Ativo</h3>
                  <Accordion type="single" collapsible>
                    {(() => {
                      // Group signals by symbol
                      const symbolGroups = signals.reduce((acc: Record<string, TradingSignal[]>, signal) => {
                        const symbol = signal.symbol;
                        if (!acc[symbol]) acc[symbol] = [];
                        acc[symbol].push(signal);
                        return acc;
                      }, {});
                      
                      // Sort by number of signals
                      return Object.entries(symbolGroups)
                        .sort(([, a], [, b]) => b.length - a.length)
                        .map(([symbol, symbolSignals], index) => {
                          // Calculate win rate for this symbol
                          const totalEvaluated = symbolSignals.filter(s => 
                            s.result && 
                            s.result !== 'FALSE' && 
                            s.result !== 'false'
                          ).length;
                          
                          const winners = symbolSignals.filter(s => 
                            s.result === 'WINNER' || 
                            s.result === 'win' || 
                            s.result === 1 ||
                            s.result === 'PARTIAL' || 
                            s.result === 'partial'
                          ).length;
                          
                          const winRate = totalEvaluated > 0 ? (winners / totalEvaluated) * 100 : 0;
                          
                          return (
                            <AccordionItem value={`symbol-${index}`} key={`symbol-${index}`}>
                              <AccordionTrigger>
                                <div className="flex justify-between w-full pr-4">
                                  <span>{symbol}</span>
                                  <span className="text-muted-foreground">
                                    {symbolSignals.length} sinais ({winRate.toFixed(1)}% win)
                                  </span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="pl-4 space-y-2">
                                  <div className="flex justify-between">
                                    <span>Total:</span>
                                    <span>{symbolSignals.length}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Vencedores:</span>
                                    <span className="text-green-600">{
                                      symbolSignals.filter(s => 
                                        s.result === 'WINNER' || 
                                        s.result === 'win' || 
                                        s.result === 1
                                      ).length
                                    }</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Perdedores:</span>
                                    <span className="text-red-600">{
                                      symbolSignals.filter(s => 
                                        s.result === 'LOSER' || 
                                        s.result === 'loss' || 
                                        s.result === 0
                                      ).length
                                    }</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Parciais:</span>
                                    <span className="text-amber-600">{
                                      symbolSignals.filter(s => 
                                        s.result === 'PARTIAL' || 
                                        s.result === 'partial'
                                      ).length
                                    }</span>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        });
                    })()}
                  </Accordion>
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
