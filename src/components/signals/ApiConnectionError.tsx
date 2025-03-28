
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";

interface ApiConnectionErrorProps {
  apiUrl: string;
}

const ApiConnectionError = ({ apiUrl }: ApiConnectionErrorProps) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Histórico de Sinais</h1>
        <p className="text-muted-foreground">
          Histórico detalhado dos sinais gerados
        </p>
      </div>
      
      <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-amber-500 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-medium text-amber-800 dark:text-amber-400 mb-2">Problema de Conectividade com a API</h3>
              <p className="text-amber-700 dark:text-amber-300 mb-4">
                Não foi possível conectar ao servidor de sinais. Isso pode ocorrer devido a:
              </p>
              <ul className="list-disc pl-5 text-amber-700 dark:text-amber-300 mb-4 space-y-1">
                <li>O servidor pode estar temporariamente indisponível</li>
                <li>A plataforma Render.com pode ter colocado o servidor em hibernação (modo gratuito)</li>
                <li>Existe um problema com a conexão de rede</li>
                <li>A URL da API está incorreta em suas configurações</li>
              </ul>
              <div className="bg-white dark:bg-black/20 p-4 rounded border border-amber-200 dark:border-amber-800 font-mono text-sm mb-4 overflow-auto">
                URL API configurada: {apiUrl}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" className="bg-white dark:bg-black/20" asChild>
                  <a 
                    href="https://github.com/yourusername/trading-signals-app" 
                    target="_blank" 
                    rel="noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Ver Documentação
                  </a>
                </Button>
                <Button onClick={() => window.location.reload()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tentar Novamente
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiConnectionError;
