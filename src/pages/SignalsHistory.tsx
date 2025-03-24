
import React, { useState, useEffect } from "react";
import { TradingSignal } from "@/lib/types";
import SignalCard from "@/components/SignalCard";
import { Calendar, Filter, SortDesc, TrendingUp, TrendingDown, LineChart, ExternalLink, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchSignals, fetchStrategies } from "@/lib/signalsApi";
import { useToast } from "@/components/ui/use-toast";
import { config } from "@/config/env";

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

  // Calculate summary statistics
  const summary = React.useMemo(() => {
    const profitSignals = signals.filter(signal => signal.profit !== undefined && signal.profit > 0);
    const lossSignals = signals.filter(signal => signal.profit !== undefined && signal.profit < 0);
    
    const totalProfit = profitSignals.reduce((sum, signal) => sum + (signal.profit || 0), 0);
    const totalLoss = lossSignals.reduce((sum, signal) => sum + (signal.profit || 0), 0);
    
    return {
      totalSignals: signals.length,
      profitSignals: profitSignals.length,
      lossSignals: lossSignals.length,
      totalProfit: totalProfit.toFixed(2),
      totalLoss: totalLoss.toFixed(2),
      winRate: signals.length > 0 ? ((profitSignals.length / signals.length) * 100).toFixed(2) : "0.00"
    };
  }, [signals]);

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

  // Show API connectivity issue message
  if (apiConnectivityIssue) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Histórico de Sinais</h1>
            <p className="text-muted-foreground">Visualize os sinais passados e performance</p>
          </div>
        </div>
        
        <Card className="bg-amber-50 border-amber-200 mb-8">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-amber-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-medium text-amber-800 mb-2">Problema de Conectividade com a API</h3>
                <p className="text-amber-700 mb-4">
                  Não foi possível conectar ao servidor de sinais. Isso pode ocorrer devido a:
                </p>
                <ul className="list-disc pl-5 text-amber-700 mb-4 space-y-1">
                  <li>O servidor Flask não está rodando localmente</li>
                  <li>Existe um problema com a conexão de rede</li>
                  <li>A URL da API está incorreta em suas configurações</li>
                </ul>
                <div className="bg-white p-4 rounded border border-amber-200 font-mono text-sm mb-4">
                  URL API configurada: {config.signalsApiUrl}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" asChild>
                    <a href="https://github.com/yourusername/trading-signals-app" target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Ver Documentação
                    </a>
                  </Button>
                  <Button onClick={() => window.location.reload()}>
                    Tentar Novamente
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Histórico de Sinais</h1>
          <p className="text-muted-foreground">Visualize os sinais passados e performance</p>
        </div>
        <div className="flex flex-wrap mt-4 md:mt-0 gap-2">
          <Button variant="outline" asChild className="flex items-center">
            <Link to="/performance">
              <LineChart className="mr-2 h-4 w-4" />
              Ver Dashboard Completo
            </Link>
          </Button>
          <Card className="shadow-sm">
            <CardContent className="p-3 flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-primary" />
              <span className="text-sm">Filtrar por data</span>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3 flex items-center">
              <SortDesc className="h-4 w-4 mr-2 text-primary" />
              <span className="text-sm">Ordenar por</span>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Total de Sinais</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.totalSignals}</p>
            <p className="text-sm text-muted-foreground">Sinais completados</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-crypto-green" />
              Sinais Lucrativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-crypto-green">{summary.profitSignals}</p>
            <p className="text-sm text-muted-foreground">Lucro total: +{summary.totalProfit}%</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <TrendingDown className="h-4 w-4 mr-2 text-crypto-red" />
              Sinais com Perda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-crypto-red">{summary.lossSignals}</p>
            <p className="text-sm text-muted-foreground">Perda total: {summary.totalLoss}%</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Taxa de Acerto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.winRate}%</p>
            <p className="text-sm text-muted-foreground">Taxa de sucesso</p>
          </CardContent>
        </Card>
      </div>

      {/* Estratégias em abas */}
      <Tabs 
        defaultValue="ALL" 
        value={activeStrategy} 
        onValueChange={handleStrategyChange}
        className="mb-8"
      >
        <TabsList className="mb-4 inline-flex flex-wrap">
          <TabsTrigger value="ALL">Todas Estratégias</TabsTrigger>
          {strategiesLoading ? (
            <div className="px-3 py-1.5 text-sm">Carregando...</div>
          ) : strategies.map((strategy: string) => (
            <TabsTrigger key={strategy} value={strategy}>
              {strategy}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value={activeStrategy} className="mt-0">
          {/* Resultados em abas (profit/loss) */}
          <Tabs defaultValue="all" value={resultTab} onValueChange={setResultTab} className="mb-8">
            <TabsList>
              <TabsTrigger value="all">Todos os Sinais</TabsTrigger>
              <TabsTrigger value="profit">Lucro</TabsTrigger>
              <TabsTrigger value="loss">Perda</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-lg text-muted-foreground">Carregando sinais...</p>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-lg text-destructive">Erro ao carregar sinais. Tente novamente mais tarde.</p>
            </div>
          ) : filteredSignals.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-lg text-muted-foreground">
                {activeStrategy !== "ALL" 
                  ? `Nenhum sinal encontrado para a estratégia "${activeStrategy}".` 
                  : "Nenhum sinal encontrado para os filtros aplicados."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSignals.map((signal) => (
                <SignalCard key={signal.id} signal={signal} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SignalsHistory;
