
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Asset } from '@/types';
import { cn } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";

const formatCurrency = (value: number, currency: 'USD' | 'INR', fractionDigits = 2) => {
  return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
};

export default function PerformanceTable({ assets, currency }: { assets: Asset[], currency: 'USD' | 'INR' }) {
  const assetsWithValues = assets.map(asset => {
    const cost = asset.quantity * asset.purchasePrice;
    const currentValue = asset.quantity * asset.currentPrice;
    const unrealizedPL = currentValue - cost;
    const unrealizedPLPercent = cost > 0 ? (unrealizedPL / cost) * 100 : 0;
    return { ...asset, cost, currentValue, unrealizedPL, unrealizedPLPercent };
  }).sort((a, b) => b.currentValue - a.currentValue);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Holdings</CardTitle>
        <CardDescription>A detailed breakdown of your individual assets by current market value.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
            <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Avg. Cost</TableHead>
                    <TableHead className="text-right">Current Price</TableHead>
                    <TableHead className="text-right">Current Value</TableHead>
                    <TableHead className="text-right">Unrealized P/L</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {assetsWithValues.map((asset, index) => (
                <TableRow key={`${asset.asset}-${index}`}>
                    <TableCell>
                        <div className="font-medium">{asset.displayName}</div>
                        <div className="text-xs text-muted-foreground">{asset.quantity.toFixed(4)} shares</div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                        {formatCurrency(asset.purchasePrice, currency)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                        {formatCurrency(asset.currentPrice, currency)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                        {formatCurrency(asset.currentValue, currency)}
                    </TableCell>
                    <TableCell className={cn("text-right font-mono", asset.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600')}>
                        <div>{formatCurrency(asset.unrealizedPL, currency)}</div>
                        <div className="text-xs">({asset.unrealizedPLPercent.toFixed(2)}%)</div>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
