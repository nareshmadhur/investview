import { type Asset, type Transaction, type GrowwSchemaMapping, type ParsingLogs } from '@/types';

export type CsvTemplate = 'default' | 'groww';

export type ParseResult = {
  assets: Asset[];
  transactions: Transaction[];
  error?: string;
  logs: ParsingLogs;
  realizedProfit?: number;
};

const initialLogs: ParsingLogs = {
  setup: [],
  transactions: [],
  aggregation: [],
};


// The default parser returns both aggregated assets and raw transactions
const parseDefault = (lines: string[]): ParseResult => {
  const logs: ParsingLogs = { ...initialLogs, setup:[], transactions: [], aggregation: [] };
  if (lines.length < 2) {
    const error = 'CSV file must contain a header row and at least one data row.';
    logs.setup.push(`Error: ${error}`);
    return { assets: [], transactions: [], error, logs };
  }

  const headers = lines[0].split(',').map(h => h.trim());
  logs.setup.push(`Detected headers: ${headers.join(', ')}`);
  const assets: Asset[] = [];
  const transactions: Transaction[] = [];

  const requiredHeaders = ['Asset', 'Quantity', 'PurchasePrice', 'CurrentPrice', 'AssetType'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    const error = `Invalid CSV headers. Missing required headers: ${missingHeaders.join(', ')}`;
    logs.setup.push(`Error: ${error}`);
    return { assets: [], transactions: [], error, logs };
  }

  const assetIndex = headers.indexOf('Asset');
  const quantityIndex = headers.indexOf('Quantity');
  const purchasePriceIndex = headers.indexOf('PurchasePrice');
  const currentPriceIndex = headers.indexOf('CurrentPrice');
  const assetTypeIndex = headers.indexOf('AssetType');
  const dateIndex = headers.indexOf('Date');

  logs.transactions.push('Starting to process rows...');
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      logs.transactions.push(`Skipping empty row ${i + 1}.`);
      continue;
    }
    
    const data = line.split(',');
    logs.transactions.push(`Processing row ${i + 1}: [${data.join(', ')}]`);

    if (data.length < headers.length) {
       logs.transactions.push(`Warning: Skipping malformed row ${i + 1}. Expected at least ${requiredHeaders.length} columns, but got ${data.length}.`);
       continue;
    }

    const assetType = data[assetTypeIndex].trim();
    if (assetType !== 'Stock' && assetType !== 'Cryptocurrency' && assetType !== 'Commodity') {
      logs.transactions.push(`Warning: Skipping row ${i + 1} with invalid AssetType: ${assetType}`);
      continue;
    }

    const quantity = parseFloat(data[quantityIndex]);
    const purchasePrice = parseFloat(data[purchasePriceIndex]);
    const currentPrice = parseFloat(data[currentPriceIndex]);
    const date = dateIndex !== -1 && data[dateIndex] ? new Date(data[dateIndex].trim()) : new Date();


    if (isNaN(quantity) || isNaN(purchasePrice) || isNaN(currentPrice)) {
      logs.transactions.push(`Warning: Skipping row ${i + 1} due to invalid number format.`);
      continue;
    }

    assets.push({
      asset: data[assetIndex].trim(),
      quantity,
      purchasePrice,
      currentPrice,
      assetType: assetType as 'Stock' | 'Cryptocurrency' | 'Commodity',
    });
    
    const transaction = {
        asset: data[assetIndex].trim(),
        quantity,
        price: purchasePrice,
        type: 'BUY' as 'BUY' | 'SELL',
        date,
        assetType: assetType as 'Stock' | 'Cryptocurrency' | 'Commodity',
    };
    transactions.push(transaction);
    logs.transactions.push(`Successfully parsed transaction for row ${i + 1}: ${JSON.stringify(transaction)}`);
  }
  logs.aggregation.push(`Finished processing. Total assets found: ${assets.length}. Total transactions: ${transactions.length}.`);
  return { assets, transactions, logs };
}

function parseGrowwDate(dateStr: string): Date | null {
    // Expected format: DD-MM-YYYY HH:mm AM/PM
    const parts = dateStr.match(/(\d{2})-(\d{2})-(\d{4})\s(\d{1,2}):(\d{2})\s(AM|PM)/);
    if (!parts) return null;

    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1; // Month is 0-indexed in JS
    const year = parseInt(parts[3], 10);
    let hour = parseInt(parts[4], 10);
    const minute = parseInt(parts[5], 10);
    const ampm = parts[6];

    if (ampm === 'PM' && hour < 12) {
        hour += 12;
    }
    if (ampm === 'AM' && hour === 12) { // Midnight case
        hour = 0;
    }

    const date = new Date(Date.UTC(year, month, day, hour, minute));
    // Check if the constructed date is valid, especially for cross-timezone issues
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
        return null;
    }
    return date;
}

