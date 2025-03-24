
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { config } from "@/config/env";

interface ApiConnectionErrorProps {
  apiUrl: string;
}

const ApiConnectionError = ({ apiUrl }: ApiConnectionErrorProps) => {
  return (
    <Card className="bg-amber-50 border-amber-200 mb-8">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-amber-500 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-medium text-amber-800 mb-2">Problema de Conectividade com a API</h3>
            <p className="text-amber-700 mb-4">
              Não foi possível conectar ao servidor de sinais. Isso pode ocorrer devido a:
            </p>
            <ul className="list-disc pl-5 text-amber-700 mb-4 space-y-1">
              <li>O servidor Flask não está rodando localmente</li>
              <li>Existe um problema com a conexão de rede</li>
              <li>A URL da API está incorreta em suas configurações</li>
            </ul>
            <div className="bg-white p-4 rounded border border-amber-200 font-mono text-sm mb-4">
              URL API configurada: {apiUrl}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" asChild>
                <a href="https://github.com/yourusername/trading-signals-app" target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver Documentação
                </a>
              </Button>
              <Button onClick={() => window.location.reload()}>
                Tentar Novamente
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiConnectionError;
