import React from 'react';
import { TradingSignal } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Target, Calendar } from 'lucide-react';

interface ClassicSignalsHistoryProps {
  signals: TradingSignal[];
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getResultClass = (result: string | number | null | undefined) => {
  const resultStr = String(result || '').toUpperCase();
  switch (resultStr) {
    case 'WINNER':
    case 'WIN':
    case '1':
      return 'bg-green-500/20 text-green-600 border-green-300/30';
    case 'LOSER':
    case 'LOSS':
    case '0':
      return 'bg-red-500/20 text-red-600 border-red-300/30';
    case 'PARTIAL':
      return 'bg-amber-500/20 text-amber-600 border-amber-300/30';
    case 'FALSE':
    case 'MISSED':
      return 'bg-gray-500/20 text-gray-600 border-gray-300/30';
    case 'PENDING':
      return 'bg-blue-500/20 text-blue-600 border-blue-300/30';
    default:
      return 'bg-blue-500/20 text-blue-600 border-blue-300/30';
  }
};

const getResultText = (result: string | number | null | undefined) => {
  const resultStr = String(result || '').toUpperCase();
  switch (resultStr) {
    case 'WINNER':
    case 'WIN':
    case '1':
      return 'VENCEDOR';
    case 'LOSER':
    case 'LOSS':
    case '0':
      return 'PERDEDOR';
    case 'PARTIAL':
      return 'PARCIAL';
    case 'FALSE':
    case 'MISSED':
      return 'FALSO';
    case 'PENDING':
      return 'PENDENTE';
    default:
      return 'PENDENTE';
  }
};

const getDirectionClass = (direction: string) => 
  direction.toUpperCase() === 'BUY' ? 'default' : 'destructive';

const ClassicSignalsHistory: React.FC<ClassicSignalsHistoryProps> = ({ signals }) => {
  // Calcular estatísticas específicas para sinais Classic
  const totalSignals = signals.length;
  const winnerTrades = signals.filter(signal => signal.result === "WINNER").length;
  const partialTrades = signals.filter(signal => signal.result === "PARTIAL").length;
  const losingTrades = signals.filter(signal => signal.result === "LOSER").length;
  const falseTrades = signals.filter(signal => signal.result === "FALSE").length;
  const pendingTrades = signals.filter(signal => !signal.result || signal.result === "PENDING").length;
  
  const successfulTrades = winnerTrades + partialTrades;
  const validatedTrades = winnerTrades + partialTrades + losingTrades + falseTrades;
  const accuracyRate = validatedTrades > 0 ? (successfulTrades / validatedTrades * 100) : 0;

  const renderTargets = (signal: TradingSignal) => {
    return (
      <div className="space-y-1">
        {signal.tp1 && (
          <div className="flex items-center gap-1">
            <Badge 
              variant={signal.targets?.find(t => t.level === 1)?.hit ? "default" : "outline"} 
              className={`text-xs ${signal.targets?.find(t => t.level === 1)?.hit ? 'bg-green-500 text-white' : ''}`}
            >
              {signal.targets?.find(t => t.level === 1)?.hit && <Target className="h-3 w-3 mr-1" />}
              TP1: ${signal.tp1.toFixed(4)}
            </Badge>
          </div>
        )}
        {signal.tp2 && (
          <div className="flex items-center gap-1">
            <Badge 
              variant={signal.targets?.find(t => t.level === 2)?.hit ? "default" : "outline"} 
              className={`text-xs ${signal.targets?.find(t => t.level === 2)?.hit ? 'bg-green-500 text-white' : ''}`}
            >
              {signal.targets?.find(t => t.level === 2)?.hit && <Target className="h-3 w-3 mr-1" />}
              TP2: ${signal.tp2.toFixed(4)}
            </Badge>
          </div>
        )}
        {signal.tp3 && (
          <div className="flex items-center gap-1">
            <Badge 
              variant={signal.targets?.find(t => t.level === 3)?.hit ? "default" : "outline"} 
              className={`text-xs ${signal.targets?.find(t => t.level === 3)?.hit ? 'bg-green-500 text-white' : ''}`}
            >
              {signal.targets?.find(t => t.level === 3)?.hit && <Target className="h-3 w-3 mr-1" />}
              TP3: ${signal.tp3.toFixed(4)}
            </Badge>
          </div>
        )}
        {!signal.tp1 && !signal.tp2 && !signal.tp3 && (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </div>
    );
  };

  if (signals.length === 0) {
    return (
      <Card className="col-span-full">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Calendar className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Nenhum sinal Classic encontrado</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Gere alguns sinais na aba "Classics" para vê-los aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas dos Sinais Classic */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-4">Estatísticas - Sinais Classic</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Total de Sinais</span>
              <span className="text-2xl font-bold">{totalSignals}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">✅ Vencedores</span>
              <span className="text-2xl font-bold text-green-500">{winnerTrades}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">🟡 Parciais</span>
              <span className="text-2xl font-bold text-amber-500">{partialTrades}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">❌ Perdedores</span>
              <span className="text-2xl font-bold text-red-500">{losingTrades}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Pendentes</span>
              <span className="text-2xl font-bold text-blue-500">{pendingTrades}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Taxa de Acerto</span>
              <span className="text-2xl font-bold text-primary">{accuracyRate.toFixed(1)}%</span>
              <span className="text-xs text-muted-foreground">
                (Vencedor + Parcial) ÷ Total
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Sinais Classic */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead>Direção</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Targets (TP)</TableHead>
              <TableHead>SL</TableHead>
              <TableHead>Estratégia</TableHead>
              <TableHead>Resultado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {signals.map(signal => (
              <TableRow key={signal.id}>
                <TableCell>
                  {formatDate(signal.createdAt)}
                </TableCell>
                <TableCell className="font-medium">{signal.symbol}</TableCell>
                <TableCell>
                  <Badge variant={getDirectionClass(signal.direction || 'BUY')}>
                    {(signal.direction || 'BUY').toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>${(signal.entryPrice || signal.entry_price || 0).toFixed(4)}</TableCell>
                <TableCell>
                  {renderTargets(signal)}
                </TableCell>
                <TableCell className="text-red-600">${signal.stopLoss.toFixed(4)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {signal.strategy || 'Classic AI'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getResultClass(signal.result)}>
                    {getResultText(signal.result)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default ClassicSignalsHistory;