
import { TradingSignal } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";

export function useSignalExport(signals: TradingSignal[] | undefined) {
  const { toast } = useToast();

  // Export signals to CSV
  const handleExportToCSV = () => {
    if (!signals || signals.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Não há sinais para exportar para CSV.",
        variant: "default"
      });
      return;
    }

    try {
      // Create CSV headers
      const headers = [
        "ID",
        "Symbol",
        "Direction",
        "Entry Price",
        "Stop Loss",
        "TP1",
        "TP2", 
        "TP3",
        "Result",
        "Status",
        "Created At",
        "Verified At"
      ];

      // Convert signals to CSV rows
      const rows = signals.map(signal => [
        signal.id,
        signal.symbol,
        signal.direction,
        signal.entryPrice,
        signal.stopLoss,
        signal.tp1 || (signal.targets && signal.targets[0]?.price),
        signal.tp2 || (signal.targets && signal.targets[1]?.price),
        signal.tp3 || (signal.targets && signal.targets[2]?.price),
        signal.result,
        signal.status,
        signal.createdAt,
        signal.verifiedAt
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `signals_history_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Exportação concluída",
        description: `${signals.length} sinais exportados para CSV.`,
      });
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os sinais para CSV.",
        variant: "destructive"
      });
    }
  };

  return { handleExportToCSV };
}

export default useSignalExport;
