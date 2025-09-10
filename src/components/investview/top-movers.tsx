
'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Asset, Portfolio, Transaction } from '@/types';
import { TrendingUp, TrendingDown, Repeat, BarChart, Gem } from 'lucide-react';
import { formatCurrency } from './kpi-card';
import { cn } from '@/lib/utils';

const StatCard = ({ icon: Icon, title, value, subValue, className = '' }: { icon: React.ElementType, title: string, value: string, subValue?: string, className?: string}) => (
    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
        <div className="p-2 bg-muted rounded-full">
            <Icon className={cn("w-6 h-6 text-muted-foreground", className)} />
        </div>
        <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="font-bold text-lg">{value}</p>
            {subValue && <p className="text-sm text-green-600">{subValue}</p>}
        </div>
    </div>
);

export default function TopMovers({ assets, transactions, currency }: { assets: Asset[], transactions: Transaction[], currency: 'USD' | 'INR' }) {
    const stats = useMemo(() => {
        if (assets.length === 0) return null;

        const transactionCounts: Record<string, number> = {};
        transactions.forEach(tx => {
            transactionCounts[tx.asset] = (transactionCounts[tx.asset] || 0) + 1;
        });
        const mostTradedAssetTicker = Object.keys(transactionCounts).reduce((a, b) => transactionCounts[a] > transactionCounts[b] ? a : b);
        const mostTradedAsset = assets.find(a => a.asset === mostTradedAssetTicker);

        const largestHolding = assets.reduce((max, asset) => (asset.quantity * asset.currentPrice) > (max.quantity * max.currentPrice) ? asset : max);

        const assetsWithPL = assets.map(asset => ({
            ...asset,
            unrealizedPL: (asset.quantity * asset.currentPrice) - (asset.quantity * asset.purchasePrice)
        }));

        const topGainer = assetsWithPL.reduce((max, asset) => asset.unrealizedPL > max.unrealizedPL ? asset : max);
        const topLoser = assetsWithPL.reduce((min, asset) => asset.unrealizedPL < min.unrealizedPL ? asset : min);

        return {
            mostTraded: {
                name: mostTradedAsset?.displayName || 'N/A',
                count: transactionCounts[mostTradedAssetTicker]
            },
            largestHolding: {
                name: largestHolding.displayName,
                value: largestHolding.quantity * largestHolding.currentPrice
            },
            topGainer: {
                name: topGainer.displayName,
                pl: topGainer.unrealizedPL
            },
            topLoser: {
                name: topLoser.displayName,
                pl: topLoser.unrealizedPL
            }
        }
    }, [assets, transactions]);

    if (!stats) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Top Movers & Key Holdings</CardTitle>
                <CardDescription>At-a-glance analytics of your portfolio's key assets.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard 
                        icon={Repeat}
                        title="Most Traded Asset"
                        value={stats.mostTraded.name}
                        subValue={`${stats.mostTraded.count} transactions`}
                    />
                     <StatCard 
                        icon={Gem}
                        title="Largest Holding by Value"
                        value={stats.largestHolding.name}
                        subValue={formatCurrency(stats.largestHolding.value, currency)}
                    />
                    <StatCard 
                        icon={TrendingUp}
                        title="Top Gainer (Unrealized)"
                        value={stats.topGainer.name}
                        subValue={`+${formatCurrency(stats.topGainer.pl, currency)}`}
                        className="text-green-500"
                    />
                    <StatCard 
                        icon={TrendingDown}
                        title="Top Loser (Unrealized)"
                        value={stats.topLoser.name}
                        subValue={formatCurrency(stats.topLoser.pl, currency)}
                        className="text-red-500"
                    />
                </div>
            </CardContent>
        </Card>
    )
}
