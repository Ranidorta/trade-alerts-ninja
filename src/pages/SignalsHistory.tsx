import React, { useState, useEffect, useCallback } from "react";
import { TradingSignal } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart4, 
  Calendar, 
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Database,
  Filter,
  Search,
  SlidersHorizontal,
  CheckCircle,
  List,
  CalendarIcon,
  X
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  Legend
} from "recharts";
import ApiConnectionError from "@/components/signals/ApiConnectionError";
import { config } from "@/config/env";
import { 
  getSignalsHistory, 
  updateAllSignalsStatus, 
  analyzeSignalsHistory,
  updateSignalInHistory
} from "@/lib/signalHistoryService";
import { verifySingleSignal, verifyAllSignals } from "@/lib/signalVerification";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import SignalHistoryTable from "@/components/signals/SignalHistoryTable";
import { getSignalHistory } from "@/lib/signal-storage";
import SignalsSummary from "@/components/signals/SignalsSummary";
import { fetchSignalsHistory } from "@/lib/signalsApi";

const SignalsHistory = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<TradingSignal[]>([]);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedTab, setSelectedTab] = useState("table");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState<string | undefined>(undefined);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);
  const [isVerifyingAll, setIsVerifyingAll] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchSignalsHistory();
      setSignals(data);
      setFilteredSignals(data);
      setIsError(false);
    } catch (error) {
      console.error("Error fetching signals:", error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDateChange = (newDate: Date | undefined) => {
    setDate(newDate);
  };

  const filterSignalsByDate = useCallback(() => {
    if (!date) {
      setFilteredSignals([...signals]);
      return;
    }

    const selectedDate = new Date(date);
    const filtered = signals.filter((signal) => {
      const signalDate = new Date(signal.createdAt);
      return (
        signalDate.getDate() === selectedDate.getDate() &&
        signalDate.getMonth() === selectedDate.getMonth() &&
        signalDate.getFullYear() === selectedDate.getFullYear()
      );
    });

    setFilteredSignals(filtered);
  }, [date, signals]);

  useEffect(() => {
    filterSignalsByDate();
  }, [filterSignalsByDate]);

  const filterSignalsBySearch = useCallback(() => {
    if (!search) {
      setFilteredSignals([...signals]);
      return;
    }

    const filtered = signals.filter((signal) => {
      return (
        signal.symbol.toLowerCase().includes(search.toLowerCase()) ||
        signal.strategy?.toLowerCase().includes(search.toLowerCase())
      );
    });

    setFilteredSignals(filtered);
  }, [search, signals]);

  useEffect(() => {
    filterSignalsBySearch();
  }, [filterSignalsBySearch]);

  const filterSignalsByResult = useCallback(() => {
    if (!resultFilter) {
      setFilteredSignals([...signals]);
      return;
    }

    const filtered = signals.filter((signal) => {
      return signal.result === resultFilter;
    });

    setFilteredSignals(filtered);
  }, [resultFilter, signals]);

  useEffect(() => {
    filterSignalsByResult();
  }, [filterSignalsByResult]);

  const handleVerifySingleSignal = async (signalId: string) => {
    setIsUpdating(true);
    try {
      const updatedSignal = await verifySingleSignal(signalId);
      if (updatedSignal) {
        // Update the signals state with the updated signal
        setSignals((prevSignals) =>
          prevSignals.map((signal) =>
            signal.id === signalId ? updatedSignal : signal
          )
        );
        setFilteredSignals((prevFilteredSignals) =>
          prevFilteredSignals.map((signal) =>
            signal.id === signalId ? updatedSignal : signal
          )
        );
        toast({
          title: "Sinal verificado!",
          description: "O sinal foi verificado com sucesso.",
        });
      } else {
        toast({
          title: "Erro ao verificar sinal",
          description: "Não foi possível verificar o sinal.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error verifying signal:", error);
      toast({
        title: "Erro ao verificar sinal",
        description: "Ocorreu um erro ao verificar o sinal.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleVerifyAllSignals = async () => {
    setIsVerifyingAll(true);
    try {
      await verifyAllSignals();
      toast({
        title: "Sinais verificados!",
        description: "Todos os sinais foram verificados com sucesso.",
      });
      fetchData();
    } catch (error) {
      console.error("Error verifying all signals:", error);
      toast({
        title: "Erro ao verificar sinais",
        description: "Ocorreu um erro ao verificar os sinais.",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingAll(false);
    }
  };

  const handleUpdateAllSignals = async () => {
    setIsUpdatingAll(true);
    try {
      await updateAllSignalsStatus();
      toast({
        title: "Sinais atualizados!",
        description: "Todos os sinais foram atualizados com sucesso.",
      });
      fetchData();
    } catch (error) {
      console.error("Error updating all signals:", error);
      toast({
        title: "Erro ao atualizar sinais",
        description: "Ocorreu um erro ao atualizar os sinais.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingAll(false);
    }
  };

  const handleReprocessAllHistory = async () => {
    setIsReprocessing(true);
    try {
      await updateAllSignalsStatus();
      toast({
        title: "Histórico reprocessado!",
        description: "Todo o histórico foi reprocessado com sucesso.",
      });
      fetchData();
    } catch (error) {
      console.error("Error reprocessing history:", error);
      toast({
        title: "Erro ao reprocessar histórico",
        description: "Ocorreu um erro ao reprocessar o histórico.",
        variant: "destructive",
      });
    } finally {
      setIsReprocessing(false);
    }
  };

  const summary = analyzeSignalsHistory();

  if (isError) {
    return <ApiConnectionError />;
  }

  return (
    <div className="container max-w-7xl py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="scroll-m-20 pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0">
            Histórico de Sinais
          </h1>
          <Badge variant="secondary">{signals.length} sinais</Badge>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Avançado
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span>{date ? format(date, "dd/MM/yyyy") : "Filtrar data"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0"
              align="start"
            >
              <CalendarComponent
                mode="single"
                selected={date}
                onSelect={handleDateChange}
                className="rounded-md border"
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filtrar
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="end">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium leading-none">Resultado</h4>
                  <Select onValueChange={value => setResultFilter(value)} defaultValue={resultFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Selecione o resultado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={undefined}>Limpar</SelectItem>
                      <SelectItem value="win">Vencedor</SelectItem>
                      <SelectItem value="loss">Perdedor</SelectItem>
                      <SelectItem value="partial">Parcial</SelectItem>
                      <SelectItem value="missed">Falso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="outline" onClick={fetchData} disabled={isLoading}>
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </>
            )}
          </Button>
        </div>
      </div>

      {isAdvancedFilterOpen && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Filtros Avançados</CardTitle>
            <CardDescription>
              Use os filtros avançados para refinar ainda mais os resultados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium leading-none">Pesquisar</h4>
                <Input
                  placeholder="Pesquisar por par ou estratégia..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleUpdateAllSignals}
                disabled={isUpdatingAll}
              >
                {isUpdatingAll ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Atualizar todos
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={handleVerifyAllSignals}
                disabled={isVerifyingAll}
              >
                {isVerifyingAll ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Verificar todos
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={handleReprocessAllHistory}
                disabled={isReprocessing}
              >
                {isReprocessing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Reprocessando...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Reprocessar tudo
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table">
            <List className="mr-2 h-4 w-4" />
            Tabela
          </TabsTrigger>
          <TabsTrigger value="summary">
            <BarChart4 className="mr-2 h-4 w-4" />
            Resumo
          </TabsTrigger>
        </TabsList>
        <TabsContent value="table" className="space-y-2">
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Carregando sinais...
            </div>
          ) : (
            <SignalHistoryTable
              signals={filteredSignals}
              onVerifySingleSignal={handleVerifySingleSignal}
            />
          )}
        </TabsContent>
        <TabsContent value="summary" className="space-y-2">
          <SignalsSummary summary={summary} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Export the component as default
export default SignalsHistory;
