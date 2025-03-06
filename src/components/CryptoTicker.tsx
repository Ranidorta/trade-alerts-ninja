
import React, { useEffect, useRef } from "react";
import { CryptoCoin } from "@/lib/types";
import { ArrowDown, ArrowUp } from "lucide-react";

interface CryptoTickerProps {
  coins: CryptoCoin[];
  isLoading: boolean;
}

const CryptoTicker: React.FC<CryptoTickerProps> = ({ coins, isLoading }) => {
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tickerRef.current) return;
    
    // Animation for the ticker
    const scrollWidth = tickerRef.current.scrollWidth;
    const animationDuration = scrollWidth * 0.02; // Adjusted speed
    
    tickerRef.current.style.animationDuration = `${animationDuration}s`;
    
    return () => {
      if (tickerRef.current) {
        tickerRef.current.style.animationDuration = "";
      }
    };
  }, [coins]);

  if (isLoading) {
    return (
      <div className="w-full bg-gradient-to-r from-primary/20 to-primary/10 py-3 overflow-hidden border-b">
        <div className="flex space-x-8 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center min-w-32">
              <div className="w-5 h-5 bg-slate-300 rounded-full mr-2"></div>
              <div className="h-4 bg-slate-300 rounded w-16"></div>
              <div className="h-4 bg-slate-300 rounded w-12 ml-2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-r from-primary/20 to-primary/10 py-3 overflow-hidden border-b shadow-sm">
      <div className="ticker-container overflow-hidden whitespace-nowrap relative">
        <div 
          className="flex space-x-8 ticker-content"
          ref={tickerRef}
        >
          {coins.map((coin, index) => (
            <div key={`${coin.id}-${index}`} className="flex items-center min-w-32 px-2">
              <img src={coin.image} alt={coin.name} className="w-6 h-6 mr-2" />
              <span className="font-medium uppercase">{coin.symbol.replace('USDT', '')}</span>
              <span 
                className={`ml-2 text-sm font-bold flex items-center ${
                  coin.priceChangePercentage24h >= 0 
                    ? "text-crypto-green" 
                    : "text-crypto-red"
                }`}
              >
                ${coin.currentPrice.toLocaleString('en-US', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 6 
                })}
                {' '}
                <span className="flex items-center ml-1">
                  {coin.priceChangePercentage24h >= 0 ? (
                    <ArrowUp className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDown className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(coin.priceChangePercentage24h).toFixed(2)}%
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CryptoTicker;
