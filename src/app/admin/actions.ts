
'use server';

import { z } from 'zod';

const stockPriceSchema = z.object({
  "Global Quote": z.object({
    "01. symbol": z.string(),
    "05. price": z.string(),
  }).optional(),
});

export type StockPriceResponse = {
    price?: number;
    error?: string;
    rawData?: any;
}

export async function getStockPrice(symbol: string): Promise<StockPriceResponse> {
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;

  if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
    return { error: 'Alpha Vantage API key is not configured in .env file.' };
  }

  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
        const errorText = await response.text();
        return { error: `API request failed with status ${response.status}: ${errorText}`, rawData: errorText };
    }
    const data = await response.json();

    if (data.Note) {
        return { error: `API Note: ${data.Note}`, rawData: data };
    }

    const parsed = stockPriceSchema.safeParse(data);

    if (!parsed.success || !parsed.data["Global Quote"]) {
      return { error: 'Failed to parse response from Alpha Vantage API.', rawData: data };
    }
    
    const priceStr = parsed.data["Global Quote"]["05. price"];
    const price = parseFloat(priceStr);

    if (isNaN(price)) {
      return { error: 'Could not parse a valid price from the API response.', rawData: data };
    }
    
    return { price, rawData: data };

  } catch (error) {
    console.error("Error fetching stock price:", error);
    if (error instanceof Error) {
        return { error: error.message };
    }
    return { error: 'An unknown error occurred while fetching the stock price.' };
  }
}
