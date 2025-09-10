
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type KpiCardProps = {
  title: string;
  value: number;
  format?: 'currency' | 'number';
  icon?: LucideIcon;
  currency?: 'USD' | 'INR';
  fractionDigits?: number;
  tooltipText?: string;
  onClick?: () => void;
};

export const formatCurrency = (value: number, currency: 'USD' | 'INR', fractionDigits?: number) => {
  const digits = fractionDigits !== undefined ? fractionDigits : (currency === 'INR' ? 0 : 2);
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
};

const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
}

export default function KpiCard({ title, value, format = 'number', icon: Icon, currency = 'USD', fractionDigits, tooltipText, onClick }: KpiCardProps) {
  const displayValue = format === 'currency' ? formatCurrency(value, currency, fractionDigits) : formatNumber(value);

  return (
    <Card onClick={onClick} className={cn(onClick && "cursor-pointer hover:bg-muted/50 transition-colors")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
            {title}
            {tooltipText && (
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="max-w-xs">{tooltipText}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", value < 0 && 'text-destructive')}>
          {displayValue}
        </div>
      </CardContent>
    </Card>
  );
}
