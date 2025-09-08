
import { type Asset, type Transaction, type GrowwSchemaMapping, type ParsingLogs, type StructuredLog } from '@/types';

export type CsvTemplate = 'default' | 'groww';

export type ParseResult = {
  assets: Asset[];
  transactions: Transaction[];
  error?: string;
  logs: ParsingLogs;
  realizedProfit?: number;
};

const initialLogs = (): ParsingLogs => ({
  setup: [],
  assetLogs: {},
  summary: [],
});

const parseDefault = (lines: string[]): ParseResult => {
  const logs: ParsingLogs = initialLogs();
  if (lines.length < 2) {
    const error = 'CSV file must contain a header row and at least one data row.';
    logs.setup.push(`Error: ${error}`);
    return { assets: [], transactions: [], error, logs };
  }

  const headers = lines[0].split(',').map(h => h.trim());
  logs.setup.push(`Detected headers: ${headers.join(', ')}`);
  const assets: Asset[] = [];
  const transactions: Transaction[] = [];

  const requiredHeaders = ['Symbol', 'Exchange', 'Quantity', 'PurchasePrice', 'AssetType'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    const error = `Invalid CSV headers. Missing required headers: ${missingHeaders.join(', ')}`;
    logs.setup.push(`Error: ${error}`);
    return { assets: [], transactions: [], error, logs };
  }

  const symbolIndex = headers.indexOf('Symbol');
  const exchangeIndex = headers.indexOf('Exchange');
  const quantityIndex = headers.indexOf('Quantity');
  const purchasePriceIndex = headers.indexOf('PurchasePrice');
  const assetTypeIndex = headers.indexOf('AssetType');
  const dateIndex = headers.indexOf('Date');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const data = line.split(',');
    const symbol = data[symbolIndex].trim();
    const exchange = data[exchangeIndex].trim();
    const assetName = `${symbol}.${exchange}`;

    if (!logs.assetLogs[assetName]) {
      logs.assetLogs[assetName] = { logs: [], transactions: [] };
    }
    const assetLogs = logs.assetLogs[assetName].logs;

    assetLogs.push({ step: `Row ${i + 1}`, action: 'Read', details: `Raw data: [${data.join(', ')}]`, result: '' });

    if (data.length < headers.length) {
       assetLogs.push({ step: `Row ${i + 1}`, action: 'Validate', details: `Malformed row. Expected ${headers.length}, got ${data.length}`, result: 'Skipped' });
       continue;
    }

    const assetType = data[assetTypeIndex].trim();
    if (assetType !== 'Stock' && assetType !== 'Cryptocurrency' && assetType !== 'Commodity') {
      assetLogs.push({ step: `Row ${i + 1}`, action: 'Validate', details: `Invalid AssetType: ${assetType}`, result: 'Skipped' });
      continue;
    }

    const quantity = parseFloat(data[quantityIndex]);
    const purchasePrice = parseFloat(data[purchasePriceIndex]);
    const date = dateIndex !== -1 && data[dateIndex] ? new Date(data[dateIndex].trim()) : new Date();


    if (isNaN(quantity) || isNaN(purchasePrice)) {
      assetLogs.push({ step: `Row ${i + 1}`, action: 'Validate', details: `Invalid number format in row.`, result: 'Skipped' });
      continue;
    }

    assets.push({
      asset: assetName,
      quantity,
      purchasePrice,
      currentPrice: purchasePrice,
      assetType: assetType as 'Stock' | 'Cryptocurrency' | 'Commodity',
    });
    
    const transaction = {
        asset: assetName,
        quantity,
        price: purchasePrice,
        type: 'BUY' as 'BUY' | 'SELL',
        date,
        assetType: assetType as 'Stock' | 'Cryptocurrency' | 'Commodity',
    };
    transactions.push(transaction);
    logs.assetLogs[assetName].transactions.push(transaction);
    assetLogs.push({ step: `Row ${i + 1}`, action: 'Parse', details: `Parsed transaction.`, result: `Type: ${transaction.type}, Qty: ${transaction.quantity}` });
  }
  logs.summary.push(`Finished processing. Total assets found: ${assets.length}. Total transactions: ${transactions.length}.`);
  return { assets, transactions, logs };
}

function parseGrowwDate(dateStr: string): Date | null {
    const parts = dateStr.match(/(\d{2})-(\d{2})-(\d{4})\s(\d{1,2}):(\d{2})\s(AM|PM)/);
    if (!parts) return null;

    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1;
    const year = parseInt(parts[3], 10);
    let hour = parseInt(parts[4], 10);
    const minute = parseInt(parts[5], 10);
    const ampm = parts[6];

    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    const date = new Date(Date.UTC(year, month, day, hour, minute));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return null;
    return date;
}

