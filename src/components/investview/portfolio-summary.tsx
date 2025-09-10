
'use client';

import { useMemo } from 'react';
import type { Portfolio } from '@/types';
import { TrendingUp, Wallet, ArrowRightLeft, Coins, Gem, Repeat, TrendingDown } from 'lucide-react';
import KpiCard, { formatCurrency } from './kpi-card';
import type { InfoPaneView } from './info-pane';

export default function PortfolioSummary({ portfolio, setInfoPaneView }: { portfolio: Portfolio, setInfoPaneView: (view: InfoPaneView) => void }) {

    const stats = useMemo(() => {
        let totalCurrentValue = 0;
        portfolio.assets.forEach(asset => {
            totalCurrentValue += asset.quantity * asset.currentPrice;
        });
        const unrealizedPL = totalCurrentValue - portfolio.totalCost;
        const totalTransactions = portfolio.transactions.length;

        // Top Movers Logic
        if (portfolio.assets.length === 0 && portfolio.transactions.length === 0) {
             return { totalCurrentValue, unrealizedPL, totalTransactions, mostTraded: null, largestHolding: null, topGainer: null, topLoser: null };
        }

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
            const transaction = portfolio.transactions.find(t => t.asset === ticker);
            if(transaction) return transaction.asset.split('.')[0];
            return ticker;
        }
        
        const mostTradedName = findDisplayName(mostTradedAssetTicker);
        const mostTradedCount = mostTradedAssetTicker ? transactionCounts[mostTradedAssetTicker] : 0;
        
        const mostTraded = { name: mostTradedName, count: mostTradedCount };

        if (portfolio.assets.length === 0) {
             return { totalCurrentValue, unrealizedPL, totalTransactions, mostTraded, largestHolding: null, topGainer: null, topLoser: null };
        }
        
        const largestHolding = portfolio.assets.reduce((max, asset) => (asset.quantity * asset.currentPrice) > (max.quantity * max.currentPrice) ? asset : max);

        const assetsWithPL = portfolio.assets.map(asset => ({
            ...asset,
            unrealizedPL: (asset.quantity * asset.currentPrice) - (asset.quantity * asset.purchasePrice)
        }));

        const topGainer = [...assetsWithPL].sort((a, b) => b.unrealizedPL - a.unrealizedPL)[0];
        const topLoser = [...assetsWithPL].sort((a, b) => a.unrealizedPL - b.unrealizedPL)[0];

        return { 
            totalCurrentValue, 
            unrealizedPL, 
            totalTransactions,
            mostTraded,
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
        };
    }, [portfolio]);

    return (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <KpiCard
                title="Current Value"
                value={stats.totalCurrentValue}
                format="currency"
                icon={Wallet}
                currency={portfolio.currency}
                tooltipText="The total current market value of your holdings. Click to see a detailed breakdown."
                onClick={() => setInfoPaneView({ type: 'holdings'})}
            />
            <KpiCard
                title="Unrealized P/L"
                value={stats.unrealizedPL}
                format="currency"
                icon={TrendingUp}
                currency={portfolio.currency}
                tooltipText="The potential profit or loss if all holdings were sold today. Click to see a detailed breakdown."
                onClick={() => setInfoPaneView({ type: 'holdings'})}
            />
            <KpiCard
                title="Realized P/L"
                value={portfolio.realizedProfit || 0}
                format="currency"
                icon={Coins}
                currency={portfolio.currency}
                tooltipText="The total profit or loss from all completed sales. Click to see a log of all sell transactions."
                onClick={() => setInfoPaneView({ type: 'realized'})}
            />
             <KpiCard 
                title="Total Transactions" 
                value={stats.totalTransactions} 
                icon={ArrowRightLeft} 
                tooltipText="The total number of buy/sell transactions. Click to see the full log."
                onClick={() => setInfoPaneView({ type: 'transactions'})}
            />
            {stats.largestHolding && (
                <KpiCard 
                    title="Largest Holding"
                    value_string={stats.largestHolding.name}
                    subValue={formatCurrency(stats.largestHolding.value, portfolio.currency)}
                    icon={Gem}
                    onClick={() => setInfoPaneView({ type: 'largest_holding' })}
                />
            )}
             {stats.topGainer && stats.topGainer.pl > 0 && (
                <KpiCard 
                    title="Top Gainer"
                    value_string={stats.topGainer.name}
                    subValue={`+${formatCurrency(stats.topGainer.pl, portfolio.currency)}`}
                    subValueClassName="text-green-600"
                    icon={TrendingUp}
                    onClick={() => setInfoPaneView({ type: 'top_gainer' })}
                />
            )}
             {stats.topLoser && stats.topLoser.pl < 0 && (
                <KpiCard 
                    title="Top Loser"
                    value_string={stats.topLoser.name}
                    subValue={formatCurrency(stats.topLoser.pl, portfolio.currency)}
                    subValueClassName="text-red-600"
                    icon={TrendingDown}
                    onClick={() => setInfoPaneView({ type: 'top_loser' })}
                />
            )}
            {stats.mostTraded && stats.mostTraded.count > 0 && (
                 <KpiCard 
                    title="Most Traded"
                    value_string={stats.mostTraded.name}
                    subValue={`${stats.mostTraded.count} transactions`}
                    icon={Repeat}
                    onClick={() => setInfoPaneView({ type: 'most_traded' })}
                />
            )}
        </div>
    );
}
