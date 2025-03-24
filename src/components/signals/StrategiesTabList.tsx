
import React from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfoIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StrategiesTabListProps {
  strategies: string[];
  activeStrategy: string;
  isLoading: boolean;
}

const StrategiesTabList = ({ strategies, activeStrategy, isLoading }: StrategiesTabListProps) => {
  // Default strategies in case the API fails to return data
  const defaultStrategies = ["CLASSIC", "FAST", "RSI_MACD", "BREAKOUT_ATR", "TREND_ADX"];
  
  // Use API strategies if available, otherwise use defaults
  const displayStrategies = strategies.length > 0 ? strategies : defaultStrategies;
  
  // Descrições das estratégias
  const strategyDescriptions: Record<string, string> = {
    "CLASSIC": "Estratégia original baseada em RSI, Médias e MACD",
    "FAST": "Sinais rápidos com lógica mais simples (RSI e MACD)",
    "RSI_MACD": "Reversão baseada em RSI < 30 e MACD cruzando para cima",
    "BREAKOUT_ATR": "Rompimento com confirmação por ATR acima da média e candle rompendo high/low anterior",
    "TREND_ADX": "Seguimento de tendência com MA9 vs MA21 e ADX > 20"
  };
  
  // Parâmetros técnicos de cada estratégia
  const strategyParameters: Record<string, Record<string, string>> = {
    "CLASSIC": {
      "RSI": "< 30 (compra) / > 70 (venda)",
      "Médias": "MA curta acima/abaixo da MA longa",
      "MACD": "MACD acima/abaixo da linha de sinal"
    },
    "FAST": {
      "RSI": "< 40 (compra) / > 60 (venda)",
      "MACD": "MACD cruzando a linha de sinal"
    },
    "RSI_MACD": {
      "RSI": "< 30 (apenas compra)",
      "MACD": "MACD cruzando para cima"
    },
    "BREAKOUT_ATR": {
      "ATR": "Acima da média de 14 períodos",
      "Preço": "Rompendo máxima/mínima anterior",
      "Volume": "Acima da média"
    },
    "TREND_ADX": {
      "ADX": "> 20 (força da tendência)",
      "Médias": "MA9 acima/abaixo de MA21",
      "Tendência": "Seguimento da direção confirmada"
    }
  };
  
  return (
    <TabsList className="mb-4 inline-flex flex-wrap">
      <TabsTrigger value="ALL">Todas Estratégias</TabsTrigger>
      {isLoading ? (
        <div className="px-3 py-1.5 text-sm">Carregando...</div>
      ) : displayStrategies.map((strategy: string) => (
        <TooltipProvider key={strategy}>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value={strategy} className="flex items-center">
                {strategy}
                <InfoIcon className="ml-1 h-3 w-3 opacity-70" />
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs p-4 space-y-2">
              <p className="font-medium">{strategyDescriptions[strategy] || `Estratégia ${strategy}`}</p>
              {strategyParameters[strategy] && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-xs font-medium mb-1">Parâmetros técnicos:</p>
                  <ul className="text-xs space-y-1">
                    {Object.entries(strategyParameters[strategy]).map(([param, value]) => (
                      <li key={param} className="flex justify-between">
                        <span className="font-medium">{param}:</span>
                        <span className="ml-2">{value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </TabsList>
  );
};

export default StrategiesTabList;
