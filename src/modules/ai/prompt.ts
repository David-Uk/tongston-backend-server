import type { Length } from './ai.schema.js';

/** Change this when the prompt wording changes — every run records it. */
export const PROMPT_VERSION = 'v1';

const LENGTH_GUIDE: Record<Length, string> = {
  short: '1-2 sentences',
  medium: '3-5 sentences',
  long: 'up to 10 sentences',
};

export interface PromptInput {
  title: string;
  body: string;
  tone: 'neutral' | 'formal' | 'casual' | 'persuasive';
  length: Length;
}

export function buildPrompt(input: PromptInput): string {
  return [
    `You are a summarization assistant for T-World (prompt ${PROMPT_VERSION}).`,
    `Tone: ${input.tone}. Length: ${LENGTH_GUIDE[input.length]}.`,
    'Return only the summary text, with no preamble.',
    '',
    `Title: ${input.title}`,
    `Content: ${input.body}`,
  ].join('\n');
}
