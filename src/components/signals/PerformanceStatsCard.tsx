import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, AlertTriangle } from "lucide-react";

interface PerformanceStatsCardProps {
  title: string;
  value: number;
  percentage: number;
  type: 'vencedor' | 'parcial' | 'perdedor' | 'falso';
  total: number;
}

const PerformanceStatsCard: React.FC<PerformanceStatsCardProps> = ({ 
  title, 
  value, 
  percentage, 
  type,
  total 
}) => {
  const getIcon = () => {
    switch (type) {
      case 'vencedor':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'parcial':
        return <Target className="h-4 w-4 text-amber-600" />;
      case 'perdedor':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'falso':
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getColor = () => {
    switch (type) {
      case 'vencedor':
        return 'text-green-600';
      case 'parcial':
        return 'text-amber-600';
      case 'perdedor':
        return 'text-red-600';
      case 'falso':
        return 'text-gray-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getBadgeVariant = () => {
    switch (type) {
      case 'vencedor':
        return 'default';
      case 'parcial':
        return 'secondary';
      case 'perdedor':
        return 'destructive';
      case 'falso':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {getIcon()}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-2xl font-bold ${getColor()}`}>
              {value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {percentage.toFixed(1)}% do total
            </p>
          </div>
          <Badge variant={getBadgeVariant()} className="ml-2">
            {percentage.toFixed(1)}%
          </Badge>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2 mt-3">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              type === 'vencedor' ? 'bg-green-500' :
              type === 'parcial' ? 'bg-amber-500' :
              type === 'perdedor' ? 'bg-red-500' :
              'bg-gray-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <div className="text-xs text-muted-foreground mt-2">
          {value} de {total} sinais
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceStatsCard;