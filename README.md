# InvestView: Your Personal Portfolio Dashboard

InvestView is a sophisticated, interactive web application designed to help users visualize, analyze, and gain insights from their investment portfolios. By uploading a simple CSV file of transaction history, users can unlock a powerful dashboard that brings their investment data to life with live market prices, dynamic charts, and AI-powered suggestions.

![InvestView Dashboard](./public/investview-dashboard.png?raw=true "InvestView Dashboard")

## Key Features

- **Interactive Dashboard**: At a glance, view key performance indicators (KPIs) like total portfolio value, realized and unrealized profit/loss, and transaction counts.
- **Dynamic Info Pane**: The dashboard is a fully interactive cockpit. Click on any KPI or "Top Mover" to dynamically update the main content pane, revealing detailed breakdowns of holdings, transaction logs, and performance metrics for specific assets.
- **Live Price Fetching**: Integrates with the Yahoo Finance API to fetch real-time market prices for your assets, providing an up-to-date valuation of your entire portfolio.
- **Versatile CSV Parsing**:
  - Supports multiple CSV formats, including a generic **Default** template and a specific template for transaction reports from **Groww**.
  - The parsing logic correctly handles different transaction types (BUY/SELL) to aggregate net holdings and calculate average purchase prices and realized profits.
- **AI-Powered Analysis**: Leverages Google's Gemini models via **Genkit** to analyze your portfolio composition and generate high-level investment suggestions, helping you identify potential strengths and weaknesses.
- **Advanced Admin Panel**: A dedicated "cockpit" for power-users and developers. The admin panel provides:
  - Detailed, step-by-step logs of the entire CSV parsing process for easy debugging.
  - A raw data viewer to inspect aggregated assets before they are displayed on the main dashboard.
  - A summary of the live price fetching process, showing which assets were successfully updated and which failed.
- **Modern Tech Stack**: Built with Next.js (App Router), React, and TypeScript for a robust and performant user experience.
- **Polished UI/UX**:
  - Styled with Tailwind CSS and pre-built, production-ready components from **shadcn/ui**.
  - Includes a seamless **Day/Night mode** theme switcher that persists across sessions.
  - Fully responsive design that works beautifully on desktop and mobile devices.

## Tech Stack & Architecture

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **UI Components**: shadcn/ui, Radix UI
- **Styling**: Tailwind CSS
- **Charting**: Recharts
- **AI/Generative**: Google Gemini via Genkit
- **State Management**: React Hooks (useState, useMemo, useEffect) & Context API for theming.
- **Data Persistence**: Browser `localStorage` is used to remember the user's last uploaded portfolio and theme preference, providing a seamless experience across sessions.

### Core Architectural Concepts

1.  **Client-Side Rendering and Processing**: The entire application is client-centric. CSV parsing, portfolio calculations, and state management all happen within the user's browser. This makes the application fast, private, and scalable, as no sensitive financial data is ever sent to a server.
2.  **Server Actions for Data Fetching**: Next.js Server Actions (`'use server'`) are used for the single task of fetching live stock prices from the Yahoo Finance API. This is a secure and efficient way to interact with external data sources without exposing API keys or complex logic to the client.
3.  **Component-Based Design**: The UI is broken down into reusable React components located in `src/components`. This includes UI primitives (`/ui`), dashboard-specific components (`/investview`), and a theme provider.
4.  **Genkit for AI**: AI functionality is neatly encapsulated in `src/ai/flows`. The `provide-investment-suggestions.ts` flow defines the prompt, input/output schemas (using Zod), and the logic for interacting with the Gemini model.

## How It Works: From CSV to Dashboard

1.  **Upload**: The user selects a CSV template (`Default` or `Groww`) and uploads their transaction file.
2.  **Parse**: The `parseCSV` function in `src/lib/csv-parser.ts` reads the text, identifies the data based on the selected template, and processes each row.
    - It aggregates all BUY and SELL transactions to calculate the final quantity and average purchase price for each unique asset.
    - It calculates total realized profit from all SELL transactions.
    - It generates a unique, queryable `asset` ticker (e.g., `RELIANCE.NS`) for API calls.
3.  **Fetch Live Prices**: Once the assets are parsed, a Server Action (`getYahooFinancePrice`) is triggered for each asset. It calls the Yahoo Finance API to get the latest market price.
4.  **Calculate Metrics**: With live prices, the application calculates the final portfolio metrics: total current value, unrealized P/L, top gainers/losers, etc.
5.  **Render Dashboard**: The complete `Portfolio` object is passed to the main page components, which render the KPI cards, charts, and the dynamic "Info Pane."
6.  **Interact**: The user can then click on various UI elements to trigger state updates, which dynamically changes the view in the "Info Pane" to show more granular details.

## Getting Started

To run this project locally:

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Set Up Environment Variables**:
    Create a `.env` file in the root of the project and add your Google AI API key for Genkit to work:
    ```
    GEMINI_API_KEY=YOUR_API_KEY_HERE
    ```
3.  **Run the Development Server**:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:9002`.

---

This project was bootstrapped in **Firebase Studio**.
