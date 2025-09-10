
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Asset, Transaction } from '@/types';
import { parseCSV, type CsvTemplate, type ParseResult } from '@/lib/csv-parser';
import { getYahooFinancePrice } from './actions';


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Settings, TableIcon, Database, Search, Wallet, TrendingUp, AlertTriangle, CheckCircle, LayoutDashboard, Rocket } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

function AssetLogsView({
    asset,
    transactions,
    currency,
    isPriceLive
}: {
    asset: Asset,
    transactions: Transaction[],
    currency: 'USD' | 'INR',
    isPriceLive: boolean
}) {
    if (!transactions) {
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
    
    const currentValue = asset.quantity * asset.currentPrice;
    const unrealizedPL = currentValue - (asset.quantity * avgBuyPrice);

    return (
        <ScrollArea className="h-[70vh] w-full">
            <div className="grid gap-6 p-1">
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
                                    <TableCell className="font-medium text-primary">Realized P/L (From Sales)</TableCell>
                                    <TableCell className="text-right font-mono text-primary font-bold">{formatCurrency(realizedProfit)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell colSpan={2} className="h-4"></TableCell>
                                </TableRow>
                                <TableRow className="bg-muted/50">
                                    <TableCell className="font-medium">Net Quantity (Holdings)</TableCell>
                                    <TableCell className="text-right font-mono">{asset.quantity.toFixed(4)}</TableCell>
                                </TableRow>
                                <TableRow className="bg-muted/50">
                                    <TableCell className="font-medium">Net Cost of Holdings</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(avgBuyPrice * asset.quantity)}</TableCell>
                                </TableRow>
                                <TableRow className="bg-muted/50">
                                     <TableCell className="font-medium flex items-center gap-2">
                                        {isPriceLive ? <CheckCircle className="w-4 h-4 text-green-500"/> : <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                                        Current Market Price ({isPriceLive ? 'Live' : 'Fallback'})
                                    </TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(asset.currentPrice)}</TableCell>
                                </TableRow>
                                <TableRow className="bg-muted/50">
                                    <TableCell className="font-medium flex items-center gap-2"><Wallet className="w-4 h-4 text-primary"/>Current Market Value</TableCell>
                                    <TableCell className="text-right font-mono font-bold">{formatCurrency(currentValue)}</TableCell>
                                </TableRow>
                                 <TableRow className="bg-muted/50">
                                    <TableCell className="font-medium flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary"/>Unrealized P/L</TableCell>
                                    <TableCell className="text-right font-mono font-bold">{formatCurrency(unrealizedPL)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </ScrollArea>
    );
};

export default function AdminPage() {
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName]  = useState<string | null>(null);
  const [csvTemplate, setCsvTemplate] = useState<CsvTemplate>('groww');
  const [parsingLogs, setParsingLogs] = useState<ParseResult['logs'] | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'INR'>('INR');
  const [selectedAsset, setSelectedAsset] = useState<{asset: Asset, transactions: Transaction[], isPriceLive: boolean} | null>(null);
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);
  const [priceFetchSummary, setPriceFetchSummary] = useState<{success: string[], failed: {asset: string, error: string}[]} | null>(null);

  const { toast } = useToast();

   useEffect(() => {
    const savedData = localStorage.getItem('adminCsvData');
    if (savedData) {
      try {
        const { fileContent, fileName: savedFileName, template } = JSON.parse(savedData);
        if (fileContent && savedFileName && template) {
            setFileName(savedFileName);
            setCsvTemplate(template);
            processCsvText(fileContent, template, true);
        }
      } catch (e) {
        console.error("Failed to load admin data from local storage", e);
        localStorage.removeItem('adminCsvData');
      }
    }
  }, []);
  
  const handleBulkFetchPrices = async (assetsToFetch: Asset[]) => {
    if (!assetsToFetch || assetsToFetch.length === 0) return;
    setIsFetchingPrices(true);
    setPriceFetchSummary(null);
    toast({ title: 'Fetching Live Prices', description: `Fetching live data for ${assetsToFetch.length} assets...`});

    const results = await Promise.all(
        assetsToFetch.map(asset => getYahooFinancePrice(asset.asset).then(res => ({...res, asset: asset.asset})))
    );

    const success: string[] = [];
    const failed: {asset: string, error: string}[] = [];

    results.forEach(result => {
        if (result.price) {
            success.push(result.asset);
        } else {
            failed.push({ asset: result.asset, error: result.error || 'Unknown error' });
        }
    });

    setPriceFetchSummary({ success, failed });
    setIsFetchingPrices(false);
    toast({ title: 'Price Fetch Complete', description: `${success.length} succeeded, ${failed.length} failed.` });
  }

  const processCsvText = (text: string, template: CsvTemplate, isFromCache = false) => {
    try {
      const result: ParseResult = parseCSV(text, template);
      setParsingLogs(result.logs || null);
      if (result.error) throw new Error(result.error);
      
      const selectedCurrency = template === 'groww' ? 'INR' : 'USD';
      setCurrency(selectedCurrency);

      if (result.assets.length === 0) {
        toast({
          variant: "default",
          title: "Parsing complete, no net holdings found",
          description: "This might be expected if all holdings were sold or the file had no transaction data.",
        });
      }
      setAssets(result.assets);
      if (!isFromCache) {
        toast({ title: 'File Processed!', description: 'Your data is ready. Now fetching prices...' });
        handleBulkFetchPrices(result.assets);
      } else {
        toast({ title: 'Loaded from Cache!', description: 'Last used data has been restored.'});
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsParsing(true);
      setFileName(file.name);
      setAssets(null);
      setParsingLogs(null);
      setSelectedAsset(null);
      setPriceFetchSummary(null);
      toast({ title: 'Processing File', description: 'Parsing your CSV file...' });

      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        localStorage.setItem('adminCsvData', JSON.stringify({
            fileContent: text,
            fileName: file.name,
            template: csvTemplate,
        }));
        processCsvText(text, csvTemplate);
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };
  
  const handleViewTransactions = async (asset: Asset) => {
    setIsFetchingPrices(true);
    toast({ title: 'Fetching Live Price...', description: `Getting latest market data for ${asset.displayName}`});
    const result = await getYahooFinancePrice(asset.asset);
    
    let updatedAsset = { ...asset };
    let isPriceLive = false;

    if (result.price) {
        updatedAsset.currentPrice = result.price;
        isPriceLive = true;
        toast({ title: 'Price Updated!', description: `Successfully fetched price for ${asset.displayName}`});
    } else {
         toast({
            variant: 'destructive',
            title: `Price Fetch Failed for ${asset.displayName}`,
            description: (
              <div className="flex flex-col gap-2">
                <p>Could not fetch the latest market price. Using purchase price as a fallback.</p>
                <p className="font-mono text-xs">Query: {`https://query1.finance.yahoo.com/v8/finance/chart/${asset.asset}?interval=1d`}</p>
                <p className="font-mono text-xs">Error: {result.error}</p>
              </div>
            ),
            duration: 8000,
        });
    }

    setSelectedAsset({
      asset: updatedAsset,
      transactions: parsingLogs?.assetLogs?.[asset.asset]?.transactions || [],
      isPriceLive: isPriceLive
    });
    setIsFetchingPrices(false);
  }

  const hasAssets = assets !== null;

  return (
    <div className="flex flex-col min-h-screen bg-background font-body">
      <header className="p-4 border-b shadow-sm bg-card text-card-foreground flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-2xl font-bold font-headline">Admin Panel</h1>
        <Link href="/">
          <Button variant="outline">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </Link>
      </header>

      <main className="flex-grow p-4 md:p-8">
        <div className="mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Upload className="w-6 h-6" />
                    Aggregated Data Viewer
                </CardTitle>
                <CardDescription>
                    Upload a CSV to see the aggregated, parsed data. The last uploaded file is remembered and prices are fetched automatically.
                </CardDescription>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-1 md:grid-cols-2 items-center gap-4">
                <Select value={csvTemplate} onValueChange={(value) => setCsvTemplate(value as CsvTemplate)}>
                    <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="groww">Groww</SelectItem>
                    </SelectContent>
                </Select>

                <label htmlFor="csv-upload" className="w-full">
                    <Button asChild variant="outline" className="w-full justify-start text-muted-foreground cursor-pointer">
                    <div className="flex items-center">
                        {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                        <span className="truncate">
                            {fileName || "Click to select a .csv file"}
                        </span>
                    </div>
                    </Button>
                </label>
                <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} className="sr-only" disabled={isParsing} />

                </CardContent>
            </Card>

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
                    <ScrollArea className="h-[60vh]">
                        <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Asset Name</TableHead>
                            <TableHead>Yahoo Query Ticker</TableHead>
                            <TableHead>Net Quantity</TableHead>
                            <TableHead>Avg. Purchase Price</TableHead>
                            <TableHead>Asset Type</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {assets.map((asset, index) => (
                            <TableRow key={`${asset.asset}-${index}`}>
                            <TableCell className="font-medium">{asset.displayName}</TableCell>
                            <TableCell className="font-mono text-xs">{asset.asset}</TableCell>
                            <TableCell>{asset.quantity.toFixed(4)}</TableCell>
                            <TableCell>{asset.purchasePrice.toFixed(2)}</TableCell>
                            <TableCell>{asset.assetType}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => handleViewTransactions(asset)} disabled={isFetchingPrices && selectedAsset?.asset.asset !== asset.asset}>
                                    {isFetchingPrices && selectedAsset?.asset.asset === asset.asset ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <TableIcon className="mr-2 h-4 w-4" />
                                    )}
                                    View Transactions
                                </Button>
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    </ScrollArea>
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

          <div className="lg:col-span-1 space-y-8">
            {parsingLogs && (
                <Card>
                    <CardHeader>
                        <CardTitle>Parsing Logs</CardTitle>
                        <CardDescription>Detailed step-by-step process of how the CSV file was parsed.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="setup">
                                <AccordionTrigger>Setup and Header Validation</AccordionTrigger>
                                <AccordionContent>
                                    <ul className="list-disc pl-5 font-mono text-xs space-y-1">
                                        {parsingLogs.setup.map((log, i) => <li key={i}>{log}</li>)}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="assets">
                                <AccordionTrigger>Asset Processing ({Object.keys(parsingLogs.assetLogs).length} assets)</AccordionTrigger>
                                <AccordionContent>
                                    <ScrollArea className="h-[40vh]">
                                    <Accordion type="multiple" className="w-full pr-4">
                                        {Object.entries(parsingLogs.assetLogs).map(([assetName, assetLog]) => (
                                            <AccordionItem value={assetName} key={assetName}>
                                                <AccordionTrigger>{assetName}</AccordionTrigger>
                                                <AccordionContent>
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Step</TableHead>
                                                                <TableHead>Action</TableHead>
                                                                <TableHead>Details</TableHead>
                                                                <TableHead>Result</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {assetLog.logs.map((log, i) => (
                                                                <TableRow key={i}>
                                                                    <TableCell className="font-mono text-xs">{log.step}</TableCell>
                                                                    <TableCell className="font-mono text-xs">{log.action}</TableCell>
                                                                    <TableCell className="font-mono text-xs">{log.details}</TableCell>
                                                                    <TableCell className="font-mono text-xs">{log.result}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                    </ScrollArea>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="summary">
                                <AccordionTrigger>Summary</AccordionTrigger>
                                <AccordionContent>
                                    <ul className="list-disc pl-5 font-mono text-xs space-y-1">
                                        {parsingLogs.summary.map((log, i) => <li key={i}>{log}</li>)}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>
            )}

            {priceFetchSummary && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                             {isFetchingPrices ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="w-5 h-5"/>}
                            Price Fetch Summary
                        </CardTitle>
                         <CardDescription>
                            Summary of the live price fetching process for all assets.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div>
                            <h3 className="font-semibold text-green-600 mb-2">Succeeded ({priceFetchSummary.success.length})</h3>
                            <ScrollArea className="h-40 border rounded-md">
                                <ul className="p-2 list-disc pl-6 text-sm space-y-1">
                                    {priceFetchSummary.success.map(asset => <li key={asset}>{asset}</li>)}
                                </ul>
                            </ScrollArea>
                        </div>
                        <div>
                            <h3 className="font-semibold text-red-600 mb-2">Failed ({priceFetchSummary.failed.length})</h3>
                            <ScrollArea className="h-40 border rounded-md">
                                <ul className="p-2 space-y-2">
                                    {priceFetchSummary.failed.map(fail => (
                                        <li key={fail.asset} className="text-sm p-2 rounded-md bg-destructive/10">
                                            <p className="font-bold">{fail.asset}</p>
                                            <p className="text-xs text-muted-foreground">{fail.error}</p>
                                        </li>
                                    ))}
                                </ul>
                            </ScrollArea>
                        </div>
                    </CardContent>
                </Card>
            )}

          </div>
        </div>
      </main>

       <Dialog open={!!selectedAsset} onOpenChange={(isOpen) => !isOpen && setSelectedAsset(null)}>
            <DialogContent className="max-w-4xl">
            {selectedAsset && (
                <>
                <DialogHeader>
                <DialogTitle>Transaction Summary for: {selectedAsset.asset.displayName}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                <AssetLogsView 
                    asset={selectedAsset.asset}
                    transactions={selectedAsset.transactions} 
                    currency={currency}
                    isPriceLive={selectedAsset.isPriceLive}
                />
                </div>
                </>
            )}
            </DialogContent>
        </Dialog>
    </div>
  );

    