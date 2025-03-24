
import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ResultsTabSelectorProps {
  resultTab: string;
  onValueChange: (value: string) => void;
}

const ResultsTabSelector = ({ resultTab, onValueChange }: ResultsTabSelectorProps) => {
  return (
    <Tabs defaultValue="all" value={resultTab} onValueChange={onValueChange} className="mb-8">
      <TabsList>
        <TabsTrigger value="all">Todos os Sinais</TabsTrigger>
        <TabsTrigger value="profit">Lucro</TabsTrigger>
        <TabsTrigger value="loss">Perda</TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default ResultsTabSelector;
