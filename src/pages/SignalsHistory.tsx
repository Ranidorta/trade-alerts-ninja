
import React, { useState, useEffect, useCallback } from 'react';
import { fetchSignalsHistory } from '@/lib/signalsApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowUpDown, 
  Filter, 
  Calendar, 
  ChevronDown,
  Layers,
  BarChart3,
  X,
  Search,
  RefreshCw
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/signals/PageHeader';
import { TradingSignal } from '@/lib/types';
import SignalHistoryTable from '@/components/signals/SignalHistoryTable';
import SignalsSummary from '@/components/signals/SignalsSummary';
import ApiConnectionError from '@/components/signals/ApiConnectionError';
import { config } from '@/config/env';
import { useToast } from '@/components/ui/use-toast';
import { SignalHistoryItem } from '@/components/signals/SignalHistoryItem';
import { getSignalHistory } from '@/lib/signal-storage';

const SignalsHistory = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<TradingSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [symbolFilter, setSymbolFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'summary'>('table');
  const { toast } = useToast();
  
  const uniqueSymbols = [...new Set(signals.map(signal => signal.symbol))].sort();
  
  const totalSignals = filteredSignals.length;
  const winningTrades = filteredSignals.filter(signal => 
    signal.result === "WINNER" || 
    signal.result === "win" || 
    signal.result === 1
  ).length;
  const losingTrades = filteredSignals.filter(signal => 
    signal.result === "LOSER" || 
    signal.result === "loss" || 
    signal.result === 0
  ).length;
  const winRate = totalSignals > 0 ? (winningTrades / totalSignals) * 100 : 0;
  
  const loadSignals = useCallback(async (isRefreshRequest = false) => {
    try {
      if (isRefreshRequest) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      setApiError(false);
      
      const filters: { symbol?: string; result?: string } = {};
      if (symbolFilter) filters.symbol = symbolFilter;
      if (resultFilter) filters.result = resultFilter;
      
      console.log("Fetching signals history with filters:", filters);
      
      // Try to fetch from API first
      try {
        const response = await fetchSignalsHistory(filters);
        
        if (Array.isArray(response) && response.length > 0) {
          console.log(`Received ${response.length} signals from API`);
          setSignals(response);
          
          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            const filtered = response.filter(signal => 
              signal.symbol?.toLowerCase().includes(query) ||
              (signal.strategy && signal.strategy.toLowerCase().includes(query)) ||
              (typeof signal.result === 'string' && signal.result.toLowerCase().includes(query))
            );
            setFilteredSignals(filtered);
          } else {
            setFilteredSignals(response);
          }
          
          if (isRefreshRequest) {
            toast({
              title: "Sinais atualizados",
              description: `${response.length} sinais históricos encontrados.`,
            });
          }
          
          return;
        } else {
          console.log("API returned empty array or invalid data, trying local storage");
        }
      } catch (error) {
        console.error("Failed to load signals from API:", error);
        setApiError(true);
      }
      
      // If API fails or returns no signals, try local storage
      const localSignals = getSignalHistory();
      if (localSignals.length > 0) {
        console.log(`Using ${localSignals.length} signals from local storage`);
        
        // Apply filters to local signals
        let filtered = localSignals;
        if (symbolFilter) {
          filtered = filtered.filter(s => s.symbol === symbolFilter);
        }
        if (resultFilter) {
          filtered = filtered.filter(s => s.result === resultFilter);
        }
        
        setSignals(filtered);
        
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const searchFiltered = filtered.filter(signal => 
            signal.symbol?.toLowerCase().includes(query) ||
            (signal.strategy && signal.strategy.toLowerCase().includes(query)) ||
            (typeof signal.result === 'string' && signal.result.toLowerCase().includes(query))
          );
          setFilteredSignals(searchFiltered);
        } else {
          setFilteredSignals(filtered);
        }
        
        toast({
          title: "Usando dados locais",
          description: "Não foi possível conectar à API, usando dados locais.",
          variant: "warning"
        });
        
        return;
      }
      
      // If no signals found in API or local storage, try mock data
      try {
        const mockData = await import('@/lib/mockData');
        if (mockData && typeof mockData.getMockSignals === 'function') {
          const mockSignals = mockData.getMockSignals() as TradingSignal[];
          setSignals(mockSignals);
          setFilteredSignals(mockSignals);
          
          toast({
            title: "Usando dados de exemplo",
            description: "Não foi possível encontrar sinais reais, usando dados de exemplo.",
            variant: "destructive"
          });
        }
      } catch (e) {
        console.error("Failed to load mock data:", e);
        setSignals([]);
        setFilteredSignals([]);
      }
    } finally {
      setIsLoading(false);
      if (isRefreshRequest) {
        setIsRefreshing(false);
      }
    }
  }, [symbolFilter, resultFilter, searchQuery, toast]);
  
  useEffect(() => {
    loadSignals();
  }, [loadSignals]);
  
  useEffect(() => {
    if (!signals.length) return;
    
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      setFilteredSignals(signals);
      return;
    }
    
    const filtered = signals.filter(signal => 
      signal.symbol.toLowerCase().includes(query) ||
      (signal.strategy && signal.strategy.toLowerCase().includes(query)) ||
      (typeof signal.result === 'string' && signal.result.toLowerCase().includes(query))
    );
    
    setFilteredSignals(filtered);
  }, [signals, searchQuery]);
  
  const handleRefresh = () => {
    loadSignals(true);
  };
  
  const handleLocalModeClick = async () => {
    try {
      const mockData = await import('@/lib/mockData');
      if (mockData && typeof mockData.getMockSignals === 'function') {
        const mockSignals = mockData.getMockSignals() as TradingSignal[];
        setSignals(mockSignals);
        setFilteredSignals(mockSignals);
        setApiError(false);
        
        toast({
          title: "Modo local ativado",
          description: "Exibindo dados de exemplo armazenados localmente.",
        });
      }
    } catch (error) {
      console.error("Failed to load mock data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados locais.",
        variant: "destructive"
      });
    }
  };

  const Check = (props: React.SVGProps<SVGSVGElement>) => {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  };

  if (apiError && signals.length === 0) {
    return (
      <ApiConnectionError 
        apiUrl={config.apiUrl || 'http://localhost:5000'} 
        onLocalModeClick={handleLocalModeClick} 
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Histórico de Sinais"
        description="Histórico detalhado dos sinais gerados"
      />
      
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
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
          <Button 
            variant="outline" 
            className="h-9 gap-1"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 gap-1">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Ativo</span>
                {symbolFilter && (
                  <Badge variant="secondary" className="ml-1 bg-primary/20">
                    {symbolFilter}
                  </Badge>
                )}
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filtrar por ativo</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-y-auto">
                <DropdownMenuItem 
                  onSelect={() => setSymbolFilter('')}
                  className={!symbolFilter ? "bg-primary/10" : ""}
                >
                  Todos os ativos
                  {!symbolFilter && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                
                {uniqueSymbols.map((symbol) => (
                  <DropdownMenuItem
                    key={symbol}
                    onSelect={() => setSymbolFilter(symbol)}
                    className={symbolFilter === symbol ? "bg-primary/10" : ""}
                  >
                    {symbol}
                    {symbolFilter === symbol && <Check className="ml-auto h-4 w-4" />}
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 gap-1">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Resultado</span>
                {resultFilter && (
                  <Badge 
                    variant="secondary" 
                    className={`ml-1 ${
                      resultFilter === 'WINNER' || resultFilter === 'win'
                        ? 'bg-green-500/20 text-green-600 border-green-300/30' 
                        : resultFilter === 'LOSER' || resultFilter === 'loss'
                          ? 'bg-red-500/20 text-red-600 border-red-300/30'
                          : 'bg-orange-500/20 text-orange-600 border-orange-300/30'
                    }`}
                  >
                    {resultFilter}
                  </Badge>
                )}
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filtrar por resultado</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onSelect={() => setResultFilter('')}
                className={!resultFilter ? "bg-primary/10" : ""}
              >
                Todos os resultados
                {!resultFilter && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onSelect={() => setResultFilter('win')}
                className={resultFilter === 'win' || resultFilter === 'WINNER' ? "bg-primary/10" : ""}
              >
                <Badge className="mr-2 bg-green-500/20 text-green-600 border-green-300/30">Vencedor</Badge>
                {(resultFilter === 'win' || resultFilter === 'WINNER') && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onSelect={() => setResultFilter('loss')}
                className={resultFilter === 'loss' || resultFilter === 'LOSER' ? "bg-primary/10" : ""}
              >
                <Badge className="mr-2 bg-red-500/20 text-red-600 border-red-300/30">Perdedor</Badge>
                {(resultFilter === 'loss' || resultFilter === 'LOSER') && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onSelect={() => setResultFilter('partial')}
                className={resultFilter === 'partial' || resultFilter === 'PARTIAL' ? "bg-primary/10" : ""}
              >
                <Badge className="mr-2 bg-orange-500/20 text-orange-600 border-orange-300/30">Parcial</Badge>
                {(resultFilter === 'partial' || resultFilter === 'PARTIAL') && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 gap-1">
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {viewMode === 'table' ? 'Tabela' : viewMode === 'cards' ? 'Cards' : 'Resumo'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Modo de visualização</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onSelect={() => setViewMode('table')}
                className={viewMode === 'table' ? "bg-primary/10" : ""}
              >
                Tabela
                {viewMode === 'table' && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onSelect={() => setViewMode('cards')}
                className={viewMode === 'cards' ? "bg-primary/10" : ""}
              >
                Cards
                {viewMode === 'cards' && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onSelect={() => setViewMode('summary')}
                className={viewMode === 'summary' ? "bg-primary/10" : ""}
              >
                Resumo
                {viewMode === 'summary' && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {(symbolFilter || resultFilter || searchQuery) && (
            <Button 
              variant="ghost" 
              className="h-9"
              onClick={() => {
                setSymbolFilter('');
                setResultFilter('');
                setSearchQuery('');
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>
      </div>
      
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Total de Sinais</span>
              <span className="text-2xl font-bold">{totalSignals}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Sinais Vencedores</span>
              <span className="text-2xl font-bold text-green-500">{winningTrades}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Sinais Perdedores</span>
              <span className="text-2xl font-bold text-red-500">{losingTrades}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Taxa de Acerto</span>
              <span className="text-2xl font-bold text-amber-500">{winRate.toFixed(1)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {isLoading ? (
        <div className="space-y-4">
          <div className="flex items-center space-x-4 animate-pulse">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
          <Skeleton className="h-[100px] w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-[150px] w-full" />
            <Skeleton className="h-[150px] w-full" />
            <Skeleton className="h-[150px] w-full" />
          </div>
        </div>
      ) : (
        <>
          {filteredSignals.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-8 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <Calendar className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">Nenhum sinal encontrado</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchQuery || symbolFilter || resultFilter ? 
                    'Tente ajustar seus filtros para ver mais resultados.' : 
                    'Nenhum sinal de trading foi gerado ainda.'}
                </p>
                {(searchQuery || symbolFilter || resultFilter) && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setSymbolFilter('');
                      setResultFilter('');
                      setSearchQuery('');
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpar filtros
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {viewMode === 'table' && (
                <SignalHistoryTable signals={filteredSignals} />
              )}
              
              {viewMode === 'cards' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSignals.slice(0, 50).map((signal) => (
                    <SignalHistoryItem key={signal.id || `${signal.createdAt}-${signal.symbol}`} signal={signal} />
                  ))}
                  
                  {filteredSignals.length > 50 && (
                    <div className="col-span-full flex justify-center mt-4">
                      <Button 
                        variant="outline"
                        onClick={() => toast({
                          title: "Limite atingido",
                          description: "Apenas os 50 primeiros sinais são exibidos em modo cards. Use a tabela para ver todos."
                        })}  
                      >
                        Carregar mais ({filteredSignals.length - 50} restantes)
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              {viewMode === 'summary' && (
                <SignalsSummary signals={filteredSignals} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default SignalsHistory;
