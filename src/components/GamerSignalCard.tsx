
import { Link } from "react-router-dom";
import { Signal } from "@/lib/types";
import { ArrowUp, ArrowDown, Target, AlertTriangle, Clock, Trophy, Gamepad } from "lucide-react";
import StatusBadge from "./StatusBadge";
import GamerCryptoChart from "./GamerCryptoChart";
import { cn } from "@/lib/utils";

interface GamerSignalCardProps {
  signal: Signal;
}

const GamerSignalCard = ({ signal }: GamerSignalCardProps) => {
  const {
    id,
    symbol,
    type,
    entryPrice,
    stopLoss,
    targets,
    status,
    timestamp,
    pnl,
  } = signal;

  const isActive = status === "ACTIVE";
  const isCompleted = status === "COMPLETED";
  const isCancelled = status === "CANCELLED";
  const hasHitTargets = targets.some((target) => target.hit);

  // Determine profit/loss status
  const isProfitable = pnl > 0;
  const formatPnl = (value: number) => {
    const formatted = Math.abs(value).toFixed(2);
    return value >= 0 ? `+${formatted}%` : `-${formatted}%`;
  };

  return (
    <div 
      className={cn(
        "gamer-card group transition-all duration-300 animate-in",
        "hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(139,92,246,0.4)]",
        "relative overflow-hidden"
      )}
    >
      {/* Background glow effect based on signal type */}
      <div 
        className={cn(
          "absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity",
          type === "LONG" ? "bg-[#4CAF50]" : "bg-[#FF3361]"
        )}
      ></div>
      
      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-[#8B5CF6]"></div>
      <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-[#D946EF]"></div>
      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-[#D946EF]"></div>
      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-[#8B5CF6]"></div>
      
      {/* Signal header */}
      <div className="p-4 border-b border-[#8B5CF6] flex items-center justify-between bg-[#221F26]">
        <div className="flex items-center gap-2">
          {type === "LONG" ? (
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#4CAF50]/20 text-[#4CAF50]">
              <ArrowUp className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#FF3361]/20 text-[#FF3361]">
              <ArrowDown className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold tracking-wide text-white">
              {symbol}
              <span className={cn(
                "ml-2 text-xs font-bold px-2 py-0.5 rounded",
                type === "LONG" ? "bg-[#4CAF50]/20 text-[#4CAF50]" : "bg-[#FF3361]/20 text-[#FF3361]"
              )}>
                {type}
              </span>
            </h3>
            <div className="text-xs text-[#c8c8ff]/70 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(timestamp).toLocaleString()}
            </div>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Signal content */}
      <div className="p-4">
        {/* Chart */}
        <GamerCryptoChart
          symbol={symbol}
          type={type}
          entryPrice={entryPrice}
          stopLoss={stopLoss}
          targets={targets}
          className="mb-4"
        />

        {/* Signal metrics */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="hud-element">
            <div className="text-xs uppercase tracking-widest text-[#8B5CF6] mb-1 flex items-center gap-1">
              <Target className="w-3 h-3" /> Entry Price
            </div>
            <div className="text-lg font-semibold text-white">
              {entryPrice.toFixed(entryPrice < 10 ? 5 : 2)}
            </div>
          </div>
          
          <div className="hud-element">
            <div className="text-xs uppercase tracking-widest text-[#FF3361] mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Stop Loss
            </div>
            <div className="text-lg font-semibold text-white">
              {stopLoss.toFixed(stopLoss < 10 ? 5 : 2)}
            </div>
          </div>

          {pnl !== undefined && (
            <div className="hud-element col-span-2">
              <div className="text-xs uppercase tracking-widest text-[#8B5CF6] mb-1 flex items-center gap-1">
                <Trophy className="w-3 h-3" /> Performance
              </div>
              <div className={cn(
                "text-lg font-semibold",
                isProfitable ? "text-[#4CAF50]" : pnl < 0 ? "text-[#FF3361]" : "text-white"
              )}>
                {formatPnl(pnl)}
              </div>
            </div>
          )}
        </div>
        
        {/* Targets */}
        <div className="mb-4">
          <div className="text-sm font-semibold text-[#D946EF] mb-2 uppercase tracking-wider flex items-center gap-2">
            <Gamepad className="w-4 h-4" /> Targets
          </div>
          <div className="space-y-2">
            {targets.map((target) => (
              <div
                key={target.level}
                className={cn(
                  "flex items-center justify-between p-2 border rounded",
                  target.hit
                    ? "border-[#4CAF50]/30 bg-[#4CAF50]/10"
                    : "border-[#8B5CF6]/30 bg-[#221F26]"
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                      target.hit
                        ? "bg-[#4CAF50]/20 text-[#4CAF50]"
                        : "bg-[#8B5CF6]/20 text-[#8B5CF6]"
                    )}
                  >
                    {target.level}
                  </div>
                  <div className="text-sm font-medium">
                    {target.price.toFixed(target.price < 10 ? 5 : 2)}
                  </div>
                </div>
                {target.hit && (
                  <div className="text-xs px-2 py-0.5 rounded bg-[#4CAF50]/20 text-[#4CAF50]">
                    HIT
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <Link
            to={`/signals/${id}`}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-[#8B5CF6] rounded hover:bg-[#9461FF] transition-colors gap-2"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default GamerSignalCard;
