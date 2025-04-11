
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
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
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
                {formatDate(signal.createdAt)}
              </TableCell>
              <TableCell className="font-semibold">
                {signal.symbol}
              </TableCell>
              <TableCell>
                <Badge variant={signal.direction === "BUY" ? "success" : "destructive"}>
                  {signal.direction}
                </Badge>
              </TableCell>
              <TableCell>
                {typeof signal.entryPrice !== 'undefined' 
                  ? Number(signal.entryPrice).toFixed(2) 
                  : typeof signal.entry_price !== 'undefined'
                    ? Number(signal.entry_price).toFixed(2)
                    : 'N/A'}
              </TableCell>
              <TableCell className="text-red-600 dark:text-red-400">
                {typeof signal.stopLoss !== 'undefined' 
                  ? Number(signal.stopLoss).toFixed(2) 
                  : typeof signal.sl !== 'undefined'
                    ? Number(signal.sl).toFixed(2)
                    : 'N/A'}
              </TableCell>
              <TableCell className="text-green-600 dark:text-green-400">
                {signal.takeProfit && signal.takeProfit.length > 0 
                  ? Number(signal.takeProfit[0]).toFixed(2) 
                  : signal.targets && signal.targets.length > 0 
                    ? Number(signal.targets[0].price).toFixed(2)
                    : typeof signal.tp1 !== 'undefined'
                      ? Number(signal.tp1).toFixed(2)
                      : typeof signal.tp !== 'undefined'
                        ? Number(signal.tp).toFixed(2)
                        : 'N/A'}
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
                {signal.strategy || "N/A"}
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
