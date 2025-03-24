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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import StrategiesTabList from "@/components/signals/StrategiesTabList";
import StrategyDetails from "@/components/signals/StrategyDetails";

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
  const [activeStrategy, setActiveStrategy] = useState<string>("ALL");
  const { toast } = useToast();
  
  const { data: strategies = [], isLoading: strategiesLoading } = useQuery({
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
      const params: any = { days: 30 };
      if (activeStrategy !== "ALL") {
        params.strategy = activeStrategy;
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
  }, [toast, activeStrategy]);
  
  useEffect(() => {
    loadSignalsData();
  }, [loadSignalsData, activeStrategy]);
  
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
    setActiveStrategy(value);
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
      
      <Tabs 
        value={activeStrategy} 
        onValueChange={handleStrategyChange}
        className="mb-8"
      >
        <StrategiesTabList 
          strategies={strategies} 
          activeStrategy={activeStrategy}
          isLoading={strategiesLoading}
        />
        
        <TabsContent value={activeStrategy} className="mt-0">
          <StrategyDetails strategy={activeStrategy} />
          
          {!isLoading && signals.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
                <Zap className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Gere seus primeiros sinais</h3>
              <p className="text-slate-600 dark:text-slate-300 max-w-md mx-auto mb-6">
                Clique no botão "Gerar Sinais" para analisar o mercado e encontrar oportunidades de trading.
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
                    activeStrategy !== "ALL" ?
                    `Nenhum sinal encontrado para a estratégia "${activeStrategy}". Tente outra estratégia.` :
                    "Não há sinais com o filtro selecionado. Tente alterar seus filtros ou gerar novos sinais."}
                </p>
              </div>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SignalsDashboard;
