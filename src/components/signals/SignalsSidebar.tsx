
import { TradingSignal } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle } from "lucide-react";
import SignalItem from "./SignalItem";

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
            <SignalItem 
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
