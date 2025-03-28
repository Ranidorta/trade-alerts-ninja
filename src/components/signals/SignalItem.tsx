
import { TradingSignal } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { formatDistance } from "date-fns";
import { 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignalItemProps {
  signal: TradingSignal;
  isActive: boolean;
  onSelect: () => void;
}

export default function SignalItem({ signal, isActive, onSelect }: SignalItemProps) {
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
