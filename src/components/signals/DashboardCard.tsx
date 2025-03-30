
import React, { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  showOptions?: boolean;
  onClick?: () => void;
}

const DashboardCard = ({
  title,
  children,
  className = "",
  showOptions = false,
  onClick
}: DashboardCardProps) => {
  return (
    <Card 
      className={`relative overflow-hidden bg-slate-100/80 dark:bg-card backdrop-blur-sm p-5 ${className}`}
      onClick={onClick}
    >
      {title && (
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          {showOptions && (
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      <div>{children}</div>
    </Card>
  );
};

export default DashboardCard;
