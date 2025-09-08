
'use server';

import type { EodhdRecord, EodhdResult } from '@/types';
import { eodhdResponseSchema } from '@/types';


/**
 * Fetches the end-of-day bulk data for a given exchange from EODHD.
 * @param exchange The stock exchange code (e.g., 'NSE', 'BSE').
 */
export async function getEodhdLastDayData(exchange: 'NSE' | 'BSE'): Promise<EodhdResult> {
    const apiKey = process.env.EODHD_API_KEY;

    if (!apiKey || apiKey === "YOUR_API_KEY") {
        return { error: 'EODHD API key is not configured in .env file. Please add EODHD_API_KEY.' };
    }

    const url = `https://eodhd.com/api/eod-bulk-last-day/${exchange}?api_token=${apiKey}&fmt=json`;
    
    try {
        const response = await fetch(url, {
            // Using next: { revalidate: 3600 } to cache the result for 1 hour
            // This is a good practice for data that doesn't change frequently like EOD data
            next: { revalidate: 3600 }
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { error: `API request failed with status ${response.status}: ${errorText}` };
        }

        const data = await response.json();
        const parsed = eodhdResponseSchema.safeParse(data);

        if (!parsed.success) {
            console.error("EODHD parsing error:", parsed.error.errors);
            return { error: 'Failed to parse response from EODHD API.' };
        }
        
        return { data: parsed.data };

    } catch (error) {
        console.error("Error fetching EODHD data:", error);
        if (error instanceof Error) {
            return { error: error.message };
        }
        return { error: 'An unknown error occurred while fetching EODHD data.' };
    }
}
