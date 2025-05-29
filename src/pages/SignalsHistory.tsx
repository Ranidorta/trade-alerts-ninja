
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

// Define the backend signal type based on the actual API structure
type BackendSignal = {
  id: number;
  timestamp: string;
  symbol: string;
  signal: 'BUY' | 'SELL' | 'buy' | 'sell';
  price: number;
  sl: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  size: number;
  rsi?: number;
  atr?: number;
  leverage?: number;
  result: 'WINNER' | 'LOSER' | 'PARTIAL' | 'FALSE' | null;
};

// Helper function to convert TradingSignal to BackendSignal
const convertToBackendSignal = (signal: TradingSignal): BackendSignal => {
  return {
    id: parseInt(signal.id || '0'),
    timestamp: signal.createdAt || signal.timestamp || new Date().toISOString(),
    symbol: signal.symbol,
    signal: (signal.direction?.toUpperCase() as 'BUY' | 'SELL') || 'BUY',
    price: signal.entryPrice || signal.entry_price || 0,
    sl: signal.stopLoss || signal.sl || 0,
    tp1: signal.tp1,
    tp2: signal.tp2,
    tp3: signal.tp3,
    size: 0, // Default size since it's not in TradingSignal
    leverage: signal.leverage,
    result: signal.result === 1 ? "WINNER" : 
            signal.result === 0 ? "LOSER" : 
            signal.result === "win" ? "WINNER" :
            signal.result === "loss" ? "LOSER" :
            signal.result === "partial" ? "PARTIAL" :
            signal.result === "WINNER" || signal.result === "LOSER" || 
            signal.result === "PARTIAL" || signal.result === "FALSE" ? signal.result :
            null
  };
};

// Helper function to safely convert result string to BackendSignal result type
const convertResultType = (result: any): 'WINNER' | 'LOSER' | 'PARTIAL' | 'FALSE' | null => {
  if (!result) return null;
  if (typeof result === 'string') {
    const upperResult = result.toUpperCase();
    if (upperResult === 'WINNER' || upperResult === 'LOSER' || 
        upperResult === 'PARTIAL' || upperResult === 'FALSE') {
      return upperResult as 'WINNER' | 'LOSER' | 'PARTIAL' | 'FALSE';
    }
  }
  return null;
};

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

const getResultClass = (result: string | null) => {
  switch (result) {
    case 'WINNER': return 'bg-green-500/20 text-green-600 border-green-300/30';
    case 'LOSER': return 'bg-red-500/20 text-red-600 border-red-300/30';
    case 'PARTIAL': return 'bg-amber-500/20 text-amber-600 border-amber-300/30';
    case 'FALSE': return 'bg-gray-500/20 text-gray-600 border-gray-300/30';
    default: return 'bg-blue-500/20 text-blue-600 border-blue-300/30';
  }
};

const getDirectionClass = (direction: string) =>
  direction.toUpperCase() === 'BUY' ? 'default' : 'destructive';

