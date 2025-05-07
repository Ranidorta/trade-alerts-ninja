
import React, { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/signals/PageHeader";
import SignalHistoryTable from "@/components/signals/SignalHistoryTable";
import FilterPanel from "@/components/signals/history/FilterPanel";
import SignalEvaluationHeader from "@/components/signals/history/SignalEvaluationHeader";
import WaitingSignalsNotice from "@/components/signals/history/WaitingSignalsNotice";
import StatisticsTab from "@/components/signals/history/StatisticsTab";
import EmptySignalState from "@/components/signals/history/EmptySignalState";
import useSignalHistory from "@/hooks/useSignalHistory";
import useSignalEvaluation from "@/hooks/useSignalEvaluation";
import useSignalExport from "@/hooks/useSignalExport";

const HistoryPage = () => {
  const [filterSymbol, setFilterSymbol] = useState<string>("");
  const [filterResult, setFilterResult] = useState<string>("");
  const [filters, setFilters] = useState<{ symbol?: string; result?: string }>({});

  // Get signals history data and metadata
  const { 
    signals, 
    isLoading, 
    refetch, 
    uniqueSymbols,
    signalsReadyForEvaluation,
    signalsWaiting
  } = useSignalHistory(filters);
  
  // Handle signal evaluation
  const {
    isEvaluatingAll,
    handleVerifySingleSignal,
    handleEvaluateAllSignals
  } = useSignalEvaluation(signals, refetch);
  
  // Handle CSV export
  const { handleExportToCSV } = useSignalExport(signals);

  // Apply filters
  const handleApplyFilters = () => {
    const newFilters: { symbol?: string; result?: string } = {};
    if (filterSymbol) newFilters.symbol = filterSymbol;
    if (filterResult) newFilters.result = filterResult;
    setFilters(newFilters);
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilterSymbol("");
    setFilterResult("");
    setFilters({});
  };

  return (
    <div className="container py-8">
      <PageHeader 
        title="Histórico de Sinais" 
        description="Visualize e analise o histórico completo de sinais de trading"
      />
      
      <Alert className="mb-4">
        <Info className="h-4 w-4" />
        <AlertTitle>Regras de Avaliação de Sinais</AlertTitle>
        <AlertDescription>
          Os sinais só podem ser avaliados uma vez. Sinais novos precisam aguardar 15 minutos antes de poderem ser avaliados.
        </AlertDescription>
      </Alert>

      <FilterPanel 
        filterSymbol={filterSymbol}
        setFilterSymbol={setFilterSymbol}
        filterResult={filterResult}
        setFilterResult={setFilterResult}
        uniqueSymbols={uniqueSymbols}
        isLoading={isLoading}
        handleApplyFilters={handleApplyFilters}
        handleClearFilters={handleClearFilters}
        handleRefetch={refetch}
      />

      <SignalEvaluationHeader 
        signalsCount={signals?.length || 0}
        isLoading={isLoading}
        signalsReadyForEvaluation={signalsReadyForEvaluation}
        isEvaluatingAll={isEvaluatingAll}
        handleEvaluateAllSignals={handleEvaluateAllSignals}
        handleExportToCSV={handleExportToCSV}
      />
      
      <WaitingSignalsNotice signalsWaiting={signalsWaiting} />

      <Tabs defaultValue="table">
        <TabsList className="mb-4">
          <TabsTrigger value="table">Tabela</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : signals && signals.length > 0 ? (
            <SignalHistoryTable 
              signals={signals} 
              onVerifySingleSignal={handleVerifySingleSignal}
              onEvaluateAllSignals={handleEvaluateAllSignals}
            />
          ) : (
            <EmptySignalState handleRefetch={refetch} />
          )}
        </TabsContent>

        <TabsContent value="stats">
          <StatisticsTab signals={signals || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HistoryPage;
