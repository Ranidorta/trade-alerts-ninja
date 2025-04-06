import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { PerformanceData } from "@/lib/types";

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

interface PerformanceChartProps {
  data: PerformanceData;
  chartType?: "pie" | "bar";
  isLoading?: boolean;
  title?: string;
  showDetails?: boolean;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ 
  data, 
  chartType = "pie",
  isLoading = false,
  title = "Distribuição de Resultados",
  showDetails = true
}) => {
  // Define colors for each result type
  const colors = {
    vencedor: "#10b981", // verde
    parcial: "#f59e0b",  // amarelo
    perdedor: "#ef4444", // vermelho
    falso: "#9ca3af"     // cinza
  };

  // If loading or no data, show loading state
  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex justify-center items-center">
          <div className="animate-pulse text-muted-foreground">
            Carregando dados...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate overall success rate (vencedor + parcial)
  const sucessoTotal = data.vencedor.percentual + data.parcial.percentual;

  // Prepare chart data
  const chartData = {
    labels: ['Vencedor', 'Parcial', 'Perdedor', 'Falso'],
    datasets: [
      {
        data: [
          data.vencedor.quantidade,
          data.parcial.quantidade,
          data.perdedor.quantidade,
          data.falso.quantidade
        ],
        backgroundColor: [
          colors.vencedor,
          colors.parcial,
          colors.perdedor,
          colors.falso
        ],
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)'
      },
    ],
  };

  // Chart options
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.chart.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(2);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col space-y-4">
        <div className="h-80">
          {chartType === "pie" ? (
            <Pie data={chartData} options={options} />
          ) : (
            <Bar 
              data={chartData} 
              options={{
                ...options,
                indexAxis: 'y' as const,
              }} 
            />
          )}
        </div>
        
        {showDetails && (
          <>
            <div className="mt-4 grid gap-3">
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="font-medium">Vencedor:</span>
                  <span>{data.vencedor.quantidade} ({data.vencedor.percentual.toFixed(2)}%)</span>
                </div>
              </div>
              
              <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="font-medium">Parcial:</span>
                  <span>{data.parcial.quantidade} ({data.parcial.percentual.toFixed(2)}%)</span>
                </div>
              </div>
              
              <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="font-medium">Perdedor:</span>
                  <span>{data.perdedor.quantidade} ({data.perdedor.percentual.toFixed(2)}%)</span>
                </div>
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-900/30 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-gray-500" />
                  <span className="font-medium">Falso:</span>
                  <span>{data.falso.quantidade} ({data.falso.percentual.toFixed(2)}%)</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-4 border rounded-lg bg-primary/5">
              <p className="text-lg font-medium">
                Taxa de sucesso total: 
                <span className={`ml-2 ${sucessoTotal >= 60 ? 'text-green-600' : sucessoTotal >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                  {sucessoTotal.toFixed(2)}%
                </span>
                <span className="text-sm text-muted-foreground ml-2">(vencedor + parcial)</span>
              </p>
            </div>
            
            <div className="text-sm text-muted-foreground mt-2">
              Total de sinais avaliados: <span className="font-medium">{data.total}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PerformanceChart;
