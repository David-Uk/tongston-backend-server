import type { Config } from '../../config/index.js';
import type { ChainClient } from './chain.client.js';
import { MockChainClient } from './mock-chain.client.js';

export type { ChainClient, ChainReceipt } from './chain.client.js';

export function createChainClient(config: Config): ChainClient {
  return new MockChainClient(config.JWT_SECRET);
}
