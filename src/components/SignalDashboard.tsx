import { useEffect } from "react";
import { useTradingSignals } from "@/hooks/useTradingSignals";

const SignalDashboard = () => {
  const { signals, loading, error, fetchSignals } = useTradingSignals();

  useEffect(() => {
    fetchSignals();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Trading Signals</h2>

      {loading && <p>Loading signals...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      <ul className="space-y-2">
        {signals.map((signal) => (
          <li key={signal.id} className="border p-2 rounded shadow">
            <strong>{signal.symbol}</strong> — {signal.direction} @{" "}
            <span className="font-mono">{signal.entryPrice.toFixed(4)}</span>{" "}
            <em>({signal.status})</em>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SignalDashboard;
