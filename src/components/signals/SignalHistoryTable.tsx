
import React from "react";
import { TradingSignal } from "@/lib/types";
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
import { Button } from "../ui/button";

interface SignalHistoryTableProps {
  signals: TradingSignal[];
  onSignalSelect?: (signal: TradingSignal) => void;
}

const SignalHistoryTable: React.FC<SignalHistoryTableProps> = ({ 
  signals,
  onSignalSelect
}) => {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm");
    } catch {
      return dateString;
    }
  };

  const getResultColor = (result: any): string => {
    if (!result) return "bg-gray-100 text-gray-800";
    
    const resultStr = typeof result === 'number' ? 
      (result === 1 ? "win" : "loss") : result.toString().toLowerCase();
    
    switch(resultStr) {
      case "winner":
      case "win":
      case "1":
        return "bg-green-100 text-green-800 border-green-300";
      case "partial":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "loser":
      case "loss":
      case "0":
        return "bg-red-100 text-red-800 border-red-300";
      case "false":
      case "missed":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatResultText = (result: any): string => {
    if (!result) return "PENDENTE";
    
    if (typeof result === 'number') {
      return result === 1 ? "WINNER" : "LOSER";
    }
    
    const resultMap: Record<string, string> = {
      "win": "WINNER",
      "loss": "LOSER",
      "partial": "PARTIAL",
      "missed": "FALSE",
      "winner": "WINNER",
      "loser": "LOSER",
      "false": "FALSE"
    };
    
    return resultMap[result.toString().toLowerCase()] || result.toString().toUpperCase();
  };

  const formatTakeProfit = (signal: TradingSignal): string => {
    // Verificar se temos um array de takeProfit
    if (signal.takeProfit && signal.takeProfit.length > 0) {
      return Number(signal.takeProfit[0]).toFixed(2);
    }
    
    // Verificar se temos targets estruturados
    if (signal.targets && signal.targets.length > 0) {
      return Number(signal.targets[0].price).toFixed(2);
    }
    
    // Verificar campos específicos para sinais híbridos (tp1, tp2, tp3)
    if (typeof signal.tp1 !== 'undefined') {
      return Number(signal.tp1).toFixed(2);
    }
    
    // Verificar campo tp genérico (pode ser um array ou número)
    if (typeof signal.tp !== 'undefined') {
      if (Array.isArray(signal.tp)) {
        return signal.tp.map(t => Number(t).toFixed(2)).join(', ');
      }
      return Number(signal.tp).toFixed(2);
    }
    
    return 'N/A';
  };

  const getEntryPrice = (signal: TradingSignal): string => {
    if (typeof signal.entryPrice !== 'undefined') {
      return Number(signal.entryPrice).toFixed(2);
    }
    
    if (typeof signal.entry_price !== 'undefined') {
      return Number(signal.entry_price).toFixed(2);
    }
    
    return 'N/A';
  };

  const getStopLoss = (signal: TradingSignal): string => {
    if (typeof signal.stopLoss !== 'undefined') {
      return Number(signal.stopLoss).toFixed(2);
    }
    
    if (typeof signal.sl !== 'undefined') {
      return Number(signal.sl).toFixed(2);
    }
    
    return 'N/A';
  };

  const getTimestamp = (signal: TradingSignal): string => {
    return signal.timestamp || signal.createdAt;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableCaption>
          Total de {signals.length} sinais no histórico
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Símbolo</TableHead>
            <TableHead>Direção</TableHead>
            <TableHead>Entrada</TableHead>
            <TableHead>Stop Loss</TableHead>
            <TableHead>Take Profit</TableHead>
            <TableHead>Resultado</TableHead>
            <TableHead>Estratégia</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {signals.map((signal) => (
            <TableRow 
              key={signal.id} 
              className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              onClick={() => onSignalSelect && onSignalSelect(signal)}
            >
              <TableCell className="font-mono text-xs">
                {formatDate(getTimestamp(signal))}
              </TableCell>
              <TableCell className="font-semibold">
                {signal.symbol || signal.pair || 'N/A'}
              </TableCell>
              <TableCell>
                <Badge variant={signal.direction === "BUY" ? "success" : "destructive"}>
                  {signal.direction}
                </Badge>
              </TableCell>
              <TableCell>
                {getEntryPrice(signal)}
              </TableCell>
              <TableCell className="text-red-600 dark:text-red-400">
                {getStopLoss(signal)}
              </TableCell>
              <TableCell className="text-green-600 dark:text-green-400">
                {formatTakeProfit(signal)}
              </TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={`${getResultColor(signal.result)}`}
                >
                  {formatResultText(signal.result)}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">
                {signal.strategy || "-"}
              </TableCell>
              <TableCell>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSignalSelect && onSignalSelect(signal);
                  }}
                >
                  Detalhes
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default SignalHistoryTable;
