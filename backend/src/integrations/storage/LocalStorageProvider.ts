import fs from 'fs';
import path from 'path';
import { StorageProvider, StoredFileResult } from './StorageProvider.interface';
import { config } from '../../config/env';

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = config.storage.uploadDir;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File, directory?: string): Promise<StoredFileResult> {
    const targetDir = directory ? path.join(this.baseDir, directory) : this.baseDir;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const fileName = path.basename(file.path);
    const storagePath = path.relative(this.baseDir, file.path);
    const url = `/uploads/${storagePath.replace(/\\/g, '/')}`;

    return {
      fileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      url,
      storagePath: file.path,
    };
  }

  async deleteFile(storagePath: string): Promise<boolean> {
    try {
      if (fs.existsSync(storagePath)) {
        await fs.promises.unlink(storagePath);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete file:', err);
      return false;
    }
  }

  getFileUrl(storagePath: string): string {
    const rel = path.relative(this.baseDir, storagePath);
    return `/uploads/${rel.replace(/\\/g, '/')}`;
  }
}

export const defaultStorageProvider = new LocalStorageProvider();
