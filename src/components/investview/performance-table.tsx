
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
    const dayPL = currentValue - cost;
    const dayPLPercent = cost > 0 ? (dayPL / cost) * 100 : 0;
    return { ...asset, cost, currentValue, dayPL, dayPLPercent };
  }).sort((a, b) => b.cost - a.cost);

  const getBadgeVariant = (assetType: string) => {
    switch (assetType) {
      case 'Stock': return 'default';
      case 'Cryptocurrency': return 'secondary';
      case 'Commodity': return 'outline';
      default: return 'default';
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Holdings</CardTitle>
        <CardDescription>A detailed breakdown of your individual assets by invested value.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative w-full overflow-auto max-h-96">
            <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Avg. Cost</TableHead>
                    <TableHead className="text-right">Current Price</TableHead>
                    <TableHead className="text-right">Current Value</TableHead>
                    <TableHead className="text-right">Day's P/L</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {assetsWithValues.map((asset, index) => (
                <TableRow key={`${asset.asset}-${index}`}>
                    <TableCell>
                        <div className="font-medium">{asset.asset}</div>
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
                    <TableCell className={cn("text-right font-mono", asset.dayPL > 0 ? 'text-green-600' : 'text-red-600')}>
                        <div>{formatCurrency(asset.dayPL, currency)}</div>
                        <div className="text-xs">({asset.dayPLPercent.toFixed(2)}%)</div>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}

    