export type Transaction = {
  asset: string;
  quantity: number;
  price: number;
  type: 'BUY' | 'SELL';
  date: Date;
  assetType: 'Stock' | 'Cryptocurrency' | 'Commodity';
};

export type Asset = {
  asset: string;
  quantity: number;
  purchasePrice: number; // Average purchase price
  currentPrice: number; // Placeholder for now
  assetType: 'Stock' | 'Cryptocurrency' | 'Commodity';
};

export type Portfolio = {
  assets: Asset[];
  transactions: Transaction[];
  totalCost: number; // Net invested value of current holdings
  currency: 'USD' | 'INR';
};

export type GrowwSchemaMapping = {
  asset: string;
  type: string;
  quantity: string;
  price: string;
  date: string;
  status: string;
};
