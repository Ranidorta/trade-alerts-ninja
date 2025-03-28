
import { useState } from "react";
import { TradingSignal } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { formatDistance } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ChevronRight, 
  ArrowUp, 
  ArrowDown,
  Target,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignalsSidebarProps {
  signals: TradingSignal[];
  activeSignal: TradingSignal | null;
  onSelectSignal: (signal: TradingSignal) => void;
  isLoading: boolean;
}

export default function SignalsSidebar({ 
  signals, 
  activeSignal, 
  onSelectSignal,
  isLoading 
}: SignalsSidebarProps) {
  if (isLoading) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-background border rounded-lg p-4">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="h-[600px] flex flex-col items-center justify-center bg-background border rounded-lg p-4">
        <AlertCircle className="w-10 h-10 mb-2 text-muted-foreground" />
        <h3 className="text-lg font-medium">Sem sinais disponíveis</h3>
        <p className="text-sm text-muted-foreground text-center mt-1">
          Clique em "Gerar Sinais" para criar novos sinais de trading
        </p>
      </div>
    );
  }

  return (
    <div className="h-[600px] bg-background border rounded-lg flex flex-col">
      <div className="p-3 border-b">
        <h3 className="font-medium">Sinais Ativos ({signals.length})</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-1">
          {signals.map((signal) => (
            <SignalSidebarItem 
              key={signal.id} 
              signal={signal} 
              isActive={activeSignal?.id === signal.id}
              onSelect={() => onSelectSignal(signal)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface SignalSidebarItemProps {
  signal: TradingSignal;
  isActive: boolean;
  onSelect: () => void;
}

function SignalSidebarItem({ signal, isActive, onSelect }: SignalSidebarItemProps) {
  const formattedDate = signal.createdAt 
    ? formatDistance(new Date(signal.createdAt), new Date(), { addSuffix: true })
    : 'data desconhecida';
  
  const isLong = signal.type === "LONG" || signal.direction === "BUY";
  
  return (
    <Button
      variant="ghost"
      className={`w-full justify-start text-left p-2 mb-1 rounded-md hover:bg-accent ${
        isActive ? 'bg-accent' : ''
      }`}
      onClick={onSelect}
    >
      <div className="w-full flex flex-col gap-1">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1">
            <span className="font-semibold">{signal.symbol}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <Badge 
            variant={
              signal.status === "COMPLETED" ? "secondary" : 
              signal.status === "ACTIVE" ? "default" : 
              "outline"
            }
            className="text-xs rounded-sm px-1"
          >
            {signal.status}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {isLong ? (
              <Badge variant="success" className="gap-0.5 text-xs font-medium py-0 px-1">
                <ArrowUpRight className="h-3 w-3" />
                LONG
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-0.5 text-xs font-medium py-0 px-1">
                <ArrowDownRight className="h-3 w-3" />
                SHORT
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{formattedDate}</span>
          </div>
          <div className="text-xs font-medium">
            {signal.currentPrice}
          </div>
        </div>
      </div>
    </Button>
  );
}
