
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Calendar, Filter, LineChart, SortDesc } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap mt-4 md:mt-0 gap-2">
        <Button variant="outline" asChild className="flex items-center">
          <Link to="/performance">
            <LineChart className="mr-2 h-4 w-4" />
            Ver Dashboard Completo
          </Link>
        </Button>
        <Card className="shadow-sm">
          <CardContent className="p-3 flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-primary" />
            <span className="text-sm">Filtrar por data</span>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 flex items-center">
            <SortDesc className="h-4 w-4 mr-2 text-primary" />
            <span className="text-sm">Ordenar por</span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PageHeader;
