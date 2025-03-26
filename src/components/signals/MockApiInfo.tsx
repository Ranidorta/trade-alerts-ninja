
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink, GitHub } from "lucide-react";
import { config } from "@/config/env";

const MockApiInfo = () => {
  return (
    <Card className="bg-amber-50 border-amber-200 mb-8">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-amber-500 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-medium text-amber-800 mb-2">Backend Connection Info</h3>
            <p className="text-amber-700 mb-4">
              Para obter sinais em tempo real, você precisa conectar ao backend:
            </p>
            <ul className="list-disc pl-5 text-amber-700 mb-4 space-y-1">
              <li>Clone o repositório do backend em sua máquina local</li>
              <li>Execute o servidor backend seguindo as instruções no README</li>
              <li>Configure a URL da API no arquivo .env (se necessário)</li>
            </ul>
            <div className="bg-white p-4 rounded border border-amber-200 font-mono text-sm mb-4">
              URL API configurada: {config.signalsApiUrl}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" asChild>
                <a href="https://github.com/Ranidorta/trade-alerts-backend-2" target="_blank" rel="noreferrer">
                  <GitHub className="mr-2 h-4 w-4" />
                  Repositório Backend
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

export default MockApiInfo;
