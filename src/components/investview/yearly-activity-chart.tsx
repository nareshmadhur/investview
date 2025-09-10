
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Transaction } from '@/types';
import { useMemo } from 'react';
import { formatCurrency } from './kpi-card';

const chartConfig = {
  buy: {
    label: 'Buy',
    color: 'hsl(var(--chart-1))',
  },
  sell: {
    label: 'Sell',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

export default function YearlyActivityChart({ transactions, currency }: { transactions: Transaction[], currency: 'USD' | 'INR' }) {
  const data = useMemo(() => {
    const yearlyData: Record<string, { year: string; buy: number; sell: number }> = {};

    transactions.forEach(tx => {
      const year = tx.date.getFullYear().toString();
      if (!yearlyData[year]) {
        yearlyData[year] = { year, buy: 0, sell: 0 };
      }
      const value = tx.quantity * tx.price;
      if (tx.type === 'BUY') {
        yearlyData[year].buy += value;
      } else {
        yearlyData[year].sell += value;
      }
    });

    return Object.values(yearlyData).sort((a,b) => parseInt(a.year) - parseInt(b.year));
  }, [transactions]);

  if(data.length === 0) {
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Yearly Activity</CardTitle>
                <CardDescription>No data available.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-[250px]">
                <p className="text-muted-foreground">Upload a CSV to see activity.</p>
            </CardContent>
        </Card>
    )
  }

  const formatCurrencyValue = (value: number) => {
    const symbol = currency === 'INR' ? '₹' : '$';
    if (value > 10000000) return `${symbol}${(value / 10000000).toFixed(2)}Cr`;
    if (value > 100000) return `${symbol}${(value / 100000).toFixed(2)}L`;
    if (value > 1000) return `${symbol}${(value / 1000).toFixed(1)}k`;
    return `${symbol}${value.toFixed(0)}`;
  }


  return (
    <div className="flex flex-col h-full">
      <CardHeader className="p-4 pb-0">
        <CardTitle>Yearly Investment Activity</CardTitle>
        <CardDescription>Total buy and sell value per year.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4 pr-0">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 30, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={12}
                    tickFormatter={formatCurrencyValue}
                />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent 
                        indicator="dot"
                        formatter={(value) => formatCurrency(value as number, currency)}
                     />}
                />
                <Bar dataKey="buy" fill="var(--color-buy)" radius={4} />
                <Bar dataKey="sell" fill="var(--color-sell)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </div>
  );
}
