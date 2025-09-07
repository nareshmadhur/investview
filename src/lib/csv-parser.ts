import { type Asset, type Transaction } from '@/types';

export type CsvTemplate = 'default' | 'groww';

export type ParseResult = {
  assets: Asset[];
  transactions: Transaction[];
  error?: string;
};

// The default parser returns both aggregated assets and raw transactions
const parseDefault = (lines: string[]): ParseResult => {
  if (lines.length < 2) {
    return { assets: [], transactions: [], error: 'CSV file must contain a header row and at least one data row.' };
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const assets: Asset[] = [];
  const transactions: Transaction[] = [];

  const requiredHeaders = ['Asset', 'Quantity', 'PurchasePrice', 'CurrentPrice', 'AssetType'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    return { assets: [], transactions: [], error: `Invalid CSV headers. Missing required headers: ${missingHeaders.join(', ')}` };
  }

  const assetIndex = headers.indexOf('Asset');
  const quantityIndex = headers.indexOf('Quantity');
  const purchasePriceIndex = headers.indexOf('PurchasePrice');
  const currentPriceIndex = headers.indexOf('CurrentPrice');
  const assetTypeIndex = headers.indexOf('AssetType');
  const dateIndex = headers.indexOf('Date'); // Assuming an optional Date column

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const data = line.split(',');
    if (data.length < headers.length) { // Allow for optional date
       console.warn(`Skipping malformed row ${i + 1}: Expected at least ${headers.length} columns, but got ${data.length}.`);
       continue;
    }

    const assetType = data[assetTypeIndex].trim();
    if (assetType !== 'Stock' && assetType !== 'Cryptocurrency' && assetType !== 'Commodity') {
      console.warn(`Skipping row ${i + 1} with invalid AssetType: ${assetType}`);
      continue;
    }

    const quantity = parseFloat(data[quantityIndex]);
    const purchasePrice = parseFloat(data[purchasePriceIndex]);
    const currentPrice = parseFloat(data[currentPriceIndex]);
    const date = dateIndex !== -1 && data[dateIndex] ? new Date(data[dateIndex].trim()) : new Date();


    if (isNaN(quantity) || isNaN(purchasePrice) || isNaN(currentPrice)) {
      console.warn(`Skipping row ${i + 1} due to invalid number format.`);
      continue;
    }

    assets.push({
      asset: data[assetIndex].trim(),
      quantity,
      purchasePrice,
      currentPrice,
      assetType: assetType as 'Stock' | 'Cryptocurrency' | 'Commodity',
    });
    
    // For default, we assume all entries are 'BUY' for transaction history
    transactions.push({
        asset: data[assetIndex].trim(),
        quantity,
        price: purchasePrice,
        type: 'BUY',
        date,
        assetType: assetType as 'Stock' | 'Cryptocurrency' | 'Commodity',
    });
  }
  return { assets, transactions };
}

// The Groww parser returns both aggregated assets and raw transactions
const parseGroww = (lines: string[]): ParseResult => {
    if (lines.length === 0) {
        return { assets: [], transactions: [], error: 'The uploaded Groww CSV file is empty.' };
    }
    
    // Groww files can be tab-separated, so we check for that
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
    
    if (lines.length < 2) {
        return { assets: [], transactions: [], error: 'Groww CSV file must contain a header row and at least one data row.' };
    }

    const requiredHeaders = ['Stock name', 'Type', 'Quantity', 'Price', 'Execution date and time', 'Order status'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
        return { assets: [], transactions: [], error: `Invalid Groww CSV headers. Missing: ${missingHeaders.join(', ')}` };
    }

    const assetIndex = headers.indexOf('Stock name');
    const quantityIndex = headers.indexOf('Quantity');
    const priceIndex = headers.indexOf('Price');
    const typeIndex = headers.indexOf('Type');
    const dateIndex = headers.indexOf('Execution date and time');
    const statusIndex = headers.indexOf('Order status');

    const holdings: Record<string, { quantity: number; totalCost: number }> = {};
    const transactions: Transaction[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const data = line.split(delimiter).map(d => d.trim().replace(/"/g, ''));
        if (data.length < headers.length) {
            console.warn(`Skipping malformed Groww row ${i + 1}: Expected ${headers.length} columns, but got ${data.length}.`);
            continue;
        }

        // Only process completed orders
        if (statusIndex !== -1 && data[statusIndex].toUpperCase() !== 'COMPLETED') {
            continue;
        }

        const assetName = data[assetIndex];
        const quantity = parseFloat(data[quantityIndex]);
        const price = parseFloat(data[priceIndex]);
        const type = data[typeIndex].toUpperCase();
        const dateStr = data[dateIndex];
        const date = new Date(dateStr);

        if (isNaN(quantity) || isNaN(price) || isNaN(date.getTime())) {
            console.warn(`Skipping Groww row ${i + 1} due to invalid number or date format.`);
            continue;
        }
        
        if (type !== 'BUY' && type !== 'SELL') continue;

        transactions.push({
            asset: assetName,
            quantity,
            price,
            type: type as 'BUY' | 'SELL',
            date,
            assetType: 'Stock' // Groww CSV is for stocks
        });

        if (!holdings[assetName]) {
            holdings[assetName] = { quantity: 0, totalCost: 0 };
        }

        if (type === 'BUY') {
            holdings[assetName].quantity += quantity;
            holdings[assetName].totalCost += quantity * price;
        } else if (type === 'SELL') {
            const holding = holdings[assetName];
            // Only adjust cost basis if there are shares to sell
            if (holding.quantity > 0) {
                const currentAvgPrice = holding.totalCost / holding.quantity;
                // Reduce cost basis by the average price of shares sold, not the sale price
                holding.totalCost -= quantity * (isNaN(currentAvgPrice) ? price : currentAvgPrice);
            }
            holding.quantity -= quantity;
        }
    }

    const assets: Asset[] = Object.entries(holdings)
        .filter(([, holding]) => holding.quantity > 0.00001)
        .map(([assetName, holding]) => {
            const averagePrice = holding.totalCost / holding.quantity;
            return {
                asset: assetName,
                quantity: holding.quantity,
                purchasePrice: isNaN(averagePrice) ? 0 : averagePrice,
                currentPrice: isNaN(averagePrice) ? 0 : averagePrice, // Placeholder
                assetType: 'Stock',
            };
        });

    return { assets, transactions };
};

export const parseCSV = (csvText: string, template: CsvTemplate = 'default'): ParseResult => {
  if (!csvText) {
    return { assets: [], transactions: [], error: 'The uploaded CSV file is empty.' };
  }
  const lines = csvText.trim().split(/\r?\n/);
  
  switch(template) {
    case 'groww':
      return parseGroww(lines);
    case 'default':
    default:
      return parseDefault(lines);
  }
};
