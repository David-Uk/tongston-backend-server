import type { Config } from '../../config/index.js';
import type { MockAsset } from './contract-conversion.model.js';

/** Tokens needed for one unit of the mock asset (all values come from env). */
export function tokensPerUnit(config: Config, asset: MockAsset): number {
  return asset === 'MOCK_USDT' ? config.RATE_TOKENS_PER_MOCK_USDT : config.RATE_TOKENS_PER_MOCK_ETH;
}

export function formatConvertedAmount(amount: number, asset: MockAsset, config: Config): string {
  const value = amount / tokensPerUnit(config, asset);
  const decimals = asset === 'MOCK_USDT' ? 1 : 2;
  return `${value.toFixed(decimals)} ${asset}`;
}
