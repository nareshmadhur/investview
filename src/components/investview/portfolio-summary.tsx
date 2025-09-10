
'use client';

import { useMemo, useState } from 'react';
import type { Portfolio } from '@/types';
import { BarChart, TrendingUp, CircleDollarSign, Wallet, ArrowRightLeft, BookOpen, Coins } from 'lucide-react';
import KpiCard from './kpi-card';
import BreakdownDialog, { type BreakdownType } from './breakdown-dialog';

export default function PortfolioSummary({ portfolio }: { portfolio: Portfolio }) {
    const [breakdown, setBreakdown] = useState<BreakdownType | null>(null);

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

    const handleCardClick = (type: BreakdownType) => {
        setBreakdown(type);
    };

    return (
        <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                    title="Current Value"
                    value={totalCurrentValue}
                    format="currency"
                    icon={Wallet}
                    currency={portfolio.currency}
                    tooltipText="The total current market value of your holdings, based on live prices."
                    onClick={() => handleCardClick('holdings')}
                />
                <KpiCard
                    title="Unrealized P/L"
                    value={unrealizedPL}
                    format="currency"
                    icon={TrendingUp}
                    currency={portfolio.currency}
                    tooltipText="The potential profit or loss on your current holdings if they were sold today."
                    onClick={() => handleCardClick('holdings')}
                />
                <KpiCard
                    title="Realized P/L"
                    value={portfolio.realizedProfit || 0}
                    format="currency"
                    icon={Coins}
                    currency={portfolio.currency}
                    tooltipText="The total profit or loss from all completed sales."
                    onClick={() => handleCardClick('realized')}
                />
                 <KpiCard 
                    title="Total Transactions" 
                    value={totalTransactions} 
                    icon={ArrowRightLeft} 
                    tooltipText="The total number of buy/sell transactions found in your file."
                    onClick={() => handleCardClick('transactions')}
                />
            </div>
            {breakdown && (
                <BreakdownDialog
                    isOpen={!!breakdown}
                    onClose={() => setBreakdown(null)}
                    type={breakdown}
                    portfolio={portfolio}
                />
            )}
        </>
    );
}
