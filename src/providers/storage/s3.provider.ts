import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { Config } from '../../config/index.js';
import type { StorageProvider, StoredObject } from './storage.provider.js';

/** Real S3 adapter, selected with STORAGE_LONGTERM_MODE=s3. */
export class S3Provider implements StorageProvider {
  private readonly client: S3Client;

  constructor(private readonly config: Config) {
    this.client = new S3Client({
      region: config.AWS_REGION,
      endpoint: config.S3_ENDPOINT,
      credentials:
        config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: config.AWS_ACCESS_KEY_ID,
              secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }

  async upload({
    data,
    mimeType,
    id,
  }: {
    data: Buffer;
    mimeType: string;
    id?: string;
  }): Promise<StoredObject> {
    const key = id ?? `media/${Date.now()}-${Math.random().toString(16).slice(2)}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.S3_BUCKET,
        Key: key,
        Body: data,
        ContentType: mimeType,
      }),
    );
    return { id: key, url: this.getUrl(key) };
  }

  async fetch(id: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.config.S3_BUCKET, Key: id }),
    );
    return Buffer.from(await response.Body!.transformToByteArray());
  }

  async delete(id: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.S3_BUCKET, Key: id }));
  }

  getUrl(id: string): string {
    return `s3://${this.config.S3_BUCKET}/${id}`;
  }
}
