
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import MarketOverview from "@/components/MarketOverview";
import CryptoTicker from "@/components/CryptoTicker";
import CryptoChart from "@/components/CryptoChart";
import CryptoNews from "@/components/CryptoNews";
import { CryptoCoin, CryptoNews as CryptoNewsType, MarketOverview as MarketOverviewType } from "@/lib/types";
import { fetchBybitKlines, fetchCryptoNews, fetchCoinGeckoGlobal, calculateIndicators } from "@/lib/apiServices";

const CryptoMarket = () => {
  const [selectedCoin, setSelectedCoin] = useState<string>("BTCUSDT");
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState<boolean>(true);
  const [technicalIndicators, setTechnicalIndicators] = useState<any>(null);

  // Fetch coins data from CoinGecko
  const { data: coins, isLoading: isLoadingCoins } = useQuery({
    queryKey: ['coins'],
    queryFn: async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h",
          {
            headers: {
              "x-cg-api-key": "CG-r1Go4M9HPMrsNaH6tASKaWLr" // Using the API key from your apiServices
            }
          }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.map((coin: any) => ({
          id: coin.id,
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          image: coin.image,
          currentPrice: coin.current_price,
          priceChange24h: coin.price_change_24h,
          priceChangePercentage24h: coin.price_change_percentage_24h,
          marketCap: coin.market_cap,
          volume24h: coin.total_volume,
          high24h: coin.high_24h,
          low24h: coin.low_24h,
          lastUpdated: new Date(coin.last_updated),
          trend: coin.price_change_percentage_24h > 0 ? "BULLISH" : coin.price_change_percentage_24h < 0 ? "BEARISH" : "NEUTRAL"
        } as CryptoCoin));
      } catch (error) {
        console.error("Error fetching coins data:", error);
        toast.error("Failed to fetch cryptocurrency data");
        return [];
      }
    },
    refetchInterval: 60000 // Refetch every minute
  });

  // Fetch market overview data from CoinGecko
  const { data: marketOverview, isLoading: isLoadingMarketOverview } = useQuery({
    queryKey: ['marketOverview'],
    queryFn: async () => {
      try {
        const data = await fetchCoinGeckoGlobal();
        if (!data || !data.data) {
          throw new Error("Invalid response from CoinGecko Global");
        }
        
        return {
          activeCryptocurrencies: data.data.active_cryptocurrencies,
          totalMarketCap: data.data.total_market_cap.usd,
          totalVolume24h: data.data.total_volume.usd,
          marketCapPercentage: {
            btc: data.data.market_cap_percentage.btc,
            eth: data.data.market_cap_percentage.eth
          },
          marketCapChangePercentage24hUsd: data.data.market_cap_change_percentage_24h_usd,
          lastUpdated: new Date()
        } as MarketOverviewType;
      } catch (error) {
        console.error("Error fetching market overview:", error);
        toast.error("Failed to fetch market overview data");
        return null;
      }
    },
    refetchInterval: 300000 // Refetch every 5 minutes
  });

  // Fetch news data
  const { data: news, isLoading: isLoadingNews } = useQuery({
    queryKey: ['cryptoNews'],
    queryFn: async () => {
      try {
        return await fetchCryptoNews();
      } catch (error) {
        console.error("Error fetching news:", error);
        toast.error("Failed to fetch crypto news");
        return [];
      }
    },
    refetchInterval: 600000 // Refetch every 10 minutes
  });
  
  // Load chart data when selected coin changes
  useEffect(() => {
    loadChartData(selectedCoin);
  }, [selectedCoin]);
  
  const loadChartData = async (symbol: string) => {
    setIsLoadingChart(true);
    try {
      const data = await fetchBybitKlines(symbol);
      if (data) {
        // Process the data for chart
        const formattedData = data.map((item: any) => ({
          date: new Date(Number(item[0])),
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
          volume: parseFloat(item[5])
        }));
        
        setChartData(formattedData.reverse()); // Most recent data first
        
        // Calculate technical indicators
        const indicators = calculateIndicators(data);
        setTechnicalIndicators(indicators);
      } else {
        console.error("Failed to fetch chart data");
        toast.error(`Failed to load chart data for ${symbol}`);
        setChartData([]);
        setTechnicalIndicators(null);
      }
    } catch (error) {
      console.error("Error loading chart data:", error);
      toast.error(`Error loading chart data for ${symbol}`);
      setChartData([]);
      setTechnicalIndicators(null);
    } finally {
      setIsLoadingChart(false);
    }
  };

  // Find the selected coin data for chart
  const selectedCoinData = coins?.find(coin => `${coin.symbol}USDT` === selectedCoin);
  const entryPrice = selectedCoinData?.currentPrice || 0;
  const type = selectedCoinData?.priceChangePercentage24h >= 0 ? "LONG" : "SHORT";
  const stopLoss = type === "LONG" ? entryPrice * 0.95 : entryPrice * 1.05;
  const targets = [
    { level: 1, price: type === "LONG" ? entryPrice * 1.02 : entryPrice * 0.98, hit: false },
    { level: 2, price: type === "LONG" ? entryPrice * 1.05 : entryPrice * 0.95, hit: false },
    { level: 3, price: type === "LONG" ? entryPrice * 1.1 : entryPrice * 0.9, hit: false }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Crypto Market</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
            <CryptoChart 
              symbol={selectedCoin}
              type={type}
              entryPrice={entryPrice}
              stopLoss={stopLoss}
              targets={targets}
              showIndicators={true}
              technicalIndicators={technicalIndicators}
            />
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <MarketOverview 
              data={marketOverview}
              isLoading={isLoadingMarketOverview}
            />
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h2 className="text-xl font-semibold mb-4">Top Cryptocurrencies</h2>
            {isLoadingCoins ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {[...Array(10)].map((_, index) => (
                  <div key={index} className="animate-pulse p-2 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-gray-200 dark:bg-gray-700 w-6 h-6 rounded-full mr-2"></div>
                      <div className="bg-gray-200 dark:bg-gray-700 h-4 w-16 rounded"></div>
                    </div>
                    <div className="bg-gray-200 dark:bg-gray-700 h-4 w-24 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
                {coins?.map((coin) => (
                  <div 
                    key={coin.symbol}
                    className={`p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedCoin === `${coin.symbol}USDT` 
                        ? 'bg-primary/10 hover:bg-primary/20' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setSelectedCoin(`${coin.symbol}USDT`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <img src={coin.image} alt={coin.name} className="w-6 h-6 mr-2" />
                        <span className="font-medium">{coin.symbol}</span>
                      </div>
                      <div 
                        className={`text-sm font-bold ${
                          coin.priceChangePercentage24h >= 0 
                            ? "text-green-500" 
                            : "text-red-500"
                        }`}
                      >
                        ${coin.currentPrice.toLocaleString('en-US', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 6 
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <CryptoNews news={news || []} isLoading={isLoadingNews} />
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <CryptoTicker coins={coins || []} isLoading={isLoadingCoins} />
      </div>
    </div>
  );
};

export default CryptoMarket;
