
import { format } from 'date-fns';
import unzipper from 'unzipper';
import { Readable } from 'stream';

export type BhavcopyRecord = {
    SYMBOL: string;
    SERIES: string;
    OPEN: number;
    HIGH: number;
    LOW: number;
    CLOSE: number;
    LAST: number;
    PREVCLOSE: number;
    TOTTRDQTY: number;
    TOTTRDVAL: number;
    TIMESTAMP: string;
    TOTALTRADES: number;
    ISIN: string;
}

type FetchResult = {
    data: BhavcopyRecord[];
    fileName: string;
}

/**
 * Fetches, unzips, and parses the NSE Bhavcopy for a given date.
 * @param date The date for which to fetch the Bhavcopy.
 * @returns A promise that resolves with the parsed data and the filename.
 */
export async function fetchNseBhavcopy(date: Date): Promise<FetchResult> {
    const day = format(date, 'dd');
    const month = format(date, 'MMM').toUpperCase();
    const year = format(date, 'yyyy');
    
    // Example URL: https://archives.nseindia.com/content/historical/EQUITIES/2024/JUL/cm01JUL2024bhav.csv.zip
    const fileName = `cm${day}${month}${year}bhav.csv`;
    const zipUrl = `https://archives.nseindia.com/content/historical/EQUITIES/${year}/${month}/${fileName}.zip`;

    console.log(`Fetching from URL: ${zipUrl}`);

    const response = await fetch(zipUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/zip',
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to download file from NSE: ${response.statusText} (URL: ${zipUrl})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    return new Promise((resolve, reject) => {
        const readableStream = Readable.from(buffer);
        let csvContent = '';

        readableStream
            .pipe(unzipper.Parse())
            .on('entry', (entry) => {
                const entryFileName = entry.path;
                if (entryFileName === `${fileName}`) {
                    entry.on('data', (chunk) => {
                        csvContent += chunk.toString();
                    });
                    entry.on('end', () => {
                        const parsedData = parseBhavcopyCsv(csvContent);
                        if(parsedData.length > 0) {
                            resolve({ data: parsedData, fileName: entryFileName });
                        } else {
                            reject(new Error('Parsing Bhavcopy CSV resulted in empty data.'));
                        }
                    });
                } else {
                    entry.autodrain();
                }
            })
            .on('error', (err) => {
                 reject(new Error(`Error unzipping file: ${err.message}`));
            });
    });
}


/**
 * Parses the text content of a Bhavcopy CSV file.
 * @param csvText The raw string content of the CSV.
 * @returns An array of BhavcopyRecord objects.
 */
function parseBhavcopyCsv(csvText: string): BhavcopyRecord[] {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const records: BhavcopyRecord[] = [];

    const symbolIdx = headers.indexOf('SYMBOL');
    const seriesIdx = headers.indexOf('SERIES');
    const closeIdx = headers.indexOf('CLOSE');
    const prevCloseIdx = headers.indexOf('PREVCLOSE');

    // Basic validation
    if (symbolIdx === -1 || closeIdx === -1) {
        console.error("CSV headers are missing required columns 'SYMBOL' or 'CLOSE'.");
        return [];
    }

    for (let i = 1; i < lines.length; i++) {
        const data = lines[i].split(',');
        if (data.length < headers.length) continue;
        
        // We only care about the equity series for now
        const series = data[seriesIdx].trim();
        if (series !== 'EQ' && series !== 'BE') continue;

        const record: BhavcopyRecord = {
            SYMBOL: data[symbolIdx].trim(),
            SERIES: series,
            OPEN: parseFloat(data[headers.indexOf('OPEN')]),
            HIGH: parseFloat(data[headers.indexOf('HIGH')]),
            LOW: parseFloat(data[headers.indexOf('LOW')]),
            CLOSE: parseFloat(data[headers.indexOf('CLOSE')]),
            LAST: parseFloat(data[headers.indexOf('LAST')]),
            PREVCLOSE: parseFloat(data[headers.indexOf('PREVCLOSE')]),
            TOTTRDQTY: parseInt(data[headers.indexOf('TOTTRDQTY')], 10),
            TOTTRDVAL: parseFloat(data[headers.indexOf('TOTTRDVAL')]),
            TIMESTAMP: data[headers.indexOf('TIMESTAMP')].trim(),
            TOTALTRADES: parseInt(data[headers.indexOf('TOTALTRADES')], 10),
            ISIN: data[headers.indexOf('ISIN')].trim(),
        };

        records.push(record);
    }
    return records;
}
