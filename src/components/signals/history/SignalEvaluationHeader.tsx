
import React from "react";
import { Button } from "@/components/ui/button";
import { Check, Download, RefreshCw } from "lucide-react";

interface SignalEvaluationHeaderProps {
  signalsCount: number;
  isLoading: boolean;
  signalsReadyForEvaluation: number;
  isEvaluatingAll: boolean;
  handleEvaluateAllSignals: () => Promise<void>;
  handleExportToCSV: () => void;
}

export const SignalEvaluationHeader: React.FC<SignalEvaluationHeaderProps> = ({
  signalsCount,
  isLoading,
  signalsReadyForEvaluation,
  isEvaluatingAll,
  handleEvaluateAllSignals,
  handleExportToCSV
}) => {
  return (
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-lg font-semibold">
        {isLoading ? "Carregando sinais..." : `${signalsCount} sinais encontrados`}
      </h2>
      <div className="flex space-x-2">
        {signalsReadyForEvaluation > 0 && (
          <Button 
            variant="outline"
            onClick={handleEvaluateAllSignals}
            disabled={isEvaluatingAll || isLoading}
            className="gap-2"
          >
            {isEvaluatingAll ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Avaliando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Avaliar Todos ({signalsReadyForEvaluation})
              </>
            )}
          </Button>
        )}
        <Button onClick={handleExportToCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>
    </div>
  );
};

export default SignalEvaluationHeader;
