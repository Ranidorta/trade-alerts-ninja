import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSignals, fetchStrategies } from "@/lib/signalsApi";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { config } from "@/config/env";

// Components
import PageHeader from "@/components/signals/PageHeader";
import ApiConnectionError from "@/components/signals/ApiConnectionError";
import SignalsSummary from "@/components/signals/SignalsSummary";
import ResultsTabSelector from "@/components/signals/ResultsTabSelector";
import SignalsList from "@/components/signals/SignalsList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from "recharts";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle, BarChart4, TrendingUp, TrendingDown, Check, X, ArrowUp, ArrowDown, Calendar, Clock } from "lucide-react";
import { useTradingSignals } from "@/hooks/useTradingSignals";
import { 
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

const SignalsHistory = () => {
  const [resultTab, setResultTab] = useState("all");
  const { signals, loading, error, fetchSignals } = useTradingSignals();
  const { toast } = useToast();
  const [apiConnectivityIssue, setApiConnectivityIssue] = useState(false);
  const [activeTab, setActiveTab] = useState<"signals" | "performance">("signals");
  
  // Fetch signals on component mount
  useEffect(() => {
    fetchSignals();
  }, []);
  
  // Filter signals based on active tab
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
  
  // Handle strategy selection (simplified since we only have CLASSIC now)
  const handleSelectStrategy = () => {
    console.log("CLASSIC strategy is the only available option");
  };

  // Show API connectivity issue message
  if (apiConnectivityIssue) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader />
        <ApiConnectionError apiUrl={config.signalsApiUrl} />
      </div>
    );
  }

  // Strategy details for CLASSIC
  const classicStrategyDetails = {
    name: "Clássica",
    description: "Estratégia tradicional baseada em RSI, Médias Móveis e MACD",
    indicators: ["RSI", "Médias Móveis", "MACD"],
    parameters: {
      "RSI Compra": "30",
      "RSI Venda": "70",
      "MA Curta": "5 períodos",
      "MA Longa": "20 períodos"
    },
    timeframe: "1h",
    riskLevel: "Médio",
    successRate: winRate + "%",
    pros: ["Confiável e testada", "Bom equilíbrio entre velocidade e confirmação"],
    cons: ["Pode ser lenta em mercados muito voláteis", "Menos sinais gerados"]
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Histórico de Sinais</h1>
          <p className="text-slate-600 dark:text-slate-300">
            Histórico completo dos sinais gerados pela estratégia CLASSIC
          </p>
        </div>
        
        <button 
          onClick={fetchSignals}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" 
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
            <path d="M16 21h5v-5"></path>
          </svg>
          Atualizar
        </button>
      </div>

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
          {/* Strategy details card */}
          <Card className="mb-6 border-t-4 border-t-blue-600">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    {classicStrategyDetails.name}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 opacity-70 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p>{classicStrategyDetails.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardTitle>
                  <CardDescription>
                    {classicStrategyDetails.description}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-1 text-xs">
                  {classicStrategyDetails.indicators.map((indicator: string) => (
                    <span 
                      key={indicator} 
                      className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                      {indicator}
                    </span>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium mb-1">Timeframe</div>
                  <div>{classicStrategyDetails.timeframe}</div>
                </div>
                <div>
                  <div className="font-medium mb-1">Nível de Risco</div>
                  <div>{classicStrategyDetails.riskLevel}</div>
                </div>
                <div>
                  <div className="font-medium mb-1">Taxa de Sucesso</div>
                  <div>{classicStrategyDetails.successRate}</div>
                </div>
                <div>
                  <div className="font-medium mb-1 flex items-center gap-1">
                    Parâmetros
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 opacity-70 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Configurações principais desta estratégia</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {Object.keys(classicStrategyDetails.parameters).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(classicStrategyDetails.parameters).map(([key, value]) => (
                        <span key={key} className="text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-700">
                          {key}: <span className="font-medium">{String(value)}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-500">Múltiplos parâmetros</div>
                  )}
                </div>
              </div>

              {/* Pros & Cons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <div className="font-medium mb-1 text-green-600">Vantagens</div>
                  <ul className="list-disc list-inside text-slate-700">
                    {classicStrategyDetails.pros.map((pro: string, index: number) => (
                      <li key={index}>{pro}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-medium mb-1 text-red-600">Desvantagens</div>
                  <ul className="list-disc list-inside text-slate-700">
                    {classicStrategyDetails.cons.map((con: string, index: number) => (
                      <li key={index}>{con}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Resultados em abas (profit/loss) */}
          <ResultsTabSelector 
            resultTab={resultTab} 
            onValueChange={setResultTab} 
          />

          {/* Enhanced Signals Table with Detailed Information */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-0">
              <CardTitle className="text-xl">Histórico de Sinais Detalhado</CardTitle>
              <CardDescription>
                Registro completo dos sinais gerados pela estratégia CLASSIC com detalhes sobre alvos alcançados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Carregando sinais...</p>
                </div>
              ) : error ? (
                <div className="py-8 text-center">
                  <p className="text-red-500">Erro ao carregar sinais: {error}</p>
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
                        
                        // Format price with 2 decimal places
                        const formatPrice = (price?: number) => {
                          return price !== undefined ? price.toFixed(2) : "N/A";
                        };
                        
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
                            <TableCell className="font-medium">{signal.pair}</TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                signal.type === "LONG" 
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              }`}>
                                {signal.type === "LONG" ? (
                                  <ArrowUp className="w-3 h-3 mr-1" />
                                ) : (
                                  <ArrowDown className="w-3 h-3 mr-1" />
                                )}
                                {signal.type === "LONG" ? "Compra" : "Venda"}
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
                                    <span className="text-xs text-gray-400">Pendente</span>
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
                                    <span className="text-xs text-gray-400">Pendente</span>
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
                                    <span className="text-xs text-gray-400">Pendente</span>
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
                Análise do desempenho dos sinais gerados pela estratégia CLASSIC
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 w-full flex items-center justify-center">
                  <p className="text-slate-500">Carregando dados de performance...</p>
                </div>
              ) : signals.length === 0 ? (
                <div className="h-64 w-full flex items-center justify-center">
                  <p className="text-slate-500">Nenhum sinal disponível para análise.</p>
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
                    <h3 className="text-lg font-medium mb-4">Estatísticas da Estratégia CLASSIC</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Métrica
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Valor
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              Total de Sinais
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {signals.length}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              Sinais Vencedores
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {winningSignals.length}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              Sinais Perdedores
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                                  parseFloat(winRate) >= 70 ? 'bg-green-100 text-green-800' : 
                                  parseFloat(winRate) >= 50 ? 'bg-blue-100 text-blue-800' : 
                                  'bg-red-100 text-red-800'
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
