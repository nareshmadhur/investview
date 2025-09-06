export type Asset = {
  asset: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  assetType: 'Stock' | 'Cryptocurrency' | 'Commodity';
};

export type Portfolio = {
  assets: Asset[];
  totalCost: number;
};
