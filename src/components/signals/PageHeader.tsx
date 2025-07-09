import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Calendar, Filter, LineChart, SortDesc } from "lucide-react";
interface PageHeaderProps {
  title: string;
  description: string;
}
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description
}) => {
  return <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap mt-4 md:mt-0 gap-2">
        <Button variant="outline" asChild className="flex items-center">
          
        </Button>
        <Card className="shadow-sm">
          
        </Card>
        <Card className="shadow-sm">
          
        </Card>
      </div>
    </div>;
};
export default PageHeader;