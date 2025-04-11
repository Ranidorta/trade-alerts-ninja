
import React from "react";
import { TradingSignal } from "@/lib/types";
import { 
  Table, 
  TableBody, 
  TableCaption
} from "@/components/ui/table";
import SignalTableHeader from "./SignalTableHeader";
import SignalTableRow from "./SignalTableRow";

interface SignalHistoryTableProps {
  signals: TradingSignal[];
  onSignalSelect?: (signal: TradingSignal) => void;
}

const SignalHistoryTable: React.FC<SignalHistoryTableProps> = ({ 
  signals,
  onSignalSelect
}) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableCaption>
          Total de {signals.length} sinais no histórico
        </TableCaption>
        <SignalTableHeader />
        <TableBody>
          {signals.map((signal) => (
            <SignalTableRow 
              key={signal.id} 
              signal={signal}
              onSignalSelect={onSignalSelect}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default SignalHistoryTable;
