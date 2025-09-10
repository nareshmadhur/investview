
'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Portfolio, Transaction } from '@/types';
import { formatCurrency } from './kpi-card';
import { cn } from "@/lib/utils";

export type BreakdownType = 'holdings' | 'realized' | 'transactions';

const breakdownConfig = {
    holdings: {
        title: "Holdings Breakdown",
        description: "A detailed view of your current assets, their cost basis, and current market value."
    },
    realized: {
        title: "Realized Profit/Loss",
        description: "A log of all 'SELL' transactions that contribute to your realized P/L."
    },
    transactions: {
        title: "Complete Transaction Log",
        description: "A complete chronological log of all buy and sell transactions from your file."
    }
}

const HoldingsView = ({ portfolio }: { portfolio: Portfolio }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead className="text-right">Invested</TableHead>
                <TableHead className="text-right">Current Value</TableHead>
                <TableHead className="text-right">Unrealized P/L</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {portfolio.assets.map(asset => {
                const invested = asset.quantity * asset.purchasePrice;
                const currentValue = asset.quantity * asset.currentPrice;
                const pl = currentValue - invested;
                return (
                    <TableRow key={asset.asset}>
                        <TableCell className="font-medium">{asset.displayName}</TableCell>
                        <TableCell className="text-right">{formatCurrency(invested, portfolio.currency)}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(currentValue, portfolio.currency)}</TableCell>
                        <TableCell className={cn("text-right", pl >= 0 ? "text-green-600" : "text-red-600")}>
                            {formatCurrency(pl, portfolio.currency)}
                        </TableCell>
                    </TableRow>
                )
            })}
        </TableBody>
    </Table>
);

const RealizedView = ({ portfolio }: { portfolio: Portfolio }) => {
    const sellTransactions = portfolio.transactions.filter(t => t.type === 'SELL');
    return (
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
                {sellTransactions.map((tx, i) => (
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
    );
};

const TransactionsView = ({ portfolio }: { portfolio: Portfolio }) => (
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
            {portfolio.transactions.map((tx, i) => (
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
);

export default function BreakdownDialog({ isOpen, onClose, type, portfolio }: { isOpen: boolean, onClose: () => void, type: BreakdownType, portfolio: Portfolio }) {
    
    const renderContent = () => {
        switch (type) {
            case 'holdings': return <HoldingsView portfolio={portfolio} />;
            case 'realized': return <RealizedView portfolio={portfolio} />;
            case 'transactions': return <TransactionsView portfolio={portfolio} />;
            default: return null;
        }
    }
    
    const config = breakdownConfig[type];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{config.title}</DialogTitle>
                    <DialogDescription>{config.description}</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-6">
                    {renderContent()}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
