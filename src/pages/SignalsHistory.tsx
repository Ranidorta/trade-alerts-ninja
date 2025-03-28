
import React, { useState, useEffect } from "react";
import { TradingSignal } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTradingSignals } from "@/hooks/useTradingSignals";
import { format } from "date-fns";
import { 
  ArrowUp, 
  ArrowDown, 
  Check, 
  X, 
  BarChart4, 
  Calendar, 
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle
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

const SignalsHistory = () => {
  const [activeTab, setActiveTab] = useState<"signals" | "performance">("signals");
  const [resultTab, setResultTab] = useState("all");
  const { signals, loading, error, fetchSignals } = useTradingSignals();
  const { toast } = useToast();

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  const handleRefresh = () => {
    fetchSignals();
    toast({
      title: "Atualizando dados",
      description: "Buscando os sinais mais recentes...",
    });
  };

  // Filter signals based on result tab
  const filteredSignals = signals.filter(signal => {
    if (resultTab === "all") return true;
    if (resultTab === "profit") return signal.result === 1; // Winning signals
    if (resultTab === "loss") return signal.result === 0; // Losing signals
    return true;
  });

  // Calculate performance metrics
  const winningSignals = signals.filter(s => s.result === 1);
  const losingSignals = signals.filter(s => s.result === 0);
  const pendingSignals = signals.filter(s => s.result === undefined);
  
  const winRate = signals.length > 0 
    ? ((winningSignals.length / (winningSignals.length + losingSignals.length)) * 100).toFixed(2)
    : "0";

  // Prepare chart data
  const performanceData = [
    { name: "Vencedores", value: winningSignals.length, color: "#10b981" },
    { name: "Perdedores", value: losingSignals.length, color: "#ef4444" },
    { name: "Pendentes", value: pendingSignals.length, color: "#f59e0b" }
  ];
  
  // For daily performance chart
  const getDailyPerformanceData = () => {
    const dailyData: {[key: string]: {date: string, wins: number, losses: number}} = {};
    
    signals.forEach(signal => {
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

  // Format price with 2 decimal places
  const formatPrice = (price?: number) => {
    return price !== undefined ? price.toFixed(2) : "N/A";
  };

  // Verifica se houve erro de conexão com a API
  if (error && error.message && error.message.includes("fetch")) {
    return <ApiConnectionError apiUrl={config.signalsApiUrl || "https://trade-alerts-backend.onrender.com"} />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Histórico de Sinais</h1>
          <p className="text-muted-foreground">
            Histórico detalhado dos sinais gerados com informações sobre alvos atingidos
          </p>
        </div>
        
        <button 
          onClick={handleRefresh}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md flex items-center gap-2"
        >
          <RefreshCw className="h-5 w-5" />
          Atualizar
        </button>
      </div>

      {/* Exibe mensagem de erro caso ocorra algum erro diferente de falha de conexão */}
      {error && !error.message.includes("fetch") && (
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

      {/* Summary Cards */}
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
              {winningSignals.length}
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
              {losingSignals.length}
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Acerto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs (Signals vs Performance) */}
      <Tabs value={activeTab} onValueChange={(value: "signals" | "performance") => setActiveTab(value)} className="mb-4">
        <div className="flex justify-end mb-4">
          <TabsList>
            <TabsTrigger value="signals" className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Sinais
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-1">
              <BarChart4 className="w-4 h-4" />
              Performance
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="signals">
          {/* Result Filter Tabs */}
          <div className="flex mb-4">
            <TabsList>
              <TabsTrigger 
                value="all" 
                onClick={() => setResultTab("all")}
                className={resultTab === "all" ? "bg-muted" : ""}
              >
                Todos
              </TabsTrigger>
              <TabsTrigger 
                value="profit" 
                onClick={() => setResultTab("profit")}
                className={resultTab === "profit" ? "bg-muted" : ""}
              >
                Vencedores
              </TabsTrigger>
              <TabsTrigger 
                value="loss" 
                onClick={() => setResultTab("loss")}
                className={resultTab === "loss" ? "bg-muted" : ""}
              >
                Perdedores
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Signals Table */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-0">
              <CardTitle className="text-xl">Histórico de Sinais Detalhado</CardTitle>
              <CardDescription>
                Registro completo dos sinais com detalhes sobre alvos atingidos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Carregando sinais...</p>
                </div>
              ) : filteredSignals.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">Nenhum sinal encontrado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Par</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Entrada</TableHead>
                        <TableHead>Stop Loss</TableHead>
                        <TableHead className="text-center">TP1</TableHead>
                        <TableHead className="text-center">TP2</TableHead>
                        <TableHead className="text-center">TP3</TableHead>
                        <TableHead className="text-center">Resultado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSignals.map((signal) => {
                        const isWin = signal.result === 1;
                        const isLoss = signal.result === 0;
                        const isPending = signal.result === undefined;
                        
                        // Generate formatted date time
                        let dateTime = "Data desconhecida";
                        try {
                          if (signal.createdAt) {
                            dateTime = format(new Date(signal.createdAt), "dd/MM/yyyy HH:mm");
                          }
                        } catch (e) {
                          console.error("Error formatting date:", e);
                        }
                        
                        return (
                          <TableRow 
                            key={signal.id}
                            className={
                              isWin ? "bg-green-50 dark:bg-green-900/20" : 
                              isLoss ? "bg-red-50 dark:bg-red-900/20" : ""
                            }
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-2 opacity-70" />
                                {dateTime}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{signal.symbol}</TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                signal.direction === "BUY" 
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              }`}>
                                {signal.direction === "BUY" ? (
                                  <ArrowUp className="w-3 h-3 mr-1" />
                                ) : (
                                  <ArrowDown className="w-3 h-3 mr-1" />
                                )}
                                {signal.direction === "BUY" ? "Compra" : "Venda"}
                              </div>
                            </TableCell>
                            <TableCell>{formatPrice(signal.entryPrice)}</TableCell>
                            <TableCell>{formatPrice(signal.stopLoss)}</TableCell>
                            
                            {/* Target 1 */}
                            <TableCell className="text-center">
                              {signal.targets && signal.targets[0] ? (
                                <div className="flex flex-col items-center">
                                  <span>{formatPrice(signal.targets[0].price)}</span>
                                  {signal.targets[0].hit ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                  ) : isLoss ? (
                                    <X className="w-4 h-4 text-red-600" />
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Pendente</span>
                                  )}
                                </div>
                              ) : (
                                "N/A"
                              )}
                            </TableCell>
                            
                            {/* Target 2 */}
                            <TableCell className="text-center">
                              {signal.targets && signal.targets[1] ? (
                                <div className="flex flex-col items-center">
                                  <span>{formatPrice(signal.targets[1].price)}</span>
                                  {signal.targets[1].hit ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                  ) : isLoss ? (
                                    <X className="w-4 h-4 text-red-600" />
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Pendente</span>
                                  )}
                                </div>
                              ) : (
                                "N/A"
                              )}
                            </TableCell>
                            
                            {/* Target 3 */}
                            <TableCell className="text-center">
                              {signal.targets && signal.targets[2] ? (
                                <div className="flex flex-col items-center">
                                  <span>{formatPrice(signal.targets[2].price)}</span>
                                  {signal.targets[2].hit ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                  ) : isLoss ? (
                                    <X className="w-4 h-4 text-red-600" />
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Pendente</span>
                                  )}
                                </div>
                              ) : (
                                "N/A"
                              )}
                            </TableCell>
                            
                            {/* Result */}
                            <TableCell>
                              <div className={`flex justify-center items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                isWin 
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                  : isLoss
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                              }`}>
                                {isWin ? (
                                  <>
                                    <Check className="w-3 h-3 mr-1" />
                                    Vencedor
                                  </>
                                ) : isLoss ? (
                                  <>
                                    <X className="w-3 h-3 mr-1" />
                                    Perdedor
                                  </>
                                ) : (
                                  "Pendente"
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
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
                            data={performanceData}
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
                              {performanceData.map((entry, index) => (
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

                  <div>
                    <h3 className="text-lg font-medium mb-4">Estatísticas</h3>
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
                              Sinais Vencedores
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {winningSignals.length}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              Sinais Perdedores
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {losingSignals.length}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              Taxa de Acerto
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span 
                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  parseFloat(winRate) >= 70 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                                  parseFloat(winRate) >= 50 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 
                                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                }`}
                              >
                                {winRate}%
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              Média de Lucro por Sinal
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {signals.length > 0 ? 
                                (((winningSignals.length * 3) - (losingSignals.length * 1.5)) / signals.length).toFixed(2) + "%"
                                : "0%"}
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
