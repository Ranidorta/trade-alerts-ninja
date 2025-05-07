import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSignalsHistory } from "@/lib/signalsApi";
import { TradingSignal } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Filter, Download, Check, AlertCircle } from "lucide-react";
import RealTimeSignalTable from "@/components/signals/RealTimeSignalTable";
import PageHeader from "@/components/signals/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSignalEvaluation } from "@/hooks/useSignalEvaluation";

const HistoryPage = () => {
  const { toast } = useToast();
  const [filterSymbol, setFilterSymbol] = useState<string>("");
  const [filterResult, setFilterResult] = useState<string>("");
  const [filters, setFilters] = useState<{ symbol?: string; result?: string }>({});
  const [pendingSignalsCount, setPendingSignalsCount] = useState(0);
  const [evaluableSignalsCount, setEvaluableSignalsCount] = useState(0);

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

  const {
    evaluatingSignalId,
    isEvaluatingAll,
    handleEvaluateSignal,
    handleEvaluateAllSignals
  } = useSignalEvaluation(refetch);

  // Calculate pending and evaluable signals counts
  useEffect(() => {
    if (signals && signals.length > 0) {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      
      // Pending: signals without a verified result
      const pending = signals.filter(s => !s.verifiedAt || !s.result).length;
      setPendingSignalsCount(pending);
      
      // Evaluable: signals without a verified result that are older than 15 minutes
      const evaluable = signals.filter(s => 
        (!s.verifiedAt || !s.result) && 
        new Date(s.createdAt || Date.now()) <= fifteenMinutesAgo
      ).length;
      setEvaluableSignalsCount(evaluable);
    } else {
      setPendingSignalsCount(0);
      setEvaluableSignalsCount(0);
    }
  }, [signals]);

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

  // Export signals to XML
  const handleExportToXML = () => {
    if (!signals || signals.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Não há sinais para exportar para XML.",
        variant: "default"
      });
      return;
    }

    try {
      // Create XML structure
      let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xmlContent += '<signals>\n';
      
      // Add each signal as an XML element
      signals.forEach(signal => {
        xmlContent += '  <signal>\n';
        xmlContent += `    <id>${signal.id}</id>\n`;
        xmlContent += `    <symbol>${signal.symbol}</symbol>\n`;
        xmlContent += `    <direction>${signal.direction || ''}</direction>\n`;
        xmlContent += `    <entryPrice>${signal.entryPrice || signal.entry || ''}</entryPrice>\n`;
        xmlContent += `    <stopLoss>${signal.stopLoss || signal.sl || ''}</stopLoss>\n`;
        xmlContent += `    <tp1>${signal.tp1 || (signal.targets && signal.targets[0]?.price) || ''}</tp1>\n`;
        xmlContent += `    <tp2>${signal.tp2 || (signal.targets && signal.targets[1]?.price) || ''}</tp2>\n`;
        xmlContent += `    <tp3>${signal.tp3 || (signal.targets && signal.targets[2]?.price) || ''}</tp3>\n`;
        xmlContent += `    <result>${signal.result || ''}</result>\n`;
        xmlContent += `    <status>${signal.status || ''}</status>\n`;
        xmlContent += `    <createdAt>${signal.createdAt || ''}</createdAt>\n`;
        xmlContent += `    <verifiedAt>${signal.verifiedAt || ''}</verifiedAt>\n`;
        xmlContent += '  </signal>\n';
      });
      
      xmlContent += '</signals>';

      // Create download link
      const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `signals_history_${new Date().toISOString().slice(0, 10)}.xml`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Exportação concluída",
        description: `${signals.length} sinais exportados para XML.`,
      });
    } catch (error) {
      console.error("Error exporting to XML:", error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os sinais para XML.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container py-8">
      <PageHeader 
        title="Histórico de Sinais" 
        description="Visualize e analise o histórico completo de sinais de trading com avaliação em tempo real"
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
              <Button variant="ghost" onClick={() => refetch()}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {evaluableSignalsCount > 0 && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sinais aguardando avaliação</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              Há {evaluableSignalsCount} {evaluableSignalsCount === 1 ? 'sinal elegível' : 'sinais elegíveis'} para avaliação.
              Clique em "Avaliar Todos" para processar em tempo real.
            </span>
            <Button 
              onClick={() => signals && handleEvaluateAllSignals(signals)}
              disabled={isEvaluatingAll || evaluableSignalsCount === 0}
              variant="outline"
              size="sm"
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
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">
          {isLoading ? "Carregando sinais..." : `${signals?.length || 0} sinais encontrados`}
        </h2>
        <div className="flex space-x-2">
          <Button onClick={handleExportToXML} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar XML
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
            <RealTimeSignalTable 
              signals={signals} 
              onEvaluateSignal={(id) => signals && handleEvaluateSignal(id, signals)}
              evaluatingSignalId={evaluatingSignalId}
            />
          ) : (
            <div className="text-center py-12 border rounded-md">
              <p className="text-lg text-muted-foreground">Nenhum sinal encontrado</p>
              <p className="text-sm text-muted-foreground mt-2">
                Tente remover os filtros ou atualize a página
              </p>
              <Button variant="outline" onClick={() => refetch()}>
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
                        {pendingSignalsCount}
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
