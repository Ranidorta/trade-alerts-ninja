
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { mockHistoricalSignals } from "@/lib/mockData";
import { TradingSignal } from "@/lib/types";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  LineChart, 
  BarChart3, 
  PieChart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Coins
} from "lucide-react";
import { 
  LineChart as RechartLine, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer, 
  BarChart, 
  Bar,
  Cell,
  PieChart as RechartPie,
  Pie
} from "recharts";

const PerformanceDashboard = () => {
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "all">("30d");
  const signals = mockHistoricalSignals;

  // Calculate summary data
  const totalSignals = signals.length;
  const profitSignals = signals.filter(s => s.profit && s.profit > 0);
  const lossSignals = signals.filter(s => s.profit && s.profit < 0);
  const totalProfit = profitSignals.reduce((sum, s) => sum + (s.profit || 0), 0);
  const totalLoss = lossSignals.reduce((sum, s) => sum + (s.profit || 0), 0);
  const netProfit = totalProfit + totalLoss;
  const winRate = totalSignals > 0 ? (profitSignals.length / totalSignals) * 100 : 0;

  // Calculate coin performance
  const coinPerformance = signals.reduce((acc: Record<string, {profit: number, count: number}>, signal) => {
    if (!acc[signal.symbol]) {
      acc[signal.symbol] = {profit: 0, count: 0};
    }
    acc[signal.symbol].profit += signal.profit || 0;
    acc[signal.symbol].count += 1;
    return acc;
  }, {});

  // Convert to array and sort by profit
  const coinPerformanceArray = Object.entries(coinPerformance)
    .map(([symbol, data]) => ({
      symbol,
      profit: parseFloat(data.profit.toFixed(2)),
      trades: data.count
    }))
    .sort((a, b) => b.profit - a.profit);

  // Generate performance chart data (mock data for now)
  const generatePerformanceData = () => {
    const days = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 90;
    const data = [];
    let cumulativeProfit = 0;
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      
      // Random daily profit between -2% and 3%
      const dailyProfitPercent = (Math.random() * 5 - 2).toFixed(2);
      const dailyProfit = parseFloat(dailyProfitPercent);
      
      cumulativeProfit += dailyProfit;
      
      data.push({
        date: date.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}),
        dailyProfit,
        cumulativeProfit: parseFloat(cumulativeProfit.toFixed(2))
      });
    }
    
    return data;
  };

  const performanceData = generatePerformanceData();
  
  // Generate trade performance by coin (for pie chart)
  const pieData = coinPerformanceArray
    .filter(coin => coin.profit !== 0)
    .slice(0, 5)
    .map(coin => ({
      name: coin.symbol,
      value: Math.abs(coin.profit)
    }));

  // Balance and portfolio mock data
  const portfolioBalance = {
    total: 15420.65,
    change: 3.2,
    inTrade: 5230.45,
    available: 10190.20
  };

  // Colors for charts
  const COLORS = ['#8B5CF6', '#D946EF', '#F97316', '#0EA5E9', '#22C55E'];
  
  // Distribution data
  const distributionData = [
    { name: 'BTC', value: 45 },
    { name: 'ETH', value: 25 },
    { name: 'SOL', value: 15 },
    { name: 'BNB', value: 10 },
    { name: 'Others', value: 5 },
  ];

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Performance Dashboard</h1>
          <p className="text-muted-foreground">Acompanhe seus resultados e sinais mais lucrativos</p>
        </div>
        
        <div className="flex mt-4 md:mt-0 gap-2">
          <Card className="shadow-sm">
            <CardContent className="p-3 flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-primary" />
              <select 
                className="text-sm bg-transparent border-none outline-none" 
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as "7d" | "30d" | "all")}
              >
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="all">Todo o período</option>
              </select>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Balance Card */}
        <Card className="bg-card border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-primary" />
              Saldo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline">
              <p className="text-3xl font-bold">
                ${portfolioBalance.total.toLocaleString()}
              </p>
              <span className={`ml-2 text-sm ${portfolioBalance.change >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
                {portfolioBalance.change >= 0 ? (
                  <span className="flex items-center">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    +{portfolioBalance.change}%
                  </span>
                ) : (
                  <span className="flex items-center">
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                    {portfolioBalance.change}%
                  </span>
                )}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="text-sm">
                <p className="text-muted-foreground">Em Operações</p>
                <p className="font-medium">${portfolioBalance.inTrade.toLocaleString()}</p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">Disponível</p>
                <p className="font-medium">${portfolioBalance.available.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Profit Card */}
        <Card className="bg-card border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-crypto-green" />
              Lucro Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
              {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(2)}%
            </p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="text-sm">
                <p className="text-muted-foreground">Ganhos</p>
                <p className="font-medium text-crypto-green">+{totalProfit.toFixed(2)}%</p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">Perdas</p>
                <p className="font-medium text-crypto-red">{totalLoss.toFixed(2)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Win Rate Card */}
        <Card className="bg-card border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <LineChart className="h-4 w-4 mr-2 text-primary" />
              Taxa de Acerto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{winRate.toFixed(2)}%</p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="text-sm">
                <p className="text-muted-foreground">Acertos</p>
                <p className="font-medium text-crypto-green">{profitSignals.length}</p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">Erros</p>
                <p className="font-medium text-crypto-red">{lossSignals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Total Signals Card */}
        <Card className="bg-card border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <Coins className="h-4 w-4 mr-2 text-primary" />
              Total de Sinais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalSignals}</p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="text-sm">
                <p className="text-muted-foreground">Completados</p>
                <p className="font-medium">{profitSignals.length + lossSignals.length}</p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">Ativos</p>
                <p className="font-medium">{totalSignals - (profitSignals.length + lossSignals.length)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Performance Chart */}
        <Card className="bg-card border-0 shadow-md col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl font-medium flex items-center">
              <LineChart className="h-5 w-5 mr-2 text-primary" />
              Desempenho ao Longo do Tempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartLine
                  data={performanceData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#2D3748', borderColor: '#4B5563', color: '#E2E8F0' }} 
                    formatter={(value: number) => [`${value}%`, 'Lucro']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="cumulativeProfit"
                    name="Lucro Acumulado"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    dot={{ r: 2, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="dailyProfit"
                    name="Lucro Diário"
                    stroke="#0EA5E9"
                    strokeWidth={2}
                    dot={{ r: 2, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </RechartLine>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Distribution */}
        <Card className="bg-card border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-medium flex items-center">
              <PieChart className="h-5 w-5 mr-2 text-primary" />
              Distribuição da Carteira
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartPie>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'Alocação']}
                    contentStyle={{ backgroundColor: '#2D3748', borderColor: '#4B5563', color: '#E2E8F0' }} 
                  />
                </RechartPie>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="performance" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="performance">Performance por Moeda</TabsTrigger>
          <TabsTrigger value="trades">Histórico de Trades</TabsTrigger>
        </TabsList>
        
        <TabsContent value="performance">
          <Card className="bg-card border-0 shadow-md overflow-hidden">
            <CardHeader>
              <CardTitle className="text-xl font-medium flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-primary" />
                Moedas mais Lucrativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={coinPerformanceArray.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                    <XAxis dataKey="symbol" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, 'Lucro']}
                      contentStyle={{ backgroundColor: '#2D3748', borderColor: '#4B5563', color: '#E2E8F0' }} 
                    />
                    <Bar 
                      dataKey="profit" 
                      name="Lucro Total (%)" 
                      radius={[4, 4, 0, 0]}
                    >
                      {coinPerformanceArray.slice(0, 8).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.profit >= 0 ? '#4CAF50' : '#FF3361'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-6">
            <h3 className="text-xl font-medium mb-4 flex items-center">
              <Coins className="h-5 w-5 mr-2 text-primary" />
              Detalhes por Moeda
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-4 py-3 text-left">Moeda</th>
                    <th className="px-4 py-3 text-left">Trades</th>
                    <th className="px-4 py-3 text-left">Lucro Total</th>
                    <th className="px-4 py-3 text-left">Lucro Médio</th>
                    <th className="px-4 py-3 text-left">Último Trade</th>
                  </tr>
                </thead>
                <tbody>
                  {coinPerformanceArray.map((coin, index) => (
                    <tr key={coin.symbol} className="border-b border-gray-700 hover:bg-gray-800/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                            {coin.symbol.substring(0, 1)}
                          </div>
                          <span>{coin.symbol}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{coin.trades}</td>
                      <td className={`px-4 py-3 ${coin.profit >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
                        {coin.profit >= 0 ? '+' : ''}{coin.profit}%
                      </td>
                      <td className={`px-4 py-3 ${coin.profit / coin.trades >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
                        {coin.profit / coin.trades >= 0 ? '+' : ''}
                        {(coin.profit / coin.trades).toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="trades">
          <Card className="bg-card border-0 shadow-md overflow-hidden">
            <CardHeader>
              <CardTitle className="text-xl font-medium flex items-center">
                <LineChart className="h-5 w-5 mr-2 text-primary" />
                Histórico de Operações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-4 py-3 text-left">Data</th>
                      <th className="px-4 py-3 text-left">Par</th>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-left">Entrada</th>
                      <th className="px-4 py-3 text-left">Saída</th>
                      <th className="px-4 py-3 text-left">Lucro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockHistoricalSignals.map((signal) => (
                      <tr key={signal.id} className="border-b border-gray-700 hover:bg-gray-800/30">
                        <td className="px-4 py-3">
                          {signal.completedAt ? signal.completedAt.toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="px-4 py-3">{signal.pair}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium
                            ${signal.type === 'LONG' ? 'bg-crypto-green/20 text-crypto-green' : 'bg-crypto-red/20 text-crypto-red'}`}>
                            {signal.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">${signal.entryAvg.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          ${signal.targets.find(t => t.hit)?.price.toLocaleString() || '-'}
                        </td>
                        <td className={`px-4 py-3 ${(signal.profit || 0) >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
                          {(signal.profit || 0) >= 0 ? '+' : ''}{signal.profit || 0}%
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
