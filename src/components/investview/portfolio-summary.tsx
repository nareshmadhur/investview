
'use client';

import { useMemo } from 'react';
import type { Portfolio } from '@/types';
import { TrendingUp, Wallet, ArrowRightLeft, Coins, BarChart, FileClock } from 'lucide-react';
import KpiCard from './kpi-card';
import type { InfoPaneView } from './info-pane';

export default function PortfolioSummary({ portfolio, setInfoPaneView }: { portfolio: Portfolio, setInfoPaneView: (view: InfoPaneView) => void }) {

    const { 
        totalCurrentValue, 
        unrealizedPL,
        totalTransactions 
    } = useMemo(() => {
        let totalCurrentValue = 0;
        portfolio.assets.forEach(asset => {
            totalCurrentValue += asset.quantity * asset.currentPrice;
        });
        const unrealizedPL = totalCurrentValue - portfolio.totalCost;
        const totalTransactions = portfolio.transactions.length;

        return { totalCurrentValue, unrealizedPL, totalTransactions };
    }, [portfolio]);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <KpiCard
                title="Current Value"
                value={totalCurrentValue}
                format="currency"
                icon={Wallet}
                currency={portfolio.currency}
                tooltipText="The total current market value of your holdings. Click to see a detailed breakdown."
                onClick={() => setInfoPaneView({ type: 'holdings'})}
            />
            <KpiCard
                title="Unrealized P/L"
                value={unrealizedPL}
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
                value={totalTransactions} 
                icon={ArrowRightLeft} 
                tooltipText="The total number of buy/sell transactions. Click to see the full log."
                onClick={() => setInfoPaneView({ type: 'transactions'})}
            />
             <KpiCard 
                title="Investment Activity" 
                value={portfolio.transactions.length}
                format="number"
                icon={FileClock} 
                tooltipText="A chart showing buy/sell volume over the years. Click to view."
                onClick={() => setInfoPaneView({ type: 'yearly_activity'})}
            />
        </div>
    );
}
