
'use client';

import { useState } from 'react';
import type { Asset, Transaction } from '@/types';
import { parseCSV, type CsvTemplate, type ParseResult } from '@/lib/csv-parser';
import { getStockPrice, scrapeYahooFinancePrice, getLatestNseBhavcopy, type ApiResponse, type BhavcopyResult } from './actions';
import type { BhavcopyRecord } from '@/services/market-data';


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Settings, BookOpen, Search, TableIcon, ExternalLink, Bot, Code, Database } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
    const [symbol, setSymbol] = useState('RELIANCE.BSE');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ApiResponse | null>(null);
    const [apiSource, setApiSource] = useState<'alphavantage' | 'yahoo'>('alphavantage');
    const { toast } = useToast();

    const handleFetch = async () => {
        if (!symbol) {
            toast({ variant: 'destructive', title: 'Symbol is required' });
            return;
        }
        setIsLoading(true);
        setResult(null);
        try {
            let res: ApiResponse;
            if (apiSource === 'alphavantage') {
                res = await getStockPrice(symbol);
            } else {
                res = await scrapeYahooFinancePrice(symbol);
            }
            setResult(res);

            if (res.error) {
                toast({ variant: 'destructive', title: 'API Error', description: res.error });
            }
        } catch (e) {
            const error = e instanceof Error ? e.message : "An unknown error occurred.";
            setResult({ error });
            toast({ variant: 'destructive', title: 'Request Failed', description: error });
        } finally {
            setIsLoading(false);
        }
    };
    
    const sourceConfig = {
      alphavantage: { title: "Alpha Vantage API", icon: Bot, placeholder: "e.g. RELIANCE.BSE, IBM" },
      yahoo: { title: "Yahoo Finance (Scrape)", icon: Code, placeholder: "e.g. RELIANCE.NS, AAPL" }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Search className="w-6 h-6" />
                    Live Price Fetcher
                </CardTitle>
                <CardDescription>
                    Select a data source, enter a stock symbol, and fetch the latest traded price. This is a testing utility.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="mb-6">
                    <Label className="mb-2 block">Data Source</Label>
                    <RadioGroup defaultValue="alphavantage" onValueChange={(value) => setApiSource(value as 'alphavantage' | 'yahoo')} className="flex items-center gap-6">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="alphavantage" id="r1" />
                            <Label htmlFor="r1" className="flex items-center gap-2 cursor-pointer"><Bot/> Alpha Vantage API</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yahoo" id="r2" />
                            <Label htmlFor="r2" className="flex items-center gap-2 cursor-pointer"><Code/> Yahoo Finance (Scrape)</Label>
                        </div>
                    </RadioGroup>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="grid gap-1.5 flex-grow w-full">
                        <Label htmlFor="symbol-input">Stock Symbol</Label>
                        <Input
                            id="symbol-input"
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                            placeholder={sourceConfig[apiSource].placeholder}
                        />
                    </div>
                    <Button onClick={handleFetch} disabled={isLoading} className="w-full sm:w-auto mt-4 sm:mt-0 self-end">
                        {isLoading ? <Loader2 className="animate-spin" /> : <ExternalLink />}
                        Fetch Price
                    </Button>
                </div>

                {result && (
                    <div className="mt-6 grid gap-4">
                        {result.price !== undefined && (
                            <div className="p-4 rounded-md bg-accent border">
                                <h4 className="font-semibold text-accent-foreground">Last Traded Price</h4>
                                <p className="text-2xl font-bold text-primary">{result.price.toFixed(2)}</p>
                            </div>
                        )}
                         {result.rawData && (
                            <div>
                               <h4 className="font-semibold mb-2">Raw Response</h4>
                               <ScrollArea className="h-64 w-full rounded-md border bg-muted">
                                  <pre className="p-4 text-xs font-mono">{typeof result.rawData === 'string' ? result.rawData : JSON.stringify(result.rawData, null, 2)}</pre>
                                </ScrollArea>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function BhavcopyDownloader() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<BhavcopyResult | null>(null);
    const [bhavcopyData, setBhavcopyData] = useState<BhavcopyRecord[] | null>(null);
    const { toast } = useToast();

    const handleFetchBhavcopy = async () => {
        setIsLoading(true);
        setResult(null);
        setBhavcopyData(null);
        try {
            const res = await getLatestNseBhavcopy();
            setResult(res);

            if (res.error) {
                toast({ variant: 'destructive', title: 'Bhavcopy Error', description: res.error, duration: 5000 });
            }
            if (res.data) {
                toast({ variant: 'default', title: 'Bhavcopy Loaded', description: `Successfully parsed ${res.fileName}.` });
                setBhavcopyData(res.data);
            }

        } catch (e) {
            const error = e instanceof Error ? e.message : "An unknown error occurred.";
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
                    Market Data Downloader
                </CardTitle>
                <CardDescription>
                   Fetch the latest end-of-day data (Bhavcopy) from the NSE. This may take a moment as it involves downloading and unzipping a file.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleFetchBhavcopy} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Fetch Latest NSE Bhavcopy
                </Button>
                {bhavcopyData && (
                    <div className="mt-6">
                        <h4 className="font-semibold mb-2">Parsed Bhavcopy Data (First 20 records)</h4>
                        <ScrollArea className="h-96 w-full rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Symbol</TableHead>
                                        <TableHead>Series</TableHead>
                                        <TableHead className="text-right">Close</TableHead>
                                        <TableHead className="text-right">Prev. Close</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bhavcopyData.slice(0, 20).map((record) => (
                                        <TableRow key={record.SYMBOL}>
                                            <TableCell className="font-medium">{record.SYMBOL}</TableCell>
                                            <TableCell>{record.SERIES}</TableCell>
                                            <TableCell className="text-right font-mono">{record.CLOSE.toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-mono">{record.PREVCLOSE.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
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
          
          <BhavcopyDownloader />

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
                          <TableCell className="font-medium">{asset.asset}</TableCell>
                          <TableCell>{asset.quantity.toFixed(4)}</TableCell>
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