const parseGroww = (lines: string[], schemaMapping?: GrowwSchemaMapping): ParseResult => {
    const logs: ParsingLogs = initialLogs();
    if (lines.length === 0) {
        const error = 'The uploaded Groww CSV file is empty.';
        logs.setup.push(`Error: ${error}`);
        return { assets: [], transactions: [], error, logs };
    }
    
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    logs.setup.push(`Detected delimiter: "${delimiter === '\t' ? 'Tab' : 'Comma'}"`);

    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
    logs.setup.push(`Detected headers: ${headers.join(', ')}`);
    
    if (lines.length < 2) {
        const error = 'Groww CSV file must contain a header row and at least one data row.';
        logs.setup.push(`Error: ${error}`);
        return { assets: [], transactions: [], error, logs };
    }

    const mapping: GrowwSchemaMapping = schemaMapping || {
        asset: 'Stock name', type: 'Type', quantity: 'Quantity', price: 'Price',
        date: 'Execution date and time', status: 'Order status',
    };
    logs.setup.push(`Using schema mapping: ${JSON.stringify(mapping)}`);

    const requiredHeaders = Object.values(mapping);
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
        const error = `Invalid Groww CSV headers. Your file is missing: ${missingHeaders.join(', ')}. Please configure the schema if your column names differ.`;
        logs.setup.push(`Error: ${error}`);
        return { assets: [], transactions: [], error, logs };
    }

    const assetIndex = headers.indexOf(mapping.asset);
    const quantityIndex = headers.indexOf(mapping.quantity);
    const priceIndex = headers.indexOf(mapping.price);
    const typeIndex = headers.indexOf(mapping.type);
    const dateIndex = headers.indexOf(mapping.date);
    const statusIndex = headers.indexOf(mapping.status);

    const holdings: Record<string, { quantity: number; totalCost: number }> = {};
    let realizedProfit = 0;
    const transactions: Transaction[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const data = line.split(delimiter).map(d => d.trim().replace(/"/g, ''));
        const symbol = data[assetIndex];
        const assetName = `${symbol}.NS`; // Assume NSE for Groww stocks

        if (!logs.assetLogs[assetName]) {
          logs.assetLogs[assetName] = { logs: [], transactions: [] };
        }
        
        if (data.length < headers.length) {
            continue;
        }

        const status = data[statusIndex].toUpperCase();
        if (status !== 'EXECUTED') {
            continue;
        }

        const quantity = parseFloat(data[quantityIndex]);
        const totalValue = parseFloat(data[priceIndex]);
        const type = data[typeIndex].toUpperCase();
        const dateStr = data[dateIndex];
        const date = parseGrowwDate(dateStr);
        
        if (!assetName || isNaN(quantity) || quantity === 0 || isNaN(totalValue) || !date || isNaN(date.getTime())) {
            continue;
        }

        if (type !== 'BUY' && type !== 'SELL') {
            continue;
        }
        
        const pricePerShare = totalValue / quantity;
        const transaction = { asset: assetName, quantity, price: pricePerShare, type: type as 'BUY' | 'SELL', date, assetType: 'Stock' as 'Stock' };
        transactions.push(transaction);
        logs.assetLogs[assetName].transactions.push(transaction);

        if (!holdings[assetName]) {
            holdings[assetName] = { quantity: 0, totalCost: 0 };
        }
        const holding = holdings[assetName];

        if (type === 'BUY') {
            holding.quantity += quantity;
            holding.totalCost += totalValue;
        } else if (type === 'SELL') {
            if (holding.quantity > 0) {
                const avgPriceBeforeSell = holding.totalCost / holding.quantity;
                const costOfSharesSold = avgPriceBeforeSell * quantity;
                const profitOnThisSale = totalValue - costOfSharesSold;
                realizedProfit += profitOnThisSale;

                // Adjust cost basis
                const costRatio = quantity / holding.quantity;
                holding.totalCost = holding.totalCost * (1 - costRatio);
            }

            holding.quantity -= quantity;
            
            // To prevent floating point issues, if quantity is near zero, set cost to zero.
            if (Math.abs(holding.quantity) < 0.00001) {
                holding.quantity = 0;
                holding.totalCost = 0;
            }
        }
    }

    const assets: Asset[] = Object.entries(holdings)
        .filter(([, holding]) => holding.quantity > 0.00001)
        .map(([assetName, holding]) => {
            const averagePrice = holding.quantity > 0 ? holding.totalCost / holding.quantity : 0;
            const finalAsset = {
                asset: assetName, quantity: holding.quantity, purchasePrice: averagePrice,
                currentPrice: averagePrice, assetType: 'Stock' as 'Stock',
            };
            return finalAsset;
        });

    logs.summary.push(`Finished processing. Total aggregated assets: ${assets.length}. Total transactions: ${transactions.length}. Realized Profit: ${realizedProfit.toFixed(2)}`);
    return { assets, transactions, logs, realizedProfit };
};

export const parseCSV = (csvText: string, template: CsvTemplate = 'default', growwSchema?: GrowwSchemaMapping): ParseResult => {
  if (!csvText) {
    const error = 'The uploaded CSV file is empty.';
    return { assets: [], transactions: [], error, logs: { setup: [`Error: ${error}`], assetLogs: {}, summary: [] } };
  }
  const lines = csvText.trim().split(/\r?\n/);
  
  switch(template) {
    case 'groww':
      return parseGroww(lines, growwSchema);
    case 'default':
    default:
      return parseDefault(lines);
  }
};
