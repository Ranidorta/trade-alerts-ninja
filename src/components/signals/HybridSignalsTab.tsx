
import React, { useState, useEffect } from "react";
import { fetchHybridSignals, fetchTimeframeSignals } from "@/lib/signalsApi";
import { TradingSignal } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Zap, Target, Compass } from "lucide-react";
import SignalHistoryTable from "./SignalHistoryTable";
import { Skeleton } from "@/components/ui/skeleton";
import ApiConnectionError from "./ApiConnectionError";
import { config } from "@/config/env";

const timeframeOptions = [
  { value: "hybrid", label: "🧠 Trade Ninja Híbrido", icon: Brain, description: "Alinhamento dos 3 timeframes" },
  { value: "15m", label: "🟢 Trade Ninja Turbo", icon: Zap, description: "Análise de candle 15m" },
  { value: "1h", label: "🔵 Trade Ninja Precision", icon: Target, description: "Análise de candle 1h" },
  { value: "4h", label: "🟣 Trade Ninja Zen", icon: Compass, description: "Análise de candle 4h" },
];

const getTimeframeDescription = (timeframe: string) => {
  switch (timeframe) {
    case "hybrid":
      return "Sinais híbridos são gerados apenas quando há alinhamento perfeito entre os 3 timeframes. Alta confiabilidade.";
    case "15m":
      return "Sinais de curto prazo baseados em análise do candle de 15 minutos. Ideal para day trading.";
    case "1h":
      return "Sinais de médio prazo baseados em análise do candle de 1 hora. Equilíbrio entre volatilidade e precisão.";
    case "4h":
      return "Sinais de longo prazo baseados em análise do candle de 4 horas. Maior estabilidade e menos ruído.";
    default:
      return "Selecione um timeframe para ver detalhes.";
  }
};

const HybridSignalsTab = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState("hybrid");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSignals = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        let data: TradingSignal[] = [];
        
        if (selectedTimeframe === "hybrid") {
          data = await fetchHybridSignals();
        } else {
          // Fetch signals for the selected timeframe
          try {
            data = await fetchTimeframeSignals(selectedTimeframe);
          } catch (timeframeError) {
            console.warn(`API endpoint for ${selectedTimeframe} not yet implemented.`);
            // Fallback to hybrid signals for now
            data = await fetchHybridSignals();
            toast({
              title: "Endpoint não disponível",
              description: `O endpoint para sinais ${selectedTimeframe} ainda não está implementado. Exibindo sinais híbridos.`,
              variant: "default"
            });
          }
        }
        
        setSignals(data);
        
        const selectedOption = timeframeOptions.find(opt => opt.value === selectedTimeframe);
        toast({
          title: `${selectedOption?.label || 'Sinais'} carregados`,
          description: `${data.length} sinais encontrados`,
        });
      } catch (err) {
        console.error(`Error fetching ${selectedTimeframe} signals:`, err);
        setError(err instanceof Error ? err : new Error(String(err)));
        
        toast({
          variant: "destructive",
          title: "Erro ao carregar sinais",
          description: "Não foi possível carregar os sinais do servidor",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSignals();
  }, [selectedTimeframe, toast]);

  // Handle switching to local mode
  const handleLocalModeClick = () => {
    toast({
      title: "Modo local ativado",
      description: "Esta funcionalidade não está disponível no modo local.",
    });
  };

  if (error) {
    return (
      <ApiConnectionError 
        apiUrl={config.apiUrl || 'http://localhost:5000'} 
        onLocalModeClick={handleLocalModeClick}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl font-bold">Sinais de Trading Inteligentes</CardTitle>
          <p className="text-muted-foreground">
            Selecione o timeframe para visualizar diferentes estratégias de sinais
          </p>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-4">
            <Select
              value={selectedTimeframe}
              onValueChange={setSelectedTimeframe}
            >
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Selecione o timeframe" />
              </SelectTrigger>
              <SelectContent>
                {timeframeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center">
                      <option.icon className="mr-2 h-4 w-4" />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="bg-muted rounded-md p-3 text-sm">
              <p>{getTimeframeDescription(selectedTimeframe)}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : signals.length === 0 ? (
            <div className="text-center py-12">
              {selectedTimeframe === "hybrid" ? (
                <Brain className="w-12 h-12 mx-auto text-muted-foreground" />
              ) : selectedTimeframe === "15m" ? (
                <Zap className="w-12 h-12 mx-auto text-muted-foreground" />
              ) : selectedTimeframe === "1h" ? (
                <Target className="w-12 h-12 mx-auto text-muted-foreground" />
              ) : (
                <Compass className="w-12 h-12 mx-auto text-muted-foreground" />
              )}
              <h3 className="mt-4 text-lg font-medium">Nenhum sinal encontrado</h3>
              <p className="text-muted-foreground mt-2">
                Nenhum sinal {selectedTimeframe} está disponível no momento.
              </p>
            </div>
          ) : (
            <SignalHistoryTable signals={signals} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HybridSignalsTab;
