
'use client';

import { useState, useMemo } from 'react';
import type { Asset, GrowwSchemaMapping, ParsingLogs, AssetLog } from '@/types';
import { parseCSV, type CsvTemplate, type ParseResult } from '@/lib/csv-parser';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Settings, BookOpen, Search, TableIcon } from 'lucide-react';

const defaultGrowwSchema: GrowwSchemaMapping = {
  asset: 'Stock name',
  type: 'Type',
  quantity: 'Quantity',
  price: 'Price',
  date: 'Execution date and time',
  status: 'Order status',
};

const initialLogs: ParsingLogs = {
  setup: [],
  assetLogs: {},
  summary: [],
};

const LogTable = ({ logs, title }: { logs: string[], title: string }) => (
  <div>
    <h3 className="font-semibold mb-2">{title}</h3>
    <ScrollArea className="h-64 w-full rounded-md border">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Log Entry</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {logs.length > 0 ? logs.map((log, index) => (
                     <TableRow key={index}>
                        <TableCell className="text-xs whitespace-pre-wrap font-mono">{log}</TableCell>
                    </TableRow>
                )) : (
                     <TableRow>
                        <TableCell className="text-xs text-muted-foreground">No logs for this section.</TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    </ScrollArea>
  </div>
);


export default function AdminPage() {
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvTemplate, setCsvTemplate] = useState<CsvTemplate>('groww');
  const [growwSchema, setGrowwSchema] = useState<GrowwSchemaMapping>(defaultGrowwSchema);
  const [parsingLogs, setParsingLogs] = useState<ParsingLogs>(initialLogs);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsParsing(true);
      setFileName(file.name);
      setAssets(null);
      setParsingLogs(initialLogs);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const result: ParseResult = parseCSV(text, csvTemplate, csvTemplate === 'groww' ? growwSchema : undefined);
          
          setParsingLogs(result.logs || initialLogs);

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
  const hasLogs = useMemo(() => {
    return parsingLogs && (parsingLogs.setup.length > 0 || Object.keys(parsingLogs.assetLogs).length > 0 || parsingLogs.summary.length > 0)
  }, [parsingLogs]);

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
                Upload a CSV to see the aggregated, parsed data. Click on an asset in the table below to see its detailed parsing logs.
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-6 h-6" />
                   Groww Schema Configuration
                </CardTitle>
                <CardDescription>
                  Define the column names from your Groww CSV file. The parser will look for these exact names in the header row.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(Object.keys(defaultGrowwSchema) as Array<keyof GrowwSchemaMapping>).map(key => (
                  <div key={key} className="grid gap-1.5">
                    <Label htmlFor={`schema-${key}`} className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
                    <Input id={`schema-${key}`} value={growwSchema[key]} onChange={(e) => handleSchemaChange(key, e.target.value)} placeholder={`e.g. ${defaultGrowwSchema[key]}`} />
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

          {hasLogs && (
             <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-6 h-6" />
                    Global Parsing Logs
                  </CardTitle>
                  <CardDescription>
                    High-level logs about the parsing setup and overall summary. For asset-specific logs, click an asset in the table below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <LogTable title="Setup & Initialization" logs={parsingLogs.setup} />
                    <LogTable title="Summary" logs={parsingLogs.summary} />
                </CardContent>
              </Card>
          )}

          {hasAssets && assets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Parsed Asset Data</CardTitle>
                <CardDescription>
                  This is the final aggregated data. Click a row to see the detailed transaction and aggregation logs for that specific asset.
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
                                  <Button variant="outline" size="sm"><TableIcon className="mr-2 h-4 w-4" /> View Logs</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl">
                                  <DialogHeader>
                                    <DialogTitle>Parsing Logs for: {asset.asset}</DialogTitle>
                                  </DialogHeader>
                                  <div className="grid gap-6 py-4">
                                    <LogTable title="Transaction Logs" logs={parsingLogs.assetLogs[asset.asset]?.transactions || []} />
                                    <LogTable title="Aggregation & Profit Logs" logs={parsingLogs.assetLogs[asset.asset]?.aggregation || []} />
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

    