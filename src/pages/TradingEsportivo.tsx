import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, TrendingUp, Target, AlertCircle, Trophy, Calendar, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  { id: "Brasileirão Série A", name: "Brasileirão Série A", flag: "🇧🇷" },
  { id: "Premier League", name: "Premier League", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: "Bundesliga", name: "Bundesliga", flag: "🇩🇪" },
  { id: "La Liga", name: "La Liga", flag: "🇪🇸" },
  { id: "Serie A", name: "Serie A", flag: "🇮🇹" },
  { id: "Ligue 1", name: "Ligue 1", flag: "🇫🇷" },
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
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [isLoadingOdds, setIsLoadingOdds] = useState(false);
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