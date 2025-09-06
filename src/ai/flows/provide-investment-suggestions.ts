'use server';

/**
 * @fileOverview This file defines a Genkit flow for providing investment suggestions based on user's portfolio data.
 *
 * It uses an LLM to analyze the data and suggest potentially high and low performing sectors.
 *
 * @Exported Members:
 *   - provideInvestmentSuggestions: A function that triggers the investment suggestion flow.
 *   - ProvideInvestmentSuggestionsInput: The input type for the provideInvestmentSuggestions function.
 *   - ProvideInvestmentSuggestionsOutput: The return type for the provideInvestmentSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema for the investment data
const ProvideInvestmentSuggestionsInputSchema = z.object({
  portfolioData: z
    .string()
    .describe(
      'A string containing the user portfolio data, including asset allocations, sector distributions, and performance metrics.  The more detail provided, the better the analysis will be.'
    ),
});
export type ProvideInvestmentSuggestionsInput = z.infer<
  typeof ProvideInvestmentSuggestionsInputSchema
>;

// Define the output schema for the investment suggestions
const ProvideInvestmentSuggestionsOutputSchema = z.object({
  suggestions: z
    .string()
    .describe(
      'A string containing high-level suggestions about possible high and low performing sectors present in the user portfolio data.'
    ),
});
export type ProvideInvestmentSuggestionsOutput = z.infer<
  typeof ProvideInvestmentSuggestionsOutputSchema
>;

// Define the main function that calls the flow
export async function provideInvestmentSuggestions(
  input: ProvideInvestmentSuggestionsInput
): Promise<ProvideInvestmentSuggestionsOutput> {
  return provideInvestmentSuggestionsFlow(input);
}

// Define the prompt
const investmentSuggestionsPrompt = ai.definePrompt({
  name: 'investmentSuggestionsPrompt',
  input: {schema: ProvideInvestmentSuggestionsInputSchema},
  output: {schema: ProvideInvestmentSuggestionsOutputSchema},
  prompt: `You are an expert investment advisor. Analyze the following investment portfolio data and provide high-level suggestions about possible high and low performing sectors. Focus on providing actionable insights that the user can understand at a glance.  Be concise.

Portfolio Data:
{{{portfolioData}}}`,
});

// Define the Genkit flow
const provideInvestmentSuggestionsFlow = ai.defineFlow(
  {
    name: 'provideInvestmentSuggestionsFlow',
    inputSchema: ProvideInvestmentSuggestionsInputSchema,
    outputSchema: ProvideInvestmentSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await investmentSuggestionsPrompt(input);
    return output!;
  }
);
