import { useState, useEffect } from "react";
import { Trophy, TrendingUp, Target, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { TradingSignal } from "@/lib/types";

interface EsportivoSignal extends TradingSignal {
  sport?: string;
  event?: string;
  odds?: number;
  confidence?: number;
  strategy?: string;
  price?: number; // Added this property
}

const TradingEsportivoTab = () => {
  const [signals, setSignals] = useState<EsportivoSignal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Mock data for esportivo signals
  const generateEsportivoSignals = () => {
    const mockSignals: EsportivoSignal[] = [
      {
        id: "esp-001",
        symbol: "FLAMENGO vs PALMEIRAS",
        pair: "FLA/PAL",
        type: "LONG",
        price: 2.15,
        stopLoss: 1.95,
        takeProfit: [2.45],
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        sport: "Futebol",
        event: "Brasileirão 2024",
        odds: 2.15,
        confidence: 85,
        strategy: "Over 2.5 Gols"
      },
      {
        id: "esp-002", 
        symbol: "LAKERS vs WARRIORS",
        pair: "LAL/GSW",
        type: "SHORT",
        price: 1.87,
        stopLoss: 2.10,
        takeProfit: [1.65],
        status: "WAITING",
        createdAt: new Date(Date.now() - 300000).toISOString(),
        sport: "Basketball",
        event: "NBA Regular Season",
        odds: 1.87,
        confidence: 78,
        strategy: "Under Total Points"
      },
      {
        id: "esp-003",
        symbol: "REAL MADRID vs BARCELONA", 
        pair: "RMA/BAR",
        type: "LONG",
        price: 2.30,
        stopLoss: 2.05,
        takeProfit: [2.65],
        status: "ACTIVE",
        createdAt: new Date(Date.now() - 600000).toISOString(),
        sport: "Futebol",
        event: "El Clásico",
        odds: 2.30,
        confidence: 92,
        strategy: "Ambas Marcam"
      }
    ];
    return mockSignals;
  };

  const handleGenerateSignals = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newSignals = generateEsportivoSignals();
      setSignals(newSignals);
      
      toast({
        title: "Sinais esportivos gerados!",
        description: `${newSignals.length} novos sinais para trading esportivo`
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar sinais",
        description: "Tente novamente em alguns instantes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSportIcon = (sport: string) => {
    switch (sport?.toLowerCase()) {
      case 'futebol':
        return '⚽';
      case 'basketball':
        return '🏀';
      default:
        return '🏆';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'bg-green-500';
    if (confidence >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  useEffect(() => {
    // Auto-generate some initial signals
    if (signals.length === 0) {
      const initialSignals = generateEsportivoSignals();
      setSignals(initialSignals);
    }
  }, [signals.length]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Trading Esportivo
          </h2>
          <p className="text-muted-foreground mt-1">
            Sinais especializados para apostas esportivas
          </p>
        </div>
        <Button onClick={handleGenerateSignals} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Gerando...' : 'Gerar Sinais Esportivos'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Taxa de Acerto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">87.5%</div>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              ROI Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">+24.3%</div>
            <p className="text-xs text-muted-foreground">Por aposta</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Sinais Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{signals.length}</div>
            <p className="text-xs text-muted-foreground">Disponíveis agora</p>
          </CardContent>
        </Card>
      </div>

      {/* Signals List */}
      {signals.length === 0 ? (
        <Card className="p-8 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum sinal esportivo disponível</h3>
          <p className="text-muted-foreground mb-4">
            Clique em "Gerar Sinais Esportivos" para começar
          </p>
          <Button onClick={handleGenerateSignals} disabled={isLoading}>
            <Zap className="mr-2 h-4 w-4" />
            Gerar Primeiros Sinais
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {signals.map((signal) => (
            <Card key={signal.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-2xl">{getSportIcon(signal.sport || '')}</span>
                      {signal.symbol}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{signal.event}</p>
                  </div>
                  <Badge variant={signal.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {signal.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Strategy and Confidence */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{signal.strategy}</p>
                    <p className="text-xs text-muted-foreground">Estratégia</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getConfidenceColor(signal.confidence || 0)}`}></div>
                      <span className="text-sm font-medium">{signal.confidence}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Confiança</p>
                  </div>
                </div>

                {/* Odds and Prices */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-blue-600">Odd: {signal.odds}</p>
                    <p className="text-xs text-muted-foreground">Entrada</p>
                  </div>
                  <div>
                    <p className="font-medium text-red-600">SL: {signal.stopLoss}</p>
                    <p className="text-xs text-muted-foreground">Stop Loss</p>
                  </div>
                  <div>
                    <p className="font-medium text-green-600">TP: {signal.takeProfit?.[0]}</p>
                    <p className="text-xs text-muted-foreground">Take Profit</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="flex-1">
                    Seguir Sinal
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    Ver Detalhes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TradingEsportivoTab;