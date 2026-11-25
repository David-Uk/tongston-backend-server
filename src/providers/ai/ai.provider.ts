import type { Length, Tone } from '../../modules/ai/ai.schema.js';

export interface SummarizeInput {
  title: string;
  body: string;
  tone: Tone;
  length: Length;
  prompt: string;
}

export interface SummarizeOutput {
  text: string;
}

export interface AiProvider {
  readonly name: string;
  summarize(input: SummarizeInput, signal: AbortSignal): Promise<SummarizeOutput>;
}

/** `transient` tells the orchestrator whether a retry can help. */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly transient: boolean,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
