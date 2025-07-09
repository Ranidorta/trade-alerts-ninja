
import React, { useState } from "react";
import { useStrategyPerformance } from "@/hooks/useStrategyPerformance";
import { usePerformanceMetrics } from "@/hooks/usePerformanceMetrics";
import { usePerformanceStorage } from "@/hooks/usePerformanceStorage";
import PageHeader from "@/components/signals/PageHeader";
import StrategyPerformanceTable from "@/components/signals/StrategyPerformanceTable";
import StrategyPerformanceChart from "@/components/signals/StrategyPerformanceChart";
import PerformanceChart from "@/components/signals/PerformanceChart";
import PerformanceStatsCard from "@/components/signals/PerformanceStatsCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTradingSignals } from "@/hooks/useTradingSignals";
import { analyzeSignalsHistory } from "@/lib/signalHistoryService";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PerformanceData } from "@/lib/types";

const PerformanceBreakdownCard = ({ title, value, color, percentage, icon }: { 
  title: string; 
  value: number; 
  color: string;
  percentage: number;
  icon: React.ReactNode;
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" style={{ color }}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground">
          {percentage.toFixed(2)}% do total
        </p>
      </CardContent>
    </Card>
  );
};

const PerformanceDashboard = () => {
  const { toast } = useToast();
  const [days, setDays] = useState(30);
  const [chartType, setChartType] = useState<"pie" | "bar">("pie");
  
  // Fetch performance data from API
  const { data: apiPerformanceData, isLoading: isLoadingPerformance, refetch: refetchPerformance } = usePerformanceMetrics(days);
  
  // Local performance data (always available)
  const { 
    performanceData: localPerformanceData, 
    isLoading: isLoadingLocal, 
    refreshData: refreshLocalData,
    getAnalytics 
  } = usePerformanceStorage();
  
  // Use API data if available, otherwise fallback to local data
  const performanceData = apiPerformanceData || localPerformanceData;
  const isLoading = isLoadingPerformance && isLoadingLocal;
  
  const { signals, updateSignalStatuses } = useTradingSignals();
  const { strategies, loading, fetchStrategyPerformance, recalculateStatistics } = useStrategyPerformance();
  
  // Get performance metrics from local signals history as backup
  const metrics = analyzeSignalsHistory();
  
  // Function to sync Firebase with local data
  const syncWithFirebase = async () => {
    try {
      toast({
        title: "Atualizando dados",
        description: "Sincronizando dados locais com a API...",
      });
      
      // Process signals history to update performance data
      const { processSignalsHistory } = await import('@/lib/performanceStorage');
      const newValidated = processSignalsHistory();
      
      // Refresh local data
      refreshLocalData();
      
      // Update signal statuses first
      await updateSignalStatuses();
      
      // Then recalculate Firebase statistics
      await recalculateStatistics();
      
      // Refetch performance data
      await refetchPerformance();
      
      toast({
        title: "Sincronização completa",
        description: `Dados sincronizados! ${newValidated} novos sinais validados.`,
      });
    } catch (error) {
      console.error("Error syncing data:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao sincronizar dados com a API",
      });
    }
  };
  
  return (
    <div className="container py-8">
      <PageHeader 
        title="Dashboard de Performance"
        description="Acompanhe o desempenho dos sinais e estratégias de trading"
      />
      
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Select 
            value={days.toString()} 
            onValueChange={(value) => setDays(parseInt(value, 10))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
          
          <Select 
            value={chartType} 
            onValueChange={(value: "pie" | "bar") => setChartType(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo de gráfico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pie">Gráfico de Pizza</SelectItem>
              <SelectItem value="bar">Gráfico de Barras</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button onClick={syncWithFirebase} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar Dados
        </Button>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="strategies">Estratégias</TabsTrigger>
          <TabsTrigger value="assets">Ativos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Performance Summary Cards */}
          {performanceData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Sinais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{performanceData.total}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sinais validados no sistema
                  </p>
                </CardContent>
              </Card>
              
              <PerformanceStatsCard 
                title="Sinais Vencedores"
                value={performanceData.vencedor.quantidade}
                percentage={performanceData.vencedor.percentual}
                type="vencedor"
                total={performanceData.total}
              />
              
              <PerformanceStatsCard 
                title="Sinais Parciais"
                value={performanceData.parcial.quantidade}
                percentage={performanceData.parcial.percentual}
                type="parcial"
                total={performanceData.total}
              />
              
              <PerformanceStatsCard 
                title="Sinais Perdedores"
                value={performanceData.perdedor.quantidade}
                percentage={performanceData.perdedor.percentual}
                type="perdedor"
                total={performanceData.total}
              />
            </div>
          )}
          
          {/* Success Rate Card */}
          {performanceData && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Taxa de Sucesso Total</CardTitle>
                <CardDescription>
                  Combinação de sinais vencedores e parciais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-bold">
                      {(performanceData.vencedor.percentual + performanceData.parcial.percentual).toFixed(2)}%
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {performanceData.vencedor.quantidade + performanceData.parcial.quantidade} de {performanceData.total} sinais
                    </p>
                  </div>
                  <div className="w-32 h-32 rounded-full border-8 flex items-center justify-center"
                    style={{ 
                      borderColor: (performanceData.vencedor.percentual + performanceData.parcial.percentual) > 50 ? "#10b981" : "#ef4444",
                      opacity: 0.8
                    }}
                  >
                    <span className="text-2xl">
                      {(performanceData.vencedor.percentual + performanceData.parcial.percentual) > 50 ? "✓" : "✗"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Performance Chart */}
          {performanceData ? (
            <PerformanceChart 
              data={performanceData}
              chartType={chartType}
              isLoading={isLoadingPerformance} 
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Resultados</CardTitle>
              </CardHeader>
              <CardContent className="h-80 flex justify-center items-center">
                <div className="animate-pulse text-muted-foreground">
                  Carregando dados de performance...
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="strategies" className="space-y-4">
          {/* Strategy Performance Table */}
          <StrategyPerformanceTable 
            strategies={strategies}
            isLoading={loading}
            onRefresh={fetchStrategyPerformance}
          />
          
          {/* Strategy Performance Chart */}
          {strategies.length > 0 && (
            <StrategyPerformanceChart strategies={strategies} />
          )}
        </TabsContent>
        
        <TabsContent value="assets" className="space-y-4">
          {/* Assets Performance Component would go here */}
          <Card>
            <CardHeader>
              <CardTitle>Desempenho por Ativo</CardTitle>
            </CardHeader>
            <CardContent className="h-80 flex justify-center items-center">
              <p className="text-muted-foreground">
                Dados de desempenho por ativo serão exibidos aqui
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceDashboard;
