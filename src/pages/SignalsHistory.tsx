import React, { useState, useEffect } from 'react';
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
  Search
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/signals/PageHeader';
import { TradingSignal } from '@/lib/types';
import { SignalHistoryItem } from '@/components/signals/SignalHistoryItem';
import SignalsSummary from '@/components/signals/SignalsSummary';
import ApiConnectionError from '@/components/signals/ApiConnectionError';
import { config } from '@/config/env';
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

const calculateWinRate = (signals: TradingSignal[]) => {
  if (!signals.length) return 0;
  
  const winners = signals.filter(signal => signal.result === 'WINNER').length;
  return (winners / signals.length) * 100;
};

const SignalsHistory = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<TradingSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [symbolFilter, setSymbolFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'summary'>('table');
  const { toast } = useToast();
  
  // List of unique symbols for filtering
  const uniqueSymbols = [...new Set(signals.map(signal => signal.symbol))].sort();
  
  // Derived calculated data for summary
  const totalSignals = filteredSignals.length;
  const winningTrades = filteredSignals.filter(signal => 
    signal.result === "WINNER" || signal.result === "win" || signal.result === 1
  ).length;
  const losingTrades = filteredSignals.filter(signal => 
    signal.result === "LOSER" || signal.result === "loss" || signal.result === 0
  ).length;
  const winRate = totalSignals > 0 ? (winningTrades / totalSignals) * 100 : 0;
  
  // Symbol-based statistics
  const symbolsData = uniqueSymbols.map(symbol => {
    const symbolSignals = filteredSignals.filter(s => s.symbol === symbol);
    const count = symbolSignals.length;
    const wins = symbolSignals.filter(s => 
      s.result === "WINNER" || s.result === "win" || (typeof s.result === "number" && s.result === 1)
    ).length;
    const losses = symbolSignals.filter(s => 
      s.result === "LOSER" || s.result === "loss" || (typeof s.result === "number" && s.result === 0)
    ).length;
    const symbolWinRate = count > 0 ? (wins / count) * 100 : 0;
    
    return {
      symbol,
      count,
      wins,
      losses,
      winRate: symbolWinRate
    };
  }).sort((a, b) => b.count - a.count);
  
  // Strategy-based statistics
  const uniqueStrategies = [...new Set(filteredSignals.map(signal => signal.strategy || 'Unknown'))];
  const strategyData = uniqueStrategies.map(strategy => {
    const strategySignals = filteredSignals.filter(s => (s.strategy || 'Unknown') === strategy);
    const count = strategySignals.length;
    const wins = strategySignals.filter(s => s.result === 'WINNER').length;
    const losses = strategySignals.filter(s => s.result === 'LOSER').length;
    const strategyWinRate = count > 0 ? (wins / count) * 100 : 0;
    
    return {
      strategy,
      count,
      wins,
      losses,
      winRate: strategyWinRate
    };
  }).sort((a, b) => b.count - a.count);
  
  // Daily performance statistics
  const dailyData = (() => {
    const dailyMap = new Map();
    
    filteredSignals.forEach(signal => {
      if (!signal.createdAt) return;
      
      const date = new Date(signal.createdAt).toLocaleDateString();
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { date, count: 0, wins: 0, losses: 0 });
      }
      
      const day = dailyMap.get(date);
      day.count++;
      
      if (signal.result === 'WINNER') day.wins++;
      if (signal.result === 'LOSER') day.losses++;
    });
    
    return Array.from(dailyMap.values())
      .map(day => ({
        ...day,
        winRate: day.count > 0 ? (day.wins / day.count) * 100 : 0
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  })();
  
  const avgProfit = (() => {
    const profitSignals = filteredSignals.filter(s => s.profit);
    if (profitSignals.length === 0) return 0;
    
    const totalProfit = profitSignals.reduce((sum, signal) => {
      return sum + (parseFloat(signal.profit?.toString() || '0') || 0);
    }, 0);
    
    return totalProfit / profitSignals.length;
  })();
  
  // Summary data object
  const summaryData = {
    totalSignals,
    winningTrades,
    losingTrades,
    winRate,
    symbolsData,
    strategyData,
    dailyData,
    avgProfit
  };

  // Load signals from API
  useEffect(() => {
    const loadSignals = async () => {
      try {
        setIsLoading(true);
        setApiError(false);
        
        // Apply any active filters to the API request
        const filters: { symbol?: string; result?: string } = {};
        if (symbolFilter) filters.symbol = symbolFilter;
        if (resultFilter) filters.result = resultFilter;
        
        const response = await fetchSignalsHistory(filters);
        
        setSignals(response);
        setFilteredSignals(response);
        
        toast({
          title: "Sinais carregados",
          description: `${response.length} sinais históricos encontrados.`,
        });
      } catch (error) {
        console.error("Failed to load signals:", error);
        setApiError(true);
        
        // Get mock data if API fails
        try {
          const mockData = await import('@/lib/mockData');
          if (mockData && typeof mockData.getMockSignals === 'function') {
            const mockSignals = mockData.getMockSignals() as TradingSignal[];
            setSignals(mockSignals);
            setFilteredSignals(mockSignals);
            
            toast({
              title: "Usando dados locais",
              description: "Não foi possível conectar à API, usando dados locais.",
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
      }
    };
    
    loadSignals();
  }, [symbolFilter, resultFilter, toast]);
  
  // Handle search filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSignals(signals);
      return;
    }
    
    const query = searchQuery.toLowerCase().trim();
    const filtered = signals.filter(signal => 
      signal.symbol.toLowerCase().includes(query) ||
      (signal.strategy && signal.strategy.toLowerCase().includes(query)) ||
      (typeof signal.result === 'string' && signal.result.toLowerCase().includes(query))
    );
    
    setFilteredSignals(filtered);
  }, [signals, searchQuery]);
  
  // Handle switching to local mode
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
  
  // If API error is detected and we couldn't get mock data
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
        {/* Search and filter controls */}
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
          {/* Symbol filter dropdown */}
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
          
          {/* Result filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 gap-1">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Resultado</span>
                {resultFilter && (
                  <Badge 
                    variant="secondary" 
                    className={`ml-1 ${
                      resultFilter === 'WINNER' 
                        ? 'bg-green-500/20 text-green-600 border-green-300/30' 
                        : resultFilter === 'LOSER'
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
                onSelect={() => setResultFilter('WINNER')}
                className={resultFilter === 'WINNER' ? "bg-primary/10" : ""}
              >
                <Badge className="mr-2 bg-green-500/20 text-green-600 border-green-300/30">WINNER</Badge>
                Vencedor
                {resultFilter === 'WINNER' && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onSelect={() => setResultFilter('LOSER')}
                className={resultFilter === 'LOSER' ? "bg-primary/10" : ""}
              >
                <Badge className="mr-2 bg-red-500/20 text-red-600 border-red-300/30">LOSER</Badge>
                Perdedor
                {resultFilter === 'LOSER' && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onSelect={() => setResultFilter('PARTIAL')}
                className={resultFilter === 'PARTIAL' ? "bg-primary/10" : ""}
              >
                <Badge className="mr-2 bg-orange-500/20 text-orange-600 border-orange-300/30">PARTIAL</Badge>
                Parcial
                {resultFilter === 'PARTIAL' && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* View mode selector */}
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
          
          {/* Clear filters button */}
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
      
      {/* Results summary section */}
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
      
      {/* Loading state */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <>
          {/* No results message */}
          {filteredSignals.length === 0 && (
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
          )}
          
          {/* Table view */}
          {viewMode === 'table' && filteredSignals.length > 0 && (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Ativo</TableHead>
                      <TableHead>Direção</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>TP</TableHead>
                      <TableHead>SL</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>Estratégia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSignals.map((signal) => (
                      <TableRow key={signal.id || `${signal.createdAt}-${signal.symbol}`}>
                        <TableCell>
                          {signal.createdAt ? formatDate(signal.createdAt) : 'N/A'}
                        </TableCell>
                        <TableCell className="font-medium">{signal.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={signal.direction === 'BUY' ? 'success' : 'destructive'}>
                            {signal.direction}
                          </Badge>
                        </TableCell>
                        <TableCell>{signal.entryPrice}</TableCell>
                        <TableCell>{signal.takeProfit && signal.takeProfit[0]}</TableCell>
                        <TableCell>{signal.stopLoss}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={
                              signal.result === 'WINNER' 
                                ? 'bg-green-500/20 text-green-600 border-green-300/30' 
                                : signal.result === 'LOSER'
                                  ? 'bg-red-500/20 text-red-600 border-red-300/30'
                                  : 'bg-orange-500/20 text-orange-600 border-orange-300/30'
                            }
                          >
                            {signal.result}
                          </Badge>
                        </TableCell>
                        <TableCell>{signal.strategy || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
          
          {/* Cards view */}
          {viewMode === 'cards' && filteredSignals.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSignals.map((signal) => (
                <SignalHistoryItem key={signal.id || `${signal.createdAt}-${signal.symbol}`} signal={signal} />
              ))}
            </div>
          )}
          
          {/* Summary view */}
          {viewMode === 'summary' && (
            <SignalsSummary signals={filteredSignals} />
          )}
        </>
      )}
    </div>
  );
};

// Add the missing Check component
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

export default SignalsHistory;
