
import React, { useState, useEffect } from "react";
import { TradingSignal } from "@/lib/types";
import SignalCard from "@/components/SignalCard";
import { Calendar, Filter, SortDesc, TrendingUp, TrendingDown, LineChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchSignals } from "@/lib/signalsApi";
import { useToast } from "@/components/ui/use-toast";

const SignalsHistory = () => {
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();
  
  // Fetch signals from API with fixed onError handling
  const { data: signals = [], isLoading, error } = useQuery({
    queryKey: ['signals', 'history'],
    queryFn: () => fetchSignals({ days: 30 }),
    meta: {
      onError: () => {
        toast({
          title: "Error fetching signals",
          description: "Could not load signals history. Please try again later.",
          variant: "destructive",
        });
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
    if (activeTab === "all") return true;
    if (activeTab === "profit") return signal.profit !== undefined && signal.profit > 0;
    if (activeTab === "loss") return signal.profit !== undefined && signal.profit < 0;
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Histórico de Sinais</h1>
          <p className="text-muted-foreground">Visualize os sinais passados e performance</p>
        </div>
        <div className="flex mt-4 md:mt-0 space-x-2">
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

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-8">
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
          <p className="text-lg text-muted-foreground">Nenhum sinal encontrado para os filtros aplicados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSignals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SignalsHistory;
