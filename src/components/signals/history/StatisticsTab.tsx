
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TradingSignal } from "@/lib/types";

interface StatisticsTabProps {
  signals: TradingSignal[];
}

export const StatisticsTab: React.FC<StatisticsTabProps> = ({ signals }) => {
  if (!signals || signals.length === 0) {
    return (
      <div className="text-center py-12 border rounded-md">
        <p className="text-lg text-muted-foreground">
          Nenhum dado disponível para análise
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Carregue sinais primeiro para visualizar estatísticas
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Estatísticas Gerais</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Total de sinais:</span>
              <span className="font-medium">{signals.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Sinais vencedores:</span>
              <span className="font-medium text-green-600">
                {signals.filter(s => 
                  s.result === 'WINNER' || 
                  s.result === 'win' || 
                  s.result === 1
                ).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Sinais perdedores:</span>
              <span className="font-medium text-red-600">
                {signals.filter(s => 
                  s.result === 'LOSER' || 
                  s.result === 'loss' || 
                  s.result === 0
                ).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Sinais parciais:</span>
              <span className="font-medium text-amber-600">
                {signals.filter(s => 
                  s.result === 'PARTIAL' || 
                  s.result === 'partial'
                ).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Sinais pendentes:</span>
              <span className="font-medium">
                {signals.filter(s => !s.result || s.result === 'FALSE' || s.result === 'false').length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Taxa de Sucesso</h3>
          {(() => {
            const totalEvaluated = signals.filter(s => 
              s.result && 
              s.result !== 'FALSE' && 
              s.result !== 'false'
            ).length;
            
            const winners = signals.filter(s => 
              s.result === 'WINNER' || 
              s.result === 'win' || 
              s.result === 1 ||
              s.result === 'PARTIAL' || 
              s.result === 'partial'
            ).length;
            
            const winRate = totalEvaluated > 0 ? (winners / totalEvaluated) * 100 : 0;
            
            return (
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">
                  {winRate.toFixed(1)}%
                </div>
                <div 
                  className={`h-24 w-24 rounded-full border-8 flex items-center justify-center ${
                    winRate >= 50 ? 'border-green-500' : 'border-red-500'
                  }`}
                >
                  <span className="text-2xl">
                    {winRate >= 50 ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Desempenho por Ativo</h3>
          {(() => {
            const symbolStats = new Map<string, {
              total: number;
              wins: number;
              losses: number;
              partials: number;
            }>();
            
            signals.forEach(signal => {
              const symbol = signal.symbol || 'unknown';
              
              if (!symbolStats.has(symbol)) {
                symbolStats.set(symbol, {
                  total: 0,
                  wins: 0,
                  losses: 0,
                  partials: 0
                });
              }
              
              const stats = symbolStats.get(symbol)!;
              stats.total++;
              
              if (signal.result === 'win' || signal.result === 'WINNER' || signal.result === 1) {
                stats.wins++;
              } else if (signal.result === 'loss' || signal.result === 'LOSER' || signal.result === 0) {
                stats.losses++;
              } else if (signal.result === 'partial' || signal.result === 'PARTIAL') {
                stats.partials++;
              }
            });
            
            const sortedSymbols = Array.from(symbolStats.entries())
              .sort((a, b) => b[1].total - a[1].total)
              .slice(0, 10); // Top 10 symbols
            
            return (
              <div className="space-y-4">
                {sortedSymbols.map(([symbol, stats]) => {
                  const winRate = (stats.total > 0) 
                    ? ((stats.wins + stats.partials) / stats.total) * 100 
                    : 0;
                    
                  return (
                    <div key={symbol} className="border rounded-md p-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{symbol}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {stats.total} sinais
                          </span>
                        </div>
                        <div>
                          <span 
                            className={`text-sm font-medium ${
                              winRate >= 50 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {winRate.toFixed(1)}% taxa de sucesso
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Vitórias</div>
                          <div className="text-green-600 font-medium">{stats.wins}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Parciais</div>
                          <div className="text-amber-600 font-medium">{stats.partials}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Derrotas</div>
                          <div className="text-red-600 font-medium">{stats.losses}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
};

export default StatisticsTab;
