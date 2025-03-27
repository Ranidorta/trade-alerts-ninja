
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink, CheckCircle } from "lucide-react";
import { config } from "@/config/env";
import { useQuery } from "@tanstack/react-query";

interface BackendConnectionStatusProps {
  apiUrl: string;
}

const BackendConnectionStatus = ({ apiUrl }: BackendConnectionStatusProps) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['healthCheck'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/health`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return response.json();
    },
    retry: 1,
    staleTime: 30000 // 30 seconds
  });
  
  if (isLoading) {
    return (
      <Card className="bg-blue-50 border-blue-200 mb-8">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="animate-spin h-6 w-6 text-blue-500 mt-1 flex-shrink-0">⟳</div>
            <div>
              <h3 className="text-lg font-medium text-blue-800 mb-2">Verificando conexão com o backend</h3>
              <p className="text-blue-700 mb-4">
                Estamos tentando conectar ao servidor de sinais...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="bg-amber-50 border-amber-200 mb-8">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-amber-500 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-medium text-amber-800 mb-2">Problema de Conectividade com o Backend</h3>
              <p className="text-amber-700 mb-4">
                Não foi possível conectar ao servidor de sinais. Isso pode ocorrer devido a:
              </p>
              <ul className="list-disc pl-5 text-amber-700 mb-4 space-y-1">
                <li>O servidor backend não está acessível</li>
                <li>Existe um problema com a conexão de rede</li>
                <li>A URL da API está incorreta em suas configurações</li>
              </ul>
              <div className="bg-white p-4 rounded border border-amber-200 font-mono text-sm mb-4">
                URL API configurada: {apiUrl}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" asChild>
                  <a href="https://github.com/Ranidorta/trade-alerts-backend-2" target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Ver Repositório Backend
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
  }
  
  return (
    <Card className="bg-green-50 border-green-200 mb-8">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-medium text-green-800 mb-2">Conectado ao Backend</h3>
            <p className="text-green-700 mb-4">
              Conexão estabelecida com sucesso ao servidor de sinais de trading.
            </p>
            <div className="bg-white p-4 rounded border border-green-200 font-mono text-sm mb-4">
              Status: {data?.status || "OK"}
              {data?.timestamp && (
                <div className="mt-1">Timestamp: {data.timestamp}</div>
              )}
            </div>
            <Button variant="outline" asChild>
              <a href="https://github.com/Ranidorta/trade-alerts-backend-2" target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Ver Repositório Backend
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BackendConnectionStatus;
