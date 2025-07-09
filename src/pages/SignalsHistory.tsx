import React, { useState, useEffect, useCallback } from 'react';
import { fetchSignalsHistory, triggerSignalEvaluation, getEvaluationStatus } from '@/lib/signalsApi';
import { fetchBybitKlines } from '@/lib/apiServices';
import { validateMultipleSignalsWithBybit } from '@/lib/signalValidationService';
import { getSignalHistory, saveSignalsToHistory } from '@/lib/signal-storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  RefreshCw,
  X,
  Search,
  Calendar,
  Play,
  BarChart3,
  CheckCircle
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
    default:
      return 'PENDENTE';
  }
};

const getDirectionClass = (direction: string) =>
  direction.toUpperCase() === 'BUY' ? 'default' : 'destructive';

const SignalsHistory = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<TradingSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [evaluationStatus, setEvaluationStatus] = useState<any>(null);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const { toast } = useToast();
  
  // List of unique symbols for filtering
  const uniqueSymbols = [...new Set(signals.map(signal => signal.symbol))].sort();
  
  // Calculate performance statistics
  const totalSignals = filteredSignals.length;
  const winningTrades = filteredSignals.filter(signal => signal.result === "WINNER").length;
  const losingTrades = filteredSignals.filter(signal => signal.result === "LOSER").length;
  const partialTrades = filteredSignals.filter(signal => signal.result === "PARTIAL").length;
  const falseTrades = filteredSignals.filter(signal => signal.result === "FALSE").length;
  const pendingTrades = filteredSignals.filter(signal => !signal.result).length;
  
  const completedTrades = winningTrades + losingTrades + partialTrades;
  const winRate = completedTrades > 0 ? (winningTrades / completedTrades) * 100 : 0;
  // Taxa de acerto inclui vencedores + parciais como sucessos
  const successfulTrades = winningTrades + partialTrades;
  const accuracy = totalSignals > 0 ? (successfulTrades / totalSignals) * 100 : 0;

  // Load signals with fallback to local mode
  const loadSignals = useCallback(async (isRefreshRequest = false) => {
    try {
      if (isRefreshRequest) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      console.log("Trying to load signals from backend API...");
      
      try {
        // Try backend first
        const response = await fetchSignalsHistory();
        
        if (response && response.length > 0) {
          const last100Signals = response.slice(0, 100);
          console.log(`✅ Loaded ${last100Signals.length} signals from backend`);
          
          setSignals(last100Signals);
          setFilteredSignals(last100Signals);
          setIsLocalMode(false);
          
          // Save to localStorage for persistence across sessions
          saveSignalsToHistory(last100Signals);
          localStorage.setItem('validated_signals_backup', JSON.stringify(last100Signals));
          
          if (isRefreshRequest) {
            toast({
              title: "Sinais atualizados",
              description: `${response.length} sinais carregados do backend.`,
            });
          }
          return;
        }
      } catch (backendError) {
        console.warn("Backend failed, switching to local mode:", backendError);
      }
      
      // Fallback to local mode
      console.log("🔧 Switching to local evaluation mode...");
      setIsLocalMode(true);
      
      // Check if we have local signals with backup fallback
      let localSignals = getSignalHistory();
      
      // Fallback to backup if main storage is empty
      if (!localSignals || localSignals.length === 0) {
        const backup = localStorage.getItem('validated_signals_backup');
        if (backup) {
          try {
            localSignals = JSON.parse(backup);
            console.log(`✅ Restored ${localSignals.length} signals from backup storage`);
          } catch (e) {
            console.error("Failed to parse backup signals:", e);
            localSignals = [];
          }
        }
      }
      
      if (!localSignals || localSignals.length === 0) {
        console.log("❌ No real signals found in localStorage. Please load signals from backend first.");
        toast({
          variant: "destructive",
          title: "Nenhum Sinal Encontrado",
          description: "Não há sinais reais armazenados. Conecte ao backend para carregar sinais.",
        });
        localSignals = [];
      } else {
        console.log(`✅ Found ${localSignals.length} real signals in localStorage`);
        toast({
          title: "Modo Local",
          description: `Carregados ${localSignals.length} sinais reais do localStorage.`,
        });
      }
      
      setSignals(localSignals);
      setFilteredSignals(localSignals);
      
    } catch (error) {
      console.error("Failed to load signals:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar sinais",
        description: "Não foi possível carregar os sinais. Verifique sua conexão.",
      });
    } finally {
      setIsLoading(false);
      if (isRefreshRequest) {
        setIsRefreshing(false);
      }
    }
  }, [toast]);

  // Load evaluation status
  const loadEvaluationStatus = useCallback(async () => {
    try {
      const status = await getEvaluationStatus();
      setEvaluationStatus(status);
    } catch (error) {
      console.error("Failed to load evaluation status:", error);
    }
  }, []);
  
  // Initial load
  useEffect(() => {
    loadSignals();
    loadEvaluationStatus();
  }, [loadSignals, loadEvaluationStatus]);
  
  
  // Handle refreshing data
  const handleRefresh = () => {
    loadSignals(true);
    loadEvaluationStatus();
  };

  // Trigger signal evaluation following correct flow: fetch → validate → update backend → show results
  const handleTriggerEvaluation = async () => {
    try {
      setIsEvaluating(true);
      
      console.log("🔧 [EVAL_TRIGGER] Starting signal validation...");
      
      // Check if backend is available first
      if (!isLocalMode) {
        try {
          console.log("📊 [EVAL_TRIGGER] Trying backend evaluation...");
          await triggerSignalEvaluation();
          
          toast({
            title: "Validação iniciada",
            description: "Backend validando sinais com dados históricos da Bybit...",
          });
          
          // Wait for backend processing then refresh
          setTimeout(async () => {
            await loadSignals(true);
            await loadEvaluationStatus();
            
            toast({
              title: "Validação concluída", 
              description: "Sinais validados com dados reais da Bybit.",
            });
          }, 3000);
          
          return;
        } catch (error) {
          console.log("❌ [EVAL_TRIGGER] Backend failed, switching to local validation");
        }
      }
      
      // Local validation using Bybit API directly
      console.log("🔧 [EVAL_TRIGGER] Starting local validation with Bybit API...");
      
      const pendingSignals = signals.filter(signal => 
        !signal.result || 
        signal.result === null || 
        signal.result === undefined ||
        signal.result === "PENDING"
      );
      
      if (pendingSignals.length === 0) {
        toast({
          title: "Nenhum sinal pendente",
          description: "Todos os sinais já foram validados.",
        });
        return;
      }
      
      console.log(`🔍 [EVAL_TRIGGER] Validating ${pendingSignals.length} pending signals...`);
      
      // Use validation service to validate signals with Bybit data
      const validatedSignals = await validateMultipleSignalsWithBybit(pendingSignals);
      
      // Update state with validated results
      const updatedSignals = signals.map(signal => {
        const validatedSignal = validatedSignals.find(vs => vs.id === signal.id);
        return validatedSignal || signal;
      });
      
      console.log(`🔄 [EVAL_TRIGGER] Updated ${validatedSignals.length} signals with validation results`);
      console.log("📋 [EVAL_TRIGGER] Sample validated signal:", validatedSignals[0]);
      
      setSignals(updatedSignals);
      setFilteredSignals(updatedSignals);
      
      // Save to localStorage to persist data across sessions
      saveSignalsToHistory(updatedSignals);
      
      // Also persist the updated signals to ensure data survives page refresh/navigation
      localStorage.setItem('validated_signals_backup', JSON.stringify(updatedSignals));
      
      toast({
        title: "Validação concluída",
        description: `${pendingSignals.length} sinais validados com dados reais da Bybit.`,
      });
      
    } catch (error) {
      console.error("❌ [EVAL_TRIGGER] Error in validation:", error);
      toast({
        variant: "destructive",
        title: "Erro na validação",
        description: "Não foi possível validar os sinais. Verifique a conexão com a internet.",
      });
    } finally {
      setIsEvaluating(false);
    }
  };
  
  // Handle search filtering
  useEffect(() => {
    if (!signals.length) return;
    
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      setFilteredSignals(signals);
      return;
    }
    
    const filtered = signals.filter(signal => 
      signal.symbol.toLowerCase().includes(query) ||
      (typeof signal.result === 'string' && signal.result.toLowerCase().includes(query))
    );
    
    setFilteredSignals(filtered);
  }, [signals, searchQuery]);

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Histórico de Sinais"
          description="Carregando sinais do backend..."
        />
        <div className="space-y-4">
          <Skeleton className="h-[100px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Histórico de Sinais"
        description={isLocalMode 
          ? "Sinais de demonstração avaliados localmente usando dados reais da Bybit"
          : "Últimos 100 sinais gerados, avaliados automaticamente pelo backend usando dados reais da Bybit"}
      />
      
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-64 flex-shrink-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Pesquisar sinais..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* Trigger evaluation button */}
          <Button 
            variant="outline" 
            className="h-9 gap-1"
            onClick={handleTriggerEvaluation}
            disabled={isEvaluating || isLoading}
          >
            {isEvaluating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {isEvaluating ? 'Validando...' : 'Validar com Histórico'}
            </span>
          </Button>

          {/* Refresh button */}
          <Button 
            variant="outline" 
            className="h-9 gap-1"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        
          {/* Clear filters button */}
          {searchQuery && (
            <Button 
              variant="ghost" 
              className="h-9"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Evaluation Status */}
      {evaluationStatus && (
        <Card className="mb-6">
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
        </Card>
      )}
      
      {/* Performance statistics */}
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
        {isLocalMode ? 
          'Modo Local: Avaliação usando dados reais da Bybit' : 
          'Sinais carregados do backend e avaliados automaticamente'}
        <span className="text-xs text-muted-foreground ml-2">
          {isLocalMode ? '(clique em "Validar com Histórico" para validar)' : '(atualiza a cada 30s)'}
        </span>
      </div>
      
      {/* No results message */}
      {filteredSignals.length === 0 && (
        <Card className="col-span-full">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Calendar className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Nenhum sinal encontrado</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery ? 
                'Tente ajustar seus filtros para ver mais resultados.' : 
                'Nenhum sinal foi encontrado no backend. Verifique se o serviço de avaliação está rodando.'}
            </p>
            {searchQuery && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4 mr-2" />
                Limpar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Signals table */}
      {filteredSignals.length > 0 && (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Direção</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>TP1</TableHead>
                <TableHead>TP2</TableHead>
                <TableHead>TP3</TableHead>
                <TableHead>SL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSignals.map((signal) => (
                <TableRow key={signal.id}>
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
                  <TableCell>{(signal.tp1 || signal.targets?.find(t => t.level === 1)?.price) ? `$${(signal.tp1 || signal.targets?.find(t => t.level === 1)?.price || 0).toFixed(4)}` : '-'}</TableCell>
                  <TableCell>{(signal.tp2 || signal.targets?.find(t => t.level === 2)?.price) ? `$${(signal.tp2 || signal.targets?.find(t => t.level === 2)?.price || 0).toFixed(4)}` : '-'}</TableCell>
                  <TableCell>{(signal.tp3 || signal.targets?.find(t => t.level === 3)?.price) ? `$${(signal.tp3 || signal.targets?.find(t => t.level === 3)?.price || 0).toFixed(4)}` : '-'}</TableCell>
                  <TableCell className="text-red-600">${signal.stopLoss.toFixed(4)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {signal.status || 'ACTIVE'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={getResultClass(signal.result)}
                    >
                      {getResultText(signal.result)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default SignalsHistory;
