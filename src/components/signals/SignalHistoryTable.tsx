
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
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  ArrowUp, 
  ArrowDown,
  AlertCircle,
  CheckCircle2,
  Diff,
  Calendar
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SignalHistoryTableProps {
  signals: TradingSignal[];
  onVerifySingleSignal?: (signalId: string) => Promise<void>;
}

export default function SignalHistoryTable({ signals, onVerifySingleSignal }: SignalHistoryTableProps) {
  const [sortField, setSortField] = useState<keyof TradingSignal>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [verifyingSignal, setVerifyingSignal] = useState<string | null>(null);
  const [visibleRows, setVisibleRows] = useState<number>(50); // Initial number of rows to show
  
  const handleSort = (field: keyof TradingSignal) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };
  
  const handleVerifySignal = async (signalId: string) => {
    if (!onVerifySingleSignal) return;
    
    setVerifyingSignal(signalId);
    try {
      await onVerifySingleSignal(signalId);
    } finally {
      setVerifyingSignal(null);
    }
  };
  
  const sortedSignals = [...signals].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    if (sortField === "createdAt") {
      aValue = new Date(a.createdAt || 0).getTime();
      bValue = new Date(b.createdAt || 0).getTime();
    } else if (sortField === "profit") {
      aValue = a.profit || 0;
      bValue = b.profit || 0;
    } else if (sortField === "result") {
      // Convert result values to numeric for sorting
      const resultToNumber = (result: any) => {
        if (result === 1 || result === "win" || result === "WINNER") return 3;
        if (result === "partial" || result === "PARTIAL") return 2;
        if (result === 0 || result === "loss" || result === "LOSER") return 1;
        if (result === "missed" || result === "FALSE") return 0;
        return -1;
      };
      aValue = resultToNumber(a.result);
      bValue = resultToNumber(b.result);
    }
    
    if (aValue === bValue) return 0;
    
    const comparison = aValue < bValue ? -1 : 1;
    return sortDirection === "asc" ? comparison : -comparison;
  });

  // Slice the data to only show the visible rows
  const displayedSignals = sortedSignals.slice(0, visibleRows);
  
  // Handle loading more rows
  const handleLoadMore = () => {
    setVisibleRows(prev => prev + 50);
  };
  
  const SortIndicator = ({ field }: { field: keyof TradingSignal }) => {
    if (sortField !== field) return null;
    
    return sortDirection === "asc" ? 
      <ChevronUp className="inline-block ml-1 h-4 w-4" /> : 
      <ChevronDown className="inline-block ml-1 h-4 w-4" />;
  };
  
  const formatDate = (dateStr?: string, verifiedAt?: string) => {
    if (!dateStr) return "—";
    
    try {
      // Exibir data e hora completas em formato brasileiro
      const formattedFullDate = format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
      
      // Exibir também "há quanto tempo" para referência rápida
      const timeAgo = formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
      
      if (verifiedAt) {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col">
                  <span className="flex items-center text-xs font-medium">
                    {formattedFullDate}
                    <CheckCircle2 className="ml-1 h-3 w-3 text-green-500" />
                  </span>
                  <span className="text-xs text-muted-foreground">{timeAgo}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Verificado em {new Date(verifiedAt).toLocaleString('pt-BR')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
      
      return (
        <div className="flex flex-col">
          <span className="text-xs font-medium">{formattedFullDate}</span>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
      );
    } catch (e) {
      console.error("Erro ao formatar data:", e);
      return dateStr;
    }
  };

  const formatPrice = (price?: number) => {
    if (price === undefined) return "—";
    return price < 0.1 ? price.toFixed(6) : price < 1 ? price.toFixed(4) : price.toFixed(2);
  };
  
  const getResultColor = (result: string | number | undefined) => {
    if (result === 1 || result === "win" || result === "WINNER") {
      return "text-green-600 dark:text-green-400";
    } else if (result === 0 || result === "loss" || result === "LOSER") {
      return "text-red-600 dark:text-red-400";
    } else if (result === "missed" || result === "FALSE") {
      return "text-gray-500";
    } else if (result === "partial" || result === "PARTIAL") {
      return "text-amber-500";
    }
    return "";
  };
  
  const formatResult = (result: string | number | undefined) => {
    if (result === 1 || result === "win" || result === "WINNER") return "Vencedor";
    if (result === 0 || result === "loss" || result === "LOSER") return "Perdedor";
    if (result === "partial" || result === "PARTIAL") return "Parcial";
    if (result === "missed" || result === "FALSE") return "Falso";
    return result ? String(result) : "—";
  };
  
  const getStatusBadge = (signal: TradingSignal) => {
    if (signal.status === "COMPLETED") {
      if (signal.result === 1 || signal.result === "win" || signal.result === "WINNER") {
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Vencedor
          </Badge>
        );
      } else if (signal.result === 0 || signal.result === "loss" || signal.result === "LOSER") {
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Perdedor
          </Badge>
        );
      } else if (signal.result === "partial" || signal.result === "PARTIAL") {
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Parcial
          </Badge>
        );
      } else if (signal.result === "missed" || signal.result === "FALSE") {
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Falso
          </Badge>
        );
      } else {
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Concluído
          </Badge>
        );
      }
    } else {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {signal.status || "PENDING"}
        </Badge>
      );
    }
  };
  
  const shouldShowVerifyButton = (signal: TradingSignal) => {
    return signal.result === undefined && 
           signal.status !== "COMPLETED" && 
           signal.status !== "WAITING";
  };
  
  if (signals.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nenhum sinal no histórico</p>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      <div className="overflow-auto rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
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
              <TableHead>
                Alvos (TP)
              </TableHead>
              <TableHead>
                Stop Loss
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => handleSort("result")}
              >
                Resultado <SortIndicator field="result" />
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => handleSort("createdAt")}
              >
                Data/Hora <SortIndicator field="createdAt" />
              </TableHead>
              {onVerifySingleSignal && (
                <TableHead>Ação</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedSignals.map((signal) => (
              <TableRow key={signal.id || `${signal.symbol}-${signal.createdAt}`} className={
                signal.result === 1 || signal.result === "win" || signal.result === "WINNER" ? "bg-green-50 dark:bg-green-950/20" : 
                signal.result === 0 || signal.result === "loss" || signal.result === "LOSER" ? "bg-red-50 dark:bg-red-950/20" :
                signal.result === "missed" || signal.result === "FALSE" ? "bg-gray-50 dark:bg-gray-900/20" :
                signal.result === "partial" || signal.result === "PARTIAL" ? "bg-amber-50 dark:bg-amber-900/20" : ""
              }>
                <TableCell className="font-medium">
                  {signal.error ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center">
                            {signal.symbol}
                            <AlertCircle className="ml-1 h-3 w-3 text-amber-500" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Erro na verificação: {signal.error}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : signal.verifiedAt ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center">
                            {signal.symbol}
                            <Diff className="ml-1 h-3 w-3 text-blue-500" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Verificado com dados da Binance</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    signal.symbol
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={signal.direction === "BUY" ? "default" : "destructive"} className="flex items-center gap-1">
                    {signal.direction === "BUY" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {signal.direction}
                  </Badge>
                </TableCell>
                <TableCell>${formatPrice(signal.entryPrice)}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-xs">
                      <Badge 
                        variant={signal.targets?.find(t => t.level === 1)?.hit ? "success" : "outline"} 
                        className="text-xs"
                      >
                        TP1: ${formatPrice(signal.tp1 || signal.targets?.find(t => t.level === 1)?.price)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <Badge 
                        variant={signal.targets?.find(t => t.level === 2)?.hit ? "success" : "outline"} 
                        className="text-xs"
                      >
                        TP2: ${formatPrice(signal.tp2 || signal.targets?.find(t => t.level === 2)?.price)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <Badge 
                        variant={signal.targets?.find(t => t.level === 3)?.hit ? "success" : "outline"} 
                        className="text-xs"
                      >
                        TP3: ${formatPrice(signal.tp3 || signal.targets?.find(t => t.level === 3)?.price)}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-red-600 dark:text-red-400">
                  ${formatPrice(signal.stopLoss)}
                </TableCell>
                <TableCell className={getResultColor(signal.result)}>
                  {getStatusBadge(signal)}
                </TableCell>
                <TableCell>
                  {formatDate(signal.createdAt, signal.verifiedAt)}
                </TableCell>
                {onVerifySingleSignal && (
                  <TableCell>
                    {shouldShowVerifyButton(signal) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerifySignal(signal.id)}
                        disabled={verifyingSignal === signal.id}
                      >
                        {verifyingSignal === signal.id ? 'Verificando...' : 'Verificar'}
                      </Button>
                    ) : null}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Load more button if there are more signals to display */}
      {sortedSignals.length > visibleRows && (
        <div className="flex justify-center mt-4">
          <Button variant="outline" onClick={handleLoadMore}>
            Carregar mais ({sortedSignals.length - visibleRows} restantes)
          </Button>
        </div>
      )}
    </div>
  );
}
