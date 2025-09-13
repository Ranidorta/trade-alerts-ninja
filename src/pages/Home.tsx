import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  Target,
  BarChart3,
  Clock,
  Crown,
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalSignals: 42,
    activeSignals: 8,
    successRate: 73.5,
    totalProfit: 18.7,
    weeklyGrowth: 4.2
  });

  // Mock recent signals data
  const recentSignals = [
    { symbol: "BTCUSDT", type: "LONG", profit: 5.2, status: "COMPLETED" },
    { symbol: "ETHUSDT", type: "SHORT", profit: -2.1, status: "COMPLETED" },
    { symbol: "ADAUSDT", type: "LONG", profit: 3.8, status: "ACTIVE" },
    { symbol: "SOLUSDT", type: "LONG", profit: 7.1, status: "COMPLETED" },
  ];

  const quickActions = [
    {
      title: "Ver Sinais Ativos",
      description: "Acompanhe seus sinais em tempo real",
      icon: <Activity className="h-5 w-5" />,
      action: () => navigate("/signals"),
      color: "blue"
    },
    {
      title: "Histórico de Performance",
      description: "Analise seus resultados passados",
      icon: <BarChart3 className="h-5 w-5" />,
      action: () => navigate("/performance"),
      color: "green"
    },
    {
      title: "Trading Esportivo",
      description: "Sinais para apostas esportivas",
      icon: <Crown className="h-5 w-5" />,
      action: () => navigate("/trading-esportivo"),
      color: "purple"
    },
    {
      title: "Mercado Crypto",
      description: "Análise do mercado atual",
      icon: <TrendingUp className="h-5 w-5" />,
      action: () => navigate("/market"),
      color: "orange"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-200">
            Bem-vindo ao Trading Ninja
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Sua central de sinais de trading com inteligência artificial avançada
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Total de Sinais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {stats.totalSignals}
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Este mês
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Sinais Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {stats.activeSignals}
              </div>
              <p className="text-xs text-green-600 dark:text-green-400">
                Agora
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-600 dark:text-purple-400 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Taxa de Acerto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {stats.successRate}%
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Últimos 30 dias
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/20 dark:to-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Lucro Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                +{stats.totalProfit}%
              </div>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                Este mês
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Crescimento Semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                +{stats.weeklyGrowth}%
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Esta semana
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-6">
            Ações Rápidas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Card 
                key={index}
                className="hover:shadow-lg transition-all duration-300 cursor-pointer group"
                onClick={action.action}
              >
                <CardHeader className="pb-3">
                  <div className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center mb-3",
                    action.color === "blue" && "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
                    action.color === "green" && "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
                    action.color === "purple" && "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
                    action.color === "orange" && "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                  )}>
                    {action.icon}
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {action.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    {action.description}
                  </p>
                  <div className="flex items-center text-primary text-sm font-medium group-hover:translate-x-1 transition-transform">
                    Acessar <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Signals */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              Sinais Recentes
            </h2>
            <Button variant="outline" onClick={() => navigate("/history")}>
              Ver Todos
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentSignals.map((signal, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{signal.symbol}</CardTitle>
                      <Badge 
                        variant={signal.type === "LONG" ? "default" : "destructive"}
                        className="mt-1"
                      >
                        {signal.type}
                      </Badge>
                    </div>
                    <Badge 
                      variant={signal.status === "COMPLETED" ? "secondary" : "default"}
                      className="text-xs"
                    >
                      {signal.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Resultado:
                    </span>
                    <div className={cn(
                      "flex items-center font-bold",
                      signal.profit > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {signal.profit > 0 ? (
                        <TrendingUp className="h-4 w-4 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 mr-1" />
                      )}
                      {signal.profit > 0 ? '+' : ''}{signal.profit}%
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;