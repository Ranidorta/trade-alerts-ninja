
import React from "react";
import { TradingSignal } from "@/lib/types";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  formatDate, 
  getResultColor, 
  formatResultText, 
  formatTakeProfit, 
  getEntryPrice, 
  getStopLoss, 
  getTimestamp 
} from "./utils/signalFormatters";

interface SignalTableRowProps {
  signal: TradingSignal;
  onSignalSelect?: (signal: TradingSignal) => void;
}

const SignalTableRow: React.FC<SignalTableRowProps> = ({ 
  signal, 
  onSignalSelect 
}) => {
  return (
    <TableRow 
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
  );
};

export default SignalTableRow;
