import { useState, useEffect, useCallback } from "react";
import { TradingSignal, SignalStatus } from "@/lib/types";
import { ArrowUpDown, BarChart3, Search, Bell, RefreshCw, Zap, Filter, Loader2, TrendingUp, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { generateMonsterSignals, generateSignals } from "@/lib/signalsApi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTradingSignals } from "@/hooks/useTradingSignals";
import { saveSignalsToHistory } from "@/lib/signalHistoryService";
import { fetchSignals } from "@/lib/signalsApi";
import SignalCard from "@/components/SignalCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HybridSignalsTab from "@/components/signals/HybridSignalsTab";
import ClassicSignalsTab from "@/components/signals/ClassicSignalsTab";

// Key for storing whether signals have been generated before
const SIGNALS_GENERATED_KEY = "signals_generated_before";
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
  const [showFilters, setShowFilters] = useState(false);
  const [signalsGeneratedBefore, setSignalsGeneratedBefore] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("normal");
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

  // Check if signals have been generated before
  useEffect(() => {
    const generated = localStorage.getItem(SIGNALS_GENERATED_KEY) === "true";
    setSignalsGeneratedBefore(generated);
  }, []);

  // Load signals data from API or cache
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

  // Initialize signals from cache or API
  useEffect(() => {
    // Only initialize with cached signals if signals have been generated before
    if (!signalsGeneratedBefore) {
      return;
    }
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
  }, [signals, cachedSignals, activeSignal, getLastActiveSignal, setLastActiveSignal, signalsGeneratedBefore]);

  // Set up auto-refresh interval if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const DEFAULT_REFRESH_INTERVAL = 60000;
    const intervalId = setInterval(() => {
      console.log("Auto-refreshing signals data...");
      loadSignalsData();
    }, DEFAULT_REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [autoRefresh, loadSignalsData]);

  // Apply filters and sort whenever signals, filters, or sort order changes
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
  // Generate signals with different strategies - simplified for v3 only
  const handleGenerateStrategy = async (strategy: string = 'monster-v3-lucrativo') => {
    setIsGenerating(true);
    
    try {
      toast({
        title: "Gerando Monster v3 Lucrativo",
        description: "Analisando mercado com critérios de alto payoff (score ≥65)..."
      });
      
      // Force v3 strategy
      const newSignals = await generateSignals('monster-v3-lucrativo');
      
      if (newSignals.length > 0) {
        localStorage.setItem(SIGNALS_GENERATED_KEY, "true");
        setSignalsGeneratedBefore(true);
        setSignals(prevSignals => {
          const existingIds = new Set(prevSignals.map(s => s.id));
          const uniqueNewSignals = newSignals.filter(s => !existingIds.has(s.id));
          if (uniqueNewSignals.length > 0) {
            addSignals(uniqueNewSignals);
            if (!activeSignal) {
              setActiveSignal(uniqueNewSignals[0]);
            }
            
            toast({
              title: "✅ Monster v3 Lucrativo Gerados!",
              description: `${uniqueNewSignals.length} sinais de alto payoff com score ≥65 pontos`
            });
            saveSignalsToHistory(uniqueNewSignals);
            return [...uniqueNewSignals, ...prevSignals];
          }
          return prevSignals;
        });
      } else {
        toast({
          title: "⚠️ Nenhum sinal v3 encontrado",
          description: "Os critérios rigorosos (score ≥65) não identificaram oportunidades no momento. Tente novamente em alguns minutos."
        });
      }
    } catch (error) {
      console.error('Error generating v3 signals:', error);
      toast({
        title: "❌ Erro ao gerar sinais v3",
        description: "Falha na conexão ou análise. Tente novamente em alguns instantes.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setLastUpdated(new Date());
    }
  };

  const handleGenerateSignals = async () => {
    setIsGenerating(true);
    toast({
      title: "Gerando sinais Monster v2 Ajustado",
      description: "Critérios relaxados: RSI 25-40/60-75 + Volume 1.2x + ML ≥50% para mais oportunidades..."
    });
    try {
      // Use backend monster signal generation
      const newSignals = await generateMonsterSignals();
      if (newSignals.length > 0) {
        // Mark that signals have been generated before
        localStorage.setItem(SIGNALS_GENERATED_KEY, "true");
        setSignalsGeneratedBefore(true);
        setSignals(prevSignals => {
          const existingIds = new Set(prevSignals.map(s => s.id));
          const uniqueNewSignals = newSignals.filter(s => !existingIds.has(s.id));
          if (uniqueNewSignals.length > 0) {
            addSignals(uniqueNewSignals);
            if (!activeSignal) {
              setActiveSignal(uniqueNewSignals[0]);
            }
            toast({
              title: "Sinais Monster v2 Ajustado gerados",
              description: `${uniqueNewSignals.length} sinais com critérios relaxados para mais oportunidades mantendo qualidade`
            });
            saveSignalsToHistory(uniqueNewSignals);
            return [...uniqueNewSignals, ...prevSignals];
          }
          toast({
            title: "Nenhum novo sinal Monster v2",
            description: "Os critérios rigorosos (70%+ taxa de acerto) não identificaram novas oportunidades. Tente novamente em alguns minutos."
          });
          return prevSignals;
        });
      } else {
        toast({
          title: "Nenhum sinal Monster v2 encontrado",
          description: "Os critérios ultra-rigorosos não identificaram oportunidades"
        });
      }
    } catch (error) {
      console.error("Error generating monster signals:", error);
      toast({
        title: "Erro ao gerar sinais monster",
        description: error.message || "Ocorreu um erro ao analisar dados de mercado",
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

  // Show empty state based on whether signals have been generated before
  const showEmptyState = !signalsGeneratedBefore || signalsGeneratedBefore && signals.length === 0 && activeTab === "normal";
  return (
    <div className="container mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 sm:mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">💰 Sinais Monster v3 Lucrativo</h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
            Sistema de alta rentabilidade com score mínimo de 65 pontos
          </p>
          <div className="mt-1 sm:mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 font-medium px-3 py-1 rounded-full">
            💰 Monster v3 Lucrativo - Alto Payoff (Score ≥65) - RSI ≤45/≥55
          </span>
            {signals.length > 0 && <span className="text-xs text-slate-500">
              Última atualização: {formatLastUpdated()}
            </span>}
          </div>
        </div>
        
        <div className="flex items-center justify-center">
          <Button 
            onClick={() => handleGenerateStrategy('monster-v3-lucrativo')}
            disabled={isGenerating}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold px-8 py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Gerando Sinais v3 Lucrativo...
              </>
            ) : (
              <>
                💰
                <span className="ml-2">Gerar Sinais Monster v3 Lucrativo</span>
              </>
            )}
          </Button>
          
          {!isMobile && <Button onClick={handleSubscribe} variant="outline" className="flex-1 md:flex-auto">
              <Bell className="mr-2 h-4 w-4" />
              Receber Alertas
            </Button>}
        </div>
      </div>
      
      <Tabs defaultValue="normal" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="normal">
            💰 Monster v3 Lucrativo
          </TabsTrigger>
          <TabsTrigger value="classic">
            📊 Classic v2
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="normal">
          {isMobile ? <div className="flex items-center justify-between mb-4">
              <Button onClick={handleManualRefresh} variant="outline" size="sm" className="h-9 p-2" title="Atualizar sinais agora">
                <RefreshCw className="h-4 w-4" />
              </Button>
              
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 p-2">
                    <Filter className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[80vw] p-4" side="right">
                  <h3 className="text-lg font-medium mb-4">Filtros</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Buscar</h4>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                        <Input placeholder="Buscar por símbolo ou par..." className="pl-10" value={searchQuery} onChange={handleSearchChange} />
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Status</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant={statusFilter === "ALL" ? "default" : "outline"} size="sm" onClick={() => handleStatusFilter("ALL")} className="w-full">
                          Todos
                        </Button>
                        <Button variant={statusFilter === "ACTIVE" ? "default" : "outline"} size="sm" onClick={() => handleStatusFilter("ACTIVE")} className="w-full">
                          Ativos
                        </Button>
                        
                        <Button variant={statusFilter === "COMPLETED" ? "default" : "outline"} size="sm" onClick={() => handleStatusFilter("COMPLETED")} className="w-full">
                          Completados
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Ordenar por</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant={sortBy === "newest" ? "default" : "outline"} size="sm" onClick={() => handleSort("newest")} className="w-full">
                          Mais Recentes
                        </Button>
                        <Button variant={sortBy === "oldest" ? "default" : "outline"} size="sm" onClick={() => handleSort("oldest")} className="w-full">
                          Mais Antigos
                        </Button>
                      </div>
                    </div>
                    
                    <Button onClick={handleSubscribe} variant="outline" className="w-full">
                      <Bell className="mr-2 h-4 w-4" />
                      Receber Alertas
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div> : <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 sm:mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <Input placeholder="Buscar por símbolo ou par..." className="pl-10" value={searchQuery} onChange={handleSearchChange} />
              </div>
              
              <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size={isMobile ? "sm" : "default"} className={isMobile ? "h-9 px-2" : ""}>
                      <BarChart3 className="h-4 w-4 mr-1 sm:mr-2" />
                      {!isMobile && (statusFilter === "ALL" ? "Todos Status" : statusFilter)}
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
            </div>}
          
          {!isLoading && showEmptyState && <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-8 text-center mb-4 sm:mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-blue-100 text-blue-600 mb-2 sm:mb-4">
                <Zap className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">Gere seus primeiros sinais monster</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base max-w-md mx-auto mb-3 sm:mb-6">
                Clique no botão "Gerar Sinais Monster" para usar análise multi-timeframe avançada e encontrar as melhores oportunidades.
              </p>
              <Button onClick={handleGenerateSignals} disabled={isGenerating}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Analisando Monster...' : 'Gerar Sinais Monster Agora'}
              </Button>
            </div>}
          
          {isLoading ? <div className="flex justify-center items-center h-64">
              <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
            </div> : filteredSignals.length > 0 && <>
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">Sinais ({filteredSignals.length})</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredSignals.map(signal => <SignalCard key={signal.id} signal={signal} />)}
                </div>
              </>}
        </TabsContent>
        
        <TabsContent value="classic">
          <ClassicSignalsTab />
        </TabsContent>
        
        <TabsContent value="hybrid">
          <HybridSignalsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
export default SignalsDashboard;