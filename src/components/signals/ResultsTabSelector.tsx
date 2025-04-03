
import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon, TrendingUp, TrendingDown } from "lucide-react";

interface ResultsTabSelectorProps {
  resultTab: string;
  onValueChange: (value: string) => void;
  totalWinners: number;
  totalLosers: number;
}

const ResultsTabSelector = ({ 
  resultTab, 
  onValueChange, 
  totalWinners, 
  totalLosers 
}: ResultsTabSelectorProps) => {
  return (
    <Tabs defaultValue="all" value={resultTab} onValueChange={onValueChange} className="mb-8">
      <TabsList>
        <TabsTrigger value="all">Todos os Sinais</TabsTrigger>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="profit" className="flex items-center">
                <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                Lucro ({totalWinners}) <InfoIcon className="ml-1 h-3 w-3 opacity-70" />
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Sinais que atingiram o take profit</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="loss" className="flex items-center">
                <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                Perda ({totalLosers}) <InfoIcon className="ml-1 h-3 w-3 opacity-70" />
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Sinais que atingiram o stop loss</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TabsList>
    </Tabs>
  );
};

export default ResultsTabSelector;
