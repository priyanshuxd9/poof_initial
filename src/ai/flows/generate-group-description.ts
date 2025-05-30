// 'use server'
'use server';
/**
 * @fileOverview Generates a creative and engaging description for a group using AI.
 *
 * - generateGroupDescription - A function that generates a group description.
 * - GenerateGroupDescriptionInput - The input type for the generateGroupDescription function.
 * - GenerateGroupDescriptionOutput - The return type for the generateGroupDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateGroupDescriptionInputSchema = z.object({
  groupName: z.string().describe('The name of the group.'),
  groupPurpose: z.string().describe('The purpose of the group.'),
  groupTheme: z.string().describe('The theme of the group.'),
});
export type GenerateGroupDescriptionInput = z.infer<
  typeof GenerateGroupDescriptionInputSchema
>;

const GenerateGroupDescriptionOutputSchema = z.object({
  description: z.string().describe('A creative and engaging description for the group.'),
});
export type GenerateGroupDescriptionOutput = z.infer<
  typeof GenerateGroupDescriptionOutputSchema
>;

export async function generateGroupDescription(
  input: GenerateGroupDescriptionInput
): Promise<GenerateGroupDescriptionOutput> {
  return generateGroupDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateGroupDescriptionPrompt',
  input: {schema: GenerateGroupDescriptionInputSchema},
  output: {schema: GenerateGroupDescriptionOutputSchema},
  prompt: `You are a creative copywriter who specializes in writing engaging descriptions for groups and communities.

  Given the following information about a group, generate a creative and engaging description that will attract new members and clearly convey the group's purpose. The group description should be short and catchy.

  Group Name: {{{groupName}}}
  Group Purpose: {{{groupPurpose}}}
  Group Theme: {{{groupTheme}}}
  `,
});

const generateGroupDescriptionFlow = ai.defineFlow(
  {
    name: 'generateGroupDescriptionFlow',
    inputSchema: GenerateGroupDescriptionInputSchema,
    outputSchema: GenerateGroupDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
