export interface ChainReceipt {
  network: string;
  txHashMock: string;
}

/** Swap this for a real chain adapter without touching the token service. */
export interface ChainClient {
  readonly network: string;
  confirm(referenceId: string): Promise<ChainReceipt>;
  withdraw(referenceId: string): Promise<ChainReceipt>;
}
