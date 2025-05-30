'use server';
/**
 * @fileOverview An AI agent to suggest an appropriate self-destruct timer duration for a group.
 *
 * - suggestSelfDestructTimer - A function that suggests the timer duration.
 * - SuggestSelfDestructTimerInput - The input type for the suggestSelfDestructTimer function.
 * - SuggestSelfDestructTimerOutput - The return type for the suggestSelfDestructTimer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestSelfDestructTimerInputSchema = z.object({
  topic: z.string().describe('The topic of the group chat.'),
  memberCount: z.number().describe('The number of members in the group.'),
});
export type SuggestSelfDestructTimerInput = z.infer<
  typeof SuggestSelfDestructTimerInputSchema
>;

const SuggestSelfDestructTimerOutputSchema = z.object({
  durationDays: z
    .number()
    .describe(
      'The suggested duration for the self-destruct timer, in days. Must be an integer between 1 and 31 inclusive.'
    ),
  reasoning: z.string().describe('The reasoning behind the suggested duration.'),
});
export type SuggestSelfDestructTimerOutput = z.infer<
  typeof SuggestSelfDestructTimerOutputSchema
>;

export async function suggestSelfDestructTimer(
  input: SuggestSelfDestructTimerInput
): Promise<SuggestSelfDestructTimerOutput> {
  return suggestSelfDestructTimerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestSelfDestructTimerPrompt',
  input: {schema: SuggestSelfDestructTimerInputSchema},
  output: {schema: SuggestSelfDestructTimerOutputSchema},
  prompt: `You are an AI assistant helping to determine a reasonable self-destruct timer duration for a group chat.

  Consider the following factors:
  *   The topic of the group chat. Sensitive or time-sensitive topics may warrant shorter durations.
  *   The number of members in the group. Larger groups may benefit from slightly longer durations to allow everyone to see the messages.
  *   The duration must be between 1 and 31 days inclusive.

  Given the following information, suggest an appropriate duration in days and explain your reasoning.

  Topic: {{{topic}}}
  Number of Members: {{{memberCount}}}

  Respond in the following JSON format:
  {
    "durationDays": <number>,
    "reasoning": <string>
  }`,
});

const suggestSelfDestructTimerFlow = ai.defineFlow(
  {
    name: 'suggestSelfDestructTimerFlow',
    inputSchema: SuggestSelfDestructTimerInputSchema,
    outputSchema: SuggestSelfDestructTimerOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
