import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTradingSignals } from "@/hooks/useTradingSignals";
import { TradingSignal } from "@/lib/types";
import { Loader2, RefreshCw } from "lucide-react";
import CandlestickChart from "@/components/signals/CandlestickChart";
import SignalsList from "@/components/signals/SignalsList";
import SignalsSidebar from "@/components/signals/SignalsSidebar";
import SignalsSummary from "@/components/signals/SignalsSummary";
import CryptoNewsPanel from "@/components/signals/CryptoNewsPanel";
import PageHeader from "@/components/signals/PageHeader";
import CryptoTicker from "@/components/CryptoTicker";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fetchTopCryptos } from "@/lib/apiServices";
import { useIsMobile } from "@/hooks/use-mobile";

const SignalsDashboard = () => {
  const { toast } = useToast();
  const { signals, loading: isLoading, error, fetchSignals: refreshSignals, addSignals: generateSignals } = useTradingSignals();
  const [activeSignal, setActiveSignal] = useState<TradingSignal | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const isMobile = useIsMobile();

  // Fetch top cryptocurrencies for the ticker
  const { 
    data: topCryptos, 
    isLoading: isLoadingCryptos
  } = useQuery({
    queryKey: ['top-cryptos'],
    queryFn: fetchTopCryptos,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  useEffect(() => {
    // Set the first signal as active when signals load
    if (signals && signals.length > 0 && !activeSignal) {
      setActiveSignal(signals[0]);
    }
  }, [signals, activeSignal]);

  const handleSelectSignal = (signal: TradingSignal) => {
    setActiveSignal(signal);
  };

  const handleGenerateSignals = async () => {
    setIsGenerating(true);
    try {
      await generateSignals([]);
      toast({
        title: "Sinais gerados com sucesso!",
        description: "Novos sinais de trading foram gerados.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao gerar sinais",
        description: "Ocorreu um erro ao tentar gerar novos sinais.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshSignals();
      toast({
        title: "Sinais atualizados",
        description: "Os sinais de trading foram atualizados com sucesso.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao atualizar sinais",
        description: "Ocorreu um erro ao tentar atualizar os sinais.",
        variant: "destructive"
      });
    }
  };

  // No need to render anything on mobile until we have signals
  if (isMobile && (!signals || signals.length === 0) && !isLoading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Button onClick={handleGenerateSignals} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              'Gerar Sinais'
            )}
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Sem sinais disponíveis</h2>
            <p className="text-muted-foreground mb-4">
              Gere novos sinais para começar a analisar oportunidades de trading.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Crypto Ticker */}
      <div className="mb-4">
        <CryptoTicker coins={topCryptos || []} isLoading={isLoadingCryptos} />
      </div>

      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard de Sinais</h1>
            <p className="text-muted-foreground">Acompanhe e analise sinais de trading em tempo real</p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button onClick={handleGenerateSignals} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                'Gerar Sinais'
              )}
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SignalsSummary signals={signals || []} isLoading={isLoading} />
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Sidebar with signal list - only on larger screens */}
          {!isMobile && (
            <div className="lg:col-span-3">
              <SignalsSidebar 
                signals={signals || []}
                activeSignal={activeSignal}
                onSelectSignal={handleSelectSignal}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Chart and signal details */}
          <div className="lg:col-span-9 space-y-4">
            {/* Chart */}
            <div className="crypto-card">
              {activeSignal ? (
                <CandlestickChart
                  symbol={activeSignal.symbol}
                  entryPrice={activeSignal.entryPrice}
                  stopLoss={activeSignal.stopLoss}
                  targets={activeSignal.targets}
                />
              ) : (
                <div className="h-[400px] flex items-center justify-center">
                  {isLoading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <p className="text-muted-foreground">
                      Selecione um sinal para ver o gráfico
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Signal list on mobile */}
            {isMobile && (
              <div className="crypto-card">
                <div className="p-4 border-b border-primary/10">
                  <h2 className="text-lg font-semibold">Sinais Disponíveis</h2>
                </div>
                <div className="p-4">
                  <SignalsList 
                    signals={signals || []}
                    isLoading={isLoading}
                    error={error}
                    activeStrategy=""
                    strategies={[]}
                    onSelectStrategy={() => {}}
                  />
                </div>
              </div>
            )}

            {/* News */}
            <div className="crypto-card">
              <CryptoNewsPanel 
                symbol={activeSignal?.symbol} 
                isLoading={isLoading} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignalsDashboard;
