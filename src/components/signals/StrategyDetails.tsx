
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  BarChart4, 
  LineChart, 
  ArrowUpDown,
  Percent,
  AlertTriangle
} from "lucide-react";

interface StrategyDetailsProps {
  strategy: string;
}

const StrategyDetails = ({ strategy }: StrategyDetailsProps) => {
  if (strategy === "ALL") return null;

  // Detalhes específicos de cada estratégia
  const strategyInfo: Record<string, {
    description: string;
    timeframe: string[];
    riskLevel: "Baixo" | "Médio" | "Alto";
    successRate: string;
    parameters: Record<string, string>;
    pros: string[];
    cons: string[];
    icon: React.ReactNode;
  }> = {
    "CLASSIC": {
      description: "Estratégia original baseada em RSI, Médias Móveis e MACD. Combina múltiplos indicadores para confirmação do sinal.",
      timeframe: ["1h", "4h", "1d"],
      riskLevel: "Médio",
      successRate: "65-70%",
      parameters: {
        "RSI": "< 30 (compra) / > 70 (venda)",
        "Médias": "MA curta acima/abaixo da MA longa",
        "MACD": "MACD acima/abaixo da linha de sinal"
      },
      pros: [
        "Múltipla confirmação reduz falsos sinais",
        "Bom equilíbrio entre frequência e qualidade"
      ],
      cons: [
        "Pode perder movimentos rápidos do mercado",
        "Requer mais tempo para confirmação"
      ],
      icon: <BarChart4 className="h-5 w-5 text-primary" />
    },
    "FAST": {
      description: "Sinais rápidos com lógica simplificada baseada apenas em RSI e MACD. Ideal para traders ativos.",
      timeframe: ["15m", "30m", "1h"],
      riskLevel: "Alto",
      successRate: "55-60%",
      parameters: {
        "RSI": "< 40 (compra) / > 60 (venda)",
        "MACD": "MACD cruzando a linha de sinal"
      },
      pros: [
        "Reage rapidamente às mudanças do mercado",
        "Maior quantidade de oportunidades"
      ],
      cons: [
        "Mais falsos sinais",
        "Maior volatilidade nos resultados"
      ],
      icon: <Clock className="h-5 w-5 text-primary" />
    },
    "RSI_MACD": {
      description: "Estratégia de reversão baseada em RSI em condição de sobrevenda e MACD cruzando para cima.",
      timeframe: ["1h", "4h"],
      riskLevel: "Médio",
      successRate: "60-65%",
      parameters: {
        "RSI": "< 30 (apenas compra)",
        "MACD": "MACD cruzando para cima",
        "Reversão": "Identificação de possível esgotamento da tendência"
      },
      pros: [
        "Bom para capturar fundos de mercado",
        "Entradas com bom risco/retorno"
      ],
      cons: [
        "Funcionamento limitado em mercados muito tendenciosos",
        "Foco maior em operações de compra"
      ],
      icon: <ArrowUpDown className="h-5 w-5 text-primary" />
    },
    "BREAKOUT_ATR": {
      description: "Estratégia de rompimento com confirmação por ATR acima da média e preço rompendo high/low anterior.",
      timeframe: ["1h", "4h", "1d"],
      riskLevel: "Alto",
      successRate: "50-60%",
      parameters: {
        "ATR": "Acima da média de 14 períodos",
        "Preço": "Rompendo máxima/mínima anterior",
        "Volume": "Acima da média"
      },
      pros: [
        "Captura movimentos explosivos",
        "Potencial de ganhos maiores"
      ],
      cons: [
        "Taxa de acerto menor",
        "Risco de false breakouts"
      ],
      icon: <LineChart className="h-5 w-5 text-primary" />
    },
    "TREND_ADX": {
      description: "Estratégia de seguimento de tendência com MA9 vs MA21 e confirmação de força pela ADX > 20.",
      timeframe: ["4h", "1d"],
      riskLevel: "Baixo",
      successRate: "70-75%",
      parameters: {
        "ADX": "> 20 (força da tendência)",
        "Médias": "MA9 acima/abaixo de MA21",
        "Tendência": "Seguimento da direção confirmada"
      },
      pros: [
        "Alta taxa de acerto",
        "Menor exposição ao risco"
      ],
      cons: [
        "Menos oportunidades de trading",
        "Pode entrar tarde na tendência"
      ],
      icon: <TrendingUp className="h-5 w-5 text-primary" />
    }
  };

  const info = strategyInfo[strategy];
  if (!info) return null;

  // Lógica para cor do nível de risco
  const getRiskColor = (level: string) => {
    switch (level) {
      case "Baixo": return "text-green-500";
      case "Médio": return "text-amber-500";
      case "Alto": return "text-red-500";
      default: return "text-slate-500";
    }
  };

  return (
    <Card className="mb-8 bg-card/50 border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-lg">
          {info.icon}
          <span className="ml-2">Estratégia {strategy}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-muted-foreground">{info.description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Timeframes: {info.timeframe.join(", ")}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Risco: <span className={getRiskColor(info.riskLevel)}>{info.riskLevel}</span></span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Taxa de sucesso: {info.successRate}</span>
            </div>
          </div>
          
          <div className="pt-2 border-t border-border">
            <p className="text-sm font-medium mb-2">Parâmetros técnicos:</p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {Object.entries(info.parameters).map(([param, value]) => (
                <li key={param} className="flex items-start">
                  <span className="font-medium mr-2">{param}:</span>
                  <span className="text-muted-foreground">{value}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <p className="text-sm font-medium mb-2 flex items-center">
                <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
                Vantagens:
              </p>
              <ul className="text-sm space-y-1 list-disc pl-5">
                {info.pros.map((pro, index) => (
                  <li key={index} className="text-muted-foreground">{pro}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2 flex items-center">
                <TrendingDown className="h-4 w-4 mr-1 text-red-500" />
                Desvantagens:
              </p>
              <ul className="text-sm space-y-1 list-disc pl-5">
                {info.cons.map((con, index) => (
                  <li key={index} className="text-muted-foreground">{con}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StrategyDetails;
