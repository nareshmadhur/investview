'use client';

import { Pie, PieChart, ResponsiveContainer } from 'recharts';
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
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Asset } from '@/types';
import { useMemo } from 'react';

export default function AssetAllocationChart({ assets }: { assets: Asset[] }) {
  const { data, chartConfig } = useMemo(() => {
    const allocation = assets.reduce((acc, asset) => {
      const value = asset.quantity * asset.currentPrice;
      if (!acc[asset.assetType]) {
        acc[asset.assetType] = 0;
      }
      acc[asset.assetType] += value;
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(allocation).map(([name, value], index) => ({
      name,
      value,
      fill: `var(--chart-${index + 3})`,
    }));

    const config: ChartConfig = {};
    chartData.forEach(item => {
      config[item.name] = {
        label: item.name,
        color: item.fill,
      };
    });

    return { data: chartData, chartConfig: config };
  }, [assets]);

  const totalValue = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Asset Allocation</CardTitle>
        <CardDescription>Distribution of your portfolio by asset type.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent 
                    hideLabel 
                    formatter={(value) => `${(Number(value) / totalValue * 100).toFixed(1)}%`}
                 />}
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                strokeWidth={5}
                labelLine={false}
                label={({
                  cy,
                  midAngle,
                  innerRadius,
                  outerRadius,
                  value,
                  index,
                }) => {
                  const RADIAN = Math.PI / 180
                  const radius = 12 + innerRadius + (outerRadius - innerRadius)
                  const x = cy + radius * Math.cos(-midAngle * RADIAN)
                  const y = cy + radius * Math.sin(-midAngle * RADIAN)
                  if(totalValue === 0) return null;

                  return (
                    <text
                      x={x}
                      y={y}
                      className="fill-muted-foreground text-xs"
                      textAnchor={x > cy ? "start" : "end"}
                      dominantBaseline="central"
                    >
                      {data[index].name} ({(value/totalValue*100).toFixed(0)}%)
                    </text>
                  )
                }}
              >
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
