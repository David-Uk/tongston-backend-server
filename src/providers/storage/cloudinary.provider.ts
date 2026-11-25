import { randomUUID } from 'node:crypto';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import type { Config } from '../../config/index.js';
import { UpstreamError } from '../../utils/AppError.js';
import type { StorageProvider, StoredObject } from './storage.provider.js';

/** Short-term storage: real Cloudinary account from env. */
export class CloudinaryProvider implements StorageProvider {
  constructor(private readonly config: Config) {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = config;
    if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET,
        secure: true,
      });
    }
  }

  private assertConfigured(): void {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = this.config;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      throw new UpstreamError('Cloudinary is not configured');
    }
  }

  async upload({ data }: { data: Buffer }): Promise<StoredObject> {
    this.assertConfigured();
    const publicId = `t-world/${randomUUID()}`;
    try {
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { public_id: publicId, resource_type: 'auto' },
          (error, uploaded) => (error ? reject(error) : resolve(uploaded!)),
        );
        stream.end(data);
      });
      return { id: result.public_id, url: result.secure_url };
    } catch (error) {
      throw new UpstreamError(`Cloudinary upload failed: ${(error as Error).message}`);
    }
  }

  async fetch(id: string): Promise<Buffer> {
    this.assertConfigured();
    const response = await fetch(this.getUrl(id));
    if (!response.ok) throw new UpstreamError(`Cloudinary fetch failed with ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }

  async delete(id: string): Promise<void> {
    this.assertConfigured();
    await cloudinary.uploader.destroy(id);
  }

  getUrl(id: string): string {
    return cloudinary.url(id, { secure: true });
  }
}
