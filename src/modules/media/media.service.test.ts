import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaAssetModel } from './media.model.js';
import { promoteMedia } from './media.service.js';

vi.mock('./media.model.js', () => ({ MediaAssetModel: { findById: vi.fn() } }));

const user = {
  id: '507f1f77bcf86cd799439012',
  email: 'user@example.com',
  role: 'user' as const,
  tokenBalance: 0,
};

const makeAsset = (status: string) => ({
  _id: '507f1f77bcf86cd799439011',
  ownerId: user.id,
  publicId: 't-world/asset',
  url: 'https://res.cloudinary.com/example',
  status,
  mimeType: 'image/png',
  s3Key: status === 'PROMOTED' ? 'media/2026/11/asset.png' : undefined,
  save: vi.fn().mockResolvedValue(undefined),
});

const shortTerm = {
  fetch: vi.fn().mockResolvedValue(Buffer.from('file bytes')),
  delete: vi.fn().mockResolvedValue(undefined),
};
const longTerm = {
  upload: vi
    .fn()
    .mockResolvedValue({ id: 'media/2026/11/asset.png', url: 'mock-s3://media/asset.png' }),
  getUrl: vi.fn((id: string) => `mock-s3://${id}`),
  delete: vi.fn().mockResolvedValue(undefined),
};

describe('promoteMedia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    longTerm.upload.mockResolvedValue({
      id: 'media/2026/11/asset.png',
      url: 'mock-s3://media/asset.png',
    });
  });

  it('returns the current record for an already promoted asset', async () => {
    vi.mocked(MediaAssetModel.findById).mockResolvedValue(makeAsset('PROMOTED'));
    const result = await promoteMedia('507f1f77bcf86cd799439011', user, shortTerm, longTerm);

    expect(result.status).toBe('PROMOTED');
    expect(shortTerm.fetch).not.toHaveBeenCalled();
  });

  it('copies to long-term storage, saves then deletes the temporary copy', async () => {
    const asset = makeAsset('TEMP');
    vi.mocked(MediaAssetModel.findById).mockResolvedValue(asset);
    const result = await promoteMedia('507f1f77bcf86cd799439011', user, shortTerm, longTerm);

    expect(result.provider).toBe('s3');
    expect(result.s3Key).toBe('media/2026/11/asset.png');
    expect(asset.status).toBe('PROMOTED');
    expect(asset.save).toHaveBeenCalled();
    expect(shortTerm.delete).toHaveBeenCalledWith('t-world/asset');
  });

  it('keeps the asset TEMP and the original when the transfer fails', async () => {
    const asset = makeAsset('TEMP');
    vi.mocked(MediaAssetModel.findById).mockResolvedValue(asset);
    longTerm.upload.mockRejectedValue(new Error('transfer failed'));

    await expect(
      promoteMedia('507f1f77bcf86cd799439011', user, shortTerm, longTerm),
    ).rejects.toThrow();
    expect(asset.status).toBe('TEMP');
    expect(asset.save).not.toHaveBeenCalled();
    expect(shortTerm.delete).not.toHaveBeenCalled();
  });
});
