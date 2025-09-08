
'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import type { Portfolio, Asset, Transaction } from '@/types';
import { provideInvestmentSuggestions } from '@/ai/flows/provide-investment-suggestions';
import { parseCSV, type CsvTemplate, type ParseResult } from '@/lib/csv-parser';
import { getStockPrice } from '@/app/admin/actions';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Lightbulb, FileText, Download, TrendingUp, BarChart, Hash, Settings, CircleDollarSign } from 'lucide-react';

import KpiCard from '@/components/investview/kpi-card';
import YearlyActivityChart from '@/components/investview/yearly-activity-chart';
import PerformanceTable from '@/components/investview/performance-table';

export default function Home() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvTemplate, setCsvTemplate] = useState<CsvTemplate>('default');
  const { toast } = useToast();

  useEffect(() => {
    const savedData = localStorage.getItem('portfolioData');
    if (savedData) {
      try {
        let parsedData = JSON.parse(savedData, (key, value) => {
          if (key === 'transactions' && Array.isArray(value)) {
            return value.map((t: any) => ({ ...t, date: new Date(t.date)}));
          }
          return value;
        });

        if (!parsedData.transactions) {
          parsedData.transactions = [];
        }
        
        if (!parsedData.currency) {
            parsedData.currency = 'USD';
        }
        
        if (parsedData.realizedProfit === undefined) {
          parsedData.realizedProfit = 0;
        }

        setPortfolio(parsedData);
        setFileName("loaded_from_cache.csv");
        setCsvTemplate(parsedData.currency === 'INR' ? 'groww' : 'default');
      } catch {
        localStorage.removeItem('portfolioData');
      }
    }
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsParsing(true);
      setFileName(file.name);
      setPortfolio(null);
      setAiSuggestions(null);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const result: ParseResult = parseCSV(text, csvTemplate);
          
          if (result.error) {
            throw new Error(result.error);
          }

          if (result.assets.length === 0 && result.transactions.length === 0) {
             toast({
              variant: "default",
              title: "Parsing successful, but no transaction data found",
              description: "The file was parsed, but no valid transaction rows were found.",
            });
          }
          const currency = csvTemplate === 'groww' ? 'INR' : 'USD';
          let initialPortfolio = calculatePortfolioMetrics(result.assets, result.transactions, currency, result.realizedProfit);
          setPortfolio(initialPortfolio);
          setIsParsing(false);
          
          // Now fetch live prices
          setIsFetchingPrices(true);
          const assetsWithLivePrice = await Promise.all(
            initialPortfolio.assets.map(async (asset) => {
                // For Indian stocks from Groww, assume .BSE, for others, use asset name directly.
                const symbol = csvTemplate === 'groww' ? `${asset.asset}.BSE` : asset.asset;
                const priceResponse = await getStockPrice(symbol);
                if (priceResponse.price) {
                  return { ...asset, currentPrice: priceResponse.price };
                }
                // If API fails, keep the original price from CSV as fallback and notify user
                toast({
                    variant: "destructive",
                    title: `Could not fetch price for ${asset.asset}`,
                    description: priceResponse.error || "The API may have rate limits or the symbol may not be supported.",
                });
                return { ...asset, currentPrice: asset.purchasePrice }; // Explicitly fall back to purchase price
            })
          );
          
          const finalPortfolio = { ...initialPortfolio, assets: assetsWithLivePrice };
          setPortfolio(finalPortfolio);
          localStorage.setItem('portfolioData', JSON.stringify(finalPortfolio));

        } catch (error) {
          console.error(error);
          toast({
            variant: "destructive",
            title: "Error processing file",
            description: error instanceof Error ? error.message : "An unknown error occurred.",
          });
          setPortfolio(null);
          setFileName(null);
          localStorage.removeItem('portfolioData');
        } finally {
          setIsParsing(false);
          setIsFetchingPrices(false);
        }
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };
  
  const calculatePortfolioMetrics = (assets: Asset[], transactions: Transaction[], currency: 'USD' | 'INR', realizedProfit: number = 0): Portfolio => {
    let totalCost = 0;
    assets.forEach(asset => {
      totalCost += asset.quantity * asset.purchasePrice;
    });

    return { assets, transactions: transactions || [], totalCost, currency, realizedProfit };
  };

  const generateAISuggestions = async () => {
    if (!portfolio) return;

    setIsAnalyzing(true);
    setAiSuggestions(null);

    const portfolioSummary = portfolio.assets.map(asset => 
      `Asset: ${asset.asset}, Type: ${asset.assetType}, Invested Value: ${portfolio.currency === 'INR' ? '₹' : '$'}${(asset.quantity * asset.purchasePrice).toFixed(2)}, Current Value: ${portfolio.currency === 'INR' ? '₹' : '$'}${(asset.quantity * asset.currentPrice).toFixed(2)}`
    ).join('. ');

    const input = { portfolioData: `Total Investment: ${portfolio.currency === 'INR' ? '₹' : '$'}${portfolio.totalCost.toFixed(2)}. ${portfolioSummary}` };

    try {
      const result = await provideInvestmentSuggestions(input);
      setAiSuggestions(result.suggestions);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "AI Analysis Failed",
        description: "Could not generate investment suggestions. Please try again later.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent = "Asset,Quantity,PurchasePrice,CurrentPrice,AssetType,Date\n" +
      "AAPL,10,150,210,Stock,2023-01-15\n" +
      "MSFT,15,300,440,Stock,2023-04-05\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "sample_portfolio.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const uniqueAssetsCount = useMemo(() => {
    if (!portfolio) return 0;
    return portfolio.assets.length;
  }, [portfolio]);

  const totalTransactions = useMemo(() => {
    if (!portfolio || !portfolio.transactions) return 0;
    return portfolio.transactions.length;
  }, [portfolio]);

  const totalCurrentValue = useMemo(() => {
    if (!portfolio) return 0;
    return portfolio.assets.reduce((acc, asset) => acc + (asset.quantity * asset.currentPrice), 0);
  }, [portfolio]);

  const isLoading = isParsing || isFetchingPrices;

  return (
    <div className="flex flex-col min-h-screen bg-background font-body">
      <header className="p-4 border-b shadow-sm flex justify-between items-center">
        <h1 className="text-2xl font-bold font-headline text-primary">InvestView</h1>
        <Link href="/admin">
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Admin Panel
          </Button>
        </Link>
      </header>

      <main className="flex-grow p-4 md:p-8">
        <div className="max-w-7xl mx-auto grid gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-6 h-6" />
                Portfolio Uploader
              </CardTitle>
              <CardDescription>
                Select a CSV template, then upload your portfolio data to get started. Live market prices will be fetched for your assets.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center gap-4">
              <Select value={csvTemplate} onValueChange={(value) => setCsvTemplate(value as CsvTemplate)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default (USD Stocks)</SelectItem>
                  <SelectItem value="groww">Groww (INR Stocks)</SelectItem>
                </SelectContent>
              </Select>

               <label htmlFor="csv-upload" className="flex-grow w-full">
                  <Button asChild variant="outline" className="w-full justify-start text-muted-foreground cursor-pointer">
                    <div>
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="mr-2 h-4 w-4" />
                      )}
                      {fileName || "Click to select a .csv file"}
                    </div>
                  </Button>
                </label>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="sr-only"
                  disabled={isLoading}
                />
              <Button onClick={downloadSampleCsv} variant="secondary" className="w-full sm:w-auto" disabled={csvTemplate !== 'default'}>
                <Download className="mr-2 h-4 w-4" />
                Sample CSV
              </Button>
            </CardContent>
          </Card>

          {isLoading && (
             <div className="flex justify-center items-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">
                    {isParsing ? 'Processing your portfolio...' : 'Fetching live market prices...'}
                </p>
             </div>
          )}

          {portfolio && !isLoading && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                 <KpiCard 
                  title="Realized Profit" 
                  value={portfolio.realizedProfit || 0} 
                  format="currency" 
                  icon={TrendingUp} 
                  currency={portfolio.currency}
                  fractionDigits={2}
                  tooltipText="The total profit or loss from all completed sales."
                />
                 <KpiCard 
                  title="Total Current Value" 
                  value={totalCurrentValue} 
                  format="currency" 
                  icon={CircleDollarSign} 
                  currency={portfolio.currency}
                  fractionDigits={2}
                  tooltipText="The current market value of all your holdings."
                />
                <KpiCard title="Current Holdings" value={uniqueAssetsCount} icon={Hash} />
                <KpiCard title="Total Transactions" value={totalTransactions} icon={BarChart} />
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                 <PerformanceTable assets={portfolio.assets} currency={portfolio.currency} />
                 <YearlyActivityChart transactions={portfolio.transactions} currency={portfolio.currency} />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-6 h-6 text-yellow-400" />
                    Intelligent Analysis
                  </CardTitle>
                  <CardDescription>
                    Get high-level suggestions from our AI to understand your portfolio's performance at a glance.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={generateAISuggestions} disabled={isAnalyzing}>
                    {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate AI Suggestions
                  </Button>
                  {isAnalyzing && !aiSuggestions && <p className="mt-4 text-sm text-muted-foreground">Our AI is analyzing your portfolio...</p>}
                  {aiSuggestions && (
                    <div className="mt-4 p-4 bg-accent rounded-lg border">
                      <p className="text-sm text-accent-foreground whitespace-pre-wrap">{aiSuggestions}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {!portfolio && !isLoading &&
            <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
              <h3 className="text-lg font-semibold">Welcome to InvestView</h3>
              <p>Upload your portfolio CSV to visualize your investments.</p>
            </div>
          }
        </div>
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground border-t">
        <p>&copy; {new Date().getFullYear()} InvestView. Simple, powerful portfolio analysis.</p>
      </footer>
    </div>
  );
}

    