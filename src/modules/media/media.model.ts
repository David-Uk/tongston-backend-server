import { model, Schema, type InferSchemaType } from 'mongoose';

export const MEDIA_STATUSES = ['TEMP', 'PROMOTED', 'FAILED'] as const;

const mediaAssetSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, enum: ['cloudinary', 's3'], required: true },
    publicId: { type: String, required: true },
    url: { type: String, required: true },
    status: { type: String, enum: MEDIA_STATUSES, required: true },
    s3Key: { type: String },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { timestamps: true },
);

mediaAssetSchema.index({ ownerId: 1, createdAt: -1 });

export type MediaAsset = InferSchemaType<typeof mediaAssetSchema>;
export const MediaAssetModel = model<MediaAsset>('MediaAsset', mediaAssetSchema, 'media_assets');
