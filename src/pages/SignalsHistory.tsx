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
  Search,
  Check
} from 'lucide-react';
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
import ApiConnectionError from '@/components/signals/ApiConnectionError';
import { config } from '@/config/env';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

// Função para normalizar os resultados dos sinais
const normalizeSignalResult = (signal: TradingSignal): TradingSignal => {
  if (!signal.result) return { ...signal, result: 'PENDING' };

  // Converte para string e maiúsculas
  const resultStr = String(signal.result).toUpperCase();

  // Mapeia variações comuns para valores padronizados
  if (['WIN', '1', 'TRUE', 'SUCCESS'].includes(resultStr)) {
    return { ...signal, result: 'WINNER' };
  }
  if (['LOSS', '0', 'FALSE', 'FAIL'].includes(resultStr)) {
    return { ...signal, result: 'LOSER' };
  }
  if (resultStr === 'PARTIAL') {
    return { ...signal, result: 'PARTIAL' };
  }

  return { ...signal, result: resultStr as any };
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

const SignalsHistory = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<TradingSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [symbolFilter, setSymbolFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  // Normaliza e filtra os sinais
  const processSignals = (rawSignals: TradingSignal[]) => {
    const normalized = rawSignals.map(normalizeSignalResult);
    return normalized.filter(signal => {
      const matchesSymbol = symbolFilter ? signal.symbol === symbolFilter : true;
      const matchesResult = resultFilter ? signal.result === resultFilter : true;
      const matchesSearch = searchQuery 
        ? signal.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (signal.strategy && signal.strategy.toLowerCase().includes(searchQuery.toLowerCase()))
        : true;
      return matchesSymbol && matchesResult && matchesSearch;
    });
  };

  // Carrega os sinais
  useEffect(() => {
    const loadSignals = async () => {
      try {
        setIsLoading(true);
        const rawSignals = await fetchSignalsHistory();
        const processedSignals = processSignals(rawSignals);
        
        setSignals(processedSignals);
        setFilteredSignals(processedSignals);
        setApiError(false);
      } catch (error) {
        console.error("Failed to load signals:", error);
        setApiError(true);
        setSignals([]);
        setFilteredSignals([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSignals();
  }, [symbolFilter, resultFilter]);

  // Atualiza filtros quando searchQuery muda
  useEffect(() => {
    const filtered = processSignals(signals);
    setFilteredSignals(filtered);
  }, [searchQuery]);

  // Se houver erro na API
  if (apiError) {
    return (
      <ApiConnectionError 
        apiUrl={config.apiUrl || 'http://localhost:5000'} 
        onRetry={() => window.location.reload()} 
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Histórico de Sinais"
        description="Histórico detalhado dos sinais gerados"
      />

      {/* Filtros e busca */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          {/* Filtro por símbolo */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                {symbolFilter || 'Todos ativos'}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSymbolFilter('')}>
                Todos ativos
              </DropdownMenuItem>
              {Array.from(new Set(signals.map(s => s.symbol))).map(symbol => (
                <DropdownMenuItem 
                  key={symbol} 
                  onClick={() => setSymbolFilter(symbol)}
                >
                  {symbol}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Filtro por resultado */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <BarChart3 className="mr-2 h-4 w-4" />
                {resultFilter || 'Todos resultados'}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setResultFilter('')}>
                Todos resultados
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setResultFilter('WINNER')}>
                Vencedores
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setResultFilter('LOSER')}>
                Perdedores
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setResultFilter('PARTIAL')}>
                Parciais
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Resumo */}
      <Card className="mb-6">
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-2xl font-bold">{filteredSignals.length}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Vencedores</span>
            <span className="text-2xl font-bold text-green-500">
              {filteredSignals.filter(s => s.result === 'WINNER').length}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Parciais</span>
            <span className="text-2xl font-bold text-amber-500">
              {filteredSignals.filter(s => s.result === 'PARTIAL').length}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Perdedores</span>
            <span className="text-2xl font-bold text-red-500">
              {filteredSignals.filter(s => s.result === 'LOSER').length}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de resultados */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead>Direção</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>TP1/TP2</TableHead>
              <TableHead>SL</TableHead>
              <TableHead>Resultado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ) : filteredSignals.length > 0 ? (
              filteredSignals.map((signal) => (
                <TableRow key={signal.id || signal.symbol}>
                  <TableCell>{formatDate(signal.createdAt)}</TableCell>
                  <TableCell>{signal.symbol}</TableCell>
                  <TableCell>
                    <Badge
                      variant={signal.direction === 'BUY' ? 'default' : 'destructive'}
                    >
                      {signal.direction}
                    </Badge>
                  </TableCell>
                  <TableCell>{signal.entryPrice}</TableCell>
                  <TableCell>
                    {signal.takeProfit?.join(' / ') || 'N/A'}
                  </TableCell>
                  <TableCell>{signal.stopLoss || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        'capitalize',
                        signal.result === 'WINNER' && 'bg-green-500/10 text-green-600',
                        signal.result === 'LOSER' && 'bg-red-500/10 text-red-600',
                        signal.result === 'PARTIAL' && 'bg-amber-500/10 text-amber-600',
                        !signal.result && 'bg-gray-500/10'
                      )}
                    >
                      {signal.result?.toLowerCase() || 'pendente'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Nenhum sinal encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default SignalsHistory;