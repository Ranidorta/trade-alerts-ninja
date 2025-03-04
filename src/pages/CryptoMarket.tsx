
import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarketOverview from "@/components/MarketOverview";
import CryptoNews from "@/components/CryptoNews";
import SignalCard from "@/components/SignalCard";
import { 
  fetchCoinGeckoGlobal, 
  fetchCoinData, 
  fetchCryptoNews, 
  fetchBinanceKlines,
  getTrendFromCandle
} from "@/lib/apiServices";
import { 
  MarketOverview as MarketOverviewType, 
  CryptoCoin, 
  CryptoNews as CryptoNewsType,
  TradingSignal
} from "@/lib/types";
import { mockSignals } from "@/lib/mockData";

const popularCoins = [
  { id: "bitcoin", symbol: "BTCUSDT", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETHUSDT", name: "Ethereum" },
  { id: "binancecoin", symbol: "BNBUSDT", name: "Binance Coin" },
  { id: "solana", symbol: "SOLUSDT", name: "Solana" },
  { id: "cardano", symbol: "ADAUSDT", name: "Cardano" },
  { id: "ripple", symbol: "XRPUSDT", name: "XRP" }
];

const CryptoMarket = () => {
  const [marketData, setMarketData] = useState<MarketOverviewType | null>(null);
  const [coins, setCoins] = useState<CryptoCoin[]>([]);
  const [news, setNews] = useState<CryptoNewsType[] | null>(null);
  const [signals] = useState<TradingSignal[]>(mockSignals);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingMarket, setIsLoadingMarket] = useState(true);
  const [isLoadingCoins, setIsLoadingCoins] = useState(true);
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const { toast } = useToast();

  const loadMarketData = async () => {
    setIsLoadingMarket(true);
    try {
      const data = await fetchCoinGeckoGlobal();
      if (data && data.data) {
        setMarketData({
          activeCryptocurrencies: data.data.active_cryptocurrencies,
          totalMarketCap: data.data.total_market_cap.usd,
          totalVolume24h: data.data.total_volume.usd,
          marketCapPercentage: {
            btc: data.data.market_cap_percentage.btc,
            eth: data.data.market_cap_percentage.eth
          },
          marketCapChangePercentage24hUsd: data.data.market_cap_change_percentage_24h_usd,
          lastUpdated: new Date()
        });
      }
    } catch (error) {
      console.error("Error loading market data:", error);
      toast({
        title: "Error",
        description: "Failed to load market data",
        variant: "destructive"
      });
    } finally {
      setIsLoadingMarket(false);
    }
  };

  const loadCoinsData = async () => {
    setIsLoadingCoins(true);
    try {
      const coinsData = await Promise.all(
        popularCoins.map(async (coin) => {
          // Get coin data from CoinGecko
          const coinData = await fetchCoinData(coin.id);
          
          // Get kline data from Binance for trend
          const klineData = await fetchBinanceKlines(coin.symbol);
          const trend = klineData ? getTrendFromCandle(klineData[klineData.length - 1]) : "NEUTRAL";
          
          return {
            id: coin.id,
            symbol: coin.symbol,
            name: coin.name,
            image: coinData?.image?.small || "",
            currentPrice: coinData?.market_data?.current_price?.usd || 0,
            priceChange24h: coinData?.market_data?.price_change_24h || 0,
            priceChangePercentage24h: coinData?.market_data?.price_change_percentage_24h || 0,
            marketCap: coinData?.market_data?.market_cap?.usd || 0,
            volume24h: coinData?.market_data?.total_volume?.usd || 0,
            high24h: coinData?.market_data?.high_24h?.usd || 0,
            low24h: coinData?.market_data?.low_24h?.usd || 0,
            lastUpdated: new Date(coinData?.last_updated || Date.now()),
            trend
          };
        })
      );
      
      setCoins(coinsData);
    } catch (error) {
      console.error("Error loading coins data:", error);
      toast({
        title: "Error",
        description: "Failed to load cryptocurrency data",
        variant: "destructive"
      });
    } finally {
      setIsLoadingCoins(false);
    }
  };

  const loadNewsData = async () => {
    setIsLoadingNews(true);
    try {
      // In a real-world scenario, you would use the actual API
      // For now, we'll create mock data
      const mockNews = [
        {
          title: "Bitcoin Reaches New All-Time High as Institutional Adoption Increases",
          description: "Bitcoin has reached a new all-time high as institutional investors continue to pour money into the cryptocurrency market.",
          url: "https://example.com/news/1",
          publishedAt: new Date().toISOString(),
          source: { name: "Crypto News" },
          urlToImage: "https://example.com/image1.jpg"
        },
        {
          title: "Ethereum 2.0 Upgrade Shows Promise With Improved Transaction Speeds",
          description: "The latest Ethereum upgrade has shown significant improvements in transaction speeds and reduced gas fees.",
          url: "https://example.com/news/2",
          publishedAt: new Date(Date.now() - 3600000).toISOString(),
          source: { name: "Blockchain Times" },
          urlToImage: "https://example.com/image2.jpg"
        },
        {
          title: "Regulatory Clarity Needed for Cryptocurrency Market Growth, Says Expert",
          description: "Experts suggest that clear regulations are essential for the sustained growth of the cryptocurrency market.",
          url: "https://example.com/news/3",
          publishedAt: new Date(Date.now() - 7200000).toISOString(),
          source: { name: "Financial Post" },
          urlToImage: "https://example.com/image3.jpg"
        }
      ];
      
      // In a real implementation, you'd use:
      // const articles = await fetchCryptoNews("cryptocurrency");
      setNews(mockNews);
    } catch (error) {
      console.error("Error loading news data:", error);
      toast({
        title: "Error",
        description: "Failed to load cryptocurrency news",
        variant: "destructive"
      });
    } finally {
      setIsLoadingNews(false);
    }
  };

  const refreshData = async () => {
    toast({
      title: "Refreshing data",
      description: "Fetching the latest market information"
    });
    
    await Promise.all([
      loadMarketData(),
      loadCoinsData(),
      loadNewsData()
    ]);
    
    toast({
      title: "Data refreshed",
      description: "Market information has been updated"
    });
  };

  // Load all data on component mount
  useEffect(() => {
    loadMarketData();
    loadCoinsData();
    loadNewsData();
    
    // Set up interval to refresh data every 5 minutes
    const intervalId = setInterval(refreshData, 300000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Filter coins based on search query
  const filteredCoins = coins.filter(coin => 
    coin.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Crypto Market</h1>
          <p className="text-muted-foreground">Live prices, trends, and signals</p>
        </div>
        <div className="flex mt-4 md:mt-0 space-x-3">
          <Button variant="outline" size="sm" onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Market Overview */}
      <div className="mb-8">
        <MarketOverview data={marketData} isLoading={isLoadingMarket} />
      </div>

      <Tabs defaultValue="coins" className="mb-8">
        <TabsList>
          <TabsTrigger value="coins">Cryptocurrencies</TabsTrigger>
          <TabsTrigger value="signals">Trading Signals</TabsTrigger>
          <TabsTrigger value="news">Latest News</TabsTrigger>
        </TabsList>
        
        <TabsContent value="coins">
          <div className="mb-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Search by name or symbol..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {isLoadingCoins ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-lg border p-4 animate-pulse">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-slate-200 rounded-full mr-3"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-24"></div>
                      <div className="h-3 bg-slate-200 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-6 bg-slate-200 rounded w-1/2"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-4 bg-slate-200 rounded"></div>
                      <div className="h-4 bg-slate-200 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCoins.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCoins.map((coin) => (
                <div key={coin.id} className="rounded-lg border p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-4">
                    <img src={coin.image} alt={coin.name} className="w-10 h-10 mr-3" />
                    <div>
                      <h3 className="font-bold">{coin.name}</h3>
                      <p className="text-sm text-muted-foreground">{coin.symbol.replace('USDT', '')}</p>
                    </div>
                    <div className={`ml-auto px-2 py-1 rounded text-xs font-medium ${
                      coin.trend === "BULLISH" ? "bg-green-100 text-green-800" :
                      coin.trend === "BEARISH" ? "bg-red-100 text-red-800" : 
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {coin.trend}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-2xl font-bold">${coin.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</span>
                      <span className={`${coin.priceChangePercentage24h >= 0 ? 'text-crypto-green' : 'text-crypto-red'} font-medium`}>
                        {coin.priceChangePercentage24h >= 0 ? '+' : ''}{coin.priceChangePercentage24h.toFixed(2)}%
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">24h Volume</p>
                        <p>${(coin.volume24h / 1000000).toFixed(2)}M</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Market Cap</p>
                        <p>${(coin.marketCap / 1000000000).toFixed(2)}B</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">24h High</p>
                        <p>${coin.high24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">24h Low</p>
                        <p>${coin.low24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-xl font-medium mb-2">No cryptocurrencies found</p>
              <p className="text-muted-foreground">Try a different search term</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="signals">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {signals.filter(signal => signal.status === "ACTIVE").map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
            {signals.filter(signal => signal.status === "ACTIVE").length === 0 && (
              <div className="col-span-3 text-center py-12">
                <p className="text-xl font-medium mb-2">No active signals</p>
                <p className="text-muted-foreground">Check back later for new trading opportunities</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="news">
          <CryptoNews news={news} isLoading={isLoadingNews} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CryptoMarket;
