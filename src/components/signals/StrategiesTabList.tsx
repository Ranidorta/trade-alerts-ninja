
import React from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StrategiesTabListProps {
  strategies: string[];
  activeStrategy: string;
  isLoading: boolean;
}

const StrategiesTabList = ({ strategies, activeStrategy, isLoading }: StrategiesTabListProps) => {
  return (
    <TabsList className="mb-4 inline-flex flex-wrap">
      <TabsTrigger value="ALL">Todas Estratégias</TabsTrigger>
      {isLoading ? (
        <div className="px-3 py-1.5 text-sm">Carregando...</div>
      ) : strategies.map((strategy: string) => (
        <TabsTrigger key={strategy} value={strategy}>
          {strategy}
        </TabsTrigger>
      ))}
    </TabsList>
  );
};

export default StrategiesTabList;
