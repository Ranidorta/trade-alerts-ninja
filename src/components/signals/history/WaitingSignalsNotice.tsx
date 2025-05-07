
import React from "react";
import { Clock } from "lucide-react";

interface WaitingSignalsNoticeProps {
  signalsWaiting: number;
}

export const WaitingSignalsNotice: React.FC<WaitingSignalsNoticeProps> = ({ signalsWaiting }) => {
  if (signalsWaiting <= 0) return null;
  
  return (
    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
      <p className="text-sm text-yellow-800">
        <Clock className="h-4 w-4 inline mr-1" />
        {signalsWaiting} sinais novos estão aguardando o período de 15 minutos antes de poderem ser avaliados.
      </p>
    </div>
  );
};

export default WaitingSignalsNotice;
