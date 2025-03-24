
import React from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart4, 
  LineChart, 
  Clock, 
  ArrowUpDown,
  ChevronRight
} from "lucide-react";

interface StrategyListProps {
  strategies: string[];
  onSelectStrategy: (strategy: string) => void;
}

const StrategyList: React.FC<StrategyListProps> = ({ strategies, onSelectStrategy }) => {
  // Informações detalhadas de cada estratégia
  const strategyInfo: Record<string, {
    description: string;
    timeframe: string[];
    riskLevel: "Baixo" | "Médio" | "Alto";
    winRate: string;
    icon: React.ReactNode;
    color: string;
    parameters: Record<string, string>;
  }> = {
    "CLASSIC": {
      description: "Estratégia original baseada em RSI, Médias Móveis e MACD. Combina múltiplos indicadores para confirmação do sinal.",
      timeframe: ["1h", "4h", "1d"],
      riskLevel: "Médio",
      winRate: "65-70%",
      icon: <BarChart4 className="h-5 w-5" />,
      color: "bg-blue-100 text-blue-800",
      parameters: {
        "RSI": "< 30 (compra) / > 70 (venda)",
        "Médias": "MA curta acima/abaixo da MA longa",
        "MACD": "MACD acima/abaixo da linha de sinal"
      }
    },
    "FAST": {
      description: "Sinais rápidos com lógica simplificada baseada apenas em RSI e MACD. Ideal para traders ativos.",
      timeframe: ["15m", "30m", "1h"],
      riskLevel: "Alto",
      winRate: "55-60%",
      icon: <Clock className="h-5 w-5" />,
      color: "bg-purple-100 text-purple-800",
      parameters: {
        "RSI": "< 40 (compra) / > 60 (venda)",
        "MACD": "MACD cruzando a linha de sinal"
      }
    },
    "RSI_MACD": {
      description: "Estratégia de reversão baseada em RSI em condição de sobrevenda e MACD cruzando para cima.",
      timeframe: ["1h", "4h"],
      riskLevel: "Médio",
      winRate: "60-65%",
      icon: <ArrowUpDown className="h-5 w-5" />,
      color: "bg-amber-100 text-amber-800",
      parameters: {
        "RSI": "< 30 (apenas compra)",
        "MACD": "MACD cruzando para cima"
      }
    },
    "BREAKOUT_ATR": {
      description: "Estratégia de rompimento com confirmação por ATR acima da média e preço rompendo high/low anterior.",
      timeframe: ["1h", "4h", "1d"],
      riskLevel: "Alto",
      winRate: "50-60%",
      icon: <LineChart className="h-5 w-5" />,
      color: "bg-red-100 text-red-800",
      parameters: {
        "ATR": "Acima da média de 14 períodos",
        "Preço": "Rompendo máxima/mínima anterior"
      }
    },
    "TREND_ADX": {
      description: "Estratégia de seguimento de tendência com MA9 vs MA21 e confirmação de força pela ADX > 20.",
      timeframe: ["4h", "1d"],
      riskLevel: "Baixo",
      winRate: "70-75%",
      icon: <TrendingUp className="h-5 w-5" />,
      color: "bg-green-100 text-green-800",
      parameters: {
        "ADX": "> 20 (força da tendência)",
        "Médias": "MA9 acima/abaixo de MA21"
      }
    }
  };
  
  // Função para obter a cor do risco
  const getRiskColor = (level: string) => {
    switch (level) {
      case "Baixo": return "bg-green-100 text-green-800";
      case "Médio": return "bg-amber-100 text-amber-800";
      case "Alto": return "bg-red-100 text-red-800";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  // Lista de estratégias padrão caso não tenhamos dados da API
  const defaultStrategies = ["CLASSIC", "FAST", "RSI_MACD", "BREAKOUT_ATR", "TREND_ADX"];
  
  // Usar estratégias da API ou as padrão
  const displayStrategies = strategies.length > 0 ? strategies : defaultStrategies;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {displayStrategies.map((strategy) => {
        const info = strategyInfo[strategy] || {
          description: `Estratégia ${strategy}`,
          timeframe: ["1h"],
          riskLevel: "Médio",
          winRate: "N/A",
          icon: <BarChart4 className="h-5 w-5" />,
          color: "bg-slate-100 text-slate-800",
          parameters: {}
        };
        
        return (
          <Card key={strategy} className="hover:shadow-md transition-shadow border-slate-200">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <Badge className={info.color} variant="secondary">
                  <span className="flex items-center gap-1">
                    {info.icon}
                    <span>{strategy}</span>
                  </span>
                </Badge>
                <Badge className={getRiskColor(info.riskLevel)} variant="secondary">
                  Risco: {info.riskLevel}
                </Badge>
              </div>
              <CardTitle className="text-lg mt-2">{strategy}</CardTitle>
              <CardDescription className="line-clamp-2">{info.description}</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex items-center justify-between text-sm mb-2">
                <div>
                  <span className="text-muted-foreground">Timeframes: </span>
                  <span>{info.timeframe.join(", ")}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Win Rate: </span>
                  <span className="font-medium">{info.winRate}</span>
                </div>
              </div>
              
              <div className="mt-2 text-sm space-y-1">
                <p className="font-medium mb-1">Parâmetros principais:</p>
                <ul className="space-y-1 list-disc pl-5">
                  {Object.entries(info.parameters).slice(0, 2).map(([key, value]) => (
                    <li key={key} className="text-muted-foreground">{key}: {value}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => onSelectStrategy(strategy)} 
                variant="outline" 
                className="w-full flex justify-between"
              >
                <span>Ver Sinais</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};

export default StrategyList;
