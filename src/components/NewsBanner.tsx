
import React from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const NewsBanner: React.FC = () => {
  return (
    <Card className="mb-6 bg-primary/5 border-primary/20">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold mb-1">Notícias de Criptomoedas</h2>
            <p className="text-sm text-muted-foreground">
              Acompanhe as últimas notícias, análises e informações do mercado crypto
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="shrink-0"
            onClick={() => window.open("https://cointelegraph.com.br/", "_blank")}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Visitar Cointelegraph
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NewsBanner;
