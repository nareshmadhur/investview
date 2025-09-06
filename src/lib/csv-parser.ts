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

  const headers = lines[0].split(',').map(h => h.trim());
  const assets: Asset[] = [];

  const requiredHeaders = ['Stock name', 'Quantity', 'Price'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(`Invalid Groww CSV headers. Missing required headers: ${missingHeaders.join(', ')}`);
  }
  
  const assetIndex = headers.indexOf('Stock name');
  const quantityIndex = headers.indexOf('Quantity');
  const priceIndex = headers.indexOf('Price');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const data = line.split(',');
    if (data.length !== headers.length) {
       console.warn(`Skipping malformed Groww row ${i + 1}: Expected ${headers.length} columns, but got ${data.length}.`);
       continue;
    }

    const quantity = parseFloat(data[quantityIndex]);
    const price = parseFloat(data[priceIndex]);
    
    if (isNaN(quantity) || isNaN(price)) {
      console.warn(`Skipping Groww row ${i + 1} due to invalid number format.`);
      continue;
    }

    assets.push({
      asset: data[assetIndex].trim(),
      quantity,
      purchasePrice: price,
      currentPrice: price,
      assetType: 'Stock',
    });
  }
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