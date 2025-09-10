
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
import type { Asset, Portfolio, Transaction } from '@/types';
import { cn } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import { ArrowUpDown, BarChart, Gem, Repeat, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "../ui/button";
import { formatCurrency } from './kpi-card';
import YearlyActivityChart from "./yearly-activity-chart";

export type InfoPaneView = 
  | { type: 'holdings' }
  | { type: 'transactions' }
  | { type: 'realized' }
  | { type: 'yearly_activity' }
  | { type: 'top_gainer' }
  | { type: 'top_loser' }
  | { type: 'largest_holding' }
  | { type: 'most_traded' }

const viewConfig = {
    holdings: { title: "Portfolio Holdings", description: "A detailed breakdown of your individual assets by current market value." },
    transactions: { title: "Complete Transaction Log", description: "A complete chronological log of all buy and sell transactions from your file." },
    realized: { title: "Realized P/L Breakdown", description: "A log of all 'SELL' transactions that contribute to your realized profit and loss." },
    yearly_activity: { title: "Yearly Investment Activity", description: "Total buy and sell volume grouped by year." },
    top_gainer: { title: "Top Gainer (Unrealized)", description: "The asset with the highest absolute gain in unrealized profit." },
    top_loser: { title: "Top Loser (Unrealized)", description: "The asset with the highest absolute loss in unrealized profit." },
    largest_holding: { title: "Largest Holding by Value", description: "The asset that makes up the biggest portion of your portfolio." },
    most_traded: { title: "Most Traded Asset", description: "The asset with the highest number of buy and sell transactions." }
}


type SortKey = 'displayName' | 'currentValue' | 'unrealizedPL' | 'cost';

const formatShares = (quantity: number) => {
    if (quantity % 1 === 0) {
        return quantity.toString();
    }
    return quantity.toFixed(4);
};

const HoldingsView = ({ portfolio }: { portfolio: Portfolio }) => {
  const [sortKey, setSortKey] = useState<SortKey>('currentValue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const assetsWithValues = useMemo(() => {
    return portfolio.assets.map(asset => {
        const cost = asset.quantity * asset.purchasePrice;
        const currentValue = asset.quantity * asset.currentPrice;
        const unrealizedPL = currentValue - cost;
        const unrealizedPLPercent = cost > 0 ? (unrealizedPL / cost) * 100 : 0;
        return { ...asset, cost, currentValue, unrealizedPL, unrealizedPLPercent };
    });
  }, [portfolio.assets]);

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

  const SortableHeader = ({ tkey, label, className }: { tkey: SortKey, label: string, className?: string}) => (
    <Button variant="ghost" onClick={() => handleSort(tkey)} className={cn("px-0 hover:bg-transparent", className)}>
        {label}
        <ArrowUpDown className={cn("ml-2 h-4 w-4", sortKey !== tkey && "text-muted-foreground/50")} />
    </Button>
  );

  return (
    <ScrollArea className="h-[75vh]">
        <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                    <TableHead>
                        <SortableHeader tkey="displayName" label="Asset" />
                    </TableHead>
                    <TableHead className="text-right">Avg. Cost / Current</TableHead>
                    <TableHead>
                        <SortableHeader tkey="cost" label="Invested" className="justify-end w-full" />
                    </TableHead>
                    <TableHead>
                        <SortableHeader tkey="currentValue" label="Current Value" className="justify-end w-full"/>
                    </TableHead>
                    <TableHead>
                        <SortableHeader tkey="unrealizedPL" label="Unrealized P/L" className="justify-end w-full"/>
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
                        <div>{formatCurrency(asset.purchasePrice, portfolio.currency, 2)}</div>
                        <div className="text-muted-foreground">{formatCurrency(asset.currentPrice, portfolio.currency, 2)}</div>
                    </TableCell>
                     <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(asset.cost, portfolio.currency)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                        {formatCurrency(asset.currentValue, portfolio.currency)}
                    </TableCell>
                    <TableCell className={cn("text-right font-mono", asset.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600')}>
                        <div>{formatCurrency(asset.unrealizedPL, portfolio.currency)}</div>
                        <div className="text-xs">({asset.unrealizedPLPercent.toFixed(2)}%)</div>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
        </Table>
    </ScrollArea>
  );
}

const TransactionsView = ({ portfolio }: { portfolio: Portfolio }) => (
    <ScrollArea className="h-[75vh]">
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {portfolio.transactions.sort((a,b) => b.date.getTime() - a.date.getTime()).map((tx, i) => (
                <TableRow key={i} className={tx.type === 'SELL' ? 'bg-red-500/10' : 'bg-green-500/10'}>
                    <TableCell>{tx.date.toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{portfolio.assets.find(a => a.asset === tx.asset)?.displayName || tx.asset}</TableCell>
                    <TableCell>{tx.type}</TableCell>
                    <TableCell className="text-right">{tx.quantity.toFixed(4)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(tx.price, portfolio.currency, 2)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(tx.price * tx.quantity, portfolio.currency)}</TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
    </ScrollArea>
);

const RealizedView = ({ portfolio }: { portfolio: Portfolio }) => {
    const sellTransactions = portfolio.transactions.filter(t => t.type === 'SELL');
    return (
        <ScrollArea className="h-[75vh]">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Sell Price</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sellTransactions.sort((a,b) => b.date.getTime() - a.date.getTime()).map((tx, i) => (
                    <TableRow key={i}>
                        <TableCell>{tx.date.toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{portfolio.assets.find(a => a.asset === tx.asset)?.displayName || tx.asset}</TableCell>
                        <TableCell className="text-right">{tx.quantity.toFixed(4)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(tx.price, portfolio.currency, 2)}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(tx.price * tx.quantity, portfolio.currency)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
        </ScrollArea>
    );
};

const TopMoverDetailView = ({ portfolio, moverType}: { portfolio: Portfolio, moverType: 'top_gainer' | 'top_loser' | 'largest_holding' | 'most_traded' }) => {
     const mover = useMemo(() => {
        if (moverType === 'most_traded') {
            const transactionCounts: Record<string, number> = {};
            portfolio.transactions.forEach(tx => {
                transactionCounts[tx.asset] = (transactionCounts[tx.asset] || 0) + 1;
            });
            const assetTicker = Object.keys(transactionCounts).length > 0 
                ? Object.keys(transactionCounts).reduce((a, b) => transactionCounts[a] > transactionCounts[b] ? a : b)
                : null;
            return assetTicker;
        }

        if (portfolio.assets.length === 0) return null;

        if (moverType === 'largest_holding') {
            return portfolio.assets.reduce((max, asset) => (asset.quantity * asset.currentPrice) > (max.quantity * max.currentPrice) ? asset : max).asset;
        }

        const assetsWithPL = portfolio.assets.map(asset => ({
            ...asset,
            unrealizedPL: (asset.quantity * asset.currentPrice) - (asset.quantity * asset.purchasePrice)
        }));

        if (moverType === 'top_gainer') {
            return [...assetsWithPL].sort((a, b) => b.unrealizedPL - a.unrealizedPL)[0]?.asset;
        }
        if (moverType === 'top_loser') {
            return [...assetsWithPL].sort((a, b) => a.unrealizedPL - b.unrealizedPL)[0]?.asset;
        }
        return null;
    }, [portfolio, moverType]);

    const asset = portfolio.assets.find(a => a.asset === mover);
    const transactions = portfolio.transactions.filter(t => t.asset === mover);
    
    if (!mover) {
        return <p>No data available for this category.</p>
    }

    const displayName = asset?.displayName || mover.split('.')[0];
    const icon = {
        top_gainer: TrendingUp,
        top_loser: TrendingDown,
        largest_holding: Gem,
        most_traded: Repeat
    }[moverType];


    return (
        <ScrollArea className="h-[75vh]">
            <div className="flex items-center gap-4 mb-6">
                {icon && <div className="p-3 bg-muted rounded-full"><Card.Icon icon={icon} className="w-8 h-8 text-primary" /></div>}
                <div>
                    <h3 className="text-2xl font-bold">{displayName}</h3>
                    <p className="text-muted-foreground">{mover}</p>
                </div>
            </div>

            {asset && (
                 <div className="mb-6">
                    <h4 className="font-semibold text-lg mb-2">Holding Summary</h4>
                    <div className="rounded-md border">
                        <Table>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-medium">Net Quantity (Holdings)</TableCell>
                                    <TableCell className="text-right font-mono">{asset.quantity.toFixed(4)}</TableCell>
                                </TableRow>
                                 <TableRow>
                                    <TableCell className="font-medium">Average Purchase Price</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(asset.purchasePrice, portfolio.currency)}</TableCell>
                                </TableRow>
                                 <TableRow>
                                    <TableCell className="font-medium">Total Invested Cost</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(asset.purchasePrice * asset.quantity, portfolio.currency)}</TableCell>
                                </TableRow>
                                <TableRow>
                                     <TableCell className="font-medium">Current Market Price</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(asset.currentPrice, portfolio.currency)}</TableCell>
                                </TableRow>
                                <TableRow className="bg-muted/50">
                                    <TableCell className="font-medium">Current Market Value</TableCell>
                                    <TableCell className="text-right font-mono font-bold">{formatCurrency(asset.currentPrice * asset.quantity, portfolio.currency)}</TableCell>
                                </TableRow>
                                 <TableRow className="bg-muted/50">
                                    <TableCell className="font-medium">Unrealized P/L</TableCell>
                                    <TableCell className={cn("text-right font-mono font-bold", ((asset.currentPrice - asset.purchasePrice) * asset.quantity) >= 0 ? "text-green-600" : "text-red-600")}>
                                        {formatCurrency((asset.currentPrice - asset.purchasePrice) * asset.quantity, portfolio.currency)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
           
            <div>
                <h4 className="font-semibold text-lg mb-2">Transaction History ({transactions.length})</h4>
                <div className="rounded-md border max-h-96 overflow-y-auto">
                    <Table>
                         <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.sort((a,b) => b.date.getTime() - a.date.getTime()).map((tx, i) => (
                                <TableRow key={i} className={tx.type === 'SELL' ? 'bg-red-500/10' : 'bg-green-500/10'}>
                                    <TableCell>{tx.date.toLocaleDateString()}</TableCell>
                                    <TableCell>{tx.type}</TableCell>
                                    <TableCell className="text-right">{tx.quantity.toFixed(4)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(tx.price, portfolio.currency, 2)}</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(tx.price * tx.quantity, portfolio.currency)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </ScrollArea>
    )

}


export default function InfoPane({ portfolio, view }: { portfolio: Portfolio, view: InfoPaneView }) {
  
  const config = viewConfig[view.type];

  const renderContent = () => {
    switch (view.type) {
        case 'holdings': return <HoldingsView portfolio={portfolio} />;
        case 'transactions': return <TransactionsView portfolio={portfolio} />;
        case 'realized': return <RealizedView portfolio={portfolio} />;
        case 'yearly_activity': return <YearlyActivityChart transactions={portfolio.transactions} currency={portfolio.currency} />;
        case 'top_gainer':
        case 'top_loser':
        case 'largest_holding':
        case 'most_traded':
            return <TopMoverDetailView portfolio={portfolio} moverType={view.type} />
        default: return <HoldingsView portfolio={portfolio} />;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.title}</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}

    