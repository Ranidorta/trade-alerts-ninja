
import { useEffect, useState } from "react";
import { useTradingSignals } from "@/hooks/useTradingSignals";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { fetchStrategies } from "@/lib/signalsApi";
import StatusBadge from "./StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp } from "lucide-react";

const SignalDashboard = () => {
  const { signals, loading, error, fetchSignals } = useTradingSignals();
  const [strategies, setStrategies] = useState<string[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string>("ALL");
  const [loadingStrategies, setLoadingStrategies] = useState(false);

  useEffect(() => {
    const loadStrategies = async () => {
      setLoadingStrategies(true);
      try {
        const fetchedStrategies = await fetchStrategies();
        setStrategies(["ALL", ...fetchedStrategies]);
      } catch (error) {
        console.error("Erro ao carregar estratégias:", error);
      } finally {
        setLoadingStrategies(false);
      }
    };

    loadStrategies();
  }, []);

  useEffect(() => {
    const loadSignals = async () => {
      const params: any = { days: 30 };
      
      if (selectedStrategy && selectedStrategy !== "ALL") {
        params.strategy = selectedStrategy;
      }
      
      await fetchSignals(params);
    };

    loadSignals();
  }, [fetchSignals, selectedStrategy]);

  const handleRefresh = () => {
    const params: any = { days: 30 };
    
    if (selectedStrategy && selectedStrategy !== "ALL") {
      params.strategy = selectedStrategy;
    }
    
    fetchSignals(params);
  };

  const handleStrategyChange = (value: string) => {
    setSelectedStrategy(value);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Sinais de Trading</h2>
        <div className="flex gap-2">
          <Select value={selectedStrategy} onValueChange={handleStrategyChange} disabled={loadingStrategies}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estratégia" />
            </SelectTrigger>
            <SelectContent>
              {strategies.map((strategy) => (
                <SelectItem key={strategy} value={strategy}>
                  {strategy === "ALL" ? "Todas Estratégias" : strategy}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center p-8">
          <p className="text-muted-foreground">Carregando sinais...</p>
        </div>
      )}
      
      {error && (
        <div className="bg-destructive/10 p-4 rounded-md border border-destructive/20">
          <p className="text-destructive">Erro: {error}</p>
        </div>
      )}

      {!loading && !error && signals.length === 0 && (
        <div className="text-center p-8 bg-muted/20 rounded-md">
          <p className="text-muted-foreground">Nenhum sinal encontrado para os critérios selecionados.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {signals.map((signal) => (
          <Card key={signal.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${signal.direction === "BUY" ? "bg-green-500" : "bg-red-500"} text-white`}>
                    {signal.direction === "BUY" ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
                  </div>
                  <CardTitle className="text-lg">{signal.symbol}</CardTitle>
                </div>
                <StatusBadge status={signal.status} />
              </div>
              <CardDescription>
                Estratégia: {signal.strategy || "N/A"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Preço de Entrada</p>
                  <p className="font-medium">{signal.entryPrice?.toFixed(4) || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stop Loss</p>
                  <p className="font-medium text-red-500">{signal.stopLoss?.toFixed(4) || "N/A"}</p>
                </div>
                {signal.leverage && (
                  <div>
                    <p className="text-sm text-muted-foreground">Alavancagem</p>
                    <p className="font-medium">{signal.leverage}x</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Criado em</p>
                  <p className="font-medium">{new Date(signal.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SignalDashboard;
