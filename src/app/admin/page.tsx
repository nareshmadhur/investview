
'use client';

import { useState } from 'react';
import type { Asset, Transaction } from '@/types';
import { parseCSV, type CsvTemplate, type ParseResult } from '@/lib/csv-parser';
import { getEodhdSingleStockPrice, type EodhdRecord } from './actions';


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Settings, BookOpen, TableIcon, Database, Download, Search } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

function AssetLogsView({ asset, transactions, currency }: { asset: Asset, transactions: Transaction[], currency: 'USD' | 'INR' }) {
    if (!transactions || transactions.length === 0) {
        return <p className="text-sm text-muted-foreground">No transaction data available for this asset.</p>;
    }
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(value);
    }

    const buys = transactions.filter(t => t.type === 'BUY');
    const sells = transactions.filter(t => t.type === 'SELL');

    const totalBuyQuantity = buys.reduce((acc, t) => acc + t.quantity, 0);
    const totalBuyValue = buys.reduce((acc, t) => acc + t.quantity * t.price, 0);
    const totalSellQuantity = sells.reduce((acc, t) => acc + t.quantity, 0);
    const totalSellValue = sells.reduce((acc, t) => acc + t.quantity * t.price, 0);
    
    const avgBuyPrice = totalBuyQuantity > 0 ? totalBuyValue / totalBuyQuantity : 0;
    const realizedProfit = totalSellValue - (avgBuyPrice * totalSellQuantity);
    
    return (
        <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
            <div className="grid gap-6">
                <div>
                    <h4 className="font-semibold text-lg mb-2">Transactions</h4>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead className="text-right">Price/Share</TableHead>
                                    <TableHead className="text-right">Total Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((tx, index) => (
                                    <TableRow key={index} className={tx.type === 'SELL' ? 'bg-red-500/10' : 'bg-green-500/10'}>
                                        <TableCell className="font-mono text-xs">{tx.date.toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium">{tx.type}</TableCell>
                                        <TableCell className="text-right font-mono">{tx.quantity.toFixed(4)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(tx.price)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(tx.price * tx.quantity)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <div>
                    <h4 className="font-semibold text-lg mb-2">Aggregation Summary</h4>
                     <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                 <TableRow>
                                    <TableHead>Metric</TableHead>
                                    <TableHead className="text-right">Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-medium">Total Buy Quantity</TableCell>
                                    <TableCell className="text-right font-mono">{totalBuyQuantity.toFixed(4)}</TableCell>
                                </TableRow>
                                 <TableRow>
                                    <TableCell className="font-medium">Total Buy Value</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(totalBuyValue)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Average Buy Price</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(avgBuyPrice)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Total Sell Quantity</TableCell>
                                    <TableCell className="text-right font-mono">{totalSellQuantity.toFixed(4)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Total Sell Value</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(totalSellValue)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Net Quantity (Holdings)</TableCell>
                                    <TableCell className="text-right font-mono">{asset.quantity.toFixed(4)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Net Cost of Holdings</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(asset.purchasePrice * asset.quantity)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium text-primary">Realized Profit for this Asset</TableCell>
                                    <TableCell className="text-right font-mono text-primary font-bold">{formatCurrency(realizedProfit)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </ScrollArea>
    );
};

function StockPriceFetcher() {
    const [symbol, setSymbol] = useState('RELIANCE.NSE');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ data?: EodhdRecord, error?: string } | null>(null);
    const { toast } = useToast();

    const handleFetchPrice = async () => {
        if (!symbol) {
            toast({ variant: 'destructive', title: 'Symbol Required', description: 'Please enter a stock symbol.' });
            return;
        }
        setIsLoading(true);
        setResult(null);
        try {
            const res = await getEodhdSingleStockPrice(symbol);
            setResult(res);

            if (res.error) {
                toast({ variant: 'destructive', title: 'API Error', description: res.error, duration: 5000 });
            }
             if (res.data) {
                toast({ variant: 'default', title: 'Price Loaded', description: `Successfully fetched price for ${symbol}.` });
            }
        } catch (e) {
            const error = e instanceof Error ? e.message : 'An unknown error occurred.';
            setResult({ error });
            toast({ variant: 'destructive', title: 'Request Failed', description: error });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Database className="w-6 h-6" />
                    EODHD Single Stock Price
                </CardTitle>
                <CardDescription>
                    Test the EODHD API by fetching the last traded price for a single stock. Use the format SYMBOL.EXCHANGE (e.g., RELIANCE.NSE or AAPL.US).
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex w-full max-w-sm items-center space-x-2">
                    <Input
                        type="text"
                        placeholder="e.g., RELIANCE.NSE"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleFetchPrice()}
                    />
                    <Button onClick={handleFetchPrice} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                        Fetch Price
                    </Button>
                </div>
                
                {result && result.data && (
                    <div className="mt-6">
                        <h4 className="font-semibold mb-2">Result for {result.data.code}</h4>
                        <div className="rounded-md border p-4 space-y-2 text-sm">
                            <p><strong>Close:</strong> {result.data.close}</p>
                            <p><strong>Change:</strong> {result.data.change.toFixed(2)} ({result.data.change_p.toFixed(2)}%)</p>
                            <p><strong>Previous Close:</strong> {result.data.previousClose}</p>
                            <p><strong>Volume:</strong> {result.data.volume.toLocaleString()}</p>
                        </div>
                    </div>
                )}
                
                {result && result.error && (
                    <div className="mt-4 text-destructive p-4 bg-destructive/10 rounded-md border border-destructive/20">
                        <p className="font-semibold">An error occurred:</p>
                        <p className="text-sm">{result.error}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function AdminPage() {
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvTemplate, setCsvTemplate] = useState<CsvTemplate>('groww');
  const [growwSchema, setGrowwSchema] = useState({
      asset: 'Stock name', type: 'Type', quantity: 'Quantity', price: 'Price',
      date: 'Execution date and time', status: 'Order status',
  });
  const [parsingLogs, setParsingLogs] = useState<ParseResult['logs'] | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'INR'>('INR');
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsParsing(true);
      setFileName(file.name);
      setAssets(null);
      setParsingLogs(null);
      const selectedCurrency = csvTemplate === 'groww' ? 'INR' : 'USD';
      setCurrency(selectedCurrency);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const result: ParseResult = parseCSV(text, csvTemplate, csvTemplate === 'groww' ? growwSchema : undefined);
          
          setParsingLogs(result.logs || null);

          if (result.error) {
            throw new Error(result.error);
          }
          
          if (result.assets.length === 0 && result.transactions.length > 0) {
            toast({
              variant: "default",
              title: "Parsing successful, but no net holdings",
              description: "No net assets were found after processing all transactions. This might be expected if all holdings were sold.",
            });
             setAssets([]);
          } else if (result.assets.length === 0 && result.transactions.length === 0) {
            toast({
              variant: "default",
              title: "Parsing successful, but no transaction data found",
              description: "The file was parsed, but no valid transaction rows were found.",
            });
            setAssets([]);
          } else {
            setAssets(result.assets);
          }
        } catch (error) {
          console.error(error);
          toast({
            variant: "destructive",
            title: "Error parsing file",
            description: error instanceof Error ? error.message : "An unknown error occurred.",
          });
          setAssets(null);
        } finally {
          setIsParsing(false);
        }
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  const handleSchemaChange = (field: keyof typeof growwSchema, value: string) => {
    setGrowwSchema(prev => ({ ...prev, [field]: value }));
  };
  
  const hasAssets = assets !== null;

  return (
    <div className="flex flex-col min-h-screen bg-background font-body">
      <header className="p-4 border-b shadow-sm bg-destructive text-destructive-foreground">
        <h1 className="text-2xl font-bold font-headline">Admin Panel</h1>
      </header>

      <main className="flex-grow p-4 md:p-8">
        <div className="max-w-7xl mx-auto grid gap-8">
          
          <StockPriceFetcher />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-6 h-6" />
                Aggregated Data Viewer
              </CardTitle>
              <CardDescription>
                Upload a CSV to see the aggregated, parsed data. Click on an asset in the table below to see its detailed transaction history.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center gap-4">
              <Select value={csvTemplate} onValueChange={(value) => setCsvTemplate(value as CsvTemplate)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="groww">Groww</SelectItem>
                </SelectContent>
              </Select>

              <label htmlFor="csv-upload" className="flex-grow w-full">
                <Button asChild variant="outline" className="w-full justify-start text-muted-foreground cursor-pointer">
                  <div>
                    {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    {fileName || "Click to select a .csv file"}
                  </div>
                </Button>
              </label>
              <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} className="sr-only" disabled={isParsing} />
            </CardContent>
          </Card>

          {csvTemplate === 'groww' && (
             <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                    <AccordionTrigger>
                        <div className="flex items-center gap-2">
                            <Settings className="w-6 h-6" />
                            <span className="text-lg">Groww Schema Configuration</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <Card className="border-0">
                             <CardHeader className="pt-2">
                                <CardDescription>
                                Define the column names from your Groww CSV file. The parser will look for these exact names in the header row.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {(Object.keys(growwSchema) as Array<keyof typeof growwSchema>).map(key => (
                                <div key={key} className="grid gap-1.5">
                                    <Label htmlFor={`schema-${key}`} className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
                                    <Input id={`schema-${key}`} value={growwSchema[key]} onChange={(e) => handleSchemaChange(key, e.target.value)} />
                                </div>
                                ))}
                            </CardContent>
                        </Card>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
          )}

          {isParsing && (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Parsing data...</p>
            </div>
          )}

          {hasAssets && assets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Parsed Asset Data</CardTitle>
                <CardDescription>
                  This is the final aggregated data. Click a row to see the detailed transaction summary for that specific asset.
                </CardDescription>
              </CardHeader>
              <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead>Net Quantity</TableHead>
                        <TableHead>Avg. Purchase Price</TableHead>
                        <TableHead>Asset Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assets.map((asset, index) => (
                        <TableRow key={`${asset.asset}-${index}`}>
                          <TableCell className="font-medium">{asset.asset}</TableCell>                          <TableCell>{asset.quantity.toFixed(4)}</TableCell>
                          <TableCell>{asset.purchasePrice.toFixed(2)}</TableCell>
                          <TableCell>{asset.assetType}</TableCell>
                          <TableCell className="text-right">
                             <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm"><TableIcon className="mr-2 h-4 w-4" /> View Transactions</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-6xl">
                                  <DialogHeader>
                                    <DialogTitle>Transaction Summary for: {asset.asset}</DialogTitle>
                                  </DialogHeader>
                                  <div className="py-4">
                                    <AssetLogsView 
                                      asset={asset}
                                      transactions={parsingLogs?.assetLogs?.[asset.asset]?.transactions || []} 
                                      currency={currency}
                                    />
                                  </div>
                                </DialogContent>
                              </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
              </CardContent>
            </Card>
          )}

          {hasAssets && assets.length === 0 && (
             <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
                <h3 className="text-lg font-semibold">No Holdings Found</h3>
                <p>All assets may have been sold, or the file contained no valid transactions. Check the global logs above for details.</p>
             </div>
          )}

          {!hasAssets && !isParsing &&
            <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
              <h3 className="text-lg font-semibold">Admin Panel</h3>
              <p>Upload a file to see the aggregated parsed data.</p>
            </div>
          }
        </div>
      </main>
    </div>
  );
}
