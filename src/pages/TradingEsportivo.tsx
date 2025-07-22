import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, TrendingUp, Target, AlertCircle, Trophy, Calendar, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TradingEsportivoSignal {
  sinal: string;
  probabilidade: number;
}

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
}

const leagues = [
  { id: "brasileirao-a", name: "Brasileirão Série A", flag: "🇧🇷" },
  { id: "brasileirao-b", name: "Brasileirão Série B", flag: "🇧🇷" },
  { id: "premier-league", name: "Premier League", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: "bundesliga", name: "Bundesliga", flag: "🇩🇪" },
  { id: "ligue-1", name: "Ligue 1", flag: "🇫🇷" },
];

const markets = [
  { id: "gols", name: "Mercado de Gols", options: ["Over 0.5", "Over 1.5", "Over 2.5", "Over 3.5"] },
  { id: "escanteios", name: "Mercado de Escanteios", options: ["Over 8.5", "Over 10.5", "Over 12.5"] },
  { id: "vencedor", name: "Mercado de Vencedor", options: ["Time Mandante", "Empate", "Time Visitante"] },
];

const signalTypes = [
  { id: "back", name: "Back", description: "Apostar a favor" },
  { id: "lay", name: "Lay", description: "Apostar contra" },
];

// Mock data for matches
const mockMatches: Record<string, Match[]> = {
  "brasileirao-a": [
    { id: "1", homeTeam: "Flamengo", awayTeam: "Palmeiras", date: "2025-01-25", time: "16:00" },
    { id: "2", homeTeam: "São Paulo", awayTeam: "Corinthians", date: "2025-01-25", time: "18:30" },
    { id: "3", homeTeam: "Santos", awayTeam: "Grêmio", date: "2025-01-26", time: "11:00" },
    { id: "4", homeTeam: "Internacional", awayTeam: "Atlético-MG", date: "2025-01-26", time: "16:00" },
  ],
  "brasileirao-b": [
    { id: "5", homeTeam: "Sport", awayTeam: "Náutico", date: "2025-01-25", time: "19:00" },
    { id: "6", homeTeam: "Ceará", awayTeam: "Vila Nova", date: "2025-01-26", time: "16:30" },
  ],
  "premier-league": [
    { id: "7", homeTeam: "Manchester City", awayTeam: "Arsenal", date: "2025-01-25", time: "12:30" },
    { id: "8", homeTeam: "Liverpool", awayTeam: "Chelsea", date: "2025-01-25", time: "15:00" },
  ],
  "bundesliga": [
    { id: "9", homeTeam: "Bayern Munich", awayTeam: "Borussia Dortmund", date: "2025-01-25", time: "15:30" },
    { id: "10", homeTeam: "RB Leipzig", awayTeam: "Bayer Leverkusen", date: "2025-01-26", time: "17:30" },
  ],
  "ligue-1": [
    { id: "11", homeTeam: "PSG", awayTeam: "Marseille", date: "2025-01-25", time: "20:45" },
    { id: "12", homeTeam: "Lyon", awayTeam: "Monaco", date: "2025-01-26", time: "17:00" },
  ],
};

const TradingEsportivo = () => {
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<string>("");
  const [selectedMarketOption, setSelectedMarketOption] = useState<string>("");
  const [selectedSignalType, setSelectedSignalType] = useState<string>("");
  const [signals, setSignals] = useState<TradingEsportivoSignal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerateSignal = async () => {
    if (!selectedMatch || !selectedMarket || !selectedMarketOption || !selectedSignalType) {
      toast({
        title: "Seleção incompleta",
        description: "Por favor, selecione todas as opções antes de gerar o sinal.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://itdihklxnfycbouotuad.supabase.co/functions/v1/generate-sports-signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZGloa2x4bmZ5Y2JvdW90dWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MTkzMTksImV4cCI6MjA2ODE5NTMxOX0.v1jk7nCtgihpYM6E7B9mnB5Qkybal-xdCYLTy-TQ0M0`
        },
        body: JSON.stringify({
          gameId: selectedMatch.id,
          market: selectedMarket,
          signalType: selectedSignalType,
          line: selectedMarketOption.toLowerCase().replace(' ', '_')
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.signal) {
        setSignals([{
          sinal: data.signal,
          probabilidade: data.probability
        }]);
        toast({
          title: "Sinal gerado com sucesso!",
          description: `Sinal de trading esportivo gerado para ${selectedMatch.homeTeam} vs ${selectedMatch.awayTeam}.`
        });
      } else {
        setSignals([]);
        toast({
          title: "Nenhum sinal encontrado",
          description: "Não foi possível gerar um sinal para esta seleção.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao buscar sinais:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      toast({
        title: "Erro ao gerar sinal",
        description: "Falha na comunicação com o servidor. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetSelections = () => {
    setSelectedLeague(null);
    setSelectedMatch(null);
    setSelectedMarket("");
    setSelectedMarketOption("");
    setSelectedSignalType("");
    setSignals([]);
    setError(null);
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 0.8) return "bg-green-500/20 text-green-700 border-green-500/30";
    if (probability >= 0.6) return "bg-yellow-500/20 text-yellow-700 border-yellow-500/30";
    return "bg-red-500/20 text-red-700 border-red-500/30";
  };

  const getProbabilityIcon = (probability: number) => {
    if (probability >= 0.8) return <TrendingUp className="h-4 w-4" />;
    if (probability >= 0.6) return <Target className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Trading Esportivo</h1>
        <p className="text-muted-foreground">
          Selecione a liga, jogo, mercado e tipo de sinal para gerar análises de trading esportivo
        </p>
      </div>

      {/* Step 1: Liga Selection */}
      {!selectedLeague && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Selecione a Liga
              </CardTitle>
              <CardDescription>
                Escolha a liga desejada para visualizar os jogos da semana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {leagues.map((league) => (
                  <Button
                    key={league.id}
                    variant="outline"
                    className="h-auto p-4 justify-start"
                    onClick={() => setSelectedLeague(league.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{league.flag}</span>
                      <span className="text-left">{league.name}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Match Selection */}
      {selectedLeague && !selectedMatch && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={resetSelections}>
              ← Voltar
            </Button>
            <div>
              <h2 className="text-xl font-semibold">
                {leagues.find(l => l.id === selectedLeague)?.name}
              </h2>
              <p className="text-muted-foreground">Jogos desta semana</p>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Selecione o Jogo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockMatches[selectedLeague]?.map((match) => (
                  <Button
                    key={match.id}
                    variant="outline"
                    className="w-full h-auto p-4 justify-between"
                    onClick={() => setSelectedMatch(match)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <div className="font-medium">
                          {match.homeTeam} vs {match.awayTeam}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {match.date}
                          <Clock className="h-3 w-3 ml-2" />
                          {match.time}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Market and Signal Type Selection */}
      {selectedMatch && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={() => setSelectedMatch(null)}>
              ← Voltar
            </Button>
            <div>
              <h2 className="text-xl font-semibold">
                {selectedMatch.homeTeam} vs {selectedMatch.awayTeam}
              </h2>
              <p className="text-muted-foreground">
                {selectedMatch.date} às {selectedMatch.time}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Configuration Panel */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Configurar Sinal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Market Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mercado</label>
                    <Select value={selectedMarket} onValueChange={setSelectedMarket}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o mercado" />
                      </SelectTrigger>
                      <SelectContent>
                        {markets.map((market) => (
                          <SelectItem key={market.id} value={market.id}>
                            {market.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Market Option */}
                  {selectedMarket && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Opção do Mercado</label>
                      <Select value={selectedMarketOption} onValueChange={setSelectedMarketOption}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a opção" />
                        </SelectTrigger>
                        <SelectContent>
                          {markets.find(m => m.id === selectedMarket)?.options.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Signal Type */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Sinal</label>
                    <Select value={selectedSignalType} onValueChange={setSelectedSignalType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Back ou Lay" />
                      </SelectTrigger>
                      <SelectContent>
                        {signalTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            <div>
                              <div className="font-medium">{type.name}</div>
                              <div className="text-xs text-muted-foreground">{type.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={handleGenerateSignal}
                    className="w-full" 
                    disabled={isLoading || !selectedMarket || !selectedMarketOption || !selectedSignalType}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gerando Sinal...
                      </>
                    ) : (
                      "Gerar Sinal"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Results Panel */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Sinal Gerado
                  </CardTitle>
                  <CardDescription>
                    Resultado da análise estatística para trading esportivo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {error && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {signals.length === 0 && !isLoading && !error && (
                    <div className="text-center py-8">
                      <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">
                        Configure e gere seu sinal
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Selecione o mercado, opção e tipo de sinal para gerar a análise
                      </p>
                    </div>
                  )}

                  {isLoading && (
                    <div className="text-center py-8">
                      <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                      <h3 className="text-lg font-medium mb-2">
                        Analisando jogo...
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Processando dados estatísticos com modelo Poisson
                      </p>
                    </div>
                  )}

                  {signals.length > 0 && (
                    <div className="space-y-4">
                      {signals.map((signal, index) => (
                        <Card key={index} className="border">
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              {/* Signal Header */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {getProbabilityIcon(signal.probabilidade)}
                                  <div>
                                    <h4 className="font-semibold text-lg">{signal.sinal}</h4>
                                    <p className="text-muted-foreground">
                                      {selectedMatch.homeTeam} vs {selectedMatch.awayTeam}
                                    </p>
                                  </div>
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className={`text-lg px-4 py-2 ${getProbabilityColor(signal.probabilidade)}`}
                                >
                                  {(signal.probabilidade * 100).toFixed(1)}%
                                </Badge>
                              </div>

                              {/* Match Details */}
                              <div className="bg-muted/30 rounded-lg p-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Data:</span>
                                    <span className="ml-2 font-medium">{selectedMatch.date}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Horário:</span>
                                    <span className="ml-2 font-medium">{selectedMatch.time}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Mercado:</span>
                                    <span className="ml-2 font-medium">{selectedMarketOption}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Tipo:</span>
                                    <span className="ml-2 font-medium capitalize">{selectedSignalType}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingEsportivo;