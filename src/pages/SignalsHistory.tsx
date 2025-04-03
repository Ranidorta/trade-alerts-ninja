import React, { useState, useEffect } from "react";
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
  List 
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
  analyzeSignalsHistory
} from "@/lib/signalHistoryService";
import { verifyAllSignals } from "@/lib/signalVerification";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SignalHistoryTable from "@/components/signals/SignalHistoryTable";
import { getSignalHistory } from "@/lib/signal-storage";

const SignalsHistory = () => {
  const [activeTab, setActiveTab] = useState<"signals" | "performance">("signals");
  const [resultTab, setResultTab] = useState("all");
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const [forcingLocalMode, setForcingLocalMode] = useState(
    localStorage.getItem("force_local_mode") === "true"
  );
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "profit" | "symbol">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadSignalsHistory();
  }, []);

  const loadSignalsHistory = async () => {
    setLoading(true);
    try {
      let historySignals = getSignalHistory();
      
      if (!historySignals || historySignals.length === 0) {
        historySignals = getSignalsHistory();
      }
      
      const updatedSignals = await updateAllSignalsStatus();
      
      setSignals(updatedSignals);
      
      const metrics = analyzeSignalsHistory();
      setPerformanceMetrics(metrics);
      
    } catch (err: any) {
      console.error("Error loading signal history:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    toast({
      title: "Atualizando dados",
      description: "Atualizando status dos sinais históricos...",
    });
    
    await loadSignalsHistory();
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
      console.error("Error verifying signals:", err);
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

  const getFilteredSignals = () => {
    let filtered = [...signals];
    
    if (resultTab === "profit") {
      filtered = filtered.filter(signal => signal.result === 1);
    } else if (resultTab === "loss") {
      filtered = filtered.filter(signal => signal.result === 0);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(signal => 
        signal.symbol.toLowerCase().includes(term) ||
        signal.strategy?.toLowerCase().includes(term)
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

  const getDailyPerformanceData = () => {
    const dailyData: {[key: string]: {date: string, wins: number, losses: number}} = {};
    
    signals.forEach(signal => {
      if (!signal.createdAt) return;
      
      const date = new Date(signal.createdAt).toLocaleDateString();
      
      if (!dailyData[date]) {
        dailyData[date] = { date, wins: 0, losses: 0 };
      }
      
      if (signal.result === 1) {
        dailyData[date].wins += 1;
      } else if (signal.result === 0) {
        dailyData[date].losses += 1;
      }
    });
    
    return Object.values(dailyData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  const getPerformanceData = () => {
    const winningSignals = signals.filter(s => s.result === 1);
    const losingSignals = signals.filter(s => s.result === 0);
    const pendingSignals = signals.filter(s => s.result === undefined);

    return [
      { name: "Vencedores", value: winningSignals.length, color: "#10b981" },
      { name: "Perdedores", value: losingSignals.length, color: "#ef4444" },
      { name: "Pendentes", value: pendingSignals.length, color: "#f59e0b" }
    ];
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
            Histórico detalhado dos sinais gerados com informações sobre alvos atingidos
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
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-5 w-5" />
            Atualizar Status
          </Button>
        </div>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Sinais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{signals.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Sinais Vencedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {signals.filter(s => s.result === 1).length}
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Sinais Perdedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {signals.filter(s => s.result === 0).length}
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Acerto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceMetrics ? performanceMetrics.winRate.toFixed(2) : 0}%
            </div>
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
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="col-span-1 md:col-span-2">
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
                    <Select value={resultTab} onValueChange={setResultTab}>
                      <SelectTrigger>
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          <SelectValue placeholder="Filtrar por" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="profit">Vencedores</SelectItem>
                        <SelectItem value="loss">Perdedores</SelectItem>
                      </SelectContent>
                    </Select>
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
              <CardContent className="p-0">
                <SignalHistoryTable signals={filteredSignals} />
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
                                Símbolo
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
