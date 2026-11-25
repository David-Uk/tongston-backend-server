import type { Config } from '../../config/index.js';
import {
  ProviderError,
  type AiProvider,
  type SummarizeInput,
  type SummarizeOutput,
} from './ai.provider.js';

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/** Deterministic provider for demos and tests; no network required. */
export class MockProvider implements AiProvider {
  readonly name = 'mock';

  constructor(private readonly config: Config) {}

  async summarize(input: SummarizeInput, signal: AbortSignal): Promise<SummarizeOutput> {
    await delay(this.config.AI_MOCK_LATENCY_MS, signal);
    if (Math.random() < this.config.AI_MOCK_FAILURE_RATE) {
      throw new ProviderError('Mock provider failure', true);
    }

    const limit = { short: 12, medium: 30, long: 60 }[input.length];
    const words = input.body.trim().split(/\s+/).filter(Boolean).slice(0, limit);
    const text = words.join(' ') || input.title;
    return { text: input.tone === 'formal' ? `Summary: ${text}` : text };
  }
}
