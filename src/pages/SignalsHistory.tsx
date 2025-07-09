import React, { useState, useEffect, useCallback } from 'react';
import { fetchSignalsHistory, triggerSignalEvaluation, getEvaluationStatus } from '@/lib/signalsApi';
import { validateMultipleSignalsWithBybit } from '@/lib/signalValidationService';
import { getSignalHistory, saveSignalsToHistory } from '@/lib/signal-storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, X, Search, Calendar, Play, BarChart3, CheckCircle, Target } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/signals/PageHeader';
import { TradingSignal } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
const getResultClass = (result: string | number | null | undefined) => {
  // Handle different result formats for robustness
  const resultStr = String(result || '').toUpperCase();
  switch (resultStr) {
    case 'WINNER':
    case 'WIN':
    case '1':
      return 'bg-green-500/20 text-green-600 border-green-300/30';
    case 'LOSER':
    case 'LOSS':
    case '0':
      return 'bg-red-500/20 text-red-600 border-red-300/30';
    case 'PARTIAL':
      return 'bg-amber-500/20 text-amber-600 border-amber-300/30';
    case 'FALSE':
    case 'MISSED':
      return 'bg-gray-500/20 text-gray-600 border-gray-300/30';
    case 'PENDING':
      return 'bg-blue-500/20 text-blue-600 border-blue-300/30';
    default:
      return 'bg-blue-500/20 text-blue-600 border-blue-300/30';
  }
};
const getResultText = (result: string | number | null | undefined) => {
  // Handle different result formats for consistent display
  const resultStr = String(result || '').toUpperCase();
  switch (resultStr) {
    case 'WINNER':
    case 'WIN':
    case '1':
      return 'VENCEDOR';
    case 'LOSER':
    case 'LOSS':
    case '0':
      return 'PERDEDOR';
    case 'PARTIAL':
      return 'PARCIAL';
    case 'FALSE':
    case 'MISSED':
      return 'FALSO';
    case 'PENDING':
      return 'PENDENTE';
    default:
      return 'PENDENTE';
  }
};
const getDirectionClass = (direction: string) => direction.toUpperCase() === 'BUY' ? 'default' : 'destructive';
const SignalsHistory = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<TradingSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [evaluationStatus, setEvaluationStatus] = useState<any>(null);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const {
    toast
  } = useToast();

  // List of unique symbols for filtering
  const uniqueSymbols = [...new Set(signals.map(signal => signal.symbol))].sort();

  // Calculate performance statistics - INCLUIR PARCIAIS COMO VENCEDORES
  const totalSignals = filteredSignals.length;
  const winningTrades = filteredSignals.filter(signal => signal.result === "WINNER" || signal.result === "PARTIAL").length;
  const losingTrades = filteredSignals.filter(signal => signal.result === "LOSER").length;
  const partialTrades = filteredSignals.filter(signal => signal.result === "PARTIAL").length;
  const falseTrades = filteredSignals.filter(signal => signal.result === "FALSE").length;
  const pendingTrades = filteredSignals.filter(signal => !signal.result || signal.result === "PENDING").length;
  const completedTrades = winningTrades + losingTrades + falseTrades; // Include FALSE in completed trades
  const winRate = completedTrades > 0 ? (winningTrades / completedTrades * 100) : 0;
  const accuracy = totalSignals > 0 ? (winningTrades / totalSignals * 100) : 0;

  // Carrega sinais do backend
  const loadSignalsFromBackend = useCallback(async (isRefreshRequest = false) => {
    try {
      if (isRefreshRequest) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      console.log("🔄 [SIGNALS_LOAD] Carregando sinais do backend...");
      try {
        // Tentar carregar do backend primeiro
        const backendSignals = await fetchSignalsHistory();
        if (backendSignals && backendSignals.length > 0) {
          console.log(`✅ [SIGNALS_LOAD] ${backendSignals.length} sinais carregados do backend`);
          setSignals(backendSignals);
          setFilteredSignals(backendSignals);
          setIsLocalMode(false);
          if (isRefreshRequest) {
            toast({
              title: "Sinais atualizados",
              description: `${backendSignals.length} sinais carregados do backend.`
            });
          }
          return;
        }
      } catch (backendError) {
        console.warn("❌ [SIGNALS_LOAD] Backend falhou, tentando localStorage:", backendError);
      }

      // Fallback para localStorage
      console.log("🔧 [SIGNALS_LOAD] Usando localStorage como fallback...");
      setIsLocalMode(true);
      const localSignals = getSignalHistory();
      if (!localSignals || localSignals.length === 0) {
        console.log("❌ [SIGNALS_LOAD] Nenhum sinal encontrado no localStorage");
        toast({
          variant: "destructive",
          title: "Nenhum Sinal Encontrado",
          description: "Não há sinais salvos. Conecte ao backend para carregar sinais."
        });
        setSignals([]);
        setFilteredSignals([]);
      } else {
        console.log(`✅ [SIGNALS_LOAD] ${localSignals.length} sinais carregados do localStorage`);
        setSignals(localSignals);
        setFilteredSignals(localSignals);
        toast({
          title: "Modo Local",
          description: `${localSignals.length} sinais carregados do localStorage.`
        });
      }
    } catch (error) {
      console.error("❌ [SIGNALS_LOAD] Erro ao carregar sinais:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar sinais",
        description: "Não foi possível carregar os sinais. Verifique sua conexão."
      });
    } finally {
      setIsLoading(false);
      if (isRefreshRequest) {
        setIsRefreshing(false);
      }
    }
  }, [toast]);

  // Carrega status de avaliação
  const loadEvaluationStatus = useCallback(async () => {
    try {
      const status = await getEvaluationStatus();
      setEvaluationStatus(status);
    } catch (error) {
      console.error("❌ [EVAL_STATUS] Erro ao carregar status:", error);
    }
  }, []);

  // Carregamento inicial
  useEffect(() => {
    loadSignalsFromBackend();
    loadEvaluationStatus();
  }, [loadSignalsFromBackend, loadEvaluationStatus]);

  // Refresh manual
  const handleRefresh = () => {
    loadSignalsFromBackend(true);
    loadEvaluationStatus();
  };

  // Validação de sinais (fluxo correto)
  const handleValidateSignals = async () => {
    try {
      setIsValidating(true);
      console.log("🔍 [VALIDATION] Iniciando validação de sinais...");

      // Filtrar sinais que precisam de validação
      const pendingSignals = signals.filter(signal => !signal.result || signal.result === null || signal.result === undefined || signal.result === "PENDING");
      console.log(`📊 [VALIDATION] ${pendingSignals.length} sinais precisam de validação`);
      if (pendingSignals.length === 0) {
        toast({
          title: "Nenhum sinal pendente",
          description: "Todos os sinais já foram validados."
        });
        return;
      }
      toast({
        title: "Validação iniciada",
        description: `Validando ${pendingSignals.length} sinais com dados da Bybit...`
      });

      // Validar sinais usando dados históricos da Bybit
      const validationResults = await validateMultipleSignalsWithBybit(pendingSignals);
      console.log(`✅ [VALIDATION] ${validationResults.length} sinais validados`);

      // Atualizar sinais com os resultados
      const updatedSignals = signals.map(signal => {
        const validation = validationResults.find(v => v.id === signal.id);
        if (validation) {
          return {
            ...signal,
            result: validation.result,
            profit: validation.profit,
            validationDetails: validation.validationDetails,
            verifiedAt: new Date().toISOString(),
            completedAt: validation.result !== "PENDING" ? new Date().toISOString() : undefined,
            // Atualizar targets se existirem
            targets: validation.targets || signal.targets
          };
        }
        return signal;
      });

      // Salvar resultados
      setSignals(updatedSignals);
      setFilteredSignals(updatedSignals);
      if (isLocalMode) {
        saveSignalsToHistory(updatedSignals);
      }

      // Performance data will be recalculated on next load
      console.log('✅ Signals validated and saved to history');

      // Mostrar resultado
      const completedValidations = validationResults.filter(v => v.result !== "PENDING").length;
      toast({
        title: "Validação concluída",
        description: `${completedValidations} de ${pendingSignals.length} sinais validados com sucesso.`
      });
    } catch (error) {
      console.error("❌ [VALIDATION] Erro na validação:", error);
      toast({
        variant: "destructive",
        title: "Erro na validação",
        description: "Não foi possível validar os sinais. Tente novamente."
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Função para renderizar targets com destaque
  const renderTargets = (signal: TradingSignal) => {
    return <div className="space-y-1">
        {signal.tp1 && <div className="flex items-center gap-1">
            <Badge variant={signal.targets?.find(t => t.level === 1)?.hit ? "default" : "outline"} className={`text-xs ${signal.targets?.find(t => t.level === 1)?.hit ? 'bg-green-500 text-white' : ''}`}>
              {signal.targets?.find(t => t.level === 1)?.hit && <Target className="h-3 w-3 mr-1" />}
              TP1: ${signal.tp1.toFixed(4)}
            </Badge>
          </div>}
        {signal.tp2 && <div className="flex items-center gap-1">
            <Badge variant={signal.targets?.find(t => t.level === 2)?.hit ? "default" : "outline"} className={`text-xs ${signal.targets?.find(t => t.level === 2)?.hit ? 'bg-green-500 text-white' : ''}`}>
              {signal.targets?.find(t => t.level === 2)?.hit && <Target className="h-3 w-3 mr-1" />}
              TP2: ${signal.tp2.toFixed(4)}
            </Badge>
          </div>}
        {signal.tp3 && <div className="flex items-center gap-1">
            <Badge variant={signal.targets?.find(t => t.level === 3)?.hit ? "default" : "outline"} className={`text-xs ${signal.targets?.find(t => t.level === 3)?.hit ? 'bg-green-500 text-white' : ''}`}>
              {signal.targets?.find(t => t.level === 3)?.hit && <Target className="h-3 w-3 mr-1" />}
              TP3: ${signal.tp3.toFixed(4)}
            </Badge>
          </div>}
        {!signal.tp1 && !signal.tp2 && !signal.tp3 && <span className="text-xs text-muted-foreground">-</span>}
      </div>;
  };

  // Handle search filtering and sorting
  useEffect(() => {
    if (!signals.length) return;
    
    let filtered = signals;
    
    // Apply search filter
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      filtered = filtered.filter(signal => 
        signal.symbol.toLowerCase().includes(query) || 
        (typeof signal.result === 'string' && signal.result.toLowerCase().includes(query))
      );
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    setFilteredSignals(sorted);
  }, [signals, searchQuery, sortOrder]);

  // Loading state
  if (isLoading) {
    return;
  }
  return <div className="container mx-auto px-4 py-8">
      <PageHeader title="Histórico de Sinais" description={isLocalMode ? "Sinais carregados do localStorage - validação usando dados reais da Bybit" : "Sinais carregados do backend - validação automática"} />
      
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-64 flex-shrink-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Pesquisar sinais..." className="pl-8" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* Botões de ordenação */}
          <div className="flex gap-1">
            <Button 
              variant={sortOrder === 'newest' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setSortOrder('newest')}
              className="h-9"
            >
              Mais Recentes
            </Button>
            <Button 
              variant={sortOrder === 'oldest' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setSortOrder('oldest')}
              className="h-9"
            >
              Mais Antigos
            </Button>
          </div>

          {/* Botão de validação */}
          <Button variant="outline" className="h-9 gap-1" onClick={handleValidateSignals} disabled={isValidating || isLoading}>
            {isValidating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            <span className="hidden sm:inline">
              {isValidating ? 'Validando...' : 'Validar Sinais'}
            </span>
          </Button>

          {/* Botão de refresh */}
          <Button variant="outline" className="h-9 gap-1" onClick={handleRefresh} disabled={isRefreshing || isLoading}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        
          {/* Limpar filtros */}
          {searchQuery && <Button variant="ghost" className="h-9" onClick={() => setSearchQuery('')}>
              <X className="h-4 w-4 mr-1" />
              Limpar filtros
            </Button>}
        </div>
      </div>

      {/* Evaluation Status */}
      {evaluationStatus && <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Status de Avaliação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total: </span>
                <span className="font-medium">{evaluationStatus.total_signals || 0}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Avaliados: </span>
                <span className="font-medium text-green-600">{evaluationStatus.evaluated_signals || 0}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Pendentes: </span>
                <span className="font-medium text-blue-600">{evaluationStatus.pending_signals || 0}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Backend: </span>
                <span className="font-medium text-green-600">Conectado</span>
              </div>
            </div>
          </CardContent>
        </Card>}
      
      {/* Performance statistics - PARCIAIS COMO VENCEDORES */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Total de Sinais</span>
              <span className="text-2xl font-bold">{totalSignals}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Vencedores</span>
              <span className="text-2xl font-bold text-green-500">{winningTrades}</span>
              <span className="text-xs text-muted-foreground">
                (inclui {partialTrades} parciais)
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Perdedores</span>
              <span className="text-2xl font-bold text-red-500">{losingTrades}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Parciais</span>
              <span className="text-2xl font-bold text-amber-500">{partialTrades}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Pendentes</span>
              <span className="text-2xl font-bold text-blue-500">{pendingTrades}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Taxa de Acerto</span>
              <span className="text-2xl font-bold text-purple-500">{accuracy.toFixed(1)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Connection status */}
      <div className={`mb-4 flex items-center gap-2 text-sm ${isLocalMode ? 'text-amber-600' : 'text-green-600'}`}>
        <div className={`w-2 h-2 rounded-full ${isLocalMode ? 'bg-amber-500' : 'bg-green-500'}`}></div>
        {isLocalMode ? 'Modo Local: Avaliação usando dados reais da Bybit' : 'Sinais carregados do backend e avaliados automaticamente'}
        <span className="text-xs text-muted-foreground ml-2">
          {isLocalMode ? '(clique em "Validar Sinais" para validar)' : ''}
        </span>
      </div>
      
      {/* No results message */}
      {filteredSignals.length === 0 && <Card className="col-span-full">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Calendar className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Nenhum sinal encontrado</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery ? 'Tente ajustar seus filtros para ver mais resultados.' : 'Nenhum sinal foi encontrado no backend. Verifique se o serviço de avaliação está rodando.'}
            </p>
            {searchQuery && <Button variant="outline" className="mt-4" onClick={() => setSearchQuery('')}>
                <X className="h-4 w-4 mr-2" />
                Limpar filtros
              </Button>}
          </CardContent>
        </Card>}
      
      {/* Signals table */}
      {filteredSignals.length > 0 && <Card className="overflow-hidden">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Direção</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Targets (TP)</TableHead>
                <TableHead>SL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSignals.map(signal => <TableRow key={signal.id}>
                  <TableCell>
                    {formatDate(signal.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium">{signal.symbol}</TableCell>
                  <TableCell>
                    <Badge variant={getDirectionClass(signal.direction || 'BUY')}>
                      {(signal.direction || 'BUY').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>${(signal.entryPrice || 0).toFixed(4)}</TableCell>
                  <TableCell>
                    {renderTargets(signal)}
                  </TableCell>
                  <TableCell className="text-red-600">${signal.stopLoss.toFixed(4)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {signal.status || 'ACTIVE'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getResultClass(signal.result)}>
                      {getResultText(signal.result)}
                    </Badge>
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </Card>}
    </div>;
};
export default SignalsHistory;