
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Brain, Shield, Info } from "lucide-react";
import { fetchHybridSignals } from "@/lib/signalsApi";
import { TradingSignal, SignalResult } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Function to determine the color based on the result
const getResultColor = (result: SignalResult | null | number): string => {
  if (!result) return "bg-gray-100 text-gray-800";
  
  // Convert to string if it's a number (0 or 1)
  const resultStr = typeof result === 'number' ? 
    (result === 1 ? "WINNER" : "LOSER") : result.toString().toUpperCase();
  
  switch(resultStr) {
    case "WINNER":
    case "WIN":
      return "bg-green-100 text-green-800 border-green-300";
    case "PARTIAL":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "LOSER":
    case "LOSS":
      return "bg-red-100 text-red-800 border-red-300";
    case "FALSE":
    case "MISSED":
      return "bg-gray-100 text-gray-800 border-gray-300";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Function to get the result icon
const getResultIcon = (result: SignalResult | null | number): string => {
  if (!result) return "⏳";
  
  // Convert to string if it's a number (0 or 1)
  const resultStr = typeof result === 'number' ? 
    (result === 1 ? "WINNER" : "LOSER") : result.toString().toUpperCase();
  
  switch(resultStr) {
    case "WINNER":
    case "WIN": return "✅";
    case "PARTIAL": return "⚠️";
    case "LOSER":
    case "LOSS": return "❌";
    case "FALSE":
    case "MISSED": return "⚪";
    default: return "⏳";
  }
};

// Format the display of result text
const formatResultText = (result: SignalResult | null | number): string => {
  if (!result) return "PENDENTE";
  
  if (typeof result === 'number') {
    return result === 1 ? "WINNER" : "LOSER";
  }
  
  const resultMap: Record<string, string> = {
    "win": "WINNER",
    "loss": "LOSER",
    "partial": "PARTIAL",
    "missed": "FALSE"
  };
  
  return resultMap[result.toString().toLowerCase()] || result.toString().toUpperCase();
};

interface HybridSignalsTabProps {
  filter?: string;
}

const HybridSignalsTab: React.FC<HybridSignalsTabProps> = ({ filter }) => {
  const { toast } = useToast();
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("hybrid");
  
  // Fetch hybrid signals
  const { data: hybridSignals, isLoading, error, isError } = useQuery({
    queryKey: ["hybridSignals", selectedTimeframe],
    queryFn: fetchHybridSignals,
    retry: 1, // Only retry once to avoid excessive retries on 404
    refetchOnWindowFocus: false
  });

  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: "Erro ao carregar sinais híbridos",
        description: "Não foi possível carregar os sinais do servidor.",
        variant: "destructive"
      });
    }
  }, [error, toast]);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm");
    } catch (e) {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Carregando sinais híbridos...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <div className="flex justify-center mb-4">
          <Brain className="h-12 w-12 text-blue-500" />
        </div>
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Nenhum sinal híbrido encontrado</h3>
        <p className="text-blue-600 mb-4">
          Ainda não existem sinais gerados pelo algoritmo híbrido. O sistema verificará múltiplos timeframes, 
          níveis de Fibonacci, ADX e Volume Profile para gerar sinais de alta qualidade.
        </p>
        <p className="text-sm text-blue-500">
          Os sinais híbridos combinam confirmações em múltiplos timeframes para maior precisão.
        </p>
      </div>
    );
  }

  if (!hybridSignals || hybridSignals.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <div className="flex justify-center mb-4">
          <Brain className="h-12 w-12 text-blue-500" />
        </div>
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Nenhum sinal híbrido encontrado</h3>
        <p className="text-blue-600">
          Ainda não existem sinais gerados pelo algoritmo híbrido.
        </p>
      </div>
    );
  }

  // Filter signals by selected timeframe if needed
  let filteredSignals = hybridSignals;
  
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
            <Brain className="h-6 w-6 text-blue-800 dark:text-blue-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              🧠 Trade Ninja Híbrido
            </h2>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Sinais validados com múltiplos timeframes, Fibonacci, ADX e Volume Profile (POC)
            </p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="ml-auto p-2 rounded-full hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors">
                  <Info className="h-5 w-5 text-blue-700 dark:text-blue-300" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>Sinais Premium gerados apenas quando há confirmação em:</p>
                <ul className="list-disc pl-5 mt-2">
                  <li>Múltiplos timeframes (15m, 1h, 4h)</li>
                  <li>Acima do nível de Fibonacci 61.8%</li>
                  <li>ADX forte (&gt;25) no timeframe 4h</li>
                  <li>Acima do Point of Control do perfil de volume</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <Tabs defaultValue="hybrid" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="hybrid" onClick={() => setSelectedTimeframe("hybrid")}>
            🧠 Híbrido
          </TabsTrigger>
          <TabsTrigger value="15m" onClick={() => setSelectedTimeframe("15m")}>
            🟢 15m
          </TabsTrigger>
          <TabsTrigger value="1h" onClick={() => setSelectedTimeframe("1h")}>
            🔵 1h
          </TabsTrigger>
          <TabsTrigger value="4h" onClick={() => setSelectedTimeframe("4h")}>
            🟣 4h
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={selectedTimeframe} className="mt-0">
          <div className="rounded-md border">
            <Table>
              <TableCaption>
                Total de {filteredSignals.length} sinais híbridos encontrados
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Direção</TableHead>
                  <TableHead>Preço Entrada</TableHead>
                  <TableHead>Stop Loss</TableHead>
                  <TableHead>Take Profit</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSignals.map((signal, index) => (
                  <TableRow key={signal.id || index} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <TableCell className="font-mono text-xs">
                      {formatDate(signal.timestamp || signal.createdAt)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {signal.asset || signal.symbol}
                    </TableCell>
                    <TableCell>
                      <Badge variant={signal.direction === "BUY" ? "success" : "destructive"}>
                        {signal.direction}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {typeof signal.entry_price !== 'undefined' 
                        ? Number(signal.entry_price).toFixed(2) 
                        : typeof signal.entryPrice !== 'undefined'
                          ? Number(signal.entryPrice).toFixed(2)
                          : 'N/A'}
                    </TableCell>
                    <TableCell className="text-red-600 dark:text-red-400">
                      {typeof signal.sl !== 'undefined' 
                        ? Number(signal.sl).toFixed(2) 
                        : typeof signal.stopLoss !== 'undefined'
                          ? Number(signal.stopLoss).toFixed(2)
                          : 'N/A'}
                    </TableCell>
                    <TableCell className="text-green-600 dark:text-green-400">
                      {typeof signal.tp !== 'undefined' 
                        ? Number(signal.tp).toFixed(2) 
                        : signal.targets && signal.targets.length > 0 
                          ? Number(signal.targets[0].price).toFixed(2)
                          : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {typeof signal.score !== 'undefined' 
                          ? Number(signal.score) * 100 + '%'
                          : typeof signal.confidence !== 'undefined'
                            ? Number(signal.confidence) * 100 + '%'
                            : 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`${getResultColor(signal.result)}`}
                      >
                        {getResultIcon(signal.result)} {formatResultText(signal.result)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HybridSignalsTab;
