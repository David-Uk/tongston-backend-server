import type { Config } from '../../config/index.js';
import {
  ProviderError,
  type AiProvider,
  type SummarizeInput,
  type SummarizeOutput,
} from './ai.provider.js';

/** Calls OpenRouter's OpenAI-compatible chat completions endpoint. */
export class OpenRouterProvider implements AiProvider {
  readonly name = 'openrouter';

  constructor(private readonly config: Config) {}

  async summarize(input: SummarizeInput, signal: AbortSignal): Promise<SummarizeOutput> {
    const base = this.config.OPENROUTER_BASE_URL.replace(/\/$/, '');
    try {
      const response = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.OPENROUTER_API_KEY}`,
          'HTTP-Referer': this.config.OPENROUTER_SITE_URL,
          'X-OpenRouter-Title': this.config.OPENROUTER_APP_NAME,
        },
        body: JSON.stringify({
          model: this.config.OPENROUTER_MODEL,
          messages: [{ role: 'user', content: input.prompt }],
          stream: false,
          temperature: 0.2,
        }),
        signal,
      });

      if (!response.ok) {
        throw new ProviderError(
          `OpenRouter responded with ${response.status}`,
          response.status === 429 || response.status >= 500,
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      };
      const text = data.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text.trim()) {
        throw new ProviderError(
          data.error?.message ?? 'OpenRouter returned an empty summary',
          true,
        );
      }
      return { text: text.trim() };
    } catch (error) {
      if (error instanceof ProviderError || signal.aborted) throw error;
      throw new ProviderError(`OpenRouter request failed: ${(error as Error).message}`, true);
    }
  }
}
