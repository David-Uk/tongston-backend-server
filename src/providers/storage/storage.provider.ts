export interface StoredObject {
  id: string;
  url: string;
}

/** Same shape for short-term (Cloudinary) and long-term (S3 / mock) storage. */
export interface StorageProvider {
  upload(input: { data: Buffer; mimeType: string; id?: string }): Promise<StoredObject>;
  fetch(id: string): Promise<Buffer>;
  delete(id: string): Promise<void>;
  getUrl(id: string): string;
}
