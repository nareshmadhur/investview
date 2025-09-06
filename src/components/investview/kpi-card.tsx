import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type KpiCardProps = {
  title: string;
  value: number;
  format?: 'currency' | 'number';
  icon?: LucideIcon;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
}

export default function KpiCard({ title, value, format = 'number', icon: Icon }: KpiCardProps) {
  const displayValue = format === 'currency' ? formatCurrency(value) : formatNumber(value);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {displayValue}
        </div>
        <p className="text-xs text-muted-foreground mt-1">&nbsp;</p>
      </CardContent>
    </Card>
  );
}
