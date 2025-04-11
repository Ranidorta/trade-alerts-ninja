
import React from "react";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SignalTableHeader: React.FC = () => {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Data</TableHead>
        <TableHead>Símbolo</TableHead>
        <TableHead>Direção</TableHead>
        <TableHead>Entrada</TableHead>
        <TableHead>Stop Loss</TableHead>
        <TableHead>Take Profit</TableHead>
        <TableHead>Resultado</TableHead>
        <TableHead>Estratégia</TableHead>
        <TableHead>Ações</TableHead>
      </TableRow>
    </TableHeader>
  );
};

export default SignalTableHeader;
