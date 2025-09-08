
'use client';

import { useState, useMemo } from "react";
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
import { ArrowUpDown } from "lucide-react";
import { Button } from "../ui/button";


type SortKey = 'displayName' | 'currentValue' | 'unrealizedPL';

const formatCurrency = (value: number, currency: 'USD' | 'INR') => {
  const fractionDigits = currency === 'INR' ? 0 : 2;
  return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
};

const formatShares = (quantity: number) => {
    if (quantity % 1 === 0) {
        return quantity.toString();
    }
    return quantity.toFixed(4);
};


export default function PerformanceTable({ assets, currency }: { assets: Asset[], currency: 'USD' | 'INR' }) {
  const [sortKey, setSortKey] = useState<SortKey>('currentValue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const assetsWithValues = useMemo(() => {
    return assets.map(asset => {
        const cost = asset.quantity * asset.purchasePrice;
        const currentValue = asset.quantity * asset.currentPrice;
        const unrealizedPL = currentValue - cost;
        const unrealizedPLPercent = cost > 0 ? (unrealizedPL / cost) * 100 : 0;
        return { ...asset, cost, currentValue, unrealizedPL, unrealizedPLPercent };
    });
  }, [assets]);

  const sortedAssets = useMemo(() => {
    return [...assetsWithValues].sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];
        
        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
            comparison = aValue - bValue;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [assetsWithValues, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const SortableHeader = ({ tkey, label }: { tkey: SortKey, label: string}) => (
    <Button variant="ghost" onClick={() => handleSort(tkey)} className="px-0 hover:bg-transparent">
        {label}
        <ArrowUpDown className={cn("ml-2 h-4 w-4", sortKey !== tkey && "text-muted-foreground/50")} />
    </Button>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Holdings</CardTitle>
        <CardDescription>A detailed breakdown of your individual assets by current market value.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
            <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                    <TableHead>
                        <SortableHeader tkey="displayName" label="Asset" />
                    </TableHead>
                    <TableHead className="text-right">Avg. Cost / Current</TableHead>
                    <TableHead className="text-right">
                        <SortableHeader tkey="currentValue" label="Current Value" />
                    </TableHead>
                    <TableHead className="text-right">
                        <SortableHeader tkey="unrealizedPL" label="Unrealized P/L" />
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sortedAssets.map((asset, index) => (
                <TableRow key={`${asset.asset}-${index}`}>
                    <TableCell>
                        <div className="font-medium">{asset.displayName}</div>
                        <div className="text-xs text-muted-foreground">{formatShares(asset.quantity)} shares</div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                        <div>{formatCurrency(asset.purchasePrice, currency)}</div>
                        <div className="text-muted-foreground">{formatCurrency(asset.currentPrice, currency)}</div>
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
