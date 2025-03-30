
import { TradingSignal } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { formatDistance } from "date-fns";
import { 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

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

  // Calculate the percentage of hit targets
  const totalTargets = signal.targets?.length || 0;
  const hitTargets = signal.targets?.filter(t => t.hit)?.length || 0;
  const targetProgress = totalTargets > 0 ? (hitTargets / totalTargets) * 100 : 0;
  
  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start text-left p-3 mb-1 rounded-md hover:bg-accent transition-colors duration-200",
        isActive ? 'bg-accent border-l-4 border-primary' : ''
      )}
      onClick={() => {
        console.log("Signal item clicked:", signal.id);
        onSelect();
      }}
    >
      <div className="w-full flex flex-col gap-1">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1">
            <span className={cn("font-semibold", isActive ? "text-primary" : "")}>
              {signal.symbol}
            </span>
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
        
        {/* Add targets preview with progress bar */}
        {signal.targets && signal.targets.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Target className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Alvos ({hitTargets}/{totalTargets})</span>
              </div>
              <span className="text-xs font-medium">
                {targetProgress.toFixed(0)}%
              </span>
            </div>
            <Progress value={targetProgress} className="h-1.5" />
            <div className="flex gap-1 mt-1">
              {signal.targets.map((target, idx) => (
                <Badge 
                  key={idx}
                  variant={target.hit ? "success" : "outline"} 
                  className="px-1 py-0 text-[10px]"
                >
                  TP{idx+1}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Button>
  );
}
