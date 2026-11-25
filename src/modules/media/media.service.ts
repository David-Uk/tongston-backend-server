import { Types } from 'mongoose';
import type { Config } from '../../config/index.js';
import type { StorageProvider } from '../../providers/storage/index.js';
import type { AuthUser } from '../../types/express.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UpstreamError,
} from '../../utils/AppError.js';
import { MediaAssetModel } from './media.model.js';

export interface UploadedMediaDto {
  id: string;
  status: string;
  provider: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface PromotedMediaDto {
  id: string;
  status: string;
  provider: string;
  s3Key: string;
  url: string;
}

export async function uploadMedia(
  file: { buffer: Buffer; mimetype: string; size: number },
  ownerId: string,
  config: Config,
  shortTerm: StorageProvider,
): Promise<UploadedMediaDto> {
  if (!config.allowedMimeTypes.includes(file.mimetype)) {
    throw new BadRequestError('Unsupported MIME type');
  }
  if (file.size > config.MAX_UPLOAD_MB * 1024 * 1024) {
    throw new BadRequestError('File is too large');
  }

  const stored = await shortTerm.upload({ data: file.buffer, mimeType: file.mimetype });
  const asset = await MediaAssetModel.create({
    ownerId: new Types.ObjectId(ownerId),
    provider: 'cloudinary',
    publicId: stored.id,
    url: stored.url,
    status: 'TEMP',
    mimeType: file.mimetype,
    size: file.size,
  });

  return {
    id: String(asset._id),
    status: asset.status,
    provider: asset.provider,
    url: asset.url,
    mimeType: asset.mimeType,
    size: asset.size,
  };
}

/** Cloudinary -> long-term storage -> DB update -> delete temporary copy. */
export async function promoteMedia(
  id: string,
  user: AuthUser,
  shortTerm: StorageProvider,
  longTerm: StorageProvider,
): Promise<PromotedMediaDto> {
  const asset = await MediaAssetModel.findById(id);
  if (!asset) throw new NotFoundError('Media asset not found');
  if (String(asset.ownerId) !== user.id && user.role !== 'admin') {
    throw new ForbiddenError('Not your media asset');
  }

  if (asset.status === 'PROMOTED') {
    return {
      id: String(asset._id),
      status: 'PROMOTED',
      provider: 's3',
      s3Key: asset.s3Key!,
      url: asset.url,
    };
  }
  if (asset.status !== 'TEMP') throw new ConflictError('Media asset cannot be promoted');

  let uploadedKey: string | undefined;
  try {
    const data = await shortTerm.fetch(asset.publicId);
    const stored = await longTerm.upload({ data, mimeType: asset.mimeType });
    uploadedKey = stored.id;

    asset.status = 'PROMOTED';
    asset.provider = 's3';
    asset.s3Key = stored.id;
    asset.url = longTerm.getUrl(stored.id);
    await asset.save();

    await shortTerm.delete(asset.publicId);
    return {
      id: String(asset._id),
      status: 'PROMOTED',
      provider: 's3',
      s3Key: stored.id,
      url: asset.url,
    };
  } catch {
    // Keep status TEMP and the Cloudinary original intact for a retry.
    if (uploadedKey) await longTerm.delete(uploadedKey).catch(() => undefined);
    throw new UpstreamError('Media promotion failed');
  }
}
