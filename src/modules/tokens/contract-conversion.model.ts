import { model, Schema, type InferSchemaType } from 'mongoose';

export const MOCK_ASSETS = ['MOCK_USDT', 'MOCK_ETH'] as const;
export const CONVERSION_STATUSES = ['PENDING', 'CONFIRMED', 'WITHDRAWN', 'FAILED'] as const;
export type MockAsset = (typeof MOCK_ASSETS)[number];

const contractConversionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toAsset: { type: String, enum: MOCK_ASSETS, required: true },
    amount: { type: Number, required: true },
    convertedAmount: { type: String, required: true },
    status: { type: String, enum: CONVERSION_STATUSES, default: 'PENDING', required: true },
    txHashMock: { type: String, required: true },
    idempotencyKey: { type: String },
    withdrawIdempotencyKey: { type: String },
  },
  { timestamps: true },
);

contractConversionSchema.index({ userId: 1, createdAt: -1 });
contractConversionSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
contractConversionSchema.index({ withdrawIdempotencyKey: 1 }, { unique: true, sparse: true });

export type ContractConversion = InferSchemaType<typeof contractConversionSchema>;
export const ContractConversionModel = model<ContractConversion>(
  'ContractConversion',
  contractConversionSchema,
  'contract_conversions',
);
