
'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Portfolio } from '@/types';
import { TrendingUp, TrendingDown, Repeat, Gem } from 'lucide-react';
import { formatCurrency } from './kpi-card';
import { cn } from '@/lib/utils';
import type { InfoPaneView } from './info-pane';

const StatCard = ({ icon: Icon, title, value, subValue, className = '', onClick }: { icon: React.ElementType, title: string, value: string, subValue?: string, className?: string, onClick?: () => void }) => (
    <div className={cn("flex items-start gap-4 p-4 rounded-lg bg-muted/50", onClick && "cursor-pointer hover:bg-muted/80 transition-colors")} onClick={onClick}>
        <div className="p-2 bg-muted rounded-full">
            <Icon className={cn("w-6 h-6 text-muted-foreground", className)} />
        </div>
        <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="font-bold text-lg">{value}</p>
            {subValue && <p className={cn("text-sm", className.includes('text-red') ? 'text-red-600' : 'text-green-600')}>{subValue}</p>}
        </div>
    </div>
);

export default function TopMovers({ portfolio, setInfoPaneView }: { portfolio: Portfolio, setInfoPaneView: (view: InfoPaneView) => void }) {
    const stats = useMemo(() => {
        if (portfolio.assets.length === 0 && portfolio.transactions.length === 0) return null;

        const transactionCounts: Record<string, number> = {};
        portfolio.transactions.forEach(tx => {
            transactionCounts[tx.asset] = (transactionCounts[tx.asset] || 0) + 1;
        });

        const mostTradedAssetTicker = Object.keys(transactionCounts).length > 0 
            ? Object.keys(transactionCounts).reduce((a, b) => transactionCounts[a] > transactionCounts[b] ? a : b)
            : null;

        const findDisplayName = (ticker: string | null) => {
            if (!ticker) return 'N/A';
            const asset = portfolio.assets.find(a => a.asset === ticker);
            if(asset) return asset.displayName;
            // Fallback for sold assets
            const transaction = portfolio.transactions.find(t => t.asset === ticker);
            if(transaction) return transaction.asset.split('.')[0];
            return ticker;
        }

        const mostTradedName = findDisplayName(mostTradedAssetTicker);
        const mostTradedCount = mostTradedAssetTicker ? transactionCounts[mostTradedAssetTicker] : 0;

        if (portfolio.assets.length === 0) {
             return {
                mostTraded: { name: mostTradedName, count: mostTradedCount },
                largestHolding: null, topGainer: null, topLoser: null
            };
        }

        const largestHolding = portfolio.assets.reduce((max, asset) => (asset.quantity * asset.currentPrice) > (max.quantity * max.currentPrice) ? asset : max);

        const assetsWithPL = portfolio.assets.map(asset => ({
            ...asset,
            unrealizedPL: (asset.quantity * asset.currentPrice) - (asset.quantity * asset.purchasePrice)
        }));

        const topGainer = [...assetsWithPL].sort((a, b) => b.unrealizedPL - a.unrealizedPL)[0];
        const topLoser = [...assetsWithPL].sort((a, b) => a.unrealizedPL - b.unrealizedPL)[0];

        return {
            mostTraded: {
                name: mostTradedName,
                count: mostTradedCount
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
    }, [portfolio]);

    if (!stats) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Top Movers & Key Holdings</CardTitle>
                <CardDescription>At-a-glance analytics of your portfolio's key assets. Click any card for details.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 gap-4">
                    <StatCard 
                        icon={Repeat}
                        title="Most Traded Asset"
                        value={stats.mostTraded.name}
                        subValue={stats.mostTraded.count > 0 ? `${stats.mostTraded.count} transactions` : undefined}
                        onClick={() => setInfoPaneView({ type: 'most_traded' })}
                    />
                    {stats.largestHolding && (
                     <StatCard 
                        icon={Gem}
                        title="Largest Holding by Value"
                        value={stats.largestHolding.name}
                        subValue={formatCurrency(stats.largestHolding.value, portfolio.currency)}
                        onClick={() => setInfoPaneView({ type: 'largest_holding' })}
                    />
                    )}
                    {stats.topGainer && stats.topGainer.pl > 0 && (
                    <StatCard 
                        icon={TrendingUp}
                        title="Top Gainer (Unrealized)"
                        value={stats.topGainer.name}
                        subValue={`+${formatCurrency(stats.topGainer.pl, portfolio.currency)}`}
                        className="text-green-500"
                        onClick={() => setInfoPaneView({ type: 'top_gainer' })}
                    />
                    )}
                     {stats.topLoser && stats.topLoser.pl < 0 && (
                    <StatCard 
                        icon={TrendingDown}
                        title="Top Loser (Unrealized)"
                        value={stats.topLoser.name}
                        subValue={formatCurrency(stats.topLoser.pl, portfolio.currency)}
                        className="text-red-500"
                         onClick={() => setInfoPaneView({ type: 'top_loser' })}
                    />
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

    