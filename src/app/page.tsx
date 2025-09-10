
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Portfolio, Asset, Transaction } from '@/types';
import { provideInvestmentSuggestions } from '@/ai/flows/provide-investment-suggestions';
import { parseCSV, type CsvTemplate, type ParseResult } from '@/lib/csv-parser';
import { getYahooFinancePrice } from './admin/actions';


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Lightbulb, FileText, Download, Settings } from 'lucide-react';

import PortfolioSummary from '@/components/investview/portfolio-summary';
import YearlyActivityChart from '@/components/investview/yearly-activity-chart';
import PerformanceTable from '@/components/investview/performance-table';
import TopMovers from '@/components/investview/top-movers';
import { Sidebar, SidebarContent, SidebarHeader, SidebarTrigger } from '@/components/ui/sidebar';

export default function Home() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvTemplate, setCsvTemplate] = useState<CsvTemplate>('groww');
  const { toast } = useToast();

  useEffect(() => {
    const savedData = localStorage.getItem('portfolioData');
    if (savedData) {
      try {
        let parsedData = JSON.parse(savedData, (key, value) => {
          if ((key === 'transactions' || key === 'logs') && Array.isArray(value)) {
            return value.map((t: any) => ({ ...t, date: new Date(t.date)}));
          }
           if (key === 'assets' && Array.isArray(value)) {
            return value.map((a: any) => ({ ...a, currentPrice: a.currentPrice || a.purchasePrice }));
          }
          return value;
        });

        if (!parsedData.transactions) parsedData.transactions = [];
        if (!parsedData.currency) parsedData.currency = 'USD';
        if (parsedData.realizedProfit === undefined) parsedData.realizedProfit = 0;

        setPortfolio(parsedData.portfolio);
        setFileName(parsedData.fileName);
        setCsvTemplate(parsedData.portfolio.currency === 'INR' ? 'groww' : 'default');
      } catch {
        localStorage.removeItem('portfolioData');
      }
    }
  }, []);

  const fetchLivePrices = async (assets: Asset[]): Promise<Asset[]> => {
    const updatedAssets = [...assets];
    const promises = updatedAssets.map(asset => 
        getYahooFinancePrice(asset.asset).then(result => {
            if (result.price) {
                asset.currentPrice = result.price;
            } else {
                 toast({
                    variant: 'destructive',
                    title: `Price Fetch Failed for ${asset.asset}`,
                    description: result.error || 'Could not fetch the latest market price.',
                    duration: 4000,
                });
            }
        })
    );
    await Promise.all(promises);
    return updatedAssets;
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsParsing(true);
      setFileName(file.name);
      setPortfolio(null);
      setAiSuggestions(null);
      toast({ title: 'Processing File', description: 'Parsing your CSV and fetching live market data...' });
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const result: ParseResult = parseCSV(text, csvTemplate);
          
          if (result.error) throw new Error(result.error);
          if (result.assets.length === 0 && result.transactions.length === 0) {
             toast({
              variant: "default",
              title: "Parsing successful, no transaction data found",
              description: "The file was parsed, but no valid transaction rows were found.",
            });
          }

          const currency = csvTemplate === 'groww' ? 'INR' : 'USD';
          
          toast({ title: 'Fetching Live Prices...', description: `Fetching market data for ${result.assets.length} assets.`})
          const assetsWithLivePrices = await fetchLivePrices(result.assets);

          let finalPortfolio = calculatePortfolioMetrics(assetsWithLivePrices, result.transactions, currency, result.realizedProfit);
          setPortfolio(finalPortfolio);

          // Save to local storage
          const dataToSave = {
            portfolio: finalPortfolio,
            fileName: file.name
          };
          localStorage.setItem('portfolioData', JSON.stringify(dataToSave));

          toast({ title: 'Portfolio Ready!', description: 'Your dashboard has been updated with the latest data.' });

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
    const csvContent = "Symbol,Exchange,Quantity,PurchasePrice,AssetType,Date\n" +
      "AAPL,NASDAQ,10,150,Stock,2023-01-15\n" +
      "MSFT,NASDAQ,15,300,Stock,2023-04-05\n";
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
  
  return (
    <div className="flex min-h-screen w-full bg-background">
       <Sidebar collapsible="icon">
          <SidebarHeader className="p-4">
              <h1 className="text-2xl font-bold font-headline text-primary group-data-[collapsible=icon]:hidden">InvestView</h1>
              <h1 className="text-2xl font-bold font-headline text-primary group-data-[collapsible=icon]:block hidden">IV</h1>
          </SidebarHeader>
           <SidebarContent className="p-2 space-y-4">
                <Card className="bg-card/50">
                  <CardHeader className="p-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Upload className="w-5 h-5" />
                      Portfolio Uploader
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-4">
                    <Select value={csvTemplate} onValueChange={(value) => setCsvTemplate(value as CsvTemplate)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default (USD Stocks)</SelectItem>
                        <SelectItem value="groww">Groww (INR Stocks)</SelectItem>
                      </SelectContent>
                    </Select>

                    <label htmlFor="csv-upload" className="w-full">
                        <Button asChild variant="outline" className="w-full justify-start text-muted-foreground cursor-pointer">
                          <div>
                            {isParsing ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <FileText className="mr-2 h-4 w-4" />
                            )}
                            <span className="truncate">
                              {fileName || "Select a .csv file"}
                            </span>
                          </div>
                        </Button>
                      </label>
                      <Input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="sr-only"
                        disabled={isParsing}
                      />
                    <Button onClick={downloadSampleCsv} variant="secondary" className="w-full" disabled={csvTemplate !== 'default'}>
                      <Download className="mr-2 h-4 w-4" />
                      Sample CSV
                    </Button>
                  </CardContent>
                </Card>
           </SidebarContent>
       </Sidebar>
       <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-[57px] items-center gap-1 border-b bg-background px-4">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-xl font-semibold">Dashboard</h1>
            <div className="ml-auto">
                <Link href="/admin">
                <Button variant="outline">
                    <Settings className="mr-2 h-4 w-4" />
                    Admin Panel
                </Button>
                </Link>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto grid gap-8">
              {isParsing && (
                <div className="flex justify-center items-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-4 text-muted-foreground">
                        Processing your portfolio...
                    </p>
                </div>
              )}

              {portfolio && !isParsing && (
                <>
                  <PortfolioSummary portfolio={portfolio} />
                  
                  <TopMovers assets={portfolio.assets} transactions={portfolio.transactions} currency={portfolio.currency}/>

                  <div className="grid gap-8 lg:grid-cols-5">
                    <div className="lg:col-span-3">
                        <PerformanceTable assets={portfolio.assets} currency={portfolio.currency} />
                    </div>
                    <div className="lg:col-span-2">
                        <YearlyActivityChart transactions={portfolio.transactions} currency={portfolio.currency} />
                    </div>
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
                        <div className="mt-4 p-4 bg-accent/20 rounded-lg border border-border">
                          <p className="text-sm text-accent-foreground whitespace-pre-wrap">{aiSuggestions}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {!portfolio && !isParsing &&
                <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
                  <h3 className="text-lg font-semibold">Welcome to InvestView</h3>
                  <p>Upload your portfolio CSV from the sidebar to visualize your investments.</p>
                </div>
              }
            </div>
          </main>
           <footer className="text-center p-4 text-sm text-muted-foreground border-t">
            <p>&copy; {new Date().getFullYear()} InvestView. Simple, powerful portfolio analysis.</p>
          </footer>
       </div>
    </div>
  );
}
