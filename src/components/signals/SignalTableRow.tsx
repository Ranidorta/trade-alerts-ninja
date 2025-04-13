
import React from "react";
import { TradingSignal } from "@/lib/types";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Check, 
  X, 
  AlertTriangle, 
  Ban
} from "lucide-react";
import { 
  formatDate, 
  getEntryPrice, 
  getStopLoss, 
  getTimestamp 
} from "./utils/signalFormatters";

interface SignalTableRowProps {
  signal: TradingSignal;
  onSignalSelect?: (signal: TradingSignal) => void;
}

// Helper function to format the result
const formatResultBadge = (result: any) => {
  if (result === undefined || result === null) return null;
  
  const resultStr = typeof result === 'number' 
    ? (result === 1 ? "WINNER" : "LOSER") 
    : String(result).toUpperCase();
  
  let bgColor = "";
  let textColor = "";
  let icon = null;
  
  switch(resultStr) {
    case "WINNER":
    case "WIN":
      bgColor = "bg-green-500/20";
      textColor = "text-green-700 dark:text-green-300";
      icon = <Check className="mr-1 h-3 w-3" />;
      return { text: "WINNER", bgColor, textColor, icon };
    case "PARTIAL":
      bgColor = "bg-orange-500/20";
      textColor = "text-orange-700 dark:text-orange-300";
      icon = <AlertTriangle className="mr-1 h-3 w-3" />;
      return { text: "PARTIAL", bgColor, textColor, icon };
    case "LOSER":
    case "LOSS":
      bgColor = "bg-red-500/20";
      textColor = "text-red-700 dark:text-red-300";
      icon = <X className="mr-1 h-3 w-3" />;
      return { text: "LOSER", bgColor, textColor, icon };
    case "FALSE":
    case "MISSED":
      bgColor = "bg-slate-400/20";
      textColor = "text-slate-700 dark:text-slate-300";
      icon = <Ban className="mr-1 h-3 w-3" />;
      return { text: "FALSE", bgColor, textColor, icon };
    default:
      return { text: resultStr, bgColor: "bg-gray-100", textColor: "text-gray-700", icon: null };
  }
};

// Helper function to format take profit values
const formatTakeProfit = (signal: TradingSignal): string => {
  // Check for tp array
  if (Array.isArray(signal.tp)) {
    return signal.tp.map(price => Number(price).toFixed(2)).join(' / ');
  }
  
  // Check for individual tp1, tp2, tp3 fields
  const tpValues = [];
  if (signal.tp1 !== undefined) tpValues.push(Number(signal.tp1).toFixed(2));
  if (signal.tp2 !== undefined) tpValues.push(Number(signal.tp2).toFixed(2));
  if (signal.tp3 !== undefined) tpValues.push(Number(signal.tp3).toFixed(2));
  
  if (tpValues.length > 0) {
    return tpValues.join(' / ');
  }
  
  // Check for targets array
  if (signal.targets && signal.targets.length > 0) {
    return signal.targets.map(t => Number(t.price).toFixed(2)).join(' / ');
  }
  
  // Check for single tp value
  if (signal.tp !== undefined && !Array.isArray(signal.tp)) {
    return Number(signal.tp).toFixed(2);
  }
  
  // Check for takeProfit array
  if (signal.takeProfit && signal.takeProfit.length > 0) {
    return signal.takeProfit.map(tp => Number(tp).toFixed(2)).join(' / ');
  }
  
  return 'N/A';
};

const SignalTableRow: React.FC<SignalTableRowProps> = ({ 
  signal, 
  onSignalSelect 
}) => {
  const resultBadge = formatResultBadge(signal.result);
  
  return (
    <TableRow 
      className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
      onClick={() => onSignalSelect && onSignalSelect(signal)}
    >
      <TableCell className="font-mono text-xs">
        {formatDate(getTimestamp(signal))}
      </TableCell>
      <TableCell className="font-semibold">
        {signal.symbol || signal.pair || signal.asset || 'N/A'}
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
        {resultBadge && (
          <div 
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${resultBadge.bgColor} ${resultBadge.textColor}`}
          >
            {resultBadge.icon}
            {resultBadge.text}
          </div>
        )}
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
  );
};

export default SignalTableRow;
