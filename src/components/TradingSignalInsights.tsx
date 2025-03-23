
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TradingSignal } from "@/lib/types";
import { InfoIcon, TrendingDownIcon, TrendingUpIcon, AlertTriangleIcon } from "lucide-react";

interface TradingSignalInsightsProps {
  signal: TradingSignal;
}

const TradingSignalInsights: React.FC<TradingSignalInsightsProps> = ({ signal }) => {
  // Calcular a razão risco-recompensa (similar ao RISK_REWARD_RATIO do script Python)
  const calculateRiskReward = () => {
    if (!signal.stopLoss || !signal.takeProfit || signal.takeProfit.length === 0) {
      return 0;
    }
    
    // Usar o último take profit como alvo final
    const lastTakeProfit = signal.takeProfit[signal.takeProfit.length - 1];
    const entryPrice = signal.entryPrice || signal.entryAvg || 0;
    
    if (signal.type === "LONG") {
      const potentialGain = lastTakeProfit - entryPrice;
      const potentialLoss = entryPrice - signal.stopLoss;
      return potentialLoss ? potentialGain / potentialLoss : 0;
    } else {
      const potentialGain = entryPrice - lastTakeProfit;
      const potentialLoss = signal.stopLoss - entryPrice;
      return potentialLoss ? potentialGain / potentialLoss : 0;
    }
  };

  const riskReward = calculateRiskReward();
  
  // Avaliar a confluência dos indicadores técnicos (similar à lógica no script Python)
  const calculateConfluence = () => {
    const indicators = signal.technicalIndicators;
    if (!indicators) return 0;
    
    let confluenceScore = 0;
    const { rsi, macd, macdSignal, shortMa, longMa, volatility, atr } = indicators;
    
    // Verificar RSI (sobrevendido para compra, sobrecomprado para venda)
    if (signal.type === "LONG" && rsi && rsi < 30) confluenceScore += 1;
    if (signal.type === "SHORT" && rsi && rsi > 70) confluenceScore += 1;
    
    // Verificar MACD (cruzamento ou histograma)
    if (macd && macdSignal) {
      if (signal.type === "LONG" && macd > macdSignal) confluenceScore += 1;
      if (signal.type === "SHORT" && macd < macdSignal) confluenceScore += 1;
    }
    
    // Verificar médias móveis (cruzamento)
    if (shortMa && longMa) {
      if (signal.type === "LONG" && shortMa > longMa) confluenceScore += 1;
      if (signal.type === "SHORT" && shortMa < longMa) confluenceScore += 1;
    }
    
    // Verificar volatilidade suficiente para a operação
    if (volatility && volatility > 0.3) confluenceScore += 1;
    
    // Verificar ATR mínimo para garantir movimento suficiente
    if (atr && atr > 0.5) confluenceScore += 1;
    
    return confluenceScore;
  };
  
  const confluenceScore = calculateConfluence();
  const maxConfluence = 5; // Pontuação máxima possível
  
  return (
    <Card className="w-full mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Análise do Sinal: {signal.pair}
          {signal.type === "LONG" ? (
            <TrendingUpIcon className="text-green-500" />
          ) : (
            <TrendingDownIcon className="text-red-500" />
          )}
        </CardTitle>
        <CardDescription>
          Baseado em confluência de múltiplos indicadores e análise de risco-recompensa
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium mb-1">Confluência de Indicadores</h3>
            <div className="flex items-center gap-2">
              <Badge variant={confluenceScore >= 3 ? "default" : "outline"}>
                {confluenceScore}/{maxConfluence}
              </Badge>
              <span className="text-sm">
                {confluenceScore >= 4 
                  ? "Forte" 
                  : confluenceScore >= 3 
                  ? "Boa" 
                  : confluenceScore >= 2 
                  ? "Média" 
                  : "Fraca"}
              </span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-1">Relação Risco:Recompensa</h3>
            <div className="flex items-center gap-2">
              <Badge variant={riskReward >= 1.5 ? "default" : "outline"}>
                {riskReward.toFixed(1)}:1
              </Badge>
              <span className="text-sm">
                {riskReward >= 2 
                  ? "Excelente" 
                  : riskReward >= 1.5 
                  ? "Boa" 
                  : riskReward >= 1 
                  ? "Aceitável" 
                  : "Ruim"}
              </span>
            </div>
          </div>
        </div>
        
        {signal.technicalIndicators && (
          <div>
            <h3 className="text-sm font-medium mb-2">Indicadores Técnicos</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {signal.technicalIndicators.rsi && (
                <div className="text-xs p-2 border rounded">
                  <span className="font-semibold">RSI:</span> {signal.technicalIndicators.rsi.toFixed(2)}
                </div>
              )}
              {signal.technicalIndicators.macd && (
                <div className="text-xs p-2 border rounded">
                  <span className="font-semibold">MACD:</span> {signal.technicalIndicators.macd.toFixed(2)}
                </div>
              )}
              {signal.technicalIndicators.atr && (
                <div className="text-xs p-2 border rounded">
                  <span className="font-semibold">ATR:</span> {signal.technicalIndicators.atr.toFixed(2)}
                </div>
              )}
              {signal.technicalIndicators.volatility && (
                <div className="text-xs p-2 border rounded">
                  <span className="font-semibold">Volatilidade:</span> {signal.technicalIndicators.volatility.toFixed(2)}
                </div>
              )}
              {signal.technicalIndicators.shortMa && (
                <div className="text-xs p-2 border rounded">
                  <span className="font-semibold">MA Curta:</span> {signal.technicalIndicators.shortMa.toFixed(2)}
                </div>
              )}
              {signal.technicalIndicators.longMa && (
                <div className="text-xs p-2 border rounded">
                  <span className="font-semibold">MA Longa:</span> {signal.technicalIndicators.longMa.toFixed(2)}
                </div>
              )}
              {signal.technicalIndicators.confidence && (
                <div className="text-xs p-2 border rounded">
                  <span className="font-semibold">Confiança:</span> {signal.technicalIndicators.confidence.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Alertas e Recomendações */}
        {confluenceScore < 3 && (
          <Alert>
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertTitle>Confluência Baixa</AlertTitle>
            <AlertDescription>
              Este sinal tem baixa confluência de indicadores. Considere esperar por um setup mais forte.
            </AlertDescription>
          </Alert>
        )}
        
        {riskReward < 1.5 && (
          <Alert>
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertTitle>Relação Risco:Recompensa Desfavorável</AlertTitle>
            <AlertDescription>
              A relação risco:recompensa está abaixo do ideal de 1.5:1. Considere ajustar os níveis de TP ou SL.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Observações adicionais sobre o sinal */}
        {signal.notes && (
          <div className="mt-2">
            <h3 className="text-sm font-medium mb-1">Observações</h3>
            <p className="text-sm text-muted-foreground">{signal.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TradingSignalInsights;
