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

export default function MonthlyActivityChart({ transactions }: { transactions: Transaction[] }) {
  const data = useMemo(() => {
    const monthlyData: Record<string, { month: string; buy: number; sell: number }> = {};

    transactions.forEach(tx => {
      const month = tx.date.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!monthlyData[month]) {
        monthlyData[month] = { month, buy: 0, sell: 0 };
      }
      const value = tx.quantity * tx.price;
      if (tx.type === 'BUY') {
        monthlyData[month].buy += value;
      } else {
        monthlyData[month].sell += value;
      }
    });

    // Get the last 12 months for display
    const sortedMonths = Object.values(monthlyData).sort((a,b) => {
        const dateA = new Date(`01 ${a.month.replace("'", " 20")}`);
        const dateB = new Date(`01 ${b.month.replace("'", " 20")}`);
        return dateA.getTime() - dateB.getTime();
    });
    
    return sortedMonths.slice(-12);
  }, [transactions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Investment Activity</CardTitle>
        <CardDescription>Total buy and sell value over the last 12 months.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
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
