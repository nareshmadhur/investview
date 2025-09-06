import { type Asset } from '@/types';

export type CsvTemplate = 'default' | 'groww';

const parseDefault = (lines: string[]): Asset[] => {
  if (lines.length < 2) {
    throw new Error('CSV file must contain a header row and at least one data row.');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const assets: Asset[] = [];

  const requiredHeaders = ['Asset', 'Quantity', 'PurchasePrice', 'CurrentPrice', 'AssetType'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(`Invalid CSV headers. Missing required headers: ${missingHeaders.join(', ')}`);
  }

  const assetIndex = headers.indexOf('Asset');
  const quantityIndex = headers.indexOf('Quantity');
  const purchasePriceIndex = headers.indexOf('PurchasePrice');
  const currentPriceIndex = headers.indexOf('CurrentPrice');
  const assetTypeIndex = headers.indexOf('AssetType');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue; // Skip empty lines
    
    const data = line.split(',');
    if (data.length !== headers.length) {
       console.warn(`Skipping malformed row ${i + 1}: Expected ${headers.length} columns, but got ${data.length}.`);
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
  }
  return assets;
}

const parseGroww = (lines: string[]): Asset[] => {
    if (lines.length < 2) {
        throw new Error('Groww CSV file must contain a header row and at least one data row.');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    const requiredHeaders = ['Stock name', 'Quantity', 'Price', 'Type'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
        throw new Error(`Invalid Groww CSV headers. Missing required headers: ${missingHeaders.join(', ')}`);
    }

    const assetIndex = headers.indexOf('Stock name');
    const quantityIndex = headers.indexOf('Quantity');
    const priceIndex = headers.indexOf('Price');
    const typeIndex = headers.indexOf('Type');

    const holdings: Record<string, { quantity: number; totalCost: number }> = {};

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const data = line.split(',');
        if (data.length < headers.length) {
            console.warn(`Skipping malformed Groww row ${i + 1}: Expected ${headers.length} columns, but got ${data.length}.`);
            continue;
        }

        const assetName = data[assetIndex].trim().replace(/"/g, '');
        const quantity = parseFloat(data[quantityIndex]);
        const price = parseFloat(data[priceIndex]);
        const type = data[typeIndex].trim().replace(/"/g, '');

        if (isNaN(quantity) || isNaN(price)) {
            console.warn(`Skipping Groww row ${i + 1} due to invalid number format.`);
            continue;
        }

        if (!holdings[assetName]) {
            holdings[assetName] = { quantity: 0, totalCost: 0 };
        }

        if (type.toUpperCase() === 'BUY') {
            holdings[assetName].quantity += quantity;
            holdings[assetName].totalCost += quantity * price;
        } else if (type.toUpperCase() === 'SELL') {
            const currentAvgPrice = holdings[assetName].totalCost / holdings[assetName].quantity;
            holdings[assetName].quantity -= quantity;
            holdings[assetName].totalCost -= quantity * (isNaN(currentAvgPrice) ? price : currentAvgPrice);
        }
    }

    const assets: Asset[] = Object.entries(holdings)
        .filter(([, holding]) => holding.quantity > 0.00001) // Filter out sold-off or tiny residual holdings
        .map(([assetName, holding]) => {
            const averagePrice = holding.totalCost / holding.quantity;
            return {
                asset: assetName,
                quantity: holding.quantity,
                purchasePrice: isNaN(averagePrice) ? 0 : averagePrice,
                currentPrice: isNaN(averagePrice) ? 0 : averagePrice, // Using average as placeholder
                assetType: 'Stock',
            };
        });

    return assets;
};


export const parseCSV = (csvText: string, template: CsvTemplate = 'default'): Asset[] => {
  if (!csvText) {
    return [];
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
