
import React from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle } from "lucide-react";
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
                <HelpCircle className="ml-1 h-3 w-3 opacity-70" />
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{strategyDescriptions[strategy] || `Estratégia ${strategy}`}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </TabsList>
  );
};

export default StrategiesTabList;
