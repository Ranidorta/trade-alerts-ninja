
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSignals, fetchStrategies } from "@/lib/signalsApi";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { config } from "@/config/env";

// Componentes refatorados
import PageHeader from "@/components/signals/PageHeader";
import ApiConnectionError from "@/components/signals/ApiConnectionError";
import SignalsSummary from "@/components/signals/SignalsSummary";
import StrategiesTabList from "@/components/signals/StrategiesTabList";
import ResultsTabSelector from "@/components/signals/ResultsTabSelector";
import SignalsList from "@/components/signals/SignalsList";
import StrategyDetails from "@/components/signals/StrategyDetails";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SignalsHistory = () => {
  const [resultTab, setResultTab] = useState("all");
  const [activeStrategy, setActiveStrategy] = useState<string>("ALL");
  const { toast } = useToast();
  const [apiConnectivityIssue, setApiConnectivityIssue] = useState(false);
  
  // Fetch available strategies
  const { data: strategies = [], isLoading: strategiesLoading, error: strategiesError } = useQuery({
    queryKey: ['strategies'],
    queryFn: fetchStrategies,
    retry: 1,
    meta: {
      onSettled: (data: any, error: any) => {
        if (error) {
          console.error("Error fetching strategies:", error);
          setApiConnectivityIssue(true);
          toast({
            title: "Erro ao carregar estratégias",
            description: "Não foi possível conectar ao backend. Verifique se o servidor está rodando.",
            variant: "destructive"
          });
        } else {
          setApiConnectivityIssue(false);
        }
      }
    }
  });
  
  // Fetch signals from API with strategy filtering
  const { data: signals = [], isLoading, error } = useQuery({
    queryKey: ['signals', 'history', activeStrategy],
    queryFn: () => {
      const params: any = { days: 30 };
      if (activeStrategy !== "ALL") {
        params.strategy = activeStrategy;
      }
      return fetchSignals(params);
    },
    retry: 1,
    enabled: !apiConnectivityIssue,
    meta: {
      onSettled: (data: any, error: any) => {
        if (error) {
          toast({
            title: "Erro ao carregar sinais",
            description: "Não foi possível carregar o histórico de sinais. Tente novamente mais tarde.",
            variant: "destructive",
          });
        }
      }
    }
  });

  // Filter signals based on active tab
  const filteredSignals = signals.filter(signal => {
    if (resultTab === "all") return true;
    if (resultTab === "profit") return signal.profit !== undefined && signal.profit > 0;
    if (resultTab === "loss") return signal.profit !== undefined && signal.profit < 0;
    return true;
  });

  // Handle strategy change
  const handleStrategyChange = (value: string) => {
    setActiveStrategy(value);
  };

  // Strategy details mapped to strategy names with indicators, descriptions and parameters
  const strategyDetails = {
    ALL: {
      name: "Todas Estratégias",
      description: "Exibe sinais gerados por todas as estratégias disponíveis",
      indicators: ["RSI", "Médias Móveis", "MACD", "ATR", "ADX"],
      parameters: {},
      timeframe: "Múltiplos",
      riskLevel: "Variado",
      successRate: "65-80%",
      pros: ["Visão completa de todas as oportunidades", "Diversificação automática de estratégias"],
      cons: ["Pode gerar sinais conflitantes", "Análise mais complexa dos resultados"]
    },
    CLASSIC: {
      name: "Clássica",
      description: "Estratégia original baseada em RSI, Médias e MACD",
      indicators: ["RSI", "Médias Móveis", "MACD"],
      parameters: {
        "RSI Compra": RSI_THRESHOLD_BUY,
        "RSI Venda": RSI_THRESHOLD_SELL,
        "MA Curta": "5 períodos",
        "MA Longa": "20 períodos"
      },
      timeframe: "1h",
      riskLevel: "Médio",
      successRate: "75%",
      pros: ["Confiável e testada", "Bom equilíbrio entre velocidade e confirmação"],
      cons: ["Pode ser lenta em mercados muito voláteis", "Menos sinais gerados"]
    },
    FAST: {
      name: "Rápida",
      description: "Sinais rápidos com lógica mais simples (RSI e MACD)",
      indicators: ["RSI", "MACD"],
      parameters: {
        "RSI Compra": 40,
        "RSI Venda": 60
      },
      timeframe: "1h",
      riskLevel: "Alto",
      successRate: "65%",
      pros: ["Reação rápida a movimentos de mercado", "Mais sinais gerados"],
      cons: ["Maior taxa de falsos sinais", "Requer monitoramento mais próximo"]
    },
    RSI_MACD: {
      name: "RSI + MACD",
      description: "Reversão baseada em RSI < 30 e MACD cruzando para cima",
      indicators: ["RSI", "MACD", "Histograma MACD"],
      parameters: {
        "RSI Compra": 30,
        "RSI Venda": 70,
        "MACD": "Cruzamento do histograma"
      },
      timeframe: "1h",
      riskLevel: "Médio-Alto",
      successRate: "70%",
      pros: ["Boa identificação de reversões", "Confirmação dupla reduz falsos positivos"],
      cons: ["Pode perder início de movimentos", "Depende da calibração do MACD"]
    },
    BREAKOUT_ATR: {
      name: "Rompimento ATR",
      description: "Rompimento com confirmação por ATR acima da média e candle rompendo high/low anterior",
      indicators: ["ATR", "Candle atual", "High/Low anterior"],
      parameters: {
        "ATR Multiplicador": "1.1x acima da média",
        "Período ATR": "14"
      },
      timeframe: "1h",
      riskLevel: "Alto",
      successRate: "68%",
      pros: ["Captura movimentos fortes de preço", "Bom para mercados com tendência definida"],
      cons: ["Pode gerar falsos rompimentos", "Performance variável em mercados laterais"]
    },
    TREND_ADX: {
      name: "Tendência ADX",
      description: "Seguimento de tendência com MA9 vs MA21 e ADX > 20",
      indicators: ["ADX", "MA9", "MA21"],
      parameters: {
        "ADX Mínimo": 20,
        "MA Curta": "9 períodos",
        "MA Média": "21 períodos"
      },
      timeframe: "1h",
      riskLevel: "Médio-Baixo",
      successRate: "78%",
      pros: ["Alta probabilidade em tendências fortes", "Filtra mercados sem direção clara"],
      cons: ["Menos sinais gerados", "Pode entrar tarde em movimentos"]
    }
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

  // Get current strategy details
  const currentStrategyDetails = strategyDetails[activeStrategy as keyof typeof strategyDetails] || strategyDetails.ALL;

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader />

      {/* Summary Section */}
      <SignalsSummary signals={signals} />

      {/* Estratégias em abas */}
      <Tabs 
        defaultValue="ALL" 
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
          {/* Strategy details card */}
          <Card className="mb-6 border-t-4" style={{ borderTopColor: getStrategyColor(activeStrategy) }}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    {currentStrategyDetails.name}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 opacity-70 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p>{currentStrategyDetails.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardTitle>
                  <CardDescription>
                    {activeStrategy !== "ALL" ? currentStrategyDetails.description : "Visualizando todas as estratégias combinadas"}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-1 text-xs">
                  {currentStrategyDetails.indicators.map((indicator: string) => (
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
                  <div>{currentStrategyDetails.timeframe}</div>
                </div>
                <div>
                  <div className="font-medium mb-1">Nível de Risco</div>
                  <div>{currentStrategyDetails.riskLevel}</div>
                </div>
                <div>
                  <div className="font-medium mb-1">Taxa de Sucesso</div>
                  <div>{currentStrategyDetails.successRate}</div>
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
                  {Object.keys(currentStrategyDetails.parameters).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(currentStrategyDetails.parameters).map(([key, value]) => (
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
                    {currentStrategyDetails.pros.map((pro: string, index: number) => (
                      <li key={index}>{pro}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-medium mb-1 text-red-600">Desvantagens</div>
                  <ul className="list-disc list-inside text-slate-700">
                    {currentStrategyDetails.cons.map((con: string, index: number) => (
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

          <SignalsList 
            signals={filteredSignals}
            isLoading={isLoading}
            error={error}
            activeStrategy={activeStrategy}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper para cores de estratégias
const getStrategyColor = (strategy: string): string => {
  const colors: Record<string, string> = {
    ALL: "#6366F1",     // Indigo
    CLASSIC: "#2563EB", // Blue
    FAST: "#D946EF",    // Fuchsia
    RSI_MACD: "#10B981", // Emerald
    BREAKOUT_ATR: "#F59E0B", // Amber
    TREND_ADX: "#06B6D4"  // Cyan
  };
  
  return colors[strategy] || colors.ALL;
};

// Constantes para parâmetros de estratégias
const RSI_THRESHOLD_BUY = 30;
const RSI_THRESHOLD_SELL = 70;

export default SignalsHistory;
