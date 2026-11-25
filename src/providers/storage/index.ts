import type { Config } from '../../config/index.js';
import { CloudinaryProvider } from './cloudinary.provider.js';
import { MockS3Provider } from './mock-s3.provider.js';
import { S3Provider } from './s3.provider.js';
import type { StorageProvider } from './storage.provider.js';

export type { StorageProvider } from './storage.provider.js';

export function createStorageProviders(config: Config): {
  shortTerm: StorageProvider;
  longTerm: StorageProvider;
} {
  return {
    shortTerm: new CloudinaryProvider(config),
    longTerm: config.STORAGE_LONGTERM_MODE === 's3' ? new S3Provider(config) : new MockS3Provider(),
  };
}
