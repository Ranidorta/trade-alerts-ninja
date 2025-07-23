import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target } from "lucide-react";

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
}

export const AnaliseCompletaCard = ({ analise }: AnaliseCompletaCardProps) => {
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
          <Badge 
            variant={getRecomendacaoVariant(analise.mercados.Vencedor.recomendacao)}
            className="flex items-center gap-1 w-fit"
          >
            {getRecomendacaoIcon(analise.mercados.Vencedor.recomendacao)}
            {analise.mercados.Vencedor.recomendacao}
          </Badge>
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
          <Badge 
            variant={getRecomendacaoVariant(analise.mercados.Gols.recomendacao)}
            className="flex items-center gap-1 w-fit"
          >
            {getRecomendacaoIcon(analise.mercados.Gols.recomendacao)}
            {analise.mercados.Gols.recomendacao}
          </Badge>
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
          <Badge 
            variant={getRecomendacaoVariant(analise.mercados.Escanteios.recomendacao)}
            className="flex items-center gap-1 w-fit"
          >
            {getRecomendacaoIcon(analise.mercados.Escanteios.recomendacao)}
            {analise.mercados.Escanteios.recomendacao}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};