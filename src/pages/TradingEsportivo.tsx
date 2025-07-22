import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, TrendingUp, Target, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TradingEsportivoSignal {
  sinal: string;
  probabilidade: number;
}

const TradingEsportivo = () => {
  const [formData, setFormData] = useState({
    timeMandante: "",
    timeVisitante: "",
    liga: "",
    temporada: "2025"
  });
  const [signals, setSignals] = useState<TradingEsportivoSignal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação dos campos
    if (!formData.timeMandante || !formData.timeVisitante || !formData.liga) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/signals/gols', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          time_mandante_id: parseInt(formData.timeMandante),
          time_visitante_id: parseInt(formData.timeVisitante),
          liga_id: parseInt(formData.liga),
          temporada: parseInt(formData.temporada)
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        setSignals(data);
        toast({
          title: "Sinais gerados com sucesso!",
          description: `${data.length} sinal(is) de trading esportivo gerado(s).`
        });
      } else {
        setSignals([]);
        toast({
          title: "Nenhum sinal encontrado",
          description: "Não foram encontrados sinais para os dados informados.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao buscar sinais:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      toast({
        title: "Erro ao gerar sinais",
        description: "Falha na comunicação com o servidor. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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
          Gere sinais de trading esportivo baseados em análise estatística Poisson
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Formulário */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Gerar Sinais
              </CardTitle>
              <CardDescription>
                Preencha os dados do jogo para gerar sinais de trading esportivo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="timeMandante">ID Time Mandante *</Label>
                  <Input
                    id="timeMandante"
                    name="timeMandante"
                    type="number"
                    value={formData.timeMandante}
                    onChange={handleInputChange}
                    placeholder="Ex: 123"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeVisitante">ID Time Visitante *</Label>
                  <Input
                    id="timeVisitante"
                    name="timeVisitante"
                    type="number"
                    value={formData.timeVisitante}
                    onChange={handleInputChange}
                    placeholder="Ex: 456"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="liga">ID da Liga *</Label>
                  <Input
                    id="liga"
                    name="liga"
                    type="number"
                    value={formData.liga}
                    onChange={handleInputChange}
                    placeholder="Ex: 789"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temporada">Temporada</Label>
                  <Input
                    id="temporada"
                    name="temporada"
                    type="number"
                    value={formData.temporada}
                    onChange={handleInputChange}
                    placeholder="Ex: 2025"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando Sinais...
                    </>
                  ) : (
                    "Gerar Sinais"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Área de Resultados */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Sinais Gerados
              </CardTitle>
              <CardDescription>
                Resultados da análise estatística para trading esportivo
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
                    Nenhum sinal gerado ainda
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Preencha o formulário e clique em "Gerar Sinais" para começar
                  </p>
                </div>
              )}

              {isLoading && (
                <div className="text-center py-8">
                  <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                  <h3 className="text-lg font-medium mb-2">
                    Analisando dados...
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Processando análise estatística com modelo Poisson
                  </p>
                </div>
              )}

              {signals.length > 0 && (
                <div className="space-y-3">
                  {signals.map((signal, index) => (
                    <Card key={index} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getProbabilityIcon(signal.probabilidade)}
                            <div>
                              <h4 className="font-medium">{signal.sinal}</h4>
                              <p className="text-sm text-muted-foreground">
                                Mercado de trading esportivo
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={getProbabilityColor(signal.probabilidade)}
                          >
                            {(signal.probabilidade * 100).toFixed(1)}%
                          </Badge>
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
  );
};

export default TradingEsportivo;