# CSV Data Import Guide

This document explains how the CSV parsing and data transformation works within the InvestView application. The goal is to take a raw transaction CSV and convert it into a structured format that can be used to analyze a portfolio and fetch live market data.

## Key Transformation: Ticker Generation

The most critical step in the process is generating a valid ticker symbol that can be used with the Yahoo Finance API. Yahoo Finance requires tickers to be in a specific format, especially for international markets like India's NSE and BSE.

- **National Stock Exchange (NSE)**: Tickers must end with a `.NS` suffix (e.g., `RELIANCE.NS`).
- **Bombay Stock Exchange (BSE)**: Tickers must end with a `.BO` suffix (e.g., `TCS.BO`).

Our parser's primary job is to correctly construct this ticker from the data provided in your CSV file.

## Supported CSV Templates

The application provides two primary CSV templates: `Default` and `Groww`.

### 1. Default Template

This is a generic template designed for flexibility.

**Required Columns:**
- `Symbol`: The stock symbol (e.g., `AAPL`, `RELIANCE`).
- `Exchange`: The stock exchange identifier (e.g., `NASDAQ`, `NSE`, `BSE`).
- `Quantity`: The number of shares in the transaction.
- `PurchasePrice`: The price per share for that transaction.
- `AssetType`: The type of asset (e.g., `Stock`, `Cryptocurrency`).

**Ticker Construction Logic:**
The parser concatenates the `Symbol` and `Exchange` columns with a period.
`Ticker = {Symbol}.{Exchange}`

**Example:**
If a row in your CSV is `RELIANCE,NSE,...`, the resulting Yahoo Finance ticker will be `RELIANCE.NSE`. The application's server-side action will then automatically convert this to the required `RELIANCE.NS` before making the API call.

### 2. Groww Template

This template is specifically configured for transaction reports downloaded from the Groww platform. Since Groww reports may have different column names, the Admin Panel provides a **Schema Configuration** section where you can map the column names in your file to the fields the application needs.

**Default Column Mapping:**
- **displayName**: `Stock name` (The full name of the company, e.g., "Reliance Industries Ltd")
- **symbol**: `Symbol` (The short ticker symbol, e.g., "RELIANCE")
- **exchange**: `Exchange` (The exchange, e.g., "NSE" or "BSE")
- **type**: `Type` (Buy or Sell)
- **quantity**: `Quantity`
- **price**: `Price` (This is the total transaction value in Groww reports)
- **date**: `Execution date and time`
- **status**: `Order status` (Only `EXECUTED` orders are processed)

**Ticker Construction Logic:**
Just like the default template, the parser concatenates the column you've mapped to `symbol` and the one you've mapped to `exchange`.
`Ticker = {Symbol}.{Exchange}`

It is crucial that your Groww CSV contains columns for both the stock symbol and its exchange so the parser can build the correct query ticker. If your file's columns are named differently (e.g., "Ticker" instead of "Symbol"), you must update the mapping in the Admin Panel's "Groww Schema Configuration" section before uploading your file.

    