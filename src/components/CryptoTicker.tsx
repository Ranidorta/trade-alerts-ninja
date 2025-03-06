
import React, { useEffect, useRef } from "react";
import { CryptoCoin } from "@/lib/types";

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
    const animationDuration = scrollWidth * 0.015; // Adjust speed based on content width
    
    tickerRef.current.style.animationDuration = `${animationDuration}s`;
    
    return () => {
      if (tickerRef.current) {
        tickerRef.current.style.animationDuration = "";
      }
    };
  }, [coins]);

  if (isLoading) {
    return (
      <div className="w-full bg-accent/30 py-2 overflow-hidden">
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
    <div className="w-full bg-accent/30 py-2 overflow-hidden">
      <div 
        className="flex space-x-8 animate-infinite-scroll whitespace-nowrap"
        ref={tickerRef}
      >
        {/* Repeat coins twice to create a seamless loop */}
        {[...coins, ...coins].map((coin, index) => (
          <div key={`${coin.id}-${index}`} className="flex items-center min-w-32">
            <img src={coin.image} alt={coin.name} className="w-5 h-5 mr-2" />
            <span className="font-medium">{coin.symbol.replace('USDT', '')}</span>
            <span 
              className={`ml-2 text-sm ${
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
              ({coin.priceChangePercentage24h >= 0 ? '+' : ''}
              {coin.priceChangePercentage24h.toFixed(2)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CryptoTicker;
