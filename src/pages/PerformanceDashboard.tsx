
import { useState, useEffect } from "react";
import { TradingSignal, SignalStatus } from "@/lib/types";
import { mockSignals, mockHistoricalSignals } from "@/lib/mockData";
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
import { ArrowUpRight, ArrowDownRight, DollarSign, Percent, TrendingUp, TrendingDown } from "lucide-react";

const PerformanceDashboard = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [performanceData, setPerformanceData] = useState({
    totalProfit: 0,
    winRate: 0,
    avgProfit: 0,
    totalTrades: 0,
    completedTrades: 0,
    activeTrades: 0,
    longTrades: 0,
    shortTrades: 0,
  });

  // Format date strings
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  useEffect(() => {
    // Load signals data
    const allSignals = [...mockSignals, ...mockHistoricalSignals];
    setSignals(allSignals);

    // Calculate performance metrics
    const completed = allSignals.filter(
      (signal) => signal.status === "COMPLETED"
    );
    const active = allSignals.filter((signal) => signal.status === "ACTIVE");
    const totalProfit = completed.reduce(
      (sum, signal) => sum + (signal.profit || 0),
      0
    );
    const winningTrades = completed.filter((signal) => (signal.profit || 0) > 0);
    const longTrades = allSignals.filter(
      (signal) => signal.type === "LONG"
    ).length;

    setPerformanceData({
      totalProfit,
      winRate: (winningTrades.length / completed.length) * 100,
      avgProfit: totalProfit / completed.length,
      totalTrades: allSignals.length,
      completedTrades: completed.length,
      activeTrades: active.length,
      longTrades,
      shortTrades: allSignals.length - longTrades,
    });
  }, []);

  // Prepare data for charts
  const prepareMonthlyPerformanceData = () => {
    const completedSignals = signals.filter(
      (signal) => signal.status === "COMPLETED" && signal.completedAt
    );
    const monthlyData: Record<string, { month: string; profit: number }> = {};

    completedSignals.forEach((signal) => {
      if (signal.completedAt) {
        const date = new Date(signal.completedAt);
        const monthYear = `${date.toLocaleString("default", {
          month: "short",
        })} ${date.getFullYear()}`;

        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = { month: monthYear, profit: 0 };
        }

        monthlyData[monthYear].profit += signal.profit || 0;
      }
    });

    return Object.values(monthlyData);
  };

  const prepareTradeTypeData = () => {
    return [
      {
        name: "Long",
        value: performanceData.longTrades,
        color: "#10b981",
      },
      {
        name: "Short",
        value: performanceData.shortTrades,
        color: "#ef4444",
      },
    ];
  };

  const prepareWinLossData = () => {
    const completed = signals.filter(
      (signal) => signal.status === "COMPLETED" && signal.profit !== undefined
    );
    const winning = completed.filter((signal) => (signal.profit || 0) > 0);
    const losing = completed.filter((signal) => (signal.profit || 0) <= 0);

    return [
      {
        name: "Winning",
        value: winning.length,
        color: "#10b981",
      },
      {
        name: "Losing",
        value: losing.length,
        color: "#ef4444",
      },
    ];
  };

  const prepareTradeHistoryData = () => {
    return signals
      .filter((signal) => signal.status === "COMPLETED" && signal.profit !== undefined)
      .map((signal, index) => ({
        name: `Trade ${index + 1}`,
        profit: signal.profit,
        symbol: signal.symbol,
      }))
      .slice(-10); // Last 10 trades
  };

  const monthlyPerformanceData = prepareMonthlyPerformanceData();
  const tradeTypeData = prepareTradeTypeData();
  const winLossData = prepareWinLossData();
  const tradeHistoryData = prepareTradeHistoryData();

  // Custom function to get fill color based on profit
  const getFillColor = (entry: any) => {
    return entry.profit >= 0 ? "#10b981" : "#ef4444";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Performance Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Profit</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <DollarSign className="mr-2 h-5 w-5 text-muted-foreground" />
              {performanceData.totalProfit.toFixed(2)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex items-center">
              {performanceData.totalProfit > 0 ? (
                <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
              ) : (
                <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
              )}
              From {performanceData.completedTrades} completed trades
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
              Based on {performanceData.completedTrades} completed trades
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Profit</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <DollarSign className="mr-2 h-5 w-5 text-muted-foreground" />
              {performanceData.avgProfit.toFixed(2)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex items-center">
              {performanceData.avgProfit > 0 ? (
                <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
              ) : (
                <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
              )}
              Per completed trade
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Trades</CardDescription>
            <CardTitle className="text-2xl">
              {performanceData.activeTrades}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Out of {performanceData.totalTrades} total trades
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Performance</TabsTrigger>
          <TabsTrigger value="trades">Trade History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Trade Types</CardTitle>
                <CardDescription>
                  Distribution of long vs short trades
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tradeTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {tradeTypeData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Win/Loss Ratio</CardTitle>
                <CardDescription>
                  Distribution of winning vs losing trades
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={winLossData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {winLossData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Trade Performance</CardTitle>
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
                      name="Profit (%)"
                      fill="#10b981"
                      className="fill-green-500 negative-fill-red-500"
                    />
                  </BarChart>
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
                      name="Profit (%)"
                      fill="#10b981"
                      className="fill-green-500 negative-fill-red-500"
                    />
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
                      <th className="text-left py-3 px-4">Symbol</th>
                      <th className="text-left py-3 px-4">Type</th>
                      <th className="text-left py-3 px-4">Entry</th>
                      <th className="text-left py-3 px-4">Exit</th>
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-right py-3 px-4">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signals
                      .filter(
                        (signal) =>
                          signal.status === "COMPLETED" &&
                          signal.profit !== undefined
                      )
                      .map((signal) => (
                        <tr key={signal.id} className="border-b">
                          <td className="py-3 px-4">{signal.symbol}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                signal.type === "LONG"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {signal.type === "LONG" ? (
                                <TrendingUp className="mr-1 h-3 w-3" />
                              ) : (
                                <TrendingDown className="mr-1 h-3 w-3" />
                              )}
                              {signal.type}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {signal.entryAvg?.toFixed(2) || "-"}
                          </td>
                          <td className="py-3 px-4">
                            {signal.targets?.find((t) => t.hit)?.price.toFixed(2) || "-"}
                          </td>
                          <td className="py-3 px-4">
                            {signal.completedAt ? formatDate(signal.completedAt) : "-"}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-medium ${
                              (signal.profit || 0) >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {(signal.profit || 0) >= 0 ? "+" : ""}
                            {signal.profit?.toFixed(2)}%
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
