
import { useState } from "react";
import { SignalStatus } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { ArrowUpRight, ArrowDownRight, DollarSign, Percent, TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchPerformanceMetrics, fetchSignals } from "@/lib/signalsApi";
import { useToast } from "@/components/ui/use-toast";

const PerformanceDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  // Fetch performance metrics
  const { data: performanceData = {
    totalSignals: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    symbolsData: [],
    signalTypesData: []
  }, isLoading: metricsLoading } = useQuery({
    queryKey: ['performance'],
    queryFn: fetchPerformanceMetrics,
    onError: () => {
      toast({
        title: "Error fetching performance data",
        description: "Could not load performance metrics. Please try again later.",
        variant: "destructive",
      });
    }
  });

  // Fetch signals for detailed analysis
  const { data: signals = [], isLoading: signalsLoading } = useQuery({
    queryKey: ['signals', 'performance'],
    queryFn: () => fetchSignals({ days: 90 }),
    onError: () => {
      toast({
        title: "Error fetching signals",
        description: "Could not load signal data. Please try again later.",
        variant: "destructive",
      });
    }
  });

  const isLoading = metricsLoading || signalsLoading;

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Calculate profit percentage based on signal result (1 = win, 0 = loss)
  const calculateProfit = (signal: any) => {
    if (signal.result === 1) {
      return 3; // Assuming 3% profit on winning trades
    } else if (signal.result === 0) {
      return -1.5; // Assuming 1.5% loss on losing trades
    }
    return 0;
  };

  // Prepare data for monthly performance chart
  const prepareMonthlyPerformanceData = () => {
    const completedSignals = signals.filter(signal => signal.status === "COMPLETED");
    const monthlyData: Record<string, { month: string; profit: number }> = {};

    completedSignals.forEach((signal) => {
      const date = new Date(signal.createdAt);
      const monthYear = `${date.toLocaleString("default", {
        month: "short",
      })} ${date.getFullYear()}`;

      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = { month: monthYear, profit: 0 };
      }

      monthlyData[monthYear].profit += calculateProfit(signal);
    });

    return Object.values(monthlyData);
  };

  // Prepare data for trade type distribution
  const prepareTradeTypeData = () => {
    const longTrades = signals.filter(signal => signal.direction === "BUY").length;
    const shortTrades = signals.filter(signal => signal.direction === "SELL").length;

    return [
      {
        name: "Long",
        value: longTrades,
        color: "#10b981",
      },
      {
        name: "Short",
        value: shortTrades,
        color: "#ef4444",
      },
    ];
  };

  // Prepare data for win/loss ratio
  const prepareWinLossData = () => {
    return [
      {
        name: "Winning",
        value: performanceData.winningTrades,
        color: "#10b981",
      },
      {
        name: "Losing",
        value: performanceData.losingTrades,
        color: "#ef4444",
      },
    ];
  };

  // Prepare data for recent trade history
  const prepareTradeHistoryData = () => {
    return signals
      .filter(signal => signal.status === "COMPLETED")
      .slice(0, 10)
      .map((signal, index) => ({
        name: `Trade ${index + 1}`,
        profit: calculateProfit(signal),
        symbol: signal.symbol,
      }));
  };

  const monthlyPerformanceData = prepareMonthlyPerformanceData();
  const tradeTypeData = prepareTradeTypeData();
  const winLossData = prepareWinLossData();
  const tradeHistoryData = prepareTradeHistoryData();

  // Calculate overall performance
  const totalProfit = signals
    .filter(signal => signal.status === "COMPLETED")
    .reduce((sum, signal) => sum + calculateProfit(signal), 0);

  const avgProfit = performanceData.totalSignals > 0 
    ? totalProfit / performanceData.totalSignals 
    : 0;
    
  const activeTrades = signals.filter(signal => signal.status === "ACTIVE").length;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-[80vh]">
        <p className="text-xl text-muted-foreground">Carregando dados de performance...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard de Performance</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lucro Total</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <DollarSign className="mr-2 h-5 w-5 text-muted-foreground" />
              {totalProfit.toFixed(2)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex items-center">
              {totalProfit > 0 ? (
                <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
              ) : (
                <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
              )}
              De {performanceData.totalSignals} operações concluídas
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Taxa de Acerto</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Percent className="mr-2 h-5 w-5 text-muted-foreground" />
              {performanceData.winRate.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Baseado em {performanceData.totalSignals} operações concluídas
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lucro Médio</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <DollarSign className="mr-2 h-5 w-5 text-muted-foreground" />
              {avgProfit.toFixed(2)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex items-center">
              {avgProfit > 0 ? (
                <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
              ) : (
                <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
              )}
              Por operação concluída
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Operações Ativas</CardDescription>
            <CardTitle className="text-2xl">
              {activeTrades}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              De um total de {signals.length} operações
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="monthly">Performance Mensal</TabsTrigger>
          <TabsTrigger value="trades">Histórico de Operações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tipos de Operação</CardTitle>
                <CardDescription>
                  Distribuição entre operações de compra e venda
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tradeTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {tradeTypeData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ganhos/Perdas</CardTitle>
                <CardDescription>
                  Distribuição entre operações ganhadoras e perdedoras
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={winLossData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {winLossData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance de Operações Recentes</CardTitle>
              <CardDescription>
                Lucro/perda das últimas 10 operações concluídas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tradeHistoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="symbol" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="profit"
                      name="Lucro (%)"
                      fill={(entry) => entry.profit >= 0 ? "#10b981" : "#ef4444"}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>Performance Mensal</CardTitle>
              <CardDescription>
                Lucro/perda agregado por mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="profit"
                      name="Lucro (%)"
                      fill={(entry) => entry.profit >= 0 ? "#10b981" : "#ef4444"}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trades">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Operações</CardTitle>
              <CardDescription>
                Visualização detalhada de todas as operações concluídas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Símbolo</th>
                      <th className="text-left py-3 px-4">Tipo</th>
                      <th className="text-left py-3 px-4">Preço de Entrada</th>
                      <th className="text-left py-3 px-4">Resultado</th>
                      <th className="text-left py-3 px-4">Data</th>
                      <th className="text-right py-3 px-4">Lucro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signals
                      .filter(signal => signal.status === "COMPLETED")
                      .map((signal) => (
                        <tr key={signal.id} className="border-b">
                          <td className="py-3 px-4">{signal.symbol}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                signal.direction === "BUY"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {signal.direction === "BUY" ? (
                                <TrendingUp className="mr-1 h-3 w-3" />
                              ) : (
                                <TrendingDown className="mr-1 h-3 w-3" />
                              )}
                              {signal.direction === "BUY" ? "COMPRA" : "VENDA"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {signal.entryPrice?.toFixed(2) || "-"}
                          </td>
                          <td className="py-3 px-4">
                            {signal.result === 1 ? "GANHO" : "PERDA"}
                          </td>
                          <td className="py-3 px-4">
                            {formatDate(signal.createdAt)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-medium ${
                              calculateProfit(signal) >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {calculateProfit(signal) >= 0 ? "+" : ""}
                            {calculateProfit(signal).toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceDashboard;
