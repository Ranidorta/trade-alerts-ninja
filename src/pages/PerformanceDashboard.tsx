
import { useState, useEffect } from "react";
import { TradingSignal } from "@/lib/types";
import {
  fetchPerformanceData,
  fetchSignalHistory,
  PerformanceData,
  TradingSignalRecord,
  uploadMarketData
} from "@/lib/tradingSignalService";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { ArrowUpRight, ArrowDownRight, DollarSign, Percent, TrendingUp, TrendingDown, Upload, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

const PerformanceDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    totalSignals: 0,
    winningSignals: 0,
    losingSignals: 0,
    winRate: 0,
    totalPnL: 0,
    avgPositionSize: 0,
    capitalHistory: [{ date: new Date().toISOString().split('T')[0], capital: 10000 }]
  });
  const [signalHistory, setSignalHistory] = useState<TradingSignalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [performance, signals] = await Promise.all([
        fetchPerformanceData(),
        fetchSignalHistory()
      ]);
      
      setPerformanceData(performance);
      setSignalHistory(signals);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error loading data",
        description: "Could not load trading performance data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setIsUploading(true);
    
    try {
      await uploadMarketData(file);
      toast({
        title: "Success",
        description: "Market data processed successfully"
      });
      // Reload data after successful upload
      await loadData();
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload Error",
        description: "Failed to process market data",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset the file input
      event.target.value = "";
    }
  };

  const prepareMonthlyPerformanceData = () => {
    // Group signals by month and calculate monthly profit
    const monthlyData: Record<string, { month: string; profit: number }> = {};

    signalHistory.forEach((signal) => {
      if (signal.timestamp) {
        const date = new Date(signal.timestamp);
        const monthYear = `${date.toLocaleString("default", {
          month: "short",
        })} ${date.getFullYear()}`;

        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = { month: monthYear, profit: 0 };
        }

        monthlyData[monthYear].profit += signal.profit_loss;
      }
    });

    return Object.values(monthlyData);
  };

  const prepareCapitalHistoryData = () => {
    return performanceData.capitalHistory.map(item => ({
      date: item.date,
      capital: item.capital
    }));
  };

  const prepareTradeHistoryData = () => {
    return signalHistory
      .slice(0, 10)
      .map((signal, index) => ({
        name: `Trade ${index + 1}`,
        profit: signal.profit_loss,
        symbol: signal.symbol,
      }));
  };

  const monthlyPerformanceData = prepareMonthlyPerformanceData();
  const capitalHistoryData = prepareCapitalHistoryData();
  const tradeHistoryData = prepareTradeHistoryData();

  const getFillColor = (entry: any) => {
    return entry.profit >= 0 ? "#10b981" : "#ef4444";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Performance Dashboard</h1>
        
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button onClick={loadData} variant="outline" disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          
          <div className="relative">
            <input
              type="file"
              id="market-data"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
            <Button asChild variant="default" disabled={isUploading}>
              <label htmlFor="market-data" className="cursor-pointer">
                <Upload className={`mr-2 h-4 w-4 ${isUploading ? 'animate-pulse' : ''}`} />
                {isUploading ? 'Processing...' : 'Upload Market Data'}
              </label>
            </Button>
          </div>
        </div>
      </div>

      {isLoading && (
        <Card className="mb-6">
          <CardContent className="py-6">
            <div className="space-y-2">
              <p className="text-center text-sm text-muted-foreground">Loading trading performance data...</p>
              <Progress value={65} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Profit</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <DollarSign className="mr-2 h-5 w-5 text-muted-foreground" />
              {performanceData.totalPnL.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex items-center">
              {performanceData.totalPnL > 0 ? (
                <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
              ) : (
                <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
              )}
              From {performanceData.totalSignals} completed trades
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Win Rate</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Percent className="mr-2 h-5 w-5 text-muted-foreground" />
              {performanceData.winRate.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Based on {performanceData.totalSignals} completed trades
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Position Size</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <DollarSign className="mr-2 h-5 w-5 text-muted-foreground" />
              {performanceData.avgPositionSize.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Average risk per trade
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Success/Failure</CardDescription>
            <CardTitle className="text-2xl">
              {performanceData.winningSignals} / {performanceData.losingSignals}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Winning vs losing trades
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="capital">Capital Growth</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Performance</TabsTrigger>
          <TabsTrigger value="trades">Trade History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Performance</CardTitle>
              <CardDescription>
                Profit/loss from last 10 completed trades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tradeHistoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="symbol" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="profit"
                      name="Profit/Loss"
                      className="fill-[var(--bar-color)]"
                    >
                      {tradeHistoryData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.profit >= 0 ? "#10b981" : "#ef4444"}
                          data-value={entry.profit}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capital">
          <Card>
            <CardHeader>
              <CardTitle>Capital Growth</CardTitle>
              <CardDescription>
                Evolution of your trading capital over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={capitalHistoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="capital"
                      name="Capital"
                      stroke="#3b82f6"
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Performance</CardTitle>
              <CardDescription>
                Profit/loss aggregated by month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="profit"
                      name="Profit/Loss"
                      className="fill-[var(--bar-color)]"
                    >
                      {monthlyPerformanceData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.profit >= 0 ? "#10b981" : "#ef4444"}
                          data-value={entry.profit}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trades">
          <Card>
            <CardHeader>
              <CardTitle>Trade History</CardTitle>
              <CardDescription>
                Detailed view of all completed trades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-left py-3 px-4">Symbol</th>
                      <th className="text-left py-3 px-4">Type</th>
                      <th className="text-left py-3 px-4">Entry</th>
                      <th className="text-left py-3 px-4">Exit</th>
                      <th className="text-left py-3 px-4">Size</th>
                      <th className="text-right py-3 px-4">Profit/Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signalHistory.map((signal) => (
                      <tr key={signal.id} className="border-b">
                        <td className="py-3 px-4">{formatDate(signal.timestamp)}</td>
                        <td className="py-3 px-4">{signal.symbol}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              signal.signal === 1
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {signal.signal === 1 ? (
                              <TrendingUp className="mr-1 h-3 w-3" />
                            ) : (
                              <TrendingDown className="mr-1 h-3 w-3" />
                            )}
                            {signal.signal === 1 ? "LONG" : "SHORT"}
                          </span>
                        </td>
                        <td className="py-3 px-4">{signal.entry_price.toFixed(2)}</td>
                        <td className="py-3 px-4">{signal.exit_price.toFixed(2)}</td>
                        <td className="py-3 px-4">{signal.position_size.toFixed(2)}</td>
                        <td
                          className={`py-3 px-4 text-right font-medium ${
                            signal.profit_loss >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {signal.profit_loss >= 0 ? "+" : ""}
                          {signal.profit_loss.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceDashboard;
