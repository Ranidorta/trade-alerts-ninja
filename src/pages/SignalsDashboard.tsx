import { useState, useEffect, useCallback } from "react";
import { TradingSignal, SignalStatus } from "@/lib/types";
import { ArrowUpDown, BarChart3, Search, Bell, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { generateAllSignals } from "@/lib/apiServices";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTradingSignals } from "@/hooks/useTradingSignals";
import SignalsSidebar from "@/components/signals/SignalsSidebar";
import CandlestickChart from "@/components/signals/CandlestickChart";
import { saveSignalsToHistory } from "@/lib/signalHistoryService";
import { fetchSignals } from "@/lib/signalsApi";
import SignalCard from "@/components/SignalCard";
import { useIsMobile } from "@/hooks/use-mobile";

const SignalsDashboard = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<TradingSignal[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SignalStatus | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activeSignal, setActiveSignal] = useState<TradingSignal | null>(null);
  const isMobile = useIsMobile();
  
  const {
    toast
  } = useToast();
  
  const {
    signals: cachedSignals,
    addSignals,
    getLastActiveSignal,
    setLastActiveSignal
  } = useTradingSignals();
  
  useEffect(() => {
    if (signals.length > 0) {
      if (!activeSignal) {
        const lastActiveSignal = getLastActiveSignal();
        if (lastActiveSignal) {
          const signalExists = signals.some(s => s.id === lastActiveSignal.id);
          if (signalExists) {
            setActiveSignal(lastActiveSignal);
          } else if (signals.length > 0) {
            setActiveSignal(signals[0]);
            setLastActiveSignal(signals[0]);
          }
        } else if (signals.length > 0) {
          setActiveSignal(signals[0]);
          setLastActiveSignal(signals[0]);
        }
      }
      return;
    }
    
    if (cachedSignals && cachedSignals.length > 0) {
      setSignals(cachedSignals);
      setFilteredSignals(cachedSignals);
      
      const lastActive = getLastActiveSignal();
      if (lastActive) {
        const signalExists = cachedSignals.some(s => s.id === lastActive.id);
        if (signalExists) {
          setActiveSignal(lastActive);
        } else {
          setActiveSignal(cachedSignals[0]);
          setLastActiveSignal(cachedSignals[0]);
        }
      } else if (cachedSignals.length > 0) {
        setActiveSignal(cachedSignals[0]);
        setLastActiveSignal(cachedSignals[0]);
      }
    }
  }, [signals, cachedSignals, activeSignal, getLastActiveSignal, setLastActiveSignal]);
  
  const loadSignalsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        days: 30,
        strategy: "CLASSIC"
      };
      const fetchedSignals = await fetchSignals(params);
      if (fetchedSignals.length > 0) {
        setSignals(fetchedSignals);
        setFilteredSignals(fetchedSignals);
        if (!activeSignal) {
          setActiveSignal(fetchedSignals[0]);
        }
        addSignals(fetchedSignals);
        saveSignalsToHistory(fetchedSignals);
      } else {
        toast({
          title: "Nenhum sinal encontrado",
          description: "Nenhum sinal de trading foi encontrado com os filtros atuais."
        });
      }
    } catch (error) {
      console.error("Error loading signals:", error);
      toast({
        title: "Erro ao carregar sinais",
        description: "Falha ao carregar sinais da API.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setLastUpdated(new Date());
    }
  }, [toast, addSignals, activeSignal]);
  
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
      result = result.filter(signal => signal.symbol?.toLowerCase().includes(query) || signal.pair?.toLowerCase().includes(query));
    }
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
    });
    setFilteredSignals(result);
    if (activeSignal && !result.some(s => s.id === activeSignal.id) && result.length > 0) {
      setActiveSignal(result[0]);
    } else if (result.length === 0) {
      setActiveSignal(null);
    }
  }, [signals, statusFilter, searchQuery, sortBy, activeSignal]);
  
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
      description: "Você receberá alertas quando novos sinais forem postados"
    });
  };
  
  const handleGenerateSignals = async () => {
    setIsGenerating(true);
    toast({
      title: "Gerando sinais",
      description: "Analisando dados de mercado para encontrar oportunidades de trading..."
    });
    try {
      const newSignals = await generateAllSignals();
      if (newSignals.length > 0) {
        setSignals(prevSignals => {
          const existingIds = new Set(prevSignals.map(s => s.id));
          const uniqueNewSignals = newSignals.filter(s => !existingIds.has(s.id));
          if (uniqueNewSignals.length > 0) {
            addSignals(uniqueNewSignals);
            if (!activeSignal) {
              setActiveSignal(uniqueNewSignals[0]);
            }
            toast({
              title: "Novos sinais gerados",
              description: `Encontradas ${uniqueNewSignals.length} novas oportunidades de trading`
            });
            saveSignalsToHistory(uniqueNewSignals);
            return [...uniqueNewSignals, ...prevSignals];
          }
          toast({
            title: "Nenhum novo sinal",
            description: "Nenhuma nova oportunidade de trading encontrada no momento"
          });
          return prevSignals;
        });
      } else {
        toast({
          title: "Nenhum novo sinal",
          description: "Nenhuma oportunidade de trading encontrada no momento"
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
      description: `Os dados dos sinais ${!autoRefresh ? 'agora serão atualizados' : 'não serão mais atualizados'} automaticamente`
    });
  };
  
  const handleManualRefresh = () => {
    toast({
      title: "Atualizando sinais",
      description: "Atualizando dados dos sinais..."
    });
    loadSignalsData();
  };
  
  const formatLastUpdated = () => {
    return lastUpdated.toLocaleTimeString();
  };
  
  const handleSelectSignal = (signal: TradingSignal) => {
    setActiveSignal(signal);
    setLastActiveSignal(signal);
  };
  
  return (
    <div className="container mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Sinais de Trading</h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
            Oportunidades de trading utilizando estratégia CLASSIC
          </p>
          <div className="mt-1 sm:mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs bg-green-100 text-green-800 font-medium px-2 py-1 rounded">
              Usando Dados da API Bybit
            </span>
            {signals.length > 0 && <span className="text-xs text-slate-500">
              Última atualização: {formatLastUpdated()}
            </span>}
          </div>
        </div>
        
        {!isMobile && (
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Button 
              onClick={handleGenerateSignals} 
              variant="default" 
              disabled={isGenerating}
              className="flex-1 md:flex-auto"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Analisando...' : 'Gerar Sinais'}
            </Button>
            
            <Button 
              onClick={handleSubscribe} 
              variant="outline"
              className="flex-1 md:flex-auto"
            >
              <Bell className="mr-2 h-4 w-4" />
              Receber Alertas
            </Button>
          </div>
        )}
      </div>
      
      {!isMobile && (
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 sm:mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Buscar por símbolo ou par..." 
              className="pl-10" 
              value={searchQuery} 
              onChange={handleSearchChange} 
            />
          </div>
          
          <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
            <Button 
              onClick={handleManualRefresh} 
              variant="outline" 
              size={isMobile ? "sm" : "default"} 
              className={isMobile ? "h-9 px-2" : ""}
              title="Atualizar sinais agora"
            >
              <RefreshCw className="h-4 w-4 mr-1 sm:mr-2" />
              {!isMobile && "Atualizar"}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size={isMobile ? "sm" : "default"} className={isMobile ? "h-9 px-2" : ""}>
                  <BarChart3 className="h-4 w-4 mr-1 sm:mr-2" />
                  {!isMobile ? (statusFilter === "ALL" ? "Todos Status" : statusFilter) : "Status"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filtrar por Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem className={statusFilter === "ALL" ? "bg-slate-100 dark:bg-slate-800" : ""} onClick={() => handleStatusFilter("ALL")}>
                    Todos Status
                  </DropdownMenuItem>
                  <DropdownMenuItem className={statusFilter === "ACTIVE" ? "bg-slate-100 dark:bg-slate-800" : ""} onClick={() => handleStatusFilter("ACTIVE")}>
                    Ativos
                  </DropdownMenuItem>
                  <DropdownMenuItem className={statusFilter === "WAITING" ? "bg-slate-100 dark:bg-slate-800" : ""} onClick={() => handleStatusFilter("WAITING")}>
                    Aguardando
                  </DropdownMenuItem>
                  <DropdownMenuItem className={statusFilter === "COMPLETED" ? "bg-slate-100 dark:bg-slate-800" : ""} onClick={() => handleStatusFilter("COMPLETED")}>
                    Completados
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size={isMobile ? "sm" : "default"} className={isMobile ? "h-9 px-2" : ""}>
                  <ArrowUpDown className="h-4 w-4 mr-1 sm:mr-2" />
                  {!isMobile && "Ordenar"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ordenar Sinais</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem className={sortBy === "newest" ? "bg-slate-100 dark:bg-slate-800" : ""} onClick={() => handleSort("newest")}>
                    Mais Recentes
                  </DropdownMenuItem>
                  <DropdownMenuItem className={sortBy === "oldest" ? "bg-slate-100 dark:bg-slate-800" : ""} onClick={() => handleSort("oldest")}>
                    Mais Antigos
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
      
      {isMobile && (
        <div className="flex justify-center mb-4">
          <Button 
            onClick={handleGenerateSignals} 
            variant="default" 
            disabled={isGenerating}
            className="w-full"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Analisando...' : 'Gerar Sinais'}
          </Button>
        </div>
      )}
      
      {!isLoading && signals.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-8 text-center mb-4 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-blue-100 text-blue-600 mb-2 sm:mb-4">
            <Zap className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">Gere seus primeiros sinais</h3>
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base max-w-md mx-auto mb-3 sm:mb-6">
            Clique no botão "Gerar Sinais" para analisar o mercado e encontrar oportunidades de trading.
          </p>
          <Button onClick={handleGenerateSignals} disabled={isGenerating}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Analisando Mercado...' : 'Gerar Sinais Agora'}
          </Button>
        </div>
      )}
      
      {signals.length > 0 && (
        <>
          <div className="grid grid-cols-12 gap-3 sm:gap-6">
            <div className="col-span-12 md:col-span-4 lg:col-span-3 order-2 md:order-1">
              <SignalsSidebar 
                signals={filteredSignals} 
                activeSignal={activeSignal} 
                onSelectSignal={handleSelectSignal} 
                isLoading={isLoading} 
              />
            </div>
            
            {!isMobile && (
              <div className="col-span-12 md:col-span-8 lg:col-span-9 order-1 md:order-2">
                <CandlestickChart 
                  symbol={activeSignal?.symbol || ""} 
                  entryPrice={activeSignal?.entryPrice} 
                  stopLoss={activeSignal?.stopLoss} 
                  targets={activeSignal?.targets} 
                />
              </div>
            )}
          </div>
          
          {activeSignal && (
            <div className="mt-3 sm:mt-6">
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Detalhes do Sinal</h3>
              <SignalCard signal={activeSignal} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SignalsDashboard;
