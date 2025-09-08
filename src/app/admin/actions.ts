
'use server';

import { z } from 'zod';

const yahooFinanceResponseSchema = z.object({
    chart: z.object({
        result: z.array(
            z.object({
                meta: z.object({
                    regularMarketPrice: z.number(),
                    currency: z.string(),
                }),
            })
        ).nullable(),
        error: z.object({
            code: z.string(),
            description: z.string(),
        }).nullable(),
    }),
});

type YahooFinanceResult = {
    price?: number;
    currency?: string;
    error?: string;
}

export async function getYahooFinancePrice(symbol: string): Promise<YahooFinanceResult> {
    if (!symbol) {
        return { error: 'Symbol is required.' };
    }
    
    // Convert exchange to Yahoo's suffix format
    const exchange = symbol.split('.').pop()?.toUpperCase();
    let yahooSymbol = symbol;
    if (exchange === 'NSE') {
        yahooSymbol = symbol.replace('.NSE', '.NS');
    } else if (exchange === 'BSE') {
         yahooSymbol = symbol.replace('.BSE', '.BO');
    }


    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d`;
    
    try {
        const response = await fetch(url, {
            // Use a long revalidation time as we are mostly interested in the last day's price
            next: { revalidate: 3600 },
             headers: {
                // Mimic a browser user-agent to avoid being blocked
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { error: `API request failed with status ${response.status}: ${errorText}` };
        }

        const data = await response.json();
        const parsed = yahooFinanceResponseSchema.safeParse(data);

        if (!parsed.success) {
            console.error("Yahoo Finance parsing error:", parsed.error.errors);
            return { error: 'Failed to parse response from Yahoo Finance API.' };
        }

        if (parsed.data.chart.error) {
            return { error: `Yahoo Finance API Error: ${parsed.data.chart.error.description}` };
        }
        
        if (!parsed.data.chart.result || parsed.data.chart.result.length === 0) {
            return { error: 'No results found for the symbol.' };
        }
        
        const price = parsed.data.chart.result[0].meta.regularMarketPrice;
        const currency = parsed.data.chart.result[0].meta.currency;

        return { price, currency };

    } catch (error) {
        console.error("Error fetching Yahoo Finance data:", error);
        if (error instanceof Error) {
            return { error: error.message };
        }
        return { error: 'An unknown error occurred while fetching Yahoo Finance data.' };
    }
}