// The Groww parser returns both aggregated assets and raw transactions
const parseGroww = (lines: string[], schemaMapping?: GrowwSchemaMapping): ParseResult => {
    const logs: ParsingLogs = { setup: [], transactions: [], aggregation: [] };
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
        asset: 'Stock name',
        type: 'Type',
        quantity: 'Quantity',
        price: 'Price',
        date: 'Execution date and time',
        status: 'Order status',
    };
    logs.setup.push(`Using schema mapping: ${JSON.stringify(mapping)}`);

    const requiredHeaders = Object.values(mapping);
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
        const error = `Invalid Groww CSV headers. Your file is missing the following columns: ${missingHeaders.join(', ')}. Please configure the schema in the admin panel if your column names are different.`;
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

    logs.transactions.push('Starting to process rows...');
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) {
            logs.transactions.push(`Skipping empty row ${i + 1}.`);
            continue;
        }

        const data = line.split(delimiter).map(d => d.trim().replace(/"/g, ''));
        logs.transactions.push(`Processing row ${i + 1}: [${data.join(', ')}]`);

        if (data.length < headers.length) {
            logs.transactions.push(`Warning: Skipping malformed Groww row ${i + 1}. Expected ${headers.length} columns, but got ${data.length}.`);
            continue;
        }

        const status = data[statusIndex].toUpperCase();
        if (status !== 'EXECUTED') {
            logs.transactions.push(`Skipping row ${i + 1}: Order status is "${data[statusIndex]}", not "EXECUTED".`);
            continue;
        }

        const assetName = data[assetIndex];
        const quantity = parseFloat(data[quantityIndex]);
        const price = parseFloat(data[priceIndex]);
        const type = data[typeIndex].toUpperCase();
        const dateStr = data[dateIndex];
        const date = parseGrowwDate(dateStr);

        if (!assetName || isNaN(quantity) || isNaN(price) || !date || isNaN(date.getTime())) {
            logs.transactions.push(`Warning: Skipping row ${i + 1} due to invalid or missing data. Asset: ${assetName}, Qty: ${quantity}, Price: ${price}, Date: ${dateStr}`);
            continue;
        }
        
        if (type !== 'BUY' && type !== 'SELL') {
            logs.transactions.push(`Skipping row ${i + 1}: Invalid transaction type "${type}".`);
            continue;
        }

        const transaction = {
            asset: assetName,
            quantity,
            price,
            type: type as 'BUY' | 'SELL',
            date,
            assetType: 'Stock' as 'Stock',
        };
        transactions.push(transaction);
        logs.transactions.push(`Successfully parsed transaction for row ${i + 1}: ${JSON.stringify(transaction)}`);

        if (!holdings[assetName]) {
            holdings[assetName] = { quantity: 0, totalCost: 0 };
        }

        if (type === 'BUY') {
            holdings[assetName].quantity += quantity;
            holdings[assetName].totalCost += quantity * price;
            logs.aggregation.push(`Updated holdings for ${assetName}: BUY ${quantity} @ ${price}. New Qty: ${holdings[assetName].quantity.toFixed(4)}, New Total Cost: ${holdings[assetName].totalCost.toFixed(2)}`);
        } else if (type === 'SELL') {
            const holding = holdings[assetName];
            logs.aggregation.push(`Processing SELL for ${assetName}. State before: Qty=${holding.quantity.toFixed(4)}, Cost=${holding.totalCost.toFixed(2)}.`);
            
            if (holding.quantity > 0) {
                const avgPriceBeforeSell = holding.totalCost / holding.quantity;
                logs.aggregation.push(`To calculate profit and adjust cost basis, using the average purchase price: ${avgPriceBeforeSell.toFixed(2)}.`);
                
                const profitOnThisSale = (price - avgPriceBeforeSell) * quantity;
                realizedProfit += profitOnThisSale;
                logs.aggregation.push(`Profit from this sale: (${price.toFixed(2)} - ${avgPriceBeforeSell.toFixed(2)}) * ${quantity} = ${profitOnThisSale.toFixed(2)}. Total Realized Profit: ${realizedProfit.toFixed(2)}`);

                const costBasisAdjustment = quantity * avgPriceBeforeSell;
                holding.totalCost -= costBasisAdjustment;

                // Clamp to zero if we sold exactly what we had to avoid floating point dust
                if (Math.abs(holding.quantity - quantity) < 0.00001) {
                    holding.totalCost = 0;
                }

            } else {
                 // This assumes short selling is not tracked for profit in this simple model
                 logs.aggregation.push(`Short sell detected or no prior buy history. Cost basis adjustment is based on current sell price: ${price}`);
            }

            holding.quantity -= quantity;
            logs.aggregation.push(`State after: Qty=${holding.quantity.toFixed(4)}, New Total Cost=${holding.totalCost.toFixed(2)}.`);
        }
    }

    logs.aggregation.push('Calculating final aggregated assets...');
    const assets: Asset[] = Object.entries(holdings)
        .filter(([, holding]) => holding.quantity > 0.00001) // Use a small threshold for floating point
        .map(([assetName, holding]) => {
            const averagePrice = holding.quantity > 0 ? holding.totalCost / holding.quantity : 0;
            const finalAsset = {
                asset: assetName,
                quantity: holding.quantity,
                purchasePrice: averagePrice,
                currentPrice: averagePrice, // Placeholder
                assetType: 'Stock' as 'Stock',
            };
            logs.aggregation.push(`Final asset: ${JSON.stringify(finalAsset)}`);
            return finalAsset;
        });

    logs.aggregation.push(`Finished processing. Total aggregated assets: ${assets.length}. Total transactions: ${transactions.length}. Realized Profit: ${realizedProfit.toFixed(2)}`);
    return { assets, transactions, logs, realizedProfit };
};

export const parseCSV = (csvText: string, template: CsvTemplate = 'default', growwSchema?: GrowwSchemaMapping): ParseResult => {
  if (!csvText) {
    const error = 'The uploaded CSV file is empty.';
    return { assets: [], transactions: [], error, logs: { setup: [`Error: ${error}`], transactions: [], aggregation: [] } };
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
