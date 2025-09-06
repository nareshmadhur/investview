'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Portfolio, Asset } from '@/types';
import { provideInvestmentSuggestions } from '@/ai/flows/provide-investment-suggestions';
import { parseCSV } from '@/lib/csv-parser';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Lightbulb, FileText, Download } from 'lucide-react';

import KpiCard from '@/components/investview/kpi-card';
import AssetAllocationChart from '@/components/investview/asset-allocation-chart';
import PerformanceTable from '@/components/investview/performance-table';

export default function Home() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const savedData = localStorage.getItem('portfolioData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setPortfolio(parsedData);
        setFileName("loaded_from_cache.csv");
      } catch {
        localStorage.removeItem('portfolioData');
      }
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsParsing(true);
      setFileName(file.name);
      setPortfolio(null);
      setAiSuggestions(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const assets = parseCSV(text);
          if (assets.length === 0) {
            throw new Error("No valid data found in the file. Please check the file format and content.");
          }
          const calculatedPortfolio = calculatePortfolioMetrics(assets);
          setPortfolio(calculatedPortfolio);
          localStorage.setItem('portfolioData', JSON.stringify(calculatedPortfolio));
        } catch (error) {
          console.error(error);
          toast({
            variant: "destructive",
            title: "Error parsing file",
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
  
  const calculatePortfolioMetrics = (assets: Asset[]): Portfolio => {
    let totalValue = 0;
    let totalCost = 0;

    assets.forEach(asset => {
      totalValue += asset.quantity * asset.currentPrice;
      totalCost += asset.quantity * asset.purchasePrice;
    });

    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercentage = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    return { assets, totalValue, totalCost, totalGainLoss, totalGainLossPercentage };
  };

  const generateAISuggestions = async () => {
    if (!portfolio) return;

    setIsAnalyzing(true);
    setAiSuggestions(null);

    const portfolioSummary = portfolio.assets.map(asset => 
      `Asset: ${asset.asset}, Type: ${asset.assetType}, Value: $${(asset.quantity * asset.currentPrice).toFixed(2)}, Gain/Loss: $${((asset.currentPrice - asset.purchasePrice) * asset.quantity).toFixed(2)}`
    ).join('. ');

    const input = { portfolioData: `Total Portfolio Value: $${portfolio.totalValue.toFixed(2)}. ${portfolioSummary}` };

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
    const csvContent = "Asset,Quantity,PurchasePrice,CurrentPrice,AssetType\n" +
      "Apple Inc.,10,150,210,Stock\n" +
      "Bitcoin,0.5,60000,65000,Cryptocurrency\n" +
      "Gold,5,1800,2300,Commodity\n" +
      "Microsoft Corp.,15,300,440,Stock\n" +
      "Ethereum,10,3000,3500,Cryptocurrency";
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
  
  const { bestPerformer, worstPerformer } = useMemo(() => {
    if (!portfolio || portfolio.assets.length === 0) {
      return { 
        bestPerformer: { name: 'N/A', value: 0 },
        worstPerformer: { name: 'N/A', value: 0 }
      };
    }

    let best = { name: portfolio.assets[0].asset, value: -Infinity };
    let worst = { name: portfolio.assets[0].asset, value: Infinity };

    portfolio.assets.forEach(asset => {
      const gainLoss = (asset.currentPrice - asset.purchasePrice) * asset.quantity;
      if (gainLoss > best.value) {
        best = { name: asset.asset, value: gainLoss };
      }
      if (gainLoss < worst.value) {
        worst = { name: asset.asset, value: gainLoss };
      }
    });
    
    return { bestPerformer: best, worstPerformer: worst };
  }, [portfolio]);

  return (
    <div className="flex flex-col min-h-screen bg-background font-body">
      <header className="p-4 border-b shadow-sm">
        <h1 className="text-2xl font-bold font-headline text-primary">InvestView</h1>
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
                Upload your portfolio data as a CSV file to get started. All data is processed in your browser and is not stored on our servers.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center gap-4">
               <label htmlFor="csv-upload" className="flex-grow w-full">
                  <Button asChild variant="outline" className="w-full justify-start text-muted-foreground cursor-pointer">
                    <div>
                      {isParsing ? (
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
                  disabled={isParsing}
                />
              <Button onClick={downloadSampleCsv} variant="secondary" className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Sample CSV
              </Button>
            </CardContent>
          </Card>

          {isParsing && (
             <div className="flex justify-center items-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Processing your portfolio...</p>
             </div>
          )}

          {portfolio && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard title="Total Portfolio Value" value={portfolio.totalValue} format="currency" />
                <KpiCard title="Overall Gain/Loss" value={portfolio.totalGainLoss} previousValue={portfolio.totalCost} format="currency" showPercentage />
                <KpiCard title="Best Performer" value={bestPerformer.value} helpText={bestPerformer.name} format="currency" />
                <KpiCard title="Worst Performer" value={worstPerformer.value} helpText={worstPerformer.name} format="currency" />
              </div>

              <div className="grid gap-8 lg:grid-cols-7">
                <div className="lg:col-span-5">
                    <PerformanceTable assets={portfolio.assets} />
                </div>
                <div className="lg:col-span-2">
                    <AssetAllocationChart assets={portfolio.assets} />
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
                    <div className="mt-4 p-4 bg-accent rounded-lg border">
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
