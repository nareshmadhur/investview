
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
    return { ...asset, cost };
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
                <TableHead>Quantity</TableHead>
                <TableHead className="text-right">Avg. Cost</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {assetsWithValues.map((asset, index) => (
                <TableRow key={`${asset.asset}-${index}`}>
                    <TableCell>
                    <div className="font-medium">{asset.asset}</div>
                    <Badge variant={getBadgeVariant(asset.assetType)} className="mt-1">{asset.assetType}</Badge>
                    </TableCell>
                    <TableCell>{asset.quantity.toFixed(4)}</TableCell>
                    <TableCell className="text-right font-mono">
                        {formatCurrency(asset.purchasePrice, currency)}
                    </TableCell>
                     <TableCell className="text-right font-bold">
                        {formatCurrency(asset.cost, currency)}
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
