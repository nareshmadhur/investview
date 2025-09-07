'use client';

import { useState, useMemo } from 'react';
import type { Asset, GrowwSchemaMapping } from '@/types';
import { parseCSV, type CsvTemplate, type ParseResult } from '@/lib/csv-parser';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Settings } from 'lucide-react';

const defaultGrowwSchema: GrowwSchemaMapping = {
  asset: 'Stock name',
  type: 'Type',
  quantity: 'Quantity',
  price: 'Price',
  date: 'Execution date and time',
  status: 'Order status',
};

export default function AdminPage() {
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvTemplate, setCsvTemplate] = useState<CsvTemplate>('default');
  const [growwSchema, setGrowwSchema] = useState<GrowwSchemaMapping>(defaultGrowwSchema);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsParsing(true);
      setFileName(file.name);
      setAssets(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const result: ParseResult = parseCSV(text, csvTemplate, csvTemplate === 'groww' ? growwSchema : undefined);
          if (result.error) {
            throw new Error(result.error);
          }
          if (result.assets.length === 0) {
            toast({
              variant: "default",
              title: "Parsing successful, but no holdings",
              description: "No net assets were found after processing all transactions. This might be expected if all holdings were sold.",
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
          setFileName(null);
        } finally {
          setIsParsing(false);
        }
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  const handleSchemaChange = (field: keyof GrowwSchemaMapping, value: string) => {
    setGrowwSchema(prev => ({ ...prev, [field]: value }));
  };
  
  const hasAssets = useMemo(() => assets !== null, [assets]);

  return (
    <div className="flex flex-col min-h-screen bg-background font-body">
      <header className="p-4 border-b shadow-sm bg-destructive text-destructive-foreground">
        <h1 className="text-2xl font-bold font-headline">Admin Panel</h1>
      </header>

      <main className="flex-grow p-4 md:p-8">
        <div className="max-w-7xl mx-auto grid gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-6 h-6" />
                Aggregated Data Viewer
              </CardTitle>
              <CardDescription>
                Upload a CSV to see the aggregated, parsed data based on the selected template. This shows the final calculated holdings.
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
            </CardContent>
          </Card>

          {csvTemplate === 'groww' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-6 h-6" />
                   Groww Schema Configuration
                </CardTitle>
                <CardDescription>
                  Define the column names from your Groww CSV file.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(Object.keys(defaultGrowwSchema) as Array<keyof GrowwSchemaMapping>).map(key => (
                  <div key={key} className="grid gap-1.5">
                    <Label htmlFor={`schema-${key}`} className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
                    <Input
                      id={`schema-${key}`}
                      value={growwSchema[key]}
                      onChange={(e) => handleSchemaChange(key, e.target.value)}
                      placeholder={`e.g. ${defaultGrowwSchema[key]}`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {isParsing && (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Parsing data...</p>
            </div>
          )}

          {hasAssets && (
            <Card>
              <CardHeader>
                <CardTitle>Parsed Asset Data</CardTitle>
                <CardDescription>
                  This is the final aggregated data parsed from the uploaded CSV file.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assets.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead>Net Quantity</TableHead>
                        <TableHead>Avg. Purchase Price</TableHead>
                        <TableHead>Current Price (Placeholder)</TableHead>
                        <TableHead>Asset Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assets.map((asset, index) => (
                        <TableRow key={`${asset.asset}-${index}`}>
                          <TableCell>{asset.asset}</TableCell>
                          <TableCell>{asset.quantity.toFixed(4)}</TableCell>
                          <TableCell>{asset.purchasePrice.toFixed(2)}</TableCell>
                          <TableCell>{asset.currentPrice.toFixed(2)}</TableCell>
                          <TableCell>{asset.assetType}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <p>No holdings to display. All assets may have been sold.</p>
                  </div>
                )}
              </CardContent>
            </Card>
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
