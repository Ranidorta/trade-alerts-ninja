import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Wallet,
  Target,
  Crown,
  Activity,
  DollarSign,
  Users,
  Zap
} from "lucide-react";

// Mock data para simular dados reais
const stakingAssets = [
  {
    name: "Bitcoin",
    symbol: "BTC",
    percentage: "13.62%",
    change: "+6.51%",
    isPositive: true,
    color: "rgb(247, 147, 26)",
    chartData: [65, 67, 70, 68, 72, 75, 73, 76]
  },
  {
    name: "Ethereum", 
    symbol: "ETH",
    percentage: "12.72%",
    change: "+5.47%",
    isPositive: true,
    color: "rgb(106, 90, 205)",
    chartData: [45, 48, 52, 50, 54, 57, 59, 61]
  },
  {
    name: "Solana",
    symbol: "SOL", 
    percentage: "6.29%",
    change: "-1.96%",
    isPositive: false,
    color: "rgb(220, 38, 127)",
    chartData: [30, 32, 29, 27, 25, 23, 21, 19]
  }
];

const portfolioData = [
  { asset: "Bitcoin", amount: "$7,699.00", icon: "₿", color: "rgb(247, 147, 26)" },
  { asset: "Ethereum", amount: "$1,340.00", icon: "Ξ", color: "rgb(106, 90, 205)" },
  { asset: "Solana", amount: "$540.00", icon: "◎", color: "rgb(220, 38, 127)" },
  { asset: "Cardano", amount: "$890.00", icon: "₳", color: "rgb(0, 51, 173)" }
];

const quickStats = [
  {
    title: "Total Portfolio",
    value: "$31,396.86",
    change: "+12.34%",
    isPositive: true,
    icon: <Wallet className="h-5 w-5" />
  },
  {
    title: "Active Signals",
    value: "24",
    change: "+3",
    isPositive: true,
    icon: <Target className="h-5 w-5" />
  },
  {
    title: "Win Rate",
    value: "87.3%",
    change: "+2.1%",
    isPositive: true,
    icon: <BarChart3 className="h-5 w-5" />
  },
  {
    title: "Total Users",
    value: "2,547",
    change: "+127",
    isPositive: true,
    icon: <Users className="h-5 w-5" />
  }
];

const Index = () => {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's your trading overview.
            </p>
          </div>
          
          {user ? (
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link to="/signals">
                  <Activity className="h-4 w-4 mr-2" />
                  View Signals
                </Link>
              </Button>
              <Button asChild>
                <Link to="/checkout">
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade
                </Link>
              </Button>
            </div>
          ) : (
            <Button asChild>
              <Link to="/login">
                <Zap className="h-4 w-4 mr-2" />
                Get Started
              </Link>
            </Button>
          )}
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickStats.map((stat, index) => (
            <Card key={index} className="bg-card border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <div className="flex items-center gap-1">
                      {stat.isPositive ? (
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-sm ${stat.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    {stat.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Top Trading Assets */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Top Trading Assets</CardTitle>
                  <CardDescription>Recommended coins for 24 hours</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">24H</Button>
                  <Button variant="outline" size="sm">Proof of Stake</Button>
                  <Button variant="outline" size="sm">Desc</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {stakingAssets.map((asset, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg border bg-card/50">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: asset.color }}
                    >
                      {asset.symbol[0]}
                    </div>
                    <div>
                      <p className="font-medium">{asset.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Pool of Choice • {asset.symbol}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    {/* Mini Chart */}
                    <div className="w-24 h-8 flex items-end gap-1">
                      {asset.chartData.map((point, i) => (
                        <div 
                          key={i}
                          className="w-2 rounded-t"
                          style={{ 
                            height: `${(point / Math.max(...asset.chartData)) * 100}%`,
                            backgroundColor: asset.isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
                          }}
                        />
                      ))}
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-bold">{asset.percentage}</p>
                      <div className="flex items-center gap-1">
                        {asset.isPositive ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className={`text-sm ${asset.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                          {asset.change}
                        </span>
                      </div>
                    </div>
                    
                    <Button size="sm" variant="outline">
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Liquid Staking Portfolio */}
          <Card>
            <CardHeader>
              <CardTitle>Trading Portfolio</CardTitle>
              <CardDescription>
                Track your portfolio performance and market exposure in real-time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button className="w-full" size="lg">
                  <Wallet className="h-4 w-4 mr-2" />
                  Connect with Wallet
                </Button>
                <Button variant="outline" className="w-full">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Enter a Wallet Address
                </Button>
              </div>
              
              <div className="space-y-3 pt-4">
                <h4 className="font-medium text-sm">Your Assets</h4>
                {portfolioData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-card/50 border">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: item.color }}
                      >
                        {item.icon}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.asset}</p>
                        <p className="text-xs text-muted-foreground">
                          Amount {item.amount}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {index === 0 ? 'Active' : 'Staking'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Active Trading */}
          <Card>
            <CardHeader>
              <CardTitle>Your Active Trading</CardTitle>
              <CardDescription>Last Trading • 45 minutes ago</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-card/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                      ₿
                    </div>
                    <div>
                      <p className="font-medium">Stake Avalanche (AVAX)</p>
                      <p className="text-sm text-muted-foreground">Current Reward Balance: AVAX</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">31.39686</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="default">Upgrade</Button>
                      <Button size="sm" variant="outline">Unstake</Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Investment Period */}
          <Card>
            <CardHeader>
              <CardTitle>Investment Period</CardTitle>
              <CardDescription>Optimized for long-term growth</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">6 Months</span>
                  <span className="text-sm text-muted-foreground">4 Months</span>
                </div>
                
                <div className="relative">
                  <div className="w-full bg-secondary h-2 rounded-full">
                    <div className="bg-primary h-2 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                  <div className="absolute top-0 left-3/5 transform -translate-x-1/2 -translate-y-1">
                    <div className="w-4 h-4 bg-primary rounded-full border-2 border-background"></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Momentum</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">General</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Risk</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Reward</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        {!user && (
          <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Ready to Start Trading?</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Join thousands of traders using our advanced signals and portfolio management tools.
              </p>
              <div className="flex gap-4 justify-center">
                <Button asChild size="lg">
                  <Link to="/login">
                    <Zap className="h-4 w-4 mr-2" />
                    Get Started
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/signals">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Signals
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;