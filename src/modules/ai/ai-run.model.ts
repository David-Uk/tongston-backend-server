import { model, Schema, type InferSchemaType } from 'mongoose';

export const AI_RUN_STATUSES = ['SUCCESS', 'FALLBACK', 'TIMEOUT', 'FAILED'] as const;

const aiRunSchema = new Schema(
  {
    contentId: { type: Schema.Types.ObjectId, ref: 'Content', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    promptVersion: { type: String, required: true },
    status: { type: String, enum: AI_RUN_STATUSES, required: true },
    output: { type: String, required: true },
    latencyMs: { type: Number, required: true },
    tokensAwarded: { type: Number, required: true, default: 0 },
    reason: { type: String },
  },
  { timestamps: true },
);

aiRunSchema.index({ userId: 1, createdAt: -1 });
aiRunSchema.index({ contentId: 1 });

export type AiRun = InferSchemaType<typeof aiRunSchema>;
export const AiRunModel = model<AiRun>('AiRun', aiRunSchema, 'ai_runs');
