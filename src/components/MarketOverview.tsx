
import React from "react";
import { TrendingUp, TrendingDown, Clock, BarChart2 } from "lucide-react";
import { MarketOverview as MarketOverviewType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercentage } from "@/lib/apiServices";

export interface MarketOverviewProps {
  data: MarketOverviewType | null;
  isLoading: boolean;
}

const MarketOverview: React.FC<MarketOverviewProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Market Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-20 mb-2"></div>
                <div className="h-6 bg-slate-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Market Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">Failed to load market data</p>
        </CardContent>
      </Card>
    );
  }

  const marketCapFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2
  }).format(data.totalMarketCap);

  const volumeFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2
  }).format(data.totalVolume24h);

  const percentageInfo = formatPercentage(data.marketCapChangePercentage24hUsd);
  const lastUpdated = new Date(data.lastUpdated).toLocaleTimeString();

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <BarChart2 className="h-5 w-5" />
          <span>Market Overview</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Market Cap</p>
            <p className="text-lg font-semibold">{marketCapFormatted}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">24h Volume</p>
            <p className="text-lg font-semibold">{volumeFormatted}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Active Cryptos</p>
            <p className="text-lg font-semibold">{data.activeCryptocurrencies}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">BTC Dominance</p>
            <p className="text-lg font-semibold">{data.marketCapPercentage.btc.toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">ETH Dominance</p>
            <p className="text-lg font-semibold">{data.marketCapPercentage.eth.toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">24h Change</p>
            <p className={`text-lg font-semibold flex items-center ${percentageInfo.color}`}>
              {data.marketCapChangePercentage24hUsd > 0 ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1" />
              )}
              {percentageInfo.value}
            </p>
          </div>
        </div>
        <div className="mt-4 text-xs text-muted-foreground flex items-center justify-end">
          <Clock className="h-3 w-3 mr-1" /> Last updated: {lastUpdated}
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketOverview;
