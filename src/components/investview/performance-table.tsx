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
import { Badge } from "@/components/ui/badge";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export default function PerformanceTable({ assets }: { assets: Asset[] }) {
  const assetsWithPerformance = assets.map(asset => {
    const currentValue = asset.quantity * asset.currentPrice;
    const cost = asset.quantity * asset.purchasePrice;
    const gainLoss = currentValue - cost;
    const gainLossPercentage = cost > 0 ? (gainLoss / cost) * 100 : 0;
    return { ...asset, currentValue, gainLoss, gainLossPercentage };
  }).sort((a, b) => b.currentValue - a.currentValue);

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
        <CardDescription>A detailed breakdown of your individual assets.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative w-full overflow-auto max-h-96">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead className="text-right">Current Value</TableHead>
                <TableHead className="text-right">Gain / Loss</TableHead>
                <TableHead className="text-right">Gain / Loss (%)</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {assetsWithPerformance.map(asset => (
                <TableRow key={asset.asset}>
                    <TableCell>
                    <div className="font-medium">{asset.asset}</div>
                    <Badge variant={getBadgeVariant(asset.assetType)} className="mt-1">{asset.assetType}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(asset.currentValue)}</TableCell>
                    <TableCell className={cn("text-right font-medium", asset.gainLoss >= 0 ? "text-chart-1" : "text-chart-2")}>
                    {formatCurrency(asset.gainLoss)}
                    </TableCell>
                    <TableCell className={cn("text-right font-medium", asset.gainLoss >= 0 ? "text-chart-1" : "text-chart-2")}>
                    {asset.gainLossPercentage.toFixed(2)}%
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
