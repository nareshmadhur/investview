import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  title: string;
  value: number;
  previousValue?: number;
  format?: 'currency' | 'percentage';
  showPercentage?: boolean;
  helpText?: string;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const formatPercentage = (value: number) => {
  return `${value.toFixed(2)}%`;
};

export default function KpiCard({ title, value, previousValue, format = 'currency', showPercentage = false, helpText }: KpiCardProps) {
  const isPositive = value >= 0;
  
  const percentageChange = showPercentage && previousValue && previousValue !== 0 ? (value / previousValue) * 100 : 0;
  
  const displayValue = format === 'currency' ? formatCurrency(value) : formatPercentage(value);

  const valueIsGainLoss = title.toLowerCase().includes('gain') || title.toLowerCase().includes('performer');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn(
          "text-2xl font-bold",
          valueIsGainLoss && (isPositive ? "text-chart-1" : "text-chart-2")
        )}>
          {displayValue}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {showPercentage && percentageChange !== 0 ? (
            <span className={cn("flex items-center gap-1 font-medium", isPositive ? "text-chart-1" : "text-chart-2")}>
              {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {formatPercentage(percentageChange)}
            </span>
          ) : helpText ? (
            <span>{helpText}</span>
          ) : (
            <span>&nbsp;</span> 
          )}
        </p>
      </CardContent>
    </Card>
  );
}
