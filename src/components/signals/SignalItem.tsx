
import React from "react";
import { TradingSignal } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SignalItemProps {
  signal: TradingSignal;
  isActive: boolean;
  onSelect: () => void;
}

const SignalItem = ({ signal, isActive, onSelect }: SignalItemProps) => {
  const isLong = signal.direction === "LONG";
  const badgeVariant = isLong ? "success" : "destructive";
  const badgeText = isLong ? "LONG" : "SHORT";
  const signalIcon = isLong ? (
    <TrendingUp className="h-4 w-4 text-green-500" />
  ) : (
    <TrendingDown className="h-4 w-4 text-red-500" />
  );
  
  const getStatusBadge = () => {
    switch (signal.status) {
      case "ACTIVE":
        return <div className="status-indicator status-active"></div>;
      case "COMPLETED":
        return <div className="status-indicator status-completed"></div>;
      case "FAILED":
        return <div className="status-indicator status-failed"></div>;
      default:
        return null;
    }
  };
  
  const formatPrice = (price: number) => {
    return price < 0.1 ? price.toFixed(4) : price.toFixed(2);
  };

  return (
    <div
      className={cn(
        "p-3 mb-1 rounded-md cursor-pointer transition-all signal-card",
        isActive ? "bg-primary/10" : "hover:bg-primary/5",
        isLong ? "long" : "short"
      )}
      onClick={onSelect}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1">
          {signalIcon}
          <span className="font-medium">{signal.symbol}</span>
          <Badge variant={badgeVariant} className="text-xs py-0">
            {badgeText}
          </Badge>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Entrada:</span>
          <span className="font-medium">${formatPrice(signal.entryPrice)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">SL:</span>
          <span className="font-medium">${formatPrice(signal.stopLoss)}</span>
        </div>
      </div>
      
      <div className="mt-1 flex items-center gap-1 text-xs">
        <div className="flex items-center gap-1">
          {getStatusBadge()}
          <span className="text-muted-foreground">
            {signal.createdAt ? new Date(signal.createdAt).toLocaleTimeString() : "Agora"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SignalItem;
