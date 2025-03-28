
import React, { useState } from "react";
import { TradingSignal } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";

interface SignalHistoryTableProps {
  signals: TradingSignal[];
}

export default function SignalHistoryTable({ signals }: SignalHistoryTableProps) {
  const [sortField, setSortField] = useState<keyof TradingSignal>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  const handleSort = (field: keyof TradingSignal) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };
  
  const sortedSignals = [...signals].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    // Handle special cases for sorting
    if (sortField === "createdAt") {
      aValue = new Date(a.createdAt || 0).getTime();
      bValue = new Date(b.createdAt || 0).getTime();
    } else if (sortField === "profit") {
      aValue = a.profit || 0;
      bValue = b.profit || 0;
    } else if (sortField === "result") {
      aValue = a.result === 1 ? 1 : a.result === 0 ? 0 : -1;
      bValue = b.result === 1 ? 1 : b.result === 0 ? 0 : -1;
    }
    
    if (aValue === bValue) return 0;
    
    const comparison = aValue < bValue ? -1 : 1;
    return sortDirection === "asc" ? comparison : -comparison;
  });
  
  // Sort indicator component
  const SortIndicator = ({ field }: { field: keyof TradingSignal }) => {
    if (sortField !== field) return null;
    
    return sortDirection === "asc" ? 
      <ChevronUp className="inline-block ml-1 h-4 w-4" /> : 
      <ChevronDown className="inline-block ml-1 h-4 w-4" />;
  };
  
  // Handle empty state
  if (signals.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nenhum sinal no histórico</p>
      </div>
    );
  }
  
  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort("symbol")}
            >
              Par <SortIndicator field="symbol" />
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort("direction")}
            >
              Direção <SortIndicator field="direction" />
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort("entryPrice")}
            >
              Entrada <SortIndicator field="entryPrice" />
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort("status")}
            >
              Status <SortIndicator field="status" />
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort("profit")}
            >
              Resultado <SortIndicator field="profit" />
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort("createdAt")}
            >
              Data <SortIndicator field="createdAt" />
            </TableHead>
            <TableHead>Alvos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedSignals.map((signal) => (
            <TableRow key={signal.id} className={
              signal.result === 1 ? "bg-green-50 dark:bg-green-950/20" : 
              signal.result === 0 ? "bg-red-50 dark:bg-red-950/20" : ""
            }>
              <TableCell className="font-medium">{signal.symbol}</TableCell>
              <TableCell>
                <Badge variant={signal.direction === "BUY" ? "default" : "destructive"}>
                  {signal.direction}
                </Badge>
              </TableCell>
              <TableCell>${signal.entryPrice?.toFixed(2)}</TableCell>
              <TableCell>
                {signal.status === "COMPLETED" ? (
                  signal.result === 1 ? (
                    <Badge variant="success" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Vencedor
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      Perdedor
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {signal.status}
                  </Badge>
                )}
              </TableCell>
              <TableCell className={
                signal.profit && signal.profit > 0 ? "text-green-600 dark:text-green-400 font-semibold" : 
                signal.profit && signal.profit < 0 ? "text-red-600 dark:text-red-400 font-semibold" : ""
              }>
                {signal.profit !== undefined ? `${signal.profit > 0 ? '+' : ''}${signal.profit.toFixed(2)}%` : "—"}
              </TableCell>
              <TableCell>
                {signal.createdAt && formatDistanceToNow(new Date(signal.createdAt), { addSuffix: true, locale: ptBR })}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {signal.targets?.map((target, idx) => (
                    <Badge
                      key={idx}
                      variant={target.hit ? "success" : "outline"}
                      className="text-xs"
                    >
                      TP{target.level}
                    </Badge>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
