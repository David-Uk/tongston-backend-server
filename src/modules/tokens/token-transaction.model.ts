import { model, Schema, type InferSchemaType } from 'mongoose';

export const TOKEN_TRANSACTION_TYPES = ['EARN', 'CONVERT', 'WITHDRAW'] as const;

const tokenTransactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: TOKEN_TRANSACTION_TYPES, required: true },
    source: { type: String, required: true },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    referenceId: { type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

tokenTransactionSchema.index({ userId: 1, createdAt: -1 });

export type TokenTransaction = InferSchemaType<typeof tokenTransactionSchema>;
export const TokenTransactionModel = model<TokenTransaction>(
  'TokenTransaction',
  tokenTransactionSchema,
  'token_transactions',
);
