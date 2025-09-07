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

export default function YearlyActivityChart({ transactions }: { transactions: Transaction[] }) {
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
        <Card>
            <CardHeader>
                <CardTitle>Yearly Investment Activity</CardTitle>
                <CardDescription>No transaction data available to display.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">Upload a CSV to see your activity.</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yearly Investment Activity</CardTitle>
        <CardDescription>Total buy and sell value per year.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={12}
                    tickFormatter={(value) => `$${Number(value) / 1000}k`}
                />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="buy" fill="var(--color-buy)" radius={4} />
                <Bar dataKey="sell" fill="var(--color-sell)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
