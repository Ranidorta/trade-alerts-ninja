import React, { useState, useEffect, useCallback } from "react";
import { TradingSignal } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart4, 
  Calendar, 
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Database,
  Filter,
  Search,
  SlidersHorizontal,
  CheckCircle,
  List,
  CalendarIcon,
  X
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  Legend
} from "recharts";
import ApiConnectionError from "@/components/signals/ApiConnectionError";
import { config } from "@/config/env";
import { 
  getSignalsHistory, 
  updateAllSignalsStatus, 
  analyzeSignalsHistory,
  updateSignalInHistory
} from "@/lib/signalHistoryService";
import { verifySingleSignal, verifyAllSignals } from "@/lib/signalVerification";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import SignalHistoryTable from "@/components/signals/SignalHistoryTable";
import { getSignalHistory } from "@/lib/signal-storage";
import SignalsSummary from "@/components/signals/SignalsSummary";

const SignalsHistory = () => {
  const [activeTab, setActiveTab] = useState<"signals" | "performance">("signals");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const [forcingLocalMode, setForcingLocalMode] = useState(
    localStorage.getItem("force_local_mode") === "true"
  );
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [symbolFilter, setSymbolFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "profit" | "symbol">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [verifying, setVerifying] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(60); // em segundos
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [refreshCountdown, setRefreshCountdown] = useState<number>(autoRefreshInterval);

  const getPerformanceData = () => {
    if (!performanceMetrics) return [];
    
    return [
      { name: 'Vencedores', value: performanceMetrics.winningTrades, color: '#10b981' },
      { name: 'Parciais', value: performanceMetrics.winningTrades - performanceMetrics.losingTrades, color: '#f59e0b' },
      { name: 'Perdedores', value: performanceMetrics.losingTrades, color: '#ef4444' },
      { name: 'Falsos', value: signals.filter(s => s.result === "missed").length, color: '#9ca3af' }
    ];
  };

  const getDailyPerformanceData = () => {
    return performanceMetrics?.dailyData?.slice(-30) || [];
  };

  const loadSignalsHistory = useCallback(async () => {
    setLoading(true);
    try {
      let historySignals = getSignalHistory();
      
      if (!historySignals || historySignals.length === 0) {
        historySignals = getSignalsHistory();
      }
      
      const updatedSignals = await updateAllSignalsStatus();
      
      setSignals(updatedSignals);
      
      const symbols = [...new Set(updatedSignals.map(signal => signal.symbol))];
      setAvailableSymbols(symbols.sort());
      
      const metrics = analyzeSignalsHistory();
      setPerformanceMetrics(metrics);
      
      if (loading) {
        toast({
          title: "Histórico atualizado",
          description: "Dados dos sinais foram atualizados com sucesso.",
        });
      }
    } catch (err: any) {
      console.error("Erro ao carregar histórico de sinais:", err);
      setError(err);
      
      toast({
        variant: "destructive",
        title: "Erro ao carregar histórico",
        description: err.message || "Ocorreu um erro ao atualizar o histórico de sinais.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, loading]);

  useEffect(() => {
    loadSignalsHistory();
  }, []);

  useEffect(() => {
    let intervalId: number | undefined;
    let countdownId: number | undefined;
    
    const updateCountdown = () => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    };
    
    if (autoRefresh) {
      intervalId = window.setInterval(() => {
        console.log("Atualizando histórico automaticamente...");
        loadSignalsHistory();
        setRefreshCountdown(autoRefreshInterval);
      }, autoRefreshInterval * 1000);
      
      countdownId = window.setInterval(updateCountdown, 1000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (countdownId) {
        clearInterval(countdownId);
      }
    };
  }, [autoRefresh, autoRefreshInterval, loadSignalsHistory]);

  const handleRefresh = async () => {
    toast({
      title: "Atualizando dados",
      description: "Atualizando status do histórico de sinais...",
    });
    
    await loadSignalsHistory();
    setRefreshCountdown(autoRefreshInterval);
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    setRefreshCountdown(autoRefreshInterval);
    
    toast({
      title: autoRefresh ? "Atualização automática desativada" : "Atualização automática ativada",
      description: autoRefresh 
        ? "Os sinais não serão mais atualizados automaticamente." 
        : `Os sinais serão atualizados a cada ${autoRefreshInterval} segundos.`,
    });
  };

  const handleVerify = async () => {
    setVerifying(true);
    toast({
      title: "Verificando sinais",
      description: "Verificando apenas sinais sem resultado...",
    });
    
    try {
      const signalsToVerify = signals.filter(signal => signal.result === undefined);
      
      if (signalsToVerify.length === 0) {
        toast({
          title: "Nenhum sinal para verificar",
          description: "Todos os sinais já possuem resultados.",
          variant: "default",
        });
        setVerifying(false);
        return;
      }
      
      const verifiedSignals = await verifyAllSignals(signalsToVerify);
      
      const updatedSignals = signals.map(signal => {
        const verifiedSignal = verifiedSignals.find(vs => vs.id === signal.id);
        return verifiedSignal || signal;
      });
      
      setSignals(updatedSignals);
      
      const metrics = analyzeSignalsHistory();
      setPerformanceMetrics(metrics);
      
      toast({
        title: "Verificação concluída",
        description: `${signalsToVerify.length} sinais verificados e atualizados.`,
        variant: "default",
      });
    } catch (err) {
      console.error("Erro ao verificar sinais:", err);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao verificar sinais com dados da Binance.",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleLocalModeClick = () => {
    localStorage.setItem("force_local_mode", "true");
    setForcingLocalMode(true);
    
    toast({
      title: "Modo Local Ativado",
      description: "Utilizando dados armazenados localmente.",
    });
    
    window.location.reload();
  };

  const handleVerifySingleSignal = async (signalId: string) => {
    try {
      const signalToVerify = signals.find(s => s.id === signalId);
      
      if (!signalToVerify) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Sinal não encontrado."
        });
        return;
      }
      
      if (signalToVerify.result !== undefined) {
        toast({
          variant: "default",
          title: "Informação",
          description: "Este sinal já possui um resultado."
        });
        return;
      }
      
      const verifiedSignal = await verifySingleSignal(signalToVerify);
      
      if (verifiedSignal) {
        const updatedSignal = updateSignalInHistory(signalId, verifiedSignal);
        
        setSignals(prevSignals => prevSignals.map(signal => 
          signal.id === signalId ? { ...signal, ...verifiedSignal } : signal
        ));
        
        toast({
          variant: "default",
          title: "Verificação concluída",
          description: `Sinal ${signalId} verificado com sucesso.`
        });
      }
    } catch (err: any) {
      console.error("Erro ao verificar sinal único:", err);
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Erro ao verificar o sinal: ${err.message || "Erro desconhecido"}`
      });
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSymbolFilter("all");
    setResultFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    toast({
      title: "Filtros limpos",
      description: "Todos os filtros foram removidos.",
    });
  };

  const getFilteredSignals = () => {
    let filtered = [...signals];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(signal => 
        signal.symbol.toLowerCase().includes(term) ||
        signal.strategy?.toLowerCase().includes(term)
      );
    }
    
    if (symbolFilter && symbolFilter !== "all") {
      filtered = filtered.filter(signal => signal.symbol === symbolFilter);
    }
    
    if (resultFilter === "win") {
      filtered = filtered.filter(signal => 
        signal.result === 1 || 
        signal.result === "win"
      );
    } else if (resultFilter === "loss") {
      filtered = filtered.filter(signal => 
        signal.result === 0 || 
        signal.result === "loss"
      );
    } else if (resultFilter === "partial") {
      filtered = filtered.filter(signal => 
        signal.result === "partial"
      );
    } else if (resultFilter === "missed") {
      filtered = filtered.filter(signal => signal.result === "missed");
    } else if (resultFilter === "pending") {
      filtered = filtered.filter(signal => signal.result === undefined);
    }
    
    if (dateFrom) {
      filtered = filtered.filter(signal => 
        signal.createdAt && new Date(signal.createdAt) >= dateFrom
      );
    }
    
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(signal => 
        signal.createdAt && new Date(signal.createdAt) <= endOfDay
      );
    }
    
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === "date") {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        comparison = dateA - dateB;
      } 
      else if (sortBy === "profit") {
        const profitA = a.profit || 0;
        const profitB = b.profit || 0;
        comparison = profitA - profitB;
      }
      else if (sortBy === "symbol") {
        comparison = a.symbol.localeCompare(b.symbol);
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return filtered;
  };

  const filteredSignals = getFilteredSignals();
  const activeFiltersCount = [
    searchTerm, 
    symbolFilter !== "all", 
    resultFilter !== "all", 
    dateFrom, 
    dateTo
  ].filter(Boolean).length;

  const formatDateRange = () => {
    if (dateFrom && dateTo) {
      return `${format(dateFrom, 'dd/MM/yyyy')} - ${format(dateTo, 'dd/MM/yyyy')}`;
    } else if (dateFrom) {
      return `A partir de ${format(dateFrom, 'dd/MM/yyyy')}`;
    } else if (dateTo) {
      return `Até ${format(dateTo, 'dd/MM/yyyy')}`;
    }
    return "Selecionar período";
  };

  if (error && !forcingLocalMode && error.message && (error.message.includes("fetch") || error.message.includes("network"))) {
    return <ApiConnectionError 
      apiUrl={config.signalsApiUrl || "https://trade-alerts-backend.onrender.com"} 
      onLocalModeClick={handleLocalModeClick}
    />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Histórico de Sinais</h1>
          <p className="text-muted-foreground">
            Histórico detalhado dos sinais gerados com informações de acertos
            {forcingLocalMode && <span className="ml-2 text-amber-500">(Modo Local)</span>}
          </p>
        </div>
        
        <div className="flex gap-2">
          {forcingLocalMode && (
            <button 
              onClick={() => {
                localStorage.removeItem("force_local_mode");
                window.location.reload();
              }}
              className="px-4 py-2 bg-amber-500 text-white rounded-md flex items-center gap-2"
            >
              <RefreshCw className="h-5 w-5" />
              Tentar API Novamente
            </button>
          )}
          
          <Button 
            onClick={handleVerify}
            variant="outline"
            className="flex items-center gap-2"
            disabled={verifying || signals.every(s => s.result !== undefined)}
          >
            <CheckCircle className="h-5 w-5" />
            {verifying ? 'Verificando...' : 'Verificar Resultados'}
          </Button>
          
          <Button 
            onClick={toggleAutoRefresh}
            variant={autoRefresh ? "default" : "outline"}
            className="flex items-center gap-2"
          >
            <Clock className="h-5 w-5" />
            {autoRefresh ? 'Auto (Ligado)' : 'Auto (Desligado)'}
          </Button>
          
          <Button 
            onClick={handleRefresh}
            className="flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Atualizando...' : 'Atualizar Histórico'}
          </Button>
        </div>
      </div>

      {autoRefresh && (
        <div className="mb-6">
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div className="flex items-center">
                  <p className="mr-2">
                    Atualização automática ativa.
                  </p>
                  <span className="text-sm font-medium bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    Próxima atualização em {refreshCountdown}s
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {error && !error.message.includes("fetch") && !error.message.includes("network") && (
        <Card className="bg-destructive/10 border-destructive/20 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-destructive mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-medium text-destructive mb-2">Erro ao carregar sinais</h3>
                <p className="text-destructive/80 mb-4">
                  {error.message || "Ocorreu um erro desconhecido ao tentar carregar os sinais."}
                </p>
                <button 
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
                >
                  Tentar Novamente
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {forcingLocalMode && (
        <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-amber-500" />
              <p className="text-amber-700 dark:text-amber-300">
                Modo Local Ativado: Utilizando dados armazenados localmente. Alguns dados podem estar desatualizados.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-6">
        <Card className="bg-card">
          <CardContent className="p-6">
            <SignalsSummary signals={signals} showDetails={true} />
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(value: "signals" | "performance") => setActiveTab(value)} className="mb-4">
        <div className="flex justify-end mb-4">
          <TabsList>
            <TabsTrigger 
              value="signals" 
              className="flex items-center gap-1"
            >
              <List className="w-4 h-4" />
              Sinais
            </TabsTrigger>
            <TabsTrigger 
              value="performance" 
              className="flex items-center gap-1"
            >
              <BarChart4 className="w-4 h-4" />
              Performance
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="signals">
          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Filtros</CardTitle>
                <CardDescription>Filtre os sinais por diferentes critérios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por símbolo ou estratégia..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Select value={symbolFilter} onValueChange={setSymbolFilter}>
                      <SelectTrigger className="w-full">
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          <SelectValue placeholder="Filtrar por símbolo" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os símbolos</SelectItem>
                        {availableSymbols.map(symbol => (
                          <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Select value={resultFilter} onValueChange={setResultFilter}>
                      <SelectTrigger className="w-full">
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          <SelectValue placeholder="Filtrar por resultado" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os resultados</SelectItem>
                        <SelectItem value="win">Vencedores</SelectItem>
                        <SelectItem value="partial">Parciais</SelectItem>
                        <SelectItem value="loss">Perdedores</SelectItem>
                        <SelectItem value="missed">Falsos</SelectItem>
                        <SelectItem value="pending">Pendentes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formatDateRange()}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="flex flex-col space-y-4 p-3">
                          <div className="space-y-2">
                            <h4 className="font-medium">Data inicial</h4>
                            <CalendarComponent 
                              mode="single"
                              selected={dateFrom}
                              onSelect={setDateFrom}
                              className="border rounded-md"
                              locale={ptBR}
                            />
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-medium">Data final</h4>
                            <CalendarComponent
                              mode="single"
                              selected={dateTo}
                              onSelect={setDateTo}
                              disabled={(date) => dateFrom ? date < dateFrom : false}
                              className="border rounded-md"
                              locale={ptBR}
                            />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div>
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger>
                        <div className="flex items-center gap-2">
                          <SlidersHorizontal className="h-4 w-4" />
                          <SelectValue placeholder="Ordenar por" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Data</SelectItem>
                        <SelectItem value="profit">Lucro</SelectItem>
                        <SelectItem value="symbol">Símbolo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={clearFilters}
                      disabled={activeFiltersCount === 0}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Limpar filtros
                      {activeFiltersCount > 0 && (
                        <Badge variant="secondary" className="ml-2">{activeFiltersCount}</Badge>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="py-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em]"></div>
              <p className="mt-2 text-sm text-muted-foreground">Carregando sinais...</p>
            </div>
          ) : filteredSignals.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Nenhum sinal encontrado. Gere sinais na aba "Sinais" primeiro.</p>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Sinais</CardTitle>
                <CardDescription>
                  {filteredSignals.length} {filteredSignals.length === 1 ? 'sinal encontrado' : 'sinais encontrados'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <SignalHistoryTable 
                  signals={filteredSignals} 
                  onVerifySingleSignal={handleVerifySingleSignal} 
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Performance dos Sinais</CardTitle>
              <CardDescription>
                Análise do desempenho dos sinais gerados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 w-full flex items-center justify-center">
                  <p className="text-muted-foreground">Carregando dados de performance...</p>
                </div>
              ) : signals.length === 0 ? (
                <div className="h-64 w-full flex items-center justify-center">
                  <p className="text-muted-foreground">Nenhum sinal disponível para análise.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Distribuição de Resultados</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={getPerformanceData()}
                            margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip 
                              formatter={(value: any) => [value, "Sinais"]}
                              labelFormatter={(value) => `${value}`}
                            />
                            <Legend />
                            <Bar dataKey="value" name="Quantidade de Sinais">
                              {getPerformanceData().map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.color} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4">Desempenho por Dia</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={getDailyPerformanceData()}
                            margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                            stackOffset="sign"
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <RechartsTooltip />
                            <Legend />
                            <Bar dataKey="wins" name="Vencedores" stackId="a" fill="#10b981" />
                            <Bar dataKey="losses" name="Perdedores" stackId="a" fill="#ef4444" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                  
                  {performanceMetrics && performanceMetrics.symbolPerformance && (
                    <div className="mt-8">
                      <h3 className="text-lg font-medium mb-4">Desempenho por Símbolo</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                          <thead className="bg-muted/50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                S��mbolo
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Total
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Vencedores
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Perdedores
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Taxa de Acerto
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {performanceMetrics.symbolPerformance.map((item: any) => (
                              <tr key={item.symbol}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  {item.symbol}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {item.total}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {item.wins}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {item.losses}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <span 
                                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      item.winRate >= 70 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                                      item.winRate >= 50 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 
                                      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                    }`}
                                  >
                                    {item.winRate.toFixed(2)}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-8">
                    <h3 className="text-lg font-medium mb-4">Estatísticas Gerais</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Métrica
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Valor
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              Total de Sinais
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {signals.length}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              Sinais Completados
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {signals.filter(s => s.status === "COMPLETED").length}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              Sinais Vencedores
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {signals.filter(s => s.result === 1).length}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              Sinais Perdedores
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {signals.filter(s => s.result === 0).length}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              Taxa de Acerto
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span 
                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  performanceMetrics && performanceMetrics.winRate >= 70 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                                  performanceMetrics && performanceMetrics.winRate >= 50 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 
                                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                }`}
                              >
                                {performanceMetrics ? performanceMetrics.winRate.toFixed(2) : 0}%
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              Lucro Médio por Sinal
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {performanceMetrics ? performanceMetrics.avgProfit.toFixed(2) + "%" : "0%"}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SignalsHistory;
