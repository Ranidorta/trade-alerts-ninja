
import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface EmptySignalStateProps {
  handleRefetch: () => void;
}

export const EmptySignalState: React.FC<EmptySignalStateProps> = ({ handleRefetch }) => {
  return (
    <div className="text-center py-12 border rounded-md">
      <p className="text-lg text-muted-foreground">Nenhum sinal encontrado</p>
      <p className="text-sm text-muted-foreground mt-2">
        Tente remover os filtros ou atualize a página
      </p>
      <Button variant="outline" onClick={handleRefetch} className="mt-4">
        <RefreshCw className="mr-2 h-4 w-4" />
        Atualizar
      </Button>
    </div>
  );
};

export default EmptySignalState;
