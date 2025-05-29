
import React, { useState, useEffect, useCallback } from 'react';
import { fetchSignalsHistory } from '@/lib/signalsApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  RefreshCw,
  X,
  Search,
  Calendar
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
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<TradingSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
  const accuracy = totalSignals > 0 ? (winningTrades / totalSignals) * 100 : 0;

  // Load signals from localStorage
  const loadSignals = useCallback(async (isRefreshRequest = false) => {
    try {
      if (isRefreshRequest) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      console.log("Loading signals from localStorage and validating with Bybit...");
      
      const response = await fetchSignalsHistory();
      
      console.log(`Loaded ${response.length} signals`);
      
      setSignals(response);
      setFilteredSignals(response);
      
      if (isRefreshRequest) {
        toast({
          title: "Sinais atualizados",
          description: `${response.length} sinais carregados e validados com Bybit.`,
        });
      }
    } catch (error) {
      console.error("Failed to load signals:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar sinais",
        description: "Não foi possível carregar os sinais do localStorage.",
      });
    } finally {
      setIsLoading(false);
      if (isRefreshRequest) {
        setIsRefreshing(false);
      }
    }
  }, [toast]);
  
  // Initial load
  useEffect(() => {
    loadSignals();
  }, [loadSignals]);
  
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

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Histórico de Sinais"
          description="Carregando sinais do localStorage..."
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
        description="Sinais carregados do localStorage e validados com a API da Bybit"
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
      <div className="mb-4 flex items-center gap-2 text-sm text-green-600">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        Sinais carregados do localStorage e validados com Bybit API
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
                'Nenhum sinal foi encontrado no localStorage. Verifique a aba Sinais.'}
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
              {filteredSignals.slice(0, 50).map((signal) => (
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
                  <TableCell>{signal.tp1 ? `$${signal.tp1.toFixed(4)}` : '-'}</TableCell>
                  <TableCell>{signal.tp2 ? `$${signal.tp2.toFixed(4)}` : '-'}</TableCell>
                  <TableCell>{signal.tp3 ? `$${signal.tp3.toFixed(4)}` : '-'}</TableCell>
                  <TableCell className="text-red-600">${signal.stopLoss.toFixed(4)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {signal.status || 'ACTIVE'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={getResultClass(signal.result as string)}
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
    </div>
  );
};

export default SignalsHistory;
