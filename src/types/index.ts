import { z } from 'zod';

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
  currentPrice: number;
  assetType: 'Stock' | 'Cryptocurrency' | 'Commodity';
};

export type Portfolio = {
  assets: Asset[];
  transactions: Transaction[];
  totalCost: number; // Net invested value of current holdings
  currency: 'USD' | 'INR';
  realizedProfit?: number;
};

export type GrowwSchemaMapping = {
  asset: string;
  type: string;
  quantity: string;
  price: string;
  date: string;
  status: string;
};

export type StructuredLog = {
    step: string;
    action: string;
    details: string;
    result: string;
}

export type AssetLog = {
  logs: StructuredLog[];
  transactions: Transaction[];
}

export type ParsingLogs = {
  setup: string[];
  assetLogs: Record<string, AssetLog>;
  summary: string[];
}

    