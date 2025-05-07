
import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface FilterPanelProps {
  filterSymbol: string;
  setFilterSymbol: (value: string) => void;
  filterResult: string;
  setFilterResult: (value: string) => void;
  uniqueSymbols: string[];
  isLoading: boolean;
  handleApplyFilters: () => void;
  handleClearFilters: () => void;
  handleRefetch: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filterSymbol,
  setFilterSymbol,
  filterResult,
  setFilterResult,
  uniqueSymbols,
  isLoading,
  handleApplyFilters,
  handleClearFilters,
  handleRefetch
}) => {
  return (
    <Card className="mb-6">
      <CardContent className="py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col space-y-2">
            <label htmlFor="symbolFilter" className="text-sm font-medium">
              Filtrar por Ativo
            </label>
            <Select value={filterSymbol} onValueChange={setFilterSymbol}>
              <SelectTrigger id="symbolFilter">
                <SelectValue placeholder="Selecione um ativo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os ativos</SelectItem>
                {uniqueSymbols.map(symbol => (
                  <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col space-y-2">
            <label htmlFor="resultFilter" className="text-sm font-medium">
              Filtrar por Resultado
            </label>
            <Select 
              value={filterResult} 
              onValueChange={setFilterResult}
            >
              <SelectTrigger id="resultFilter">
                <SelectValue placeholder="Selecione um resultado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="win">Vencedor</SelectItem>
                <SelectItem value="loss">Perdedor</SelectItem>
                <SelectItem value="partial">Parcial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end space-x-2">
            <Button variant="outline" onClick={handleApplyFilters} className="flex-1">
              <Filter className="mr-2 h-4 w-4" />
              Aplicar Filtros
            </Button>
            <Button variant="secondary" onClick={handleClearFilters}>
              Limpar
            </Button>
            <Button variant="ghost" onClick={handleRefetch}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FilterPanel;
