import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TradingSignal } from "@/lib/types";
import { getSignalHistory } from "@/lib/signal-storage";
import { cn } from "@/lib/utils";

interface DayPerformance {
  date: string;
  stakePercentage: number;
  signalsCount: number;
  isPositive: boolean;
}

interface PerformanceCalendarProps {
  signals?: TradingSignal[];
  onDateClick?: (date: string) => void;
}

const PerformanceCalendar: React.FC<PerformanceCalendarProps> = ({ 
  signals: propSignals, 
  onDateClick 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState<DayPerformance[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);

  // Get signals from prop or local storage
  const signals = propSignals || getSignalHistory();

  // Calculate stake percentage for a signal based on result
  const calculateStakePercentage = (signal: TradingSignal): number => {
    // Assuming 1% stake per signal, adjust based on actual business logic
    const baseStake = 1.0;
    
    switch (signal.result) {
      case "WINNER":
      case "win":
      case 1:
        return baseStake * 3; // TP3 = 3x stake
      case "PARTIAL":
      case "partial":
        return baseStake * 1.5; // Partial = 1.5x stake
      case "LOSER":
      case "loss":
      case 0:
        return -baseStake; // Loss = -1x stake
      case "FALSE":
      case "missed":
        return -baseStake * 0.5; // False = -0.5x stake
      default:
        return 0; // Pending or unknown
    }
  };

  // Check if signal should be counted (validation rules)
  const shouldCountSignal = (signal: TradingSignal): boolean => {
    // Only count signals with final results
    const validResults = ["WINNER", "PARTIAL", "LOSER", "FALSE", "win", "partial", "loss", "missed", 0, 1];
    return validResults.includes(signal.result as any);
  };

  // Process signals for the current month
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first and last day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Filter signals for current month
    const monthSignals = signals.filter(signal => {
      const signalDate = new Date(signal.createdAt);
      return signalDate >= firstDay && signalDate <= lastDay && shouldCountSignal(signal);
    });

    // Group signals by day and calculate daily performance
    const dailyMap = new Map<string, DayPerformance>();

    monthSignals.forEach(signal => {
      const signalDate = new Date(signal.createdAt);
      const dateKey = signalDate.toISOString().split('T')[0];
      
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          stakePercentage: 0,
          signalsCount: 0,
          isPositive: false
        });
      }

      const dayData = dailyMap.get(dateKey)!;
      dayData.stakePercentage += calculateStakePercentage(signal);
      dayData.signalsCount += 1;
      dayData.isPositive = dayData.stakePercentage > 0;
    });

    // Convert to array
    const monthlyPerformance = Array.from(dailyMap.values());
    setMonthlyData(monthlyPerformance);

    // Calculate monthly total
    const total = monthlyPerformance.reduce((sum, day) => sum + day.stakePercentage, 0);
    setMonthlyTotal(total);
  }, [signals, currentDate]);

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Get calendar days
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = monthlyData.find(d => d.date === dateKey);
      
      days.push({
        day,
        dateKey,
        performance: dayData
      });
    }
    
    return days;
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const formatStakePercentage = (percentage: number) => {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  };

  const calendarDays = getCalendarDays();
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {formatMonth(currentDate)}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Monthly Total */}
        <div className="text-center">
          <div className={cn(
            "text-2xl font-bold",
            monthlyTotal >= 0 ? "text-green-600" : "text-red-600"
          )}>
            {formatStakePercentage(monthlyTotal)} Stake P.
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Week Days Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day, index) => (
            <div key={index} className="text-center text-sm font-medium text-muted-foreground p-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((dayInfo, index) => {
            if (!dayInfo) {
              return <div key={index} className="h-16" />;
            }
            
            const { day, dateKey, performance } = dayInfo;
            const hasData = performance && performance.signalsCount > 0;
            
            return (
              <div
                key={dateKey}
                className={cn(
                  "h-16 border rounded-md cursor-pointer transition-colors hover:bg-accent/50",
                  hasData && performance.isPositive && "bg-blue-500 text-white",
                  hasData && !performance.isPositive && "bg-red-500 text-white",
                  !hasData && "bg-muted/30"
                )}
                onClick={() => onDateClick?.(dateKey)}
              >
                <div className="p-1 h-full flex flex-col justify-between">
                  <div className="text-xs font-medium">{day}</div>
                  {hasData && (
                    <div className="text-[10px] font-bold text-center">
                      {formatStakePercentage(performance.stakePercentage)}
                      <div className="text-[8px] opacity-75">
                        Stake P.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex justify-center items-center mt-4 space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Positivo</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Negativo</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-muted border rounded"></div>
            <span>Sem dados</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceCalendar;