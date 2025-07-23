import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, TrendingUp, Target, AlertCircle, Trophy, Calendar, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AnaliseCompletaCard } from "@/components/signals/AnaliseCompletaCard";

// Import league images
import brasileiraoImg from "@/assets/brasileirao.jpg";
import premierLeagueImg from "@/assets/premier-league.jpg";
import bundesligaImg from "@/assets/bundesliga.jpg";
import laLigaImg from "@/assets/la-liga.jpg";
import serieAImg from "@/assets/serie-a.jpg";
import ligue1Img from "@/assets/ligue-1.jpg";

interface TradingEsportivoSignal {
  sinal: string;
  probabilidade: number;
}

interface OddsAnalysis {
  jogo: string;
  horario: string;
  mercado: string;
  analises: {
    aposta: string;
    odd: string;
    probabilidade: string;
    valor_esperado: string;
  }[];
}

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
}

const leagues = [
  { id: "Brasileirão Série A", name: "Brasileirão Série A", flag: "🇧🇷", image: brasileiraoImg },
  { id: "Premier League", name: "Premier League", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", image: premierLeagueImg },
  { id: "Bundesliga", name: "Bundesliga", flag: "🇩🇪", image: bundesligaImg },
  { id: "La Liga", name: "La Liga", flag: "🇪🇸", image: laLigaImg },
  { id: "Serie A", name: "Serie A", flag: "🇮🇹", image: serieAImg },
  { id: "Ligue 1", name: "Ligue 1", flag: "🇫🇷", image: ligue1Img },
];

const markets = [
  { id: "goals", name: "Mercado de Gols", options: ["Over 0.5", "Over 1.5", "Over 2.5", "Over 3.5"] },
  { id: "corners", name: "Mercado de Escanteios", options: ["Over 8.5", "Over 10.5", "Over 12.5"] },
  { id: "winner", name: "Mercado de Vencedor", options: ["Time Mandante", "Empate", "Time Visitante"] },
];

const signalTypes = [
  { id: "back", name: "Back", description: "Apostar a favor" },
  { id: "lay", name: "Lay", description: "Apostar contra" },
];

// Remove mock data - only use real API

const TradingEsportivo = () => {
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<string>("");
  const [selectedMarketOption, setSelectedMarketOption] = useState<string>("");
  const [selectedSignalType, setSelectedSignalType] = useState<string>("");
  const [signals, setSignals] = useState<TradingEsportivoSignal[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [oddsAnalyses, setOddsAnalyses] = useState<OddsAnalysis[]>([]);
  const [analiseCompleta, setAnaliseCompleta] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [isLoadingOdds, setIsLoadingOdds] = useState(false);
  const [isLoadingAnalise, setIsLoadingAnalise] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMatches = async (league: string) => {
    setIsLoadingMatches(true);
    setError(null);
    try {
      console.log(`🏈 Buscando jogos para a liga: ${league}`);
      
      const { data, error } = await supabase.functions.invoke('sports-games', {
        body: { league, season: 2025 }
      });

      if (error) {
        console.error('❌ Erro na edge function:', error);
        throw new Error(`Erro na API: ${error.message}`);
      }

      console.log('📡 Resposta da edge function:', data);

      if (data && data.games && data.games.length > 0) {
        console.log(`✅ Recebidos ${data.games.length} jogos da API`);
        setMatches(data.games.map((game: any) => ({
          id: game.id,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          date: game.date,
          time: game.time
        })));
        
        toast({
          title: "Jogos carregados",
          description: `${data.games.length} jogos encontrados para ${league}.`
        });
      } else {
        console.warn('⚠️ Nenhum jogo encontrado na resposta');
        setError('Nenhum jogo encontrado para esta liga');
        setMatches([]);
        toast({
          title: "Nenhum jogo encontrado",
          description: `Não há jogos programados para ${league} nos próximos 7 dias.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Erro ao buscar jogos:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      setMatches([]);
      toast({
        title: "Erro ao carregar jogos",
        description: "Verifique se a API está configurada corretamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingMatches(false);
    }
  };

  const fetchOddsAnalysis = async (league: string) => {
    setIsLoadingOdds(true);
    try {
      console.log(`📊 Buscando análises de odds para: ${league}`);
      
      const { data, error } = await supabase.functions.invoke('get-odds', {
        body: { league, page: 1 }
      });

      if (error) {
        console.error('❌ Erro na edge function de odds:', error);
        throw new Error(`Erro na API de odds: ${error.message}`);
      }

      console.log('📊 Resposta da edge function de odds:', data);

      if (data && data.analises) {
        setOddsAnalyses(data.analises);
        toast({
          title: "Análises de odds carregadas",
          description: `${data.analises.length} análises encontradas para ${league}.`
        });
      } else {
        setOddsAnalyses([]);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar análises de odds:', error);
      toast({
        title: "Erro ao carregar odds",
        description: "Não foi possível carregar as análises de odds.",
        variant: "destructive"
      });
      setOddsAnalyses([]);
    } finally {
      setIsLoadingOdds(false);
    }
  };

  const fetchAnaliseCompleta = async (match: Match) => {
    setIsLoadingAnalise(true);
    try {
      console.log(`📊 Buscando análise completa para: ${match.homeTeam} vs ${match.awayTeam}`);
      
      const { data, error } = await supabase.functions.invoke('analise-completa', {
        body: { fixture_id: match.id }
      });

      if (error) {
        console.error('❌ Erro na edge function de análise completa:', error);
        throw new Error(`Erro na API de análise: ${error.message}`);
      }

      console.log('📊 Resposta da análise completa:', data);

      if (data) {
        setAnaliseCompleta(data);
        toast({
          title: "Análise completa carregada",
          description: `Análise completa carregada para ${match.homeTeam} vs ${match.awayTeam}.`
        });
      } else {
        setAnaliseCompleta(null);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar análise completa:', error);
      toast({
        title: "Erro ao carregar análise",
        description: "Não foi possível carregar a análise completa.",
        variant: "destructive"
      });
      setAnaliseCompleta(null);
    } finally {
      setIsLoadingAnalise(false);
    }
  };

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
      console.log(`Gerando sinal para jogo ${selectedMatch.id}`);
      
      const { data, error } = await supabase.functions.invoke('generate-sports-signal', {
        body: {
          gameId: selectedMatch.id,
          market: selectedMarket,
          signalType: selectedSignalType,
          line: selectedMarketOption.toLowerCase().replace(' ', '_').replace('.', '_')
        }
      });

      if (error) {
        throw new Error(`Erro na API: ${error.message}`);
      }
      
      if (data && data.signal) {
        console.log(`Sinal gerado: ${data.signal} com probabilidade ${data.probability}`);
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
    setMatches([]);
    setOddsAnalyses([]);
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
                    onClick={() => {
                      setSelectedLeague(league.id);
                      fetchMatches(league.id);
                      fetchOddsAnalysis(league.id);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={league.image} 
                        alt={league.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
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
              {isLoadingMatches ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 text-primary mx-auto mb-4 animate-spin" />
                  <p className="text-muted-foreground">Carregando jogos...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {matches.map((match) => (
                  <Button
                    key={match.id}
                    variant="outline"
                    className="w-full h-auto p-4 justify-between"
                    onClick={() => {
                      setSelectedMatch(match);
                      fetchAnaliseCompleta(match);
                    }}
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
              )}
            </CardContent>
          </Card>

          {/* Odds Analysis Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Análises de Odds
              </CardTitle>
              <CardDescription>
                Análises de apostas com odds e probabilidades calculadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingOdds ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 text-primary mx-auto mb-4 animate-spin" />
                  <p className="text-muted-foreground">Carregando análises de odds...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {oddsAnalyses.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">
                        Nenhuma análise encontrada
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Não há análises de odds disponíveis para esta liga no momento
                      </p>
                    </div>
                  ) : (
                    oddsAnalyses.map((analysis, index) => (
                      <Card key={index} className="border">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Match Info */}
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold">{analysis.jogo}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(analysis.horario).toLocaleDateString('pt-BR')} às{' '}
                                  {new Date(analysis.horario).toLocaleTimeString('pt-BR', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </p>
                              </div>
                              <Badge variant="outline">{analysis.mercado}</Badge>
                            </div>

                            {/* Odds Analysis */}
                            <div className="grid gap-2">
                              {analysis.analises.map((bet, betIndex) => (
                                <div 
                                  key={betIndex} 
                                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="font-medium">{bet.aposta}</span>
                                    <Badge 
                                      variant="outline" 
                                      className={
                                        bet.valor_esperado === "Positivo" 
                                          ? "border-green-500 text-green-700" 
                                          : bet.valor_esperado === "Negativo"
                                          ? "border-red-500 text-red-700"
                                          : "border-yellow-500 text-yellow-700"
                                      }
                                    >
                                      {bet.valor_esperado}
                                    </Badge>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-lg">{bet.odd}</div>
                                    <div className="text-sm text-muted-foreground">{bet.probabilidade}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Match Analysis Display */}
      {selectedMatch && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={() => {
              setSelectedMatch(null);
              setAnaliseCompleta(null);
            }}>
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

          {/* Análise Completa */}
          {isLoadingAnalise ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 text-primary mx-auto mb-4 animate-spin" />
              <p className="text-muted-foreground">Carregando análise completa...</p>
            </div>
          ) : analiseCompleta ? (
            <AnaliseCompletaCard analise={analiseCompleta} />
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                Nenhuma análise encontrada
              </h3>
              <p className="text-sm text-muted-foreground">
                Não há análise disponível para este jogo no momento
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default TradingEsportivo;