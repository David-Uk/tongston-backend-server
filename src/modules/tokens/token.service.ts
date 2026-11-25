import { Types, type FilterQuery } from 'mongoose';
import type { Config } from '../../config/index.js';
import { withTransaction } from '../../db/transaction.js';
import type { ChainClient } from '../../providers/chain/chain.client.js';
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
} from '../../utils/AppError.js';
import { UserModel } from '../auth/user.model.js';
import {
  ContractConversionModel,
  MOCK_ASSETS,
  type ContractConversion,
} from './contract-conversion.model.js';
import { appendLedgerEntry, verifyLedger } from './ledger.js';
import { formatConvertedAmount } from './rates.js';
import type {
  ConvertInput,
  GrantInput,
  HistoryInput,
  PaginationInput,
  WithdrawInput,
} from './token.schema.js';
import { TokenTransactionModel, type TokenTransaction } from './token-transaction.model.js';

export interface LedgerDto {
  id: string;
  type: string;
  source: string;
  amount: number;
  balanceAfter: number;
  referenceId?: string;
  createdAt: Date;
}

export interface ConversionDto {
  id: string;
  toAsset: string;
  amount: number;
  convertedAmount: string;
  status: string;
  txHashMock: string;
  createdAt: Date;
}

export interface Page<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const isDuplicateKey = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;

const toLedgerDto = (row: TokenTransaction & { _id: Types.ObjectId }): LedgerDto => ({
  id: String(row._id),
  type: row.type,
  source: row.source,
  amount: row.amount,
  balanceAfter: row.balanceAfter,
  referenceId: row.referenceId ? String(row.referenceId) : undefined,
  createdAt: row.createdAt,
});

const toConversionDto = (row: ContractConversion & { _id: Types.ObjectId }): ConversionDto => ({
  id: String(row._id),
  toAsset: row.toAsset,
  amount: row.amount,
  convertedAmount: row.convertedAmount,
  status: row.status,
  txHashMock: row.txHashMock,
  createdAt: row.createdAt,
});

export async function getBalance(
  userId: string,
): Promise<{ userId: string; tokenBalance: number }> {
  const user = await UserModel.findById(userId).select('tokenBalance');
  if (!user) throw new NotFoundError('User not found');
  return { userId, tokenBalance: user.tokenBalance };
}

export async function listHistory(userId: string, input: HistoryInput): Promise<Page<LedgerDto>> {
  const filter: FilterQuery<TokenTransaction> = { userId: new Types.ObjectId(userId) };
  if (input.type) filter.type = input.type;

  const skip = (input.page - 1) * input.limit;
  const [rows, total] = await Promise.all([
    TokenTransactionModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(input.limit),
    TokenTransactionModel.countDocuments(filter),
  ]);

  return {
    data: rows.map(toLedgerDto),
    meta: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.ceil(total / input.limit),
    },
  };
}

export async function listConversions(userId: string): Promise<ConversionDto[]> {
  const rows = await ContractConversionModel.find({ userId: new Types.ObjectId(userId) }).sort({
    createdAt: -1,
    _id: -1,
  });
  return rows.map(toConversionDto);
}

export async function convert(
  userId: string,
  input: ConvertInput,
  idempotencyKey: string | undefined,
  config: Config,
  chain: ChainClient,
) {
  if (!MOCK_ASSETS.includes(input.toAsset)) throw new BadRequestError('Invalid toAsset');
  if (input.amount < config.MIN_CONVERT_AMOUNT) {
    throw new BadRequestError(`Minimum conversion is ${config.MIN_CONVERT_AMOUNT} tokens`);
  }
  if (
    idempotencyKey &&
    (await ContractConversionModel.exists({ idempotencyKey, userId: new Types.ObjectId(userId) }))
  ) {
    throw new ConflictError('Idempotency key already used');
  }

  try {
    return await withTransaction(async (session) => {
      // Conditional decrement prevents double-spend under concurrent requests.
      const user = await UserModel.findOneAndUpdate(
        { _id: userId, tokenBalance: { $gte: input.amount } },
        { $inc: { tokenBalance: -input.amount } },
        { new: true, session },
      );
      if (!user) {
        throw new UnprocessableError(
          'INSUFFICIENT_BALANCE',
          'Balance is lower than the requested amount',
        );
      }

      const conversionId = new Types.ObjectId();
      const receipt = await chain.confirm(String(conversionId));
      const [conversion] = await ContractConversionModel.create(
        [
          {
            _id: conversionId,
            userId: new Types.ObjectId(userId),
            toAsset: input.toAsset,
            amount: input.amount,
            convertedAmount: formatConvertedAmount(input.amount, input.toAsset, config),
            status: 'CONFIRMED',
            txHashMock: receipt.txHashMock,
            idempotencyKey,
          },
        ],
        { session },
      );

      await appendLedgerEntry(
        {
          userId,
          type: 'CONVERT',
          source: 'CONVERSION',
          amount: -input.amount,
          balanceAfter: user.tokenBalance,
          referenceId: String(conversion._id),
        },
        session,
      );

      return {
        conversionId: String(conversion._id),
        txHashMock: receipt.txHashMock,
        convertedAmount: conversion.convertedAmount,
        status: 'CONFIRMED',
        totalTokenBalance: user.tokenBalance,
      };
    });
  } catch (error) {
    if (isDuplicateKey(error)) throw new ConflictError('Idempotency key already used');
    throw error;
  }
}

export async function withdraw(
  userId: string,
  input: WithdrawInput,
  idempotencyKey: string | undefined,
  chain: ChainClient,
) {
  const conversion = await ContractConversionModel.findById(input.conversionId);
  if (!conversion) throw new NotFoundError('Conversion not found');
  if (String(conversion.userId) !== userId) throw new ForbiddenError('Not your conversion');
  if (
    idempotencyKey &&
    (await ContractConversionModel.exists({
      withdrawIdempotencyKey: idempotencyKey,
      userId: new Types.ObjectId(userId),
    }))
  ) {
    throw new ConflictError('Idempotency key already used');
  }
  if (conversion.status === 'WITHDRAWN') {
    throw new AppError(409, 'ALREADY_WITHDRAWN', 'Conversion already withdrawn');
  }
  if (conversion.status !== 'CONFIRMED') throw new ConflictError('Conversion cannot be withdrawn');

  try {
    return await withTransaction(async (session) => {
      // Conditional status update makes a second withdraw impossible.
      const updated = await ContractConversionModel.findOneAndUpdate(
        {
          _id: input.conversionId,
          userId: new Types.ObjectId(userId),
          status: 'CONFIRMED',
        },
        {
          $set: {
            status: 'WITHDRAWN',
            ...(idempotencyKey ? { withdrawIdempotencyKey: idempotencyKey } : {}),
          },
        },
        { new: true, session },
      );
      if (!updated) throw new AppError(409, 'ALREADY_WITHDRAWN', 'Conversion already withdrawn');

      const user = await UserModel.findById(userId).select('tokenBalance').session(session);
      const receipt = await chain.withdraw(String(updated._id));
      await appendLedgerEntry(
        {
          userId,
          type: 'WITHDRAW',
          source: 'WITHDRAWAL',
          amount: 0,
          balanceAfter: user?.tokenBalance ?? 0,
          referenceId: String(updated._id),
        },
        session,
      );

      return { status: 'SUCCESS', network: receipt.network, txHashMock: receipt.txHashMock };
    });
  } catch (error) {
    if (isDuplicateKey(error)) throw new ConflictError('Idempotency key already used');
    throw error;
  }
}

export async function grantTokens(input: GrantInput) {
  return withTransaction(async (session) => {
    const user = await UserModel.findByIdAndUpdate(
      input.userId,
      { $inc: { tokenBalance: input.amount } },
      { new: true, session },
    );
    if (!user) throw new NotFoundError('User not found');
    await appendLedgerEntry(
      {
        userId: input.userId,
        type: 'EARN',
        source: 'SYSTEM',
        amount: input.amount,
        balanceAfter: user.tokenBalance,
      },
      session,
    );
    return { userId: input.userId, tokenBalance: user.tokenBalance };
  });
}

export async function listUsers(input: PaginationInput): Promise<Page<unknown>> {
  const skip = (input.page - 1) * input.limit;
  const [users, total] = await Promise.all([
    UserModel.find().sort({ createdAt: -1, _id: -1 }).skip(skip).limit(input.limit),
    UserModel.countDocuments(),
  ]);
  return {
    data: users.map((user) => user.toJSON()),
    meta: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.ceil(total / input.limit),
    },
  };
}

export function verifyUserLedger(userId: string): Promise<{ valid: boolean; checked: number }> {
  return verifyLedger(userId);
}
