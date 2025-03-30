
import { useState, useEffect, useCallback } from "react";
import { TradingSignal, SignalStatus } from "@/lib/types";
import { ArrowUpDown, BarChart3, Search, Bell, RefreshCw, Zap, Filter, Wallet, Users, FileText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { generateAllSignals } from "@/lib/apiServices";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTradingSignals } from "@/hooks/useTradingSignals";
import { saveSignalsToHistory } from "@/lib/signalHistoryService";
import { fetchSignals } from "@/lib/signalsApi";
import SignalCard from "@/components/SignalCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import DashboardCard from "@/components/signals/DashboardCard";
import SignalHistoryTable from "@/components/signals/SignalHistoryTable";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const [viewMode, setViewMode] = useState<"dashboard" | "list" | "table">("dashboard");
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

  // Calculate statistics for dashboard
  const activeSignalsCount = signals.filter(s => s.status === "ACTIVE").length;
  const completedSignalsCount = signals.filter(s => s.status === "COMPLETED").length;
  const successfulSignalsCount = signals.filter(s => s.result === 1).length;
  const profitableRate = signals.length > 0 ? (successfulSignalsCount / signals.length * 100).toFixed(1) : "0";
  
  // Prepare chart data
  const prepareChartData = () => {
    // Group signals by day and calculate success rate
    const last7Days = [...Array(7)].map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const daySignals = signals.filter(s => s.createdAt?.split('T')[0] === date);
      const successSignals = daySignals.filter(s => s.result === 1);
      const successRate = daySignals.length > 0 ? (successSignals.length / daySignals.length) * 100 : 0;
      
      return {
        date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        rate: successRate,
        count: daySignals.length
      };
    });
  };

  const chartData = prepareChartData();
  
  // Dashboard content
  const renderDashboard = () => {
    return (
      <div className="space-y-6">
        {/* Top cards row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard className="cursor-default">
            <div className="flex items-center mb-1">
              <Wallet className="mr-2 h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total de sinais</span>
            </div>
            <div className="text-3xl font-bold">{signals.length}</div>
          </DashboardCard>
          
          <DashboardCard className="cursor-default">
            <div className="flex items-center mb-1">
              <Zap className="mr-2 h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Sinais ativos</span>
            </div>
            <div className="text-3xl font-bold">{activeSignalsCount}</div>
          </DashboardCard>
          
          <DashboardCard className="cursor-default">
            <div className="flex items-center mb-1">
              <Users className="mr-2 h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Taxa de sucesso</span>
            </div>
            <div className="text-3xl font-bold text-green-600">{profitableRate}%</div>
          </DashboardCard>
          
          <DashboardCard className="cursor-default">
            <div className="flex items-center mb-1">
              <FileText className="mr-2 h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Sinais completados</span>
            </div>
            <div className="text-3xl font-bold">{completedSignalsCount}</div>
          </DashboardCard>
        </div>
        
        {/* Middle row with chart and formation status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <DashboardCard className="lg:col-span-2 cursor-default h-64">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Performance dos sinais</h3>
              <span className="text-xs text-muted-foreground">Últimos 7 dias vs semana anterior</span>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Taxa de sucesso']} 
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </DashboardCard>
          
          <DashboardCard className="cursor-default">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Status de processamento</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Em progresso</span>
                    <span className="text-sm">80%</span>
                  </div>
                  <Progress value={80} className="h-2" />
                </div>
                
                <p className="text-sm text-muted-foreground mt-6">
                  Tempo estimado de processamento:<br />
                  <strong>4-5 business days</strong>
                </p>
                
                <Button variant="outline" className="w-full mt-4" onClick={handleManualRefresh}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Atualizar status
                </Button>
              </div>
            </div>
          </DashboardCard>
        </div>
        
        {/* Bottom row with tasks and recent signals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <DashboardCard className="cursor-default">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Lista de tarefas</h3>
            <div className="space-y-2">
              {[
                { icon: <Bell className="h-4 w-4" />, title: "Configurar alertas", time: "12:00" },
                { icon: <BarChart3 className="h-4 w-4" />, title: "Verificar performance", time: "15:30" },
                { icon: <RefreshCw className="h-4 w-4" />, title: "Atualizar sinais", time: "17:00" }
              ].map((task, idx) => (
                <div key={idx} className="flex items-center p-2 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-md">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                    {task.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">Hoje às {task.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>
          
          <DashboardCard className="lg:col-span-2 cursor-default">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Sinais recentes</h3>
              <Button variant="outline" size="sm" onClick={() => setViewMode("list")}>
                Ver todos
              </Button>
            </div>
            
            <div className="space-y-2">
              {signals.slice(0, 5).map(signal => (
                <div key={signal.id} className="flex items-center justify-between p-2 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-md">
                  <div className="flex items-center">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${
                      signal.direction === "BUY" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    }`}>
                      {signal.direction === "BUY" ? "B" : "S"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{signal.symbol}</p>
                      <p className="text-xs text-muted-foreground">
                        {signal.createdAt ? formatDistanceToNow(new Date(signal.createdAt), { addSuffix: true, locale: ptBR }) : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{signal.entryPrice}</p>
                    <p className={`text-xs ${
                      signal.profit && signal.profit > 0 ? "text-green-500" : 
                      signal.profit && signal.profit < 0 ? "text-red-500" : "text-muted-foreground"
                    }`}>
                      {signal.profit ? `${signal.profit > 0 ? '+' : ''}${signal.profit}%` : 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
              
              {signals.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">Nenhum sinal encontrado</p>
                  <Button 
                    onClick={handleGenerateSignals} 
                    variant="default" 
                    className="mt-2"
                    disabled={isGenerating}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Gerar Sinais
                  </Button>
                </div>
              )}
            </div>
          </DashboardCard>
        </div>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 sm:mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Bom dia, Trader!</h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
            Aqui está um resumo dos seus sinais de trading
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
          
          {!isMobile && (
            <Button 
              onClick={handleSubscribe} 
              variant="outline"
              className="flex-1 md:flex-auto"
            >
              <Bell className="mr-2 h-4 w-4" />
              Receber Alertas
            </Button>
          )}
        </div>
      </div>
      
      <div className="mb-6 flex items-center space-x-2">
        <Button 
          variant={viewMode === "dashboard" ? "default" : "outline"} 
          size="sm" 
          onClick={() => setViewMode("dashboard")}
        >
          Dashboard
        </Button>
        <Button 
          variant={viewMode === "list" ? "default" : "outline"} 
          size="sm" 
          onClick={() => setViewMode("list")}
        >
          Lista de Sinais
        </Button>
        <Button 
          variant={viewMode === "table" ? "default" : "outline"} 
          size="sm" 
          onClick={() => setViewMode("table")}
        >
          Tabela
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <>
          {viewMode === "dashboard" && renderDashboard()}
          
          {viewMode === "list" && (
            <>
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
              </div>
          
              {filteredSignals.length > 0 ? (
                <>
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold">Sinais ({filteredSignals.length})</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSignals.map((signal) => (
                      <SignalCard key={signal.id} signal={signal} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-8 text-center mb-4 sm:mb-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-blue-100 text-blue-600 mb-2 sm:mb-4">
                    <Zap className="h-6 w-6 sm:h-8 sm:w-8" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">Nenhum sinal encontrado</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base max-w-md mx-auto mb-3 sm:mb-6">
                    Clique no botão "Gerar Sinais" para analisar o mercado e encontrar oportunidades de trading.
                  </p>
                  <Button onClick={handleGenerateSignals} disabled={isGenerating}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                    {isGenerating ? 'Analisando Mercado...' : 'Gerar Sinais Agora'}
                  </Button>
                </div>
              )}
            </>
          )}
          
          {viewMode === "table" && (
            <SignalHistoryTable signals={filteredSignals} />
          )}
        </>
      )}
    </div>
  );
};

export default SignalsDashboard;
