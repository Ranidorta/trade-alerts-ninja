
import { useState, useEffect } from "react";
import { TradingSignal } from "@/lib/types";
import { RefreshCw, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import ClassicSignalCard from "./ClassicSignalCard";
import { fetchClassicSignals } from "@/lib/classicSignalsApi";

const ClassicSignalsTab = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<TradingSignal[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [directionFilter, setDirectionFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");
  const [confidenceFilter, setConfidenceFilter] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Apply filters whenever signals or filters change
  useEffect(() => {
    console.log("🔍 Filtering signals. Raw signals count:", signals.length);
    console.log("🔍 Current filters - Direction:", directionFilter, "Confidence:", confidenceFilter, "Search:", searchQuery);
    
    let result = [...signals];
    
    if (directionFilter !== "ALL") {
      result = result.filter(signal => signal.direction === directionFilter);
      console.log("🔍 After direction filter:", result.length);
    }
    
    if (confidenceFilter !== "ALL") {
      result = result.filter(signal => {
        if (!signal.confidence) return false;
        
        switch (confidenceFilter) {
          case "HIGH":
            return signal.confidence >= 0.75;
          case "MEDIUM":
            return signal.confidence >= 0.65 && signal.confidence < 0.75;
          case "LOW":
            return signal.confidence < 0.65;
          default:
            return true;
        }
      });
      console.log("🔍 After confidence filter:", result.length);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(signal => 
        signal.symbol?.toLowerCase().includes(query)
      );
      console.log("🔍 After search filter:", result.length);
    }

    // Sort by newest first
    result.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    console.log("📋 Final filtered signals:", result.length);
    setFilteredSignals(result);
  }, [signals, directionFilter, confidenceFilter, searchQuery]);

  const generateClassicSignals = async () => {
    setIsLoading(true);
    try {
      console.log("🔄 Generating classic signals...");
      const classicSignals = await fetchClassicSignals();
      console.log("📊 Received signals:", classicSignals);
      
      if (classicSignals.length > 0) {
        console.log("✅ Setting signals state with:", classicSignals.length, "signals");
        setSignals(classicSignals);
        toast({
          title: "Sinais Classic gerados",
          description: `${classicSignals.length} novos sinais foram gerados com sucesso`
        });
      } else {
        console.log("⚠️ No signals received");
        toast({
          title: "Nenhum sinal classic gerado",
          description: "Não foi possível gerar sinais no momento. Tente novamente."
        });
      }
    } catch (error) {
      console.error("❌ Error generating classic signals:", error);
      toast({
        title: "Erro ao gerar sinais classic",
        description: "Falha na geração dos sinais",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setLastUpdated(new Date());
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleDirectionFilter = (direction: "ALL" | "BUY" | "SELL") => {
    setDirectionFilter(direction);
  };

  const handleConfidenceFilter = (confidence: "ALL" | "HIGH" | "MEDIUM" | "LOW") => {
    setConfidenceFilter(confidence);
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return "Nunca";
    return lastUpdated.toLocaleTimeString();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold">Sinais Classic</h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm">
            Sinais clássicos de IA com análise tradicional
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-xs bg-blue-100 text-blue-800 font-medium px-2 py-1 rounded">
              Classic AI Strategy
            </span>
            {lastUpdated && (
              <span className="text-xs text-slate-500">
                Última geração: {formatLastUpdated()}
              </span>
            )}
          </div>
        </div>

        <Button 
          onClick={generateClassicSignals} 
          variant="default"
          disabled={isLoading}
          className="w-full md:w-auto"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Gerando Sinais...' : 'Gerar Sinais Classic'}
        </Button>
      </div>

      {/* Filters */}
      {isMobile ? (
        <div className="flex items-center justify-between">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 p-2">
                <Filter className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[80vw] p-4" side="right">
              <h3 className="text-lg font-medium mb-4">Filtros Classic</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Buscar</h4>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                    <Input 
                      placeholder="Buscar por símbolo..." 
                      className="pl-10" 
                      value={searchQuery} 
                      onChange={handleSearchChange} 
                    />
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Direção</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      variant={directionFilter === "ALL" ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => handleDirectionFilter("ALL")}
                      className="w-full"
                    >
                      Todos
                    </Button>
                    <Button 
                      variant={directionFilter === "BUY" ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => handleDirectionFilter("BUY")}
                      className="w-full"
                    >
                      BUY
                    </Button>
                    <Button 
                      variant={directionFilter === "SELL" ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => handleDirectionFilter("SELL")}
                      className="w-full"
                    >
                      SELL
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Confiança</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant={confidenceFilter === "ALL" ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => handleConfidenceFilter("ALL")}
                      className="w-full"
                    >
                      Todos
                    </Button>
                    <Button 
                      variant={confidenceFilter === "HIGH" ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => handleConfidenceFilter("HIGH")}
                      className="w-full"
                    >
                      Alta (≥75%)
                    </Button>
                    <Button 
                      variant={confidenceFilter === "MEDIUM" ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => handleConfidenceFilter("MEDIUM")}
                      className="w-full"
                    >
                      Média
                    </Button>
                    <Button 
                      variant={confidenceFilter === "LOW" ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => handleConfidenceFilter("LOW")}
                      className="w-full"
                    >
                      Baixa
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4 items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                placeholder="Buscar por símbolo..." 
                className="pl-10" 
                value={searchQuery} 
                onChange={handleSearchChange} 
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant={directionFilter === "ALL" ? "default" : "outline"} 
              size="sm" 
              onClick={() => handleDirectionFilter("ALL")}
            >
              Todos
            </Button>
            <Button 
              variant={directionFilter === "BUY" ? "default" : "outline"} 
              size="sm" 
              onClick={() => handleDirectionFilter("BUY")}
            >
              BUY
            </Button>
            <Button 
              variant={directionFilter === "SELL" ? "default" : "outline"} 
              size="sm" 
              onClick={() => handleDirectionFilter("SELL")}
            >
              SELL
            </Button>
          </div>

          <div className="flex gap-2">
            <Button 
              variant={confidenceFilter === "ALL" ? "default" : "outline"} 
              size="sm" 
              onClick={() => handleConfidenceFilter("ALL")}
            >
              Todas
            </Button>
            <Button 
              variant={confidenceFilter === "HIGH" ? "default" : "outline"} 
              size="sm" 
              onClick={() => handleConfidenceFilter("HIGH")}
            >
              Alta
            </Button>
            <Button 
              variant={confidenceFilter === "MEDIUM" ? "default" : "outline"} 
              size="sm" 
              onClick={() => handleConfidenceFilter("MEDIUM")}
            >
              Média
            </Button>
            <Button 
              variant={confidenceFilter === "LOW" ? "default" : "outline"} 
              size="sm" 
              onClick={() => handleConfidenceFilter("LOW")}
            >
              Baixa
            </Button>
          </div>
        </div>
      )}

      {/* Signals Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : signals.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            Nenhum sinal classic foi gerado ainda
          </p>
          <Button onClick={generateClassicSignals} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Gerar Primeiros Sinais
          </Button>
        </div>
      ) : filteredSignals.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {filteredSignals.map((signal) => (
            <ClassicSignalCard 
              key={signal.id} 
              signal={signal}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-slate-500 dark:text-slate-400">
            Nenhum sinal encontrado com os filtros aplicados
          </p>
        </div>
      )}
    </div>
  );
};

export default ClassicSignalsTab;