const SignalsHistory = () => {
  const [signals, setSignals] = useState<BackendSignal[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<BackendSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [symbolFilter, setSymbolFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'summary'>('table');
  const { toast } = useToast();
  
  // List of unique symbols for filtering
  const uniqueSymbols = [...new Set(signals.map(signal => signal.symbol))].sort();
  
  // Calculate performance statistics from real backend data
  const totalSignals = filteredSignals.length;
  const winningTrades = filteredSignals.filter(signal => signal.result === "WINNER").length;
  const losingTrades = filteredSignals.filter(signal => signal.result === "LOSER").length;
  const partialTrades = filteredSignals.filter(signal => signal.result === "PARTIAL").length;
  const falseTrades = filteredSignals.filter(signal => signal.result === "FALSE").length;
  const pendingTrades = filteredSignals.filter(signal => signal.result === null).length;
  
  const completedTrades = winningTrades + losingTrades + partialTrades;
  const winRate = completedTrades > 0 ? (winningTrades / completedTrades) * 100 : 0;
  const accuracy = totalSignals > 0 ? (winningTrades / totalSignals) * 100 : 0;
  
  // Symbol-based statistics
  const symbolsData = uniqueSymbols.map(symbol => {
    const symbolSignals = filteredSignals.filter(s => s.symbol === symbol);
    const count = symbolSignals.length;
    const wins = symbolSignals.filter(s => s.result === "WINNER").length;
    const losses = symbolSignals.filter(s => s.result === "LOSER").length;
    const symbolWinRate = count > 0 ? (wins / count) * 100 : 0;
    
    return {
      symbol,
      count,
      wins,
      losses,
      winRate: symbolWinRate
    };
  }).sort((a, b) => b.count - a.count);

  // Load signals from real API
  const loadSignals = useCallback(async (isRefreshRequest = false) => {
    try {
      if (isRefreshRequest) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      setApiError(false);
      
      // Apply any active filters to the API request
      const filters: { symbol?: string; result?: string } = {};
      if (symbolFilter) filters.symbol = symbolFilter;
      if (resultFilter) filters.result = resultFilter;
      
      console.log("Fetching real signals from backend API with filters:", filters);
      
      // Use the real API endpoint for backend signals
      const response = await fetchSignalsHistory(filters);
      
      console.log(`Received ${response.length} real signals from backend API`);
      
      // Convert TradingSignal[] to BackendSignal[]
      const convertedSignals: BackendSignal[] = response.map(signal => convertToBackendSignal(signal));
      
      setSignals(convertedSignals);
      
      // Apply search filter separately from API filters
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const filtered = convertedSignals.filter(signal => 
          signal.symbol.toLowerCase().includes(query) ||
          (typeof signal.result === 'string' && signal.result.toLowerCase().includes(query))
        );
        setFilteredSignals(filtered);
      } else {
        setFilteredSignals(convertedSignals);
      }
      
      if (isRefreshRequest) {
        toast({
          title: "Sinais atualizados",
          description: `${convertedSignals.length} sinais reais encontrados no backend.`,
        });
      }
    } catch (error) {
      console.error("Failed to load real signals from backend:", error);
      setApiError(true);
      
      // Fallback to mock data if API fails
      try {
        const mockData = await import('@/lib/mockData');
        if (mockData && typeof mockData.getMockSignals === 'function') {
          const mockSignals = mockData.getMockSignals() as TradingSignal[];
          // Convert mock signals to backend format
          const convertedSignals = mockSignals.map(mock => convertToBackendSignal(mock));
          setSignals(convertedSignals);
          setFilteredSignals(convertedSignals);
          
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
      if (isRefreshRequest) {
        setIsRefreshing(false);
      }
    }
  }, [symbolFilter, resultFilter, searchQuery, toast]);
  
  // Initial load
  useEffect(() => {
    loadSignals();
  }, [loadSignals]);
  
  // Handle switching to local mode
  const handleLocalModeClick = async () => {
    try {
      const mockData = await import('@/lib/mockData');
      if (mockData && typeof mockData.getMockSignals === 'function') {
        const mockSignals = mockData.getMockSignals() as TradingSignal[];
        const convertedSignals = mockSignals.map(mock => convertToBackendSignal(mock));
        setSignals(convertedSignals);
        setFilteredSignals(convertedSignals);
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
  
  // Handle refreshing data
  const handleRefresh = () => {
    loadSignals(true);
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
  
  // If API error is detected and we couldn't get data
  if (apiError && signals.length === 0) {
    return (
      <ApiConnectionError 
        apiUrl={config.apiUrl || 'http://localhost:5000'} 
        onLocalModeClick={handleLocalModeClick} 
      />
    );
  }

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

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Histórico de Sinais"
        description="Histórico detalhado dos sinais gerados pelo backend"
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
      
      {/* Performance statistics from real backend data */}
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
      
      {/* Loading state */}
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
          <Skeleton className="h-[200px] w-full" />
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
                    'Nenhum sinal de trading foi gerado ainda pelo backend.'}
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
          
          {/* Real backend signals table */}
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
                    <TableHead>Alavancagem</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>RSI</TableHead>
                    <TableHead>ATR</TableHead>
                    <TableHead>Resultado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSignals.slice(0, 50).map((signal) => (
                    <TableRow key={signal.id}>
                      <TableCell>
                        {formatDate(signal.timestamp)}
                      </TableCell>
                      <TableCell className="font-medium">{signal.symbol}</TableCell>
                      <TableCell>
                        <Badge variant={getDirectionClass(signal.signal)}>
                          {signal.signal.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>${signal.price.toFixed(4)}</TableCell>
                      <TableCell>{signal.tp1 ? `$${signal.tp1.toFixed(4)}` : '-'}</TableCell>
                      <TableCell>{signal.tp2 ? `$${signal.tp2.toFixed(4)}` : '-'}</TableCell>
                      <TableCell>{signal.tp3 ? `$${signal.tp3.toFixed(4)}` : '-'}</TableCell>
                      <TableCell className="text-red-600">${signal.sl.toFixed(4)}</TableCell>
                      <TableCell>{signal.leverage ? `${signal.leverage}x` : '-'}</TableCell>
                      <TableCell>{signal.size.toFixed(2)}</TableCell>
                      <TableCell>{signal.rsi ? signal.rsi.toFixed(2) : '-'}</TableCell>
                      <TableCell>{signal.atr ? signal.atr.toFixed(4) : '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={getResultClass(signal.result)}
                        >
                          {signal.result || 'PENDENTE'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Load more button */}
              {filteredSignals.length > 50 && (
                <div className="flex justify-center p-4">
                  <Button variant="outline">
                    Carregar mais ({filteredSignals.length - 50} restantes)
                  </Button>
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default SignalsHistory;
