import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { StorageProvider, StoredObject } from './storage.provider.js';

// Vercel's filesystem is read-only except /tmp; local dev uses the project dir.
const ROOT = process.env.VERCEL
  ? path.join(os.tmpdir(), 'mock-s3')
  : path.resolve(process.cwd(), 'tmp', 'mock-s3');

const EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

/** Long-term storage stand-in: writes objects to a local directory. */
export class MockS3Provider implements StorageProvider {
  async upload({
    data,
    mimeType,
    id,
  }: {
    data: Buffer;
    mimeType: string;
    id?: string;
  }): Promise<StoredObject> {
    const now = new Date();
    const key =
      id ??
      `media/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}${EXTENSIONS[mimeType] ?? ''}`;
    const fullPath = this.pathFor(key);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, data);
    return { id: key, url: this.getUrl(key) };
  }

  async fetch(id: string): Promise<Buffer> {
    return readFile(this.pathFor(id));
  }

  async delete(id: string): Promise<void> {
    await unlink(this.pathFor(id)).catch(() => undefined);
  }

  getUrl(id: string): string {
    return `mock-s3://${id}`;
  }

  private pathFor(key: string): string {
    const fullPath = path.resolve(ROOT, key);
    if (!fullPath.startsWith(ROOT + path.sep)) throw new Error('Invalid storage key');
    return fullPath;
  }
}
