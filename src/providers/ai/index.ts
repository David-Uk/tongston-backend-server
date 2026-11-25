import type { Config } from '../../config/index.js';
import type { AiProvider } from './ai.provider.js';
import { MockProvider } from './mock.provider.js';
import { OpenRouterProvider } from './openrouter.provider.js';

export { ProviderError, type AiProvider } from './ai.provider.js';

export function createAiProvider(config: Config): AiProvider {
  return config.AI_PROVIDER === 'openrouter'
    ? new OpenRouterProvider(config)
    : new MockProvider(config);
}
