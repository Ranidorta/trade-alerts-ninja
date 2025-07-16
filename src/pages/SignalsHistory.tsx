import React, { useState, useEffect, useCallback } from 'react';
import { fetchSignalsHistory, triggerSignalEvaluation, getEvaluationStatus } from '@/lib/signalsApi';
import { validateMultipleSignalsWithBybit } from '@/lib/signalValidationService';
import { getSignalHistory, saveSignalsToHistory } from '@/lib/signal-storage';
import { useSignalSync } from '@/hooks/useSignalSync';
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
  const { signals: firebaseSignals, isLoading: firebaseLoading, loadSignals, updateSignal } = useSignalSync();
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<TradingSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [evaluationStatus, setEvaluationStatus] = useState<any>(null);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const { toast } = useToast();

  // Update signals when Firebase signals change
  useEffect(() => {
    console.log(`🔥 Firebase loading: ${firebaseLoading}, signals: ${firebaseSignals?.length || 0}`);
    
    if (firebaseSignals && firebaseSignals.length > 0) {
      console.log(`🔥 Firebase: ${firebaseSignals.length} sinais carregados`);
      setSignals(firebaseSignals);
      setFilteredSignals(firebaseSignals);
      setIsLocalMode(false);
      setIsLoading(false);
    } else if (!firebaseLoading) {
      // Se Firebase não tem sinais, usar localStorage como fallback
      console.log('Firebase vazio, tentando localStorage...');
      loadSignalsFromBackend();
    }
  }, [firebaseSignals, firebaseLoading]);

  // List of unique symbols for filtering
  const uniqueSymbols = [...new Set(signals.map(signal => signal.symbol))].sort();

  // NOVA LÓGICA: Separar vencedores puros de parciais
  const totalSignals = filteredSignals.length;
  const winnerTrades = filteredSignals.filter(signal => signal.result === "WINNER").length;
  const partialTrades = filteredSignals.filter(signal => signal.result === "PARTIAL").length;
  const losingTrades = filteredSignals.filter(signal => signal.result === "LOSER").length;
  const falseTrades = filteredSignals.filter(signal => signal.result === "FALSE").length;
  const pendingTrades = filteredSignals.filter(signal => !signal.result || signal.result === "PENDING").length;
  
  // REGRA: WINNER + PARTIAL = acerto na taxa de acerto
  const successfulTrades = winnerTrades + partialTrades;
  const validatedTrades = winnerTrades + partialTrades + losingTrades + falseTrades;
  const accuracyRate = validatedTrades > 0 ? (successfulTrades / validatedTrades * 100) : 0;

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
        console.log("❌ [SIGNALS_LOAD] Nenhum sinal encontrado no localStorage, gerando sinais locais...");
        
        // Se não há sinais salvos, vamos gerar alguns sinais de exemplo
        const exampleSignals: TradingSignal[] = [
          {
            id: `local-${Date.now()}-1`,
            symbol: 'BTCUSDT',
            direction: 'BUY' as const,
            entryPrice: 45000,
            stopLoss: 44000,
            tp1: 46000,
            tp2: 47000,
            tp3: 48000,
            strategy: 'local_example',
            createdAt: new Date().toISOString(),
            status: 'WAITING',
            result: null,
            profit: null
          },
          {
            id: `local-${Date.now()}-2`,
            symbol: 'ETHUSDT',
            direction: 'SELL' as const,
            entryPrice: 3000,
            stopLoss: 3100,
            tp1: 2900,
            tp2: 2800,
            tp3: 2700,
            strategy: 'local_example',
            createdAt: new Date().toISOString(),
            status: 'WAITING',
            result: null,
            profit: null
          }
        ];
        
        setSignals(exampleSignals);
        setFilteredSignals(exampleSignals);
        toast({
          title: "Sinais de exemplo",
          description: `${exampleSignals.length} sinais de exemplo criados. Conecte ao backend ou Firebase para sinais reais.`
        });
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
    // Não limpar localStorage aqui, deixar ele como fallback
    // Recarregar do Firebase primeiro
    loadSignals();
    loadSignalsFromBackend(true);
    loadEvaluationStatus();
  };

  // Validação de sinais (fluxo correto)
  const handleValidateSignals = async () => {
    try {
      setIsValidating(true);
      console.log("🔍 [VALIDATION] Iniciando validação de sinais...");
      console.log(`🔍 [DEBUG] Total de sinais: ${signals.length}`);

      // Filtrar sinais que precisam de validação
      const pendingSignals = signals.filter(signal => !signal.result || signal.result === null || signal.result === undefined || signal.result === "PENDING");
      console.log(`📊 [VALIDATION] ${pendingSignals.length} sinais precisam de validação`);
      console.log('📊 [DEBUG] Sinais pendentes:', pendingSignals.map(s => ({ id: s.id, symbol: s.symbol, result: s.result })));
      
      if (pendingSignals.length === 0) {
        toast({
          title: "Nenhum sinal pendente",
          description: "Todos os sinais já foram validados."
        });
        setIsValidating(false);
        return;
      }
      
      toast({
        title: "Validação iniciada",
        description: `Validando ${pendingSignals.length} sinais com dados da Bybit...`
      });

      console.log('🔍 [DEBUG] Chamando validateMultipleSignalsWithBybit...');
      
      // Validar sinais usando dados históricos da Bybit
      const validationResults = await validateMultipleSignalsWithBybit(pendingSignals);
      console.log(`✅ [VALIDATION] ${validationResults.length} sinais validados`);
      console.log('✅ [DEBUG] Resultados da validação:', validationResults);

      if (!validationResults || validationResults.length === 0) {
        console.warn('⚠️ [DEBUG] Nenhum resultado de validação retornado');
        toast({
          title: "Erro na validação",
          description: "Nenhum resultado foi retornado pela validação.",
          variant: "destructive"
        });
        setIsValidating(false);
        return;
      }

      // Atualizar sinais com os resultados usando useSignalSync
      const updatedSignals = [...signals];
      console.log('🔄 [DEBUG] Atualizando sinais...');
      
      for (const validation of validationResults) {
        if (validation) {
          console.log(`🔄 [DEBUG] Atualizando sinal ${validation.id} com resultado: ${validation.result}`);
          
          const updates = {
            result: validation.result,
            profit: validation.profit,
            validationDetails: validation.validationDetails,
            verifiedAt: new Date().toISOString(),
            completedAt: validation.result !== "PENDING" ? new Date().toISOString() : undefined,
            targets: validation.targets
          };
          
          console.log('🔄 [DEBUG] Updates:', updates);
          
          // Usar updateSignal do useSignalSync para persistir no Firebase/localStorage
          try {
            await updateSignal(validation.id, updates);
            console.log(`✅ [DEBUG] updateSignal chamado para ${validation.id}`);
          } catch (error) {
            console.error(`❌ [DEBUG] Erro ao chamar updateSignal para ${validation.id}:`, error);
          }
          
          // Atualizar também o estado local imediatamente
          const signalIndex = updatedSignals.findIndex(s => s.id === validation.id);
          if (signalIndex !== -1) {
            updatedSignals[signalIndex] = { ...updatedSignals[signalIndex], ...updates };
            console.log(`✅ [DEBUG] Sinal ${validation.id} atualizado no estado local`);
          } else {
            console.warn(`⚠️ [DEBUG] Sinal ${validation.id} não encontrado no estado local`);
          }
        }
      }

      console.log('🔄 [DEBUG] Definindo novos estados...');
      console.log('🔄 [DEBUG] updatedSignals:', updatedSignals.map(s => ({ id: s.id, symbol: s.symbol, result: s.result })));

      // Atualizar estado local imediatamente para mostrar os resultados
      setSignals(updatedSignals);
      setFilteredSignals(updatedSignals);

      // Performance data will be recalculated on next load
      console.log('✅ Signals validated and saved to history');

      toast({
        title: "Validação concluída",
        description: `${validationResults.length} sinais foram processados com sucesso.`
      });

    } catch (error) {
      console.error('❌ [VALIDATION] Erro durante validação:', error);
      toast({
        title: "Erro na validação",
        description: error instanceof Error ? error.message : "Ocorreu um erro durante a validação",
        variant: "destructive"
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
              <span className="text-sm text-muted-foreground">✅ Vencedores</span>
              <span className="text-2xl font-bold text-green-500">{winnerTrades}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">🟡 Parciais</span>
              <span className="text-2xl font-bold text-amber-500">{partialTrades}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">❌ Perdedores</span>
              <span className="text-2xl font-bold text-red-500">{losingTrades}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Pendentes</span>
              <span className="text-2xl font-bold text-blue-500">{pendingTrades}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Taxa de Acerto</span>
              <span className="text-2xl font-bold text-primary">{accuracyRate.toFixed(1)}%</span>
              <span className="text-xs text-muted-foreground">
                (Vencedor + Parcial) ÷ Total
              </span>
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