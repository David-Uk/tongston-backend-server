import { createHash } from 'node:crypto';
import type { ClientSession } from 'mongoose';
import { TokenTransactionModel } from './token-transaction.model.js';

export const GENESIS_HASH = '0'.repeat(64);

export interface LedgerInput {
  userId: string;
  type: 'EARN' | 'CONVERT' | 'WITHDRAW';
  source: string;
  amount: number;
  balanceAfter: number;
  referenceId?: string;
}

function hashEntry(input: LedgerInput & { prevHash: string; createdAt: Date }): string {
  const payload = [
    input.prevHash,
    String(input.userId),
    input.type,
    input.source,
    input.amount,
    input.balanceAfter,
    input.referenceId ?? '',
    input.createdAt.toISOString(),
  ].join('|');
  return createHash('sha256').update(payload).digest('hex');
}

/** Appends one row, linking it to the previous row for this user. */
export async function appendLedgerEntry(input: LedgerInput, session: ClientSession) {
  const last = await TokenTransactionModel.findOne({ userId: input.userId })
    .sort({ createdAt: -1, _id: -1 })
    .select('hash')
    .session(session);
  const prevHash = last?.hash ?? GENESIS_HASH;
  const createdAt = new Date();
  const hash = hashEntry({ ...input, prevHash, createdAt });

  const [doc] = await TokenTransactionModel.create([{ ...input, prevHash, hash, createdAt }], {
    session,
  });
  return doc;
}

/** Recomputes the chain; any mismatch means the ledger was altered. */
export async function verifyLedger(userId: string): Promise<{ valid: boolean; checked: number }> {
  const entries = await TokenTransactionModel.find({ userId }).sort({ createdAt: 1, _id: 1 });
  let previous = GENESIS_HASH;

  for (const entry of entries) {
    const expected = hashEntry({
      userId: String(entry.userId),
      type: entry.type as LedgerInput['type'],
      source: entry.source,
      amount: entry.amount,
      balanceAfter: entry.balanceAfter,
      referenceId: entry.referenceId ? String(entry.referenceId) : undefined,
      prevHash: previous,
      createdAt: entry.createdAt,
    });
    if (entry.prevHash !== previous || entry.hash !== expected) {
      return { valid: false, checked: entries.length };
    }
    previous = entry.hash;
  }

  return { valid: true, checked: entries.length };
}
