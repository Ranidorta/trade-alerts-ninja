
import { useState, useEffect, useCallback } from "react";
import { TradingSignal, SignalStatus } from "@/lib/types";
import SignalCard from "@/components/SignalCard";
import { 
  ArrowUpDown, 
  BarChart3, 
  Search, 
  Bell,
  RefreshCw,
  Zap,
  Settings,
  Tags
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { generateAllSignals, generateTradingSignal } from "@/lib/apiServices";
import { fetchSignals, fetchStrategies } from "@/lib/signalsApi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import GenericSearchBar from "@/components/GenericSearchBar";
import { useQuery } from "@tanstack/react-query";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, 
} from "@/components/ui/select";

const SignalsDashboard = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<TradingSignal[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SignalStatus | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [coinSearch, setCoinSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [strategyFilter, setStrategyFilter] = useState<string>("ALL");
  const { toast } = useToast();
  
  // Fetch available strategies
  const { data: strategies = [] } = useQuery({
    queryKey: ['strategies'],
    queryFn: fetchStrategies,
    meta: {
      onSettled: (data: any, error: any) => {
        if (error) {
          console.error("Error fetching strategies:", error);
          toast({
            title: "Erro ao carregar estratégias",
            description: "Não foi possível carregar a lista de estratégias disponíveis.",
            variant: "destructive"
          });
        }
      }
    }
  });
  
  const loadSignalsData = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Use the new fetchSignals with strategy filter if selected
      const params: any = { days: 30 };
      if (strategyFilter !== "ALL") {
        params.strategy = strategyFilter;
      }
      
      const fetchedSignals = await fetchSignals(params);
      
      if (fetchedSignals.length > 0) {
        setSignals(fetchedSignals);
        setFilteredSignals(fetchedSignals);
      } else {
        toast({
          title: "Nenhum sinal encontrado",
          description: "Nenhum sinal de trading foi encontrado com os filtros atuais.",
        });
      }
    } catch (error) {
      console.error("Error loading signals:", error);
      toast({
        title: "Erro ao carregar sinais",
        description: "Falha ao carregar sinais da API.",
        variant: "destructive"
      });
      setSignals([]);
      setFilteredSignals([]);
    } finally {
      setIsLoading(false);
      setLastUpdated(new Date());
    }
  }, [toast, strategyFilter]);
  
  useEffect(() => {
    loadSignalsData();
  }, [loadSignalsData, strategyFilter]);
  
  useEffect(() => {
    if (!autoRefresh) return;
    
    const DEFAULT_REFRESH_INTERVAL = 60000;
    const intervalId = setInterval(() => {
      console.log("Auto-refreshing signals data...");
      loadSignalsData();
    }, DEFAULT_REFRESH_INTERVAL);
    
    return () => clearInterval(intervalId);
  }, [autoRefresh, loadSignalsData]);
  
  useEffect(() => {
    let result = [...signals];
    
    if (statusFilter !== "ALL") {
      result = result.filter(signal => signal.status === statusFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(signal => 
        signal.symbol?.toLowerCase().includes(query) ||
        signal.pair?.toLowerCase().includes(query)
      );
    }
    
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
    });
    
    setFilteredSignals(result);
  }, [signals, statusFilter, searchQuery, sortBy]);
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const handleStatusFilter = (status: SignalStatus | "ALL") => {
    setStatusFilter(status);
  };
  
  const handleSort = (type: "newest" | "oldest") => {
    setSortBy(type);
  };
  
  const handleSubscribe = () => {
    toast({
      title: "Inscrito para notificações",
      description: "Você receberá alertas quando novos sinais forem postados",
    });
  };
  
  const handleCoinSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCoinSearch(e.target.value.toUpperCase());
  };

  const handleGenerateSignalForCoin = async () => {
    if (!coinSearch) {
      toast({
        title: "Por favor, digite um símbolo",
        description: "Digite um símbolo de criptomoeda para gerar sinais (ex: BTCUSDT, ETHUSDT)",
      });
      return;
    }

    setIsSearching(true);
    let symbol = coinSearch;
    
    if (!symbol.endsWith("USDT")) {
      symbol = `${symbol}USDT`;
    }

    try {
      toast({
        title: "Gerando sinal",
        description: `Analisando dados de mercado para ${symbol}...`,
      });

      const signal = await generateTradingSignal(symbol);
      
      if (signal) {
        setSignals(prevSignals => {
          const exists = prevSignals.some(s => s.id === signal.id);
          if (exists) {
            toast({
              title: "Sinal já existe",
              description: `Um sinal para ${symbol} já existe no seu dashboard.`,
            });
            return prevSignals;
          }
          
          toast({
            title: "Sinal gerado",
            description: `Novo sinal ${signal.type} para ${symbol} foi adicionado ao seu dashboard.`,
          });
          
          return [signal, ...prevSignals];
        });
        
        setCoinSearch("");
      } else {
        toast({
          title: "Nenhum sinal gerado",
          description: `Não foi possível gerar um sinal para ${symbol}. As condições de mercado podem não atender aos critérios.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error generating signal for specific coin:", error);
      toast({
        title: "Erro ao gerar sinal",
        description: `Falha ao gerar sinal para ${symbol}.`,
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleGenerateSignals = async () => {
    setIsGenerating(true);
    toast({
      title: "Gerando sinais",
      description: "Analisando dados de mercado para encontrar oportunidades de trading...",
    });
    
    try {
      const newSignals = await generateAllSignals();
      
      if (newSignals.length > 0) {
        setSignals(prevSignals => {
          const existingIds = new Set(prevSignals.map(s => s.id));
          const uniqueNewSignals = newSignals.filter(s => !existingIds.has(s.id));
          
          if (uniqueNewSignals.length > 0) {
            toast({
              title: "Novos sinais gerados",
              description: `Encontradas ${uniqueNewSignals.length} novas oportunidades de trading`,
            });
            return [...uniqueNewSignals, ...prevSignals];
          }
          
          toast({
            title: "Nenhum novo sinal",
            description: "Nenhuma nova oportunidade de trading encontrada no momento",
          });
          return prevSignals;
        });
      } else {
        toast({
          title: "Nenhum novo sinal",
          description: "Nenhuma oportunidade de trading encontrada no momento",
        });
      }
    } catch (error) {
      console.error("Error generating signals:", error);
      toast({
        title: "Erro ao gerar sinais",
        description: "Ocorreu um erro ao analisar dados de mercado",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setLastUpdated(new Date());
    }
  };
  
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    toast({
      title: `Atualização automática ${!autoRefresh ? 'ativada' : 'desativada'}`,
      description: `Os dados dos sinais ${!autoRefresh ? 'agora serão atualizados' : 'não serão mais atualizados'} automaticamente`,
    });
  };
  
  const handleManualRefresh = () => {
    toast({
      title: "Atualizando sinais",
      description: "Atualizando dados dos sinais...",
    });
    loadSignalsData();
  };
  
  const handleStrategyChange = (value: string) => {
    setStrategyFilter(value);
    toast({
      title: "Filtro de estratégia alterado",
      description: value === "ALL" 
        ? "Mostrando sinais de todas as estratégias" 
        : `Filtrando sinais da estratégia ${value}`,
    });
  };
  
  const renderSkeletons = () => {
    return Array(6).fill(0).map((_, index) => (
      <div key={index} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 animate-pulse">
        <div className="flex justify-between">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-6 bg-slate-200 rounded-full w-1/4"></div>
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="h-12 bg-slate-200 rounded"></div>
            <div className="h-12 bg-slate-200 rounded"></div>
          </div>
          <div className="h-20 bg-slate-200 rounded"></div>
        </div>
        <div className="h-8 bg-slate-200 rounded w-1/2"></div>
      </div>
    ));
  };
  
  const formatLastUpdated = () => {
    return lastUpdated.toLocaleTimeString();
  };
  
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Sinais de Trading</h1>
          <p className="text-slate-600 dark:text-slate-300">
            Oportunidades de trading ativas atuais
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs bg-green-100 text-green-800 font-medium px-2 py-1 rounded">
              Usando Dados da API Bybit
            </span>
            {signals.length > 0 && (
              <span className="text-xs text-slate-500">
                Última atualização: {formatLastUpdated()}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
          <Button 
            onClick={handleGenerateSignals} 
            variant="default"
            disabled={isGenerating}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Analisando Mercado...' : 'Gerar Sinais'}
          </Button>
          
          <Button onClick={handleSubscribe} variant="outline">
            <Bell className="mr-2 h-4 w-4" />
            Receber Alertas
          </Button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Gerar Sinal para Moeda Específica</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Input
              placeholder="Digite o símbolo da cripto (ex: BTC, ETH)"
              value={coinSearch}
              onChange={handleCoinSearchChange}
              className="pr-10"
            />
          </div>
          
          <Button 
            onClick={handleGenerateSignalForCoin} 
            disabled={isSearching || !coinSearch}
            className="shrink-0"
          >
            <Zap className={`mr-2 h-4 w-4 ${isSearching ? 'animate-pulse' : ''}`} />
            {isSearching ? 'Analisando...' : 'Gerar Sinal'}
          </Button>
        </div>
        
        <p className="text-xs text-slate-500 mt-2">
          Digite um símbolo de criptomoeda para gerar um sinal de trading com base nas condições atuais de mercado.
        </p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <Input
            placeholder="Buscar por símbolo ou par..."
            className="pl-10"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={strategyFilter} onValueChange={handleStrategyChange}>
            <SelectTrigger className="w-[180px]">
              <Tags className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Estratégia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas Estratégias</SelectItem>
              {strategies.map((strategy: string) => (
                <SelectItem key={strategy} value={strategy}>
                  {strategy}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={toggleAutoRefresh} 
            variant={autoRefresh ? "default" : "outline"}
            size="icon"
            className="w-10 h-10"
            title={autoRefresh ? "Atualização automática ativada" : "Atualização automática desativada"}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button 
            onClick={handleManualRefresh} 
            variant="outline"
            size="icon"
            className="w-10 h-10"
            title="Atualizar sinais agora"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <BarChart3 className="mr-2 h-4 w-4" />
                {statusFilter === "ALL" ? "Todos Status" : statusFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filtrar por Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className={statusFilter === "ALL" ? "bg-slate-100 dark:bg-slate-800" : ""}
                  onClick={() => handleStatusFilter("ALL")}
                >
                  Todos Status
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={statusFilter === "ACTIVE" ? "bg-slate-100 dark:bg-slate-800" : ""}
                  onClick={() => handleStatusFilter("ACTIVE")}
                >
                  Ativos
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={statusFilter === "WAITING" ? "bg-slate-100 dark:bg-slate-800" : ""}
                  onClick={() => handleStatusFilter("WAITING")}
                >
                  Aguardando
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={statusFilter === "COMPLETED" ? "bg-slate-100 dark:bg-slate-800" : ""}
                  onClick={() => handleStatusFilter("COMPLETED")}
                >
                  Completados
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Ordenar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ordenar Sinais</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className={sortBy === "newest" ? "bg-slate-100 dark:bg-slate-800" : ""}
                  onClick={() => handleSort("newest")}
                >
                  Mais Recentes
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={sortBy === "oldest" ? "bg-slate-100 dark:bg-slate-800" : ""}
                  onClick={() => handleSort("oldest")}
                >
                  Mais Antigos
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {!isLoading && signals.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
            <Zap className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Gere seus primeiros sinais</h3>
          <p className="text-slate-600 dark:text-slate-300 max-w-md mx-auto mb-6">
            Clique no botão "Gerar Sinais" para analisar o mercado e encontrar oportunidades de trading, 
            ou pesquise por uma criptomoeda específica acima.
          </p>
          <Button onClick={handleGenerateSignals} disabled={isGenerating}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Analisando Mercado...' : 'Gerar Sinais Agora'}
          </Button>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          renderSkeletons()
        ) : filteredSignals.length > 0 ? (
          filteredSignals.map(signal => (
            <SignalCard 
              key={signal.id} 
              signal={signal} 
              refreshInterval={30000} // Update target status every 30 seconds
            />
          ))
        ) : signals.length > 0 ? (
          <div className="col-span-full py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <Search className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-xl font-medium mb-2">Nenhum sinal encontrado</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              {searchQuery ? 
                `Nenhum sinal correspondente a "${searchQuery}" foi encontrado. Tente um termo de pesquisa diferente.` : 
                strategyFilter !== "ALL" ?
                `Nenhum sinal encontrado para a estratégia "${strategyFilter}". Tente outra estratégia.` :
                "Não há sinais com o filtro selecionado. Tente alterar seus filtros ou gerar novos sinais."}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SignalsDashboard;
