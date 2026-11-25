import { mockTxHash } from '../../modules/tokens/tx-hash.js';
import type { ChainClient, ChainReceipt } from './chain.client.js';

export class MockChainClient implements ChainClient {
  readonly network = 'Ethereum';

  constructor(private readonly secret: string) {}

  async confirm(referenceId: string): Promise<ChainReceipt> {
    return { network: this.network, txHashMock: mockTxHash(referenceId, this.secret) };
  }

  async withdraw(referenceId: string): Promise<ChainReceipt> {
    return {
      network: this.network,
      txHashMock: mockTxHash(`${referenceId}:withdraw`, this.secret),
    };
  }
}
