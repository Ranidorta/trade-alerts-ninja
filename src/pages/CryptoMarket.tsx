
import { useState, useEffect } from "react";
import MarketOverview from "@/components/MarketOverview";
import CryptoTicker from "@/components/CryptoTicker";
import CryptoChart from "@/components/CryptoChart";
import CryptoNews from "@/components/CryptoNews";
import { CryptoCoin, CryptoNews as CryptoNewsType, MarketOverview as MarketOverviewType } from "@/lib/types";
import { fetchBybitKlines, fetchCryptoNews, getTrendFromCandle } from "@/lib/apiServices";

const CryptoMarket = () => {
  const [selectedCoin, setSelectedCoin] = useState<string>("BTCUSDT");
  const [coins, setCoins] = useState<CryptoCoin[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [news, setNews] = useState<CryptoNewsType[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState<boolean>(true);
  const [isLoadingNews, setIsLoadingNews] = useState<boolean>(true);
  const [marketOverview, setMarketOverview] = useState<MarketOverviewType | null>(null);
  const [isLoadingMarketOverview, setIsLoadingMarketOverview] = useState<boolean>(true);

  useEffect(() => {
    const loadMarketData = async () => {
      // Fetch initial market data
      const coinList: CryptoCoin[] = [
        "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "ADAUSDT", 
        "DOGEUSDT", "XRPUSDT", "AVAXUSDT", "DOTUSDT", "MATICUSDT"
      ].map(symbol => {
        const randomPrice = symbol === "BTCUSDT" ? 
          68000 + Math.random() * 2000 : 
          Math.random() * (symbol === "ETHUSDT" ? 3500 : 100);
          
        const changePercent = (Math.random() * 10) - 5;
        
        return {
          id: symbol.toLowerCase().replace("usdt", ""),
          symbol: symbol.replace("USDT", ""),
          name: getCoinName(symbol),
          image: `https://cryptologos.cc/logos/${symbol.toLowerCase().replace("usdt", "")}-logo.png`,
          currentPrice: randomPrice,
          priceChange24h: randomPrice * (changePercent / 100),
          priceChangePercentage24h: changePercent,
          marketCap: randomPrice * (Math.random() * 1000000000),
          volume24h: randomPrice * (Math.random() * 10000000),
          high24h: randomPrice * (1 + Math.random() * 0.05),
          low24h: randomPrice * (1 - Math.random() * 0.05),
          lastUpdated: new Date(),
          trend: changePercent > 0 ? "BULLISH" : changePercent < 0 ? "BEARISH" : "NEUTRAL"
        } as CryptoCoin;
      });
      
      setCoins(coinList);
      
      // Load real news from API
      loadNews();

      // Load mock market overview
      loadMarketOverview();
      
      // Load chart data for selected coin
      loadChartData(selectedCoin);
    };
    
    loadMarketData();
  }, []);
  
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
      } else {
        // Fallback to mock data
        generateMockChartData(symbol);
      }
    } catch (error) {
      console.error("Error loading chart data:", error);
      generateMockChartData(symbol);
    } finally {
      setIsLoadingChart(false);
    }
  };
  
  const loadNews = async () => {
    setIsLoadingNews(true);
    try {
      const newsData = await fetchCryptoNews();
      setNews(newsData);
    } catch (error) {
      console.error("Error loading news:", error);
      // Fallback handled in fetchCryptoNews
    } finally {
      setIsLoadingNews(false);
    }
  };

  const loadMarketOverview = () => {
    setIsLoadingMarketOverview(true);
    // Generate mock market overview data since we don't have a real API for this
    const mockMarketOverview: MarketOverviewType = {
      activeCryptocurrencies: 12500 + Math.floor(Math.random() * 500),
      totalMarketCap: 2500000000000 + Math.random() * 100000000000,
      totalVolume24h: 80000000000 + Math.random() * 20000000000,
      marketCapPercentage: {
        btc: 45 + Math.random() * 5,
        eth: 18 + Math.random() * 3
      },
      marketCapChangePercentage24hUsd: (Math.random() * 8) - 4,
      lastUpdated: new Date()
    };
    setMarketOverview(mockMarketOverview);
    setIsLoadingMarketOverview(false);
  };
  
  const generateMockChartData = (symbol: string) => {
    const basePrice = symbol === "BTCUSDT" ? 
      68000 : symbol === "ETHUSDT" ? 
      3500 : symbol === "BNBUSDT" ? 
      600 : 50;
      
    const volatility = 0.02; // 2%
    const dataPoints = 100;
    const interval = 15 * 60 * 1000; // 15 minutes in milliseconds
    const now = new Date();
    
    const mockData = [];
    let lastClose = basePrice;
    
    for (let i = dataPoints; i >= 0; i--) {
      const time = new Date(now.getTime() - (i * interval));
      const changePercent = (Math.random() - 0.5) * volatility;
      const open = lastClose;
      const close = open * (1 + changePercent);
      const high = Math.max(open, close) * (1 + Math.random() * 0.005);
      const low = Math.min(open, close) * (1 - Math.random() * 0.005);
      const volume = basePrice * Math.random() * 100;
      
      mockData.push({
        date: time,
        open,
        high,
        low,
        close,
        volume
      });
      
      lastClose = close;
    }
    
    setChartData(mockData);
  };
  
  const getCoinName = (symbol: string): string => {
    const map: Record<string, string> = {
      "BTCUSDT": "Bitcoin",
      "ETHUSDT": "Ethereum",
      "BNBUSDT": "Binance Coin",
      "SOLUSDT": "Solana",
      "ADAUSDT": "Cardano",
      "DOGEUSDT": "Dogecoin",
      "XRPUSDT": "Ripple",
      "AVAXUSDT": "Avalanche",
      "DOTUSDT": "Polkadot",
      "MATICUSDT": "Polygon"
    };
    
    return map[symbol] || symbol.replace("USDT", "");
  };

  // Find the selected coin data for chart
  const selectedCoinData = coins.find(coin => `${coin.symbol}USDT` === selectedCoin);
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
            <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
              {coins.map((coin) => (
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
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <CryptoNews news={news} isLoading={isLoadingNews} />
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <CryptoTicker coins={coins} isLoading={false} />
      </div>
    </div>
  );
};

export default CryptoMarket;
