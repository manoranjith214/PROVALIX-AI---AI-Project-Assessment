import 'multer';

export interface StoredFileResult {
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  storagePath: string;
  bucket?: string;
  isPrivate: boolean;
}

export interface StorageProvider {
  readonly driverName: string;
  saveFile(
    file: Express.Multer.File,
    directory?: string,
    options?: { isPrivate?: boolean }
  ): Promise<StoredFileResult>;
  deleteFile(storagePath: string, bucket?: string): Promise<boolean>;
  getFileUrl(storagePath: string, bucket?: string): Promise<string> | string;
  getSignedDownloadUrl(storagePath: string, expiresInSeconds?: number, bucket?: string): Promise<string>;
  downloadFile(storagePath: string, bucket?: string): Promise<{ buffer: Buffer; contentType: string; fileName: string }>;
}
