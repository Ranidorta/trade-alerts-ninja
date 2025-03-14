
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Filter, RefreshCw } from "lucide-react";
import { mockSignals } from "@/lib/mockData";
import { TradingSignal } from "@/lib/types";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeSignals, setActiveSignals] = useState<TradingSignal[]>([]);
  const [historySignals, setHistorySignals] = useState<TradingSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated
  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    if (!isAuthenticated) {
      navigate("/login");
    }
    
    // Load signals data
    loadSignals();
  }, [navigate]);
  
  const loadSignals = () => {
    setIsLoading(true);
    
    // Mock API call delay
    setTimeout(() => {
      // Filter active and completed signals
      const active = mockSignals.filter(signal => signal.status === "ACTIVE");
      const history = mockSignals.filter(signal => signal.status === "COMPLETED");
      
      setActiveSignals(active);
      setHistorySignals(history);
      setIsLoading(false);
    }, 1000);
  };
  
  const handleRefresh = () => {
    loadSignals();
    toast.success("Sinais atualizados!");
  };
  
  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    navigate("/login");
    toast.info("Você foi desconectado");
  };

  // Function to format date string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900/20 py-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Painel do Usuário</h1>
            <p className="text-slate-600 dark:text-slate-300">
              Bem-vindo(a) de volta, {localStorage.getItem("userName") || localStorage.getItem("userEmail")}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleRefresh} className="flex items-center">
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button onClick={handleLogout} variant="ghost">
              Sair
            </Button>
          </div>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <div className="flex justify-between items-center mb-6">
            <TabsList>
              <TabsTrigger value="active" className="px-6">
                Sinais Ativos
              </TabsTrigger>
              <TabsTrigger value="history" className="px-6">
                Histórico
              </TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="hidden md:flex">
                <Filter className="mr-2 h-4 w-4" />
                Filtrar
              </Button>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>
            </div>
          </div>
          
          <TabsContent value="active">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 md:gap-6">
                {[1, 2, 3].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="h-20 bg-slate-200 dark:bg-slate-800"></CardHeader>
                    <CardContent className="h-40 bg-slate-100 dark:bg-slate-900"></CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                {activeSignals.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-lg text-slate-600 dark:text-slate-300 mb-4">
                        Não há sinais ativos no momento
                      </p>
                      <Button onClick={handleRefresh}>Verificar novamente</Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:gap-6">
                    {activeSignals.map((signal) => (
                      <Card key={signal.id} className="overflow-hidden border-l-4 border-l-primary">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg md:text-xl">{signal.symbol}</CardTitle>
                              <CardDescription>
                                {formatDate(signal.createdAt)}
                              </CardDescription>
                            </div>
                            <Badge className={signal.type === "LONG" ? "bg-success" : "bg-error"}>
                              {signal.type === "LONG" ? "COMPRA" : "VENDA"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                            <div>
                              <p className="text-sm text-muted-foreground">Preço de Entrada</p>
                              <p className="font-semibold">${signal.entryPrice?.toLocaleString() || "Range"}</p>
                              {signal.entryMin && signal.entryMax && (
                                <p className="text-xs text-muted-foreground">
                                  ${signal.entryMin.toLocaleString()} - ${signal.entryMax.toLocaleString()}
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Stop Loss</p>
                              <p className="font-semibold text-error">${signal.stopLoss.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">
                                Risco: {((Math.abs(signal.entryPrice! - signal.stopLoss) / signal.entryPrice!) * 100).toFixed(2)}%
                              </p>
                            </div>
                            {signal.targets && signal.targets.map((target, index) => (
                              <div key={index}>
                                <p className="text-sm text-muted-foreground">TP {target.level}</p>
                                <p className="font-semibold text-success">${target.price.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">
                                  Lucro: {((Math.abs(signal.entryPrice! - target.price) / signal.entryPrice!) * 100).toFixed(2)}%
                                </p>
                              </div>
                            ))}
                          </div>
                          
                          {signal.notes && (
                            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
                              <p className="text-sm">{signal.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="history">
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-md mb-4"></div>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((_, i) => (
                    <div key={i} className="h-16 bg-slate-100 dark:bg-slate-900 rounded-md"></div>
                  ))}
                </div>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Histórico de Sinais</CardTitle>
                  <CardDescription>
                    Resultados dos sinais anteriores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left border-b dark:border-slate-700">
                          <th className="px-4 py-3 text-sm font-medium">Par</th>
                          <th className="px-4 py-3 text-sm font-medium">Tipo</th>
                          <th className="px-4 py-3 text-sm font-medium">Entrada</th>
                          <th className="px-4 py-3 text-sm font-medium">Resultado</th>
                          <th className="px-4 py-3 text-sm font-medium">Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historySignals.map((signal) => (
                          <tr key={signal.id} className="border-b dark:border-slate-700">
                            <td className="px-4 py-3 text-sm">{signal.symbol}</td>
                            <td className="px-4 py-3 text-sm">
                              <Badge className={signal.type === "LONG" ? "bg-success" : "bg-error"}>
                                {signal.type === "LONG" ? "COMPRA" : "VENDA"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">${signal.entryPrice?.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={signal.profit && signal.profit > 0 ? "text-success" : "text-error"}>
                                {signal.profit ? `${signal.profit > 0 ? "+" : ""}${signal.profit}%` : "N/A"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">{formatDate(signal.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
