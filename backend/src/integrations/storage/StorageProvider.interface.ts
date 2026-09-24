export interface StoredFileResult {
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  storagePath: string;
}

export interface StorageProvider {
  saveFile(file: Express.Multer.File, directory?: string): Promise<StoredFileResult>;
  deleteFile(storagePath: string): Promise<boolean>;
  getFileUrl(storagePath: string): string;
}
