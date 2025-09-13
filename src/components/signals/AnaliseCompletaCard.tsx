import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Target, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { TradingSignal, SignalDirection } from "@/lib/types";
import { useFirebaseSignals } from "@/hooks/useFirebaseSignals";
import { useSignalPersistence } from "@/hooks/useSignalPersistence";
import { useToast } from "@/hooks/use-toast";

interface AnaliseCompleta {
  partida: string;
  mercados: {
    Vencedor: {
      probabilidades: Record<string, number>;
      recomendacao: string;
    };
    Gols: {
      media_gols_total: number;
      recomendacao: string;
    };
    Escanteios: {
      media_escanteios_total: number;
      recomendacao: string;
    };
  };
}

interface AnaliseCompletaCardProps {
  analise: AnaliseCompleta;
  matchInfo?: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    date: string;
    time: string;
  };
}

export const AnaliseCompletaCard = ({ analise, matchInfo }: AnaliseCompletaCardProps) => {
  const [savedSignals, setSavedSignals] = useState<TradingSignal[]>([]);
  const { saveSignalToFirebase, updateSignalInFirebase } = useFirebaseSignals();
  const { toast } = useToast();
  
  // Use persistence hook for automatic saving
  useSignalPersistence(savedSignals);

  const getRecomendacaoIcon = (recomendacao: string) => {
    if (recomendacao.includes('Back')) {
      return <TrendingUp className="w-4 h-4 text-success" />;
    } else if (recomendacao.includes('Lay')) {
      return <TrendingDown className="w-4 h-4 text-destructive" />;
    }
    return <Target className="w-4 h-4 text-muted-foreground" />;
  };

  const getRecomendacaoVariant = (recomendacao: string) => {
    if (recomendacao.includes('Back')) {
      return 'default';
    } else if (recomendacao.includes('Lay')) {
      return 'destructive';
    }
    return 'secondary';
  };

  const createSignalFromRecomendacao = (mercado: string, recomendacao: string): TradingSignal => {
    const signalId = `${matchInfo?.id || 'unknown'}-${mercado}-${Date.now()}`;
    const symbol = `${matchInfo?.homeTeam || 'Team1'}_vs_${matchInfo?.awayTeam || 'Team2'}`;
    
    return {
      id: signalId,
      symbol: symbol,
      direction: recomendacao.includes('Back') ? 'BUY' as SignalDirection : 'SELL' as SignalDirection,
      entryPrice: 1.0,
      entry_price: 1.0,
      stopLoss: 0,
      targets: [{ level: 1, price: 1.5, hit: false }],
      confidence: 0.8,
      strategy: `sports_trading_${mercado.toLowerCase()}`,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      timeframe: `${analise.partida} - ${matchInfo?.date} ${matchInfo?.time}`
    };
  };

  const handleValidateSignal = async (mercado: string, recomendacao: string, result: 'win' | 'loss') => {
    try {
      const signal = createSignalFromRecomendacao(mercado, recomendacao);
      
      // Update signal with validation result
      signal.result = result === 'win' ? 'WINNER' : 'LOSER';
      signal.verifiedAt = new Date().toISOString();
      signal.completedAt = new Date().toISOString();
      signal.status = 'COMPLETED';
      signal.profit = result === 'win' ? 10 : -10; // Example profit/loss
      
      // Save to Supabase
      const saved = await saveSignalToFirebase(signal);
      
      if (saved) {
        // Update local state for persistence
        setSavedSignals(prev => {
          const existingIndex = prev.findIndex(s => s.id === signal.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = signal;
            return updated;
          }
          return [...prev, signal];
        });

        toast({
          title: "Sinal validado",
          description: `Resultado ${result === 'win' ? 'positivo' : 'negativo'} salvo para ${mercado}`,
        });
      } else {
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível salvar o resultado no banco de dados",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error validating signal:', error);
      toast({
        title: "Erro",
        description: "Falha ao processar validação do sinal",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full bg-card border border-border">
      <CardHeader>
        <CardTitle className="text-foreground text-center">
          Análise Completa - {analise.partida}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mercado Vencedor */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            🏆 Mercado Vencedor
          </h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {Object.entries(analise.mercados.Vencedor.probabilidades).map(([team, prob]) => (
              <div key={team} className="text-center p-2 bg-muted rounded">
                <div className="text-sm font-medium text-foreground">{team}</div>
                <div className="text-xs text-muted-foreground">{(prob * 100).toFixed(0)}%</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant={getRecomendacaoVariant(analise.mercados.Vencedor.recomendacao)}
              className="flex items-center gap-1 w-fit"
            >
              {getRecomendacaoIcon(analise.mercados.Vencedor.recomendacao)}
              {analise.mercados.Vencedor.recomendacao}
            </Badge>
            <div className="flex gap-1">
              <Button 
                size="sm" 
                variant="outline"
                className="h-8 px-2 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                onClick={() => handleValidateSignal('Vencedor', analise.mercados.Vencedor.recomendacao, 'win')}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Ganhou
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="h-8 px-2 bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                onClick={() => handleValidateSignal('Vencedor', analise.mercados.Vencedor.recomendacao, 'loss')}
              >
                <XCircle className="w-3 h-3 mr-1" />
                Perdeu
              </Button>
            </div>
          </div>
        </div>

        {/* Mercado Gols */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            ⚽ Mercado de Gols
          </h3>
          <div className="bg-muted p-3 rounded">
            <div className="text-sm text-foreground">
              Média de gols esperados: <span className="font-medium">{analise.mercados.Gols.media_gols_total}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant={getRecomendacaoVariant(analise.mercados.Gols.recomendacao)}
              className="flex items-center gap-1 w-fit"
            >
              {getRecomendacaoIcon(analise.mercados.Gols.recomendacao)}
              {analise.mercados.Gols.recomendacao}
            </Badge>
            <div className="flex gap-1">
              <Button 
                size="sm" 
                variant="outline"
                className="h-8 px-2 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                onClick={() => handleValidateSignal('Gols', analise.mercados.Gols.recomendacao, 'win')}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Ganhou
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="h-8 px-2 bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                onClick={() => handleValidateSignal('Gols', analise.mercados.Gols.recomendacao, 'loss')}
              >
                <XCircle className="w-3 h-3 mr-1" />
                Perdeu
              </Button>
            </div>
          </div>
        </div>

        {/* Mercado Escanteios */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            🚩 Mercado de Escanteios
          </h3>
          <div className="bg-muted p-3 rounded">
            <div className="text-sm text-foreground">
              Média de escanteios esperados: <span className="font-medium">{analise.mercados.Escanteios.media_escanteios_total}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant={getRecomendacaoVariant(analise.mercados.Escanteios.recomendacao)}
              className="flex items-center gap-1 w-fit"
            >
              {getRecomendacaoIcon(analise.mercados.Escanteios.recomendacao)}
              {analise.mercados.Escanteios.recomendacao}
            </Badge>
            <div className="flex gap-1">
              <Button 
                size="sm" 
                variant="outline"
                className="h-8 px-2 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                onClick={() => handleValidateSignal('Escanteios', analise.mercados.Escanteios.recomendacao, 'win')}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Ganhou
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="h-8 px-2 bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                onClick={() => handleValidateSignal('Escanteios', analise.mercados.Escanteios.recomendacao, 'loss')}
              >
                <XCircle className="w-3 h-3 mr-1" />
                Perdeu
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};