
import React from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StrategyPerformance } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { RefreshCw } from 'lucide-react';

interface StrategyPerformanceTableProps {
  strategies: StrategyPerformance[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const StrategyPerformanceTable: React.FC<StrategyPerformanceTableProps> = ({
  strategies,
  isLoading,
  onRefresh
}) => {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Strategy Performance</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      <Table>
        <TableCaption>
          {strategies.length === 0 ? 
            "No strategy data available yet." : 
            "Performance metrics for all trading strategies."}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Strategy</TableHead>
            <TableHead className="text-right">Trades</TableHead>
            <TableHead className="text-right">Wins</TableHead>
            <TableHead className="text-right">Losses</TableHead>
            <TableHead className="text-right">Win Rate</TableHead>
            <TableHead className="text-right">Profit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-24">
                Loading strategy data...
              </TableCell>
            </TableRow>
          ) : strategies.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-24">
                No strategy data available. Start trading to generate statistics.
              </TableCell>
            </TableRow>
          ) : (
            strategies.map((strategy) => (
              <TableRow key={strategy.strategy || 'unknown'}>
                <TableCell className="font-medium">{strategy.strategy || 'unknown'}</TableCell>
                <TableCell className="text-right">{strategy.totalTrades || 0}</TableCell>
                <TableCell className="text-right">{strategy.wins || 0}</TableCell>
                <TableCell className="text-right">{strategy.losses || 0}</TableCell>
                <TableCell className="text-right">
                  {strategy.winRate?.toFixed(2) || '0.00'}%
                </TableCell>
                <TableCell className={`text-right ${(strategy.avgProfit || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {(strategy.avgProfit || 0).toFixed(2)}%
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default StrategyPerformanceTable;
