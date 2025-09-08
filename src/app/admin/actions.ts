
'use server';

import { z } from 'zod';

// Zod schema for Alpha Vantage API response
const stockPriceSchema = z.object({
  "Global Quote": z.object({
    "01. symbol": z.string(),
    "05. price": z.string(),
  }).optional(),
});

export type ApiResponse = {
    price?: number;
    error?: string;
    rawData?: any;
}

/**
 * Fetches the stock price from Alpha Vantage.
 * @param symbol The stock symbol, e.g., 'RELIANCE.BSE' or 'IBM'
 */
export async function getStockPrice(symbol: string): Promise<ApiResponse> {
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

/**
 * Scrapes the stock price from Yahoo Finance.
 * Note: This is fragile and may break if Yahoo changes its website structure.
 * @param symbol The stock symbol, e.g., 'RELIANCE.NS' or 'AAPL'
 */
export async function scrapeYahooFinancePrice(symbol: string): Promise<ApiResponse> {
    const url = `https://finance.yahoo.com/quote/${symbol}`;
    const headers = {
        // Use a common user agent to mimic a browser
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
            const errorText = await response.text();
            return { error: `Failed to fetch page with status ${response.status}.`, rawData: errorText };
        }
        
        const html = await response.text();
        
        // This is a very fragile method to find the price.
        // It looks for a specific data attribute near the price.
        const regex = new RegExp(`data-symbol="${symbol.toUpperCase()}"[^>]*?data-field="regularMarketPrice"[^>]*?value="([^"]+)"`);
        const match = html.match(regex);
        
        if (match && match[1]) {
            const price = parseFloat(match[1].replace(/,/g, ''));
            if (!isNaN(price)) {
                return { price, rawData: html };
            }
        }

        return { error: 'Could not find or parse the price from the Yahoo Finance page. The website structure may have changed.', rawData: html };

    } catch (error) {
        console.error("Error scraping Yahoo Finance:", error);
        if (error instanceof Error) {
            return { error: error.message };
        }
        return { error: 'An unknown error occurred while scraping Yahoo Finance.' };
    }
}
