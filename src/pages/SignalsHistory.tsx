
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSignals } from "@/lib/signalsApi";
import { useToast } from "@/components/ui/use-toast";

// Components
import { 
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { format } from "date-fns";

const SignalsHistory = () => {
  const { toast } = useToast();
  
  // Fetch signals data using React Query
  const { data: signals = [], isLoading, error, refetch } = useQuery({
    queryKey: ['signals', 'history'],
    queryFn: () => fetchSignals({ days: 90 }), // Fetch signals from the last 90 days
    meta: {
      onSettled: (data: any, error: any) => {
        if (error) {
          toast({
            title: "Erro ao carregar sinais",
            description: "Não foi possível carregar o histórico de sinais. Tente novamente mais tarde.",
            variant: "destructive",
          });
        }
      }
    }
  });

  // Calculate performance metrics
  const winningSignals = signals.filter((s: any) => s.result === 1);
  const losingSignals = signals.filter((s: any) => s.result === 0);
  
  const winRate = signals.length > 0 
    ? ((winningSignals.length / (winningSignals.length + losingSignals.length)) * 100).toFixed(2)
    : "0";
  
  // Handle refresh button click
  const handleRefresh = () => {
    refetch();
    toast({
      title: "Atualizando dados",
      description: "Buscando os sinais mais recentes...",
    });
  };

  // Format price with 2 decimal places
  const formatPrice = (price?: number) => {
    return price !== undefined ? price.toFixed(2) : "N/A";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Histórico de Sinais</h1>
          <p className="text-slate-600 dark:text-slate-300">
            Histórico completo dos sinais gerados pelo sistema
          </p>
        </div>
        
        <button 
          onClick={handleRefresh}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md flex items-center gap-2"
        >
          <RefreshCw className="h-5 w-5" />
          Atualizar
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Sinais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{signals.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Sinais Vencedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {winningSignals.length}
              <ArrowUp className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Sinais Perdedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {losingSignals.length}
              <ArrowDown className="h-5 w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Acerto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Signals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Sinais Detalhado</CardTitle>
          <CardDescription>
            Registro completo dos sinais gerados com detalhes sobre alvos alcançados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-2 text-sm text-muted-foreground">Carregando sinais...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-red-500">Erro ao carregar sinais</p>
            </div>
          ) : signals.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Nenhum sinal encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Par</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Stop Loss</TableHead>
                    <TableHead className="text-center">TP1</TableHead>
                    <TableHead className="text-center">TP2</TableHead>
                    <TableHead className="text-center">TP3</TableHead>
                    <TableHead className="text-center">Resultado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signals.map((signal: any) => {
                    const isWin = signal.result === 1;
                    const isLoss = signal.result === 0;
                    const isPending = signal.result === undefined;
                    
                    // Generate formatted date time
                    let dateTime = "Data desconhecida";
                    try {
                      if (signal.createdAt) {
                        dateTime = format(new Date(signal.createdAt), "dd/MM/yyyy HH:mm");
                      }
                    } catch (e) {
                      console.error("Error formatting date:", e);
                    }
                    
                    return (
                      <TableRow 
                        key={signal.id}
                        className={
                          isWin ? "bg-green-50 dark:bg-green-900/20" : 
                          isLoss ? "bg-red-50 dark:bg-red-900/20" : ""
                        }
                      >
                        <TableCell className="font-medium">{dateTime}</TableCell>
                        <TableCell>{signal.pair || signal.symbol}</TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            signal.type === "LONG" || signal.direction === "BUY"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}>
                            {signal.type === "LONG" || signal.direction === "BUY" ? (
                              <ArrowUp className="w-3 h-3 mr-1" />
                            ) : (
                              <ArrowDown className="w-3 h-3 mr-1" />
                            )}
                            {signal.type === "LONG" || signal.direction === "BUY" ? "Compra" : "Venda"}
                          </div>
                        </TableCell>
                        <TableCell>{formatPrice(signal.entryPrice)}</TableCell>
                        <TableCell>{formatPrice(signal.stopLoss)}</TableCell>
                        
                        {/* Target 1 */}
                        <TableCell className="text-center">
                          {signal.targets && signal.targets[0] ? (
                            <div className="flex flex-col items-center">
                              <span>{formatPrice(signal.targets[0].price)}</span>
                              {signal.targets[0].hit ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : isLoss ? (
                                <X className="w-4 h-4 text-red-600" />
                              ) : (
                                <span className="text-xs text-gray-400">Pendente</span>
                              )}
                            </div>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                        
                        {/* Target 2 */}
                        <TableCell className="text-center">
                          {signal.targets && signal.targets[1] ? (
                            <div className="flex flex-col items-center">
                              <span>{formatPrice(signal.targets[1].price)}</span>
                              {signal.targets[1].hit ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : isLoss ? (
                                <X className="w-4 h-4 text-red-600" />
                              ) : (
                                <span className="text-xs text-gray-400">Pendente</span>
                              )}
                            </div>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                        
                        {/* Target 3 */}
                        <TableCell className="text-center">
                          {signal.targets && signal.targets[2] ? (
                            <div className="flex flex-col items-center">
                              <span>{formatPrice(signal.targets[2].price)}</span>
                              {signal.targets[2].hit ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : isLoss ? (
                                <X className="w-4 h-4 text-red-600" />
                              ) : (
                                <span className="text-xs text-gray-400">Pendente</span>
                              )}
                            </div>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                        
                        {/* Result */}
                        <TableCell>
                          <div className={`flex justify-center items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            isWin 
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : isLoss
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}>
                            {isWin ? (
                              <>
                                <Check className="w-3 h-3 mr-1" />
                                Vencedor
                              </>
                            ) : isLoss ? (
                              <>
                                <X className="w-3 h-3 mr-1" />
                                Perdedor
                              </>
                            ) : (
                              "Pendente"
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SignalsHistory;
