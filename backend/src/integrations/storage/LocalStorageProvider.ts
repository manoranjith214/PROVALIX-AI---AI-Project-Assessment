import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { StorageProvider, StoredFileResult } from './StorageProvider.interface';
import { config } from '../../config/env';
import { AppError } from '../../middleware/errorMiddleware';

export class LocalStorageProvider implements StorageProvider {
  readonly driverName = 'local';
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(config.storage.uploadDir);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async saveFile(
    file: Express.Multer.File,
    directory?: string,
    options?: { isPrivate?: boolean }
  ): Promise<StoredFileResult> {
    const isPrivate = options?.isPrivate ?? true;
    const cleanDir = (directory || '').replace(/\.\./g, '').replace(/[^a-zA-Z0-9/_-]/g, '_');
    const targetDir = path.resolve(this.baseDir, cleanDir);

    // Prevent path traversal outside baseDir
    if (!targetDir.startsWith(this.baseDir)) {
      throw new AppError('Invalid storage destination directory', 400);
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const safeBaseName = path.basename(file.originalname).replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const fileName = `${uniquePrefix}-${safeBaseName}`;
    const destinationPath = path.join(targetDir, fileName);

    // Write file content safely
    if (file.buffer) {
      await fs.promises.writeFile(destinationPath, file.buffer);
    } else if (file.path && fs.existsSync(file.path)) {
      if (path.resolve(file.path) !== path.resolve(destinationPath)) {
        await fs.promises.copyFile(file.path, destinationPath);
        try {
          await fs.promises.unlink(file.path);
        } catch {}
      }
    } else {
      throw new AppError('File buffer or path is invalid for storage', 400);
    }

    const relativeStoragePath = path.relative(this.baseDir, destinationPath).replace(/\\/g, '/');
    const url = `/api/storage/files/local/${relativeStoragePath}`;

    return {
      fileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      url,
      storagePath: destinationPath,
      bucket: 'local',
      isPrivate,
    };
  }

  async deleteFile(storagePath: string): Promise<boolean> {
    try {
      const resolved = path.resolve(storagePath);
      if (!resolved.startsWith(this.baseDir)) {
        return false;
      }
      if (fs.existsSync(resolved)) {
        await fs.promises.unlink(resolved);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete file:', err);
      return false;
    }
  }

  getFileUrl(storagePath: string): string {
    const fullPath = path.isAbsolute(storagePath) ? storagePath : path.join(this.baseDir, storagePath);
    const rel = path.relative(this.baseDir, fullPath).replace(/\\/g, '/');
    return `/api/storage/files/local/${rel}`;
  }

  async getSignedDownloadUrl(storagePath: string, expiresInSeconds = 3600): Promise<string> {
    const fullPath = path.isAbsolute(storagePath) ? storagePath : path.join(this.baseDir, storagePath);
    const rel = path.relative(this.baseDir, fullPath).replace(/\\/g, '/');
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const token = crypto
      .createHmac('sha256', config.jwt.secret)
      .update(`${rel}:${expiresAt}`)
      .digest('hex');
    return `/api/storage/files/local/${rel}?expires=${expiresAt}&signature=${token}`;
  }

  async downloadFile(storagePath: string): Promise<{ buffer: Buffer; contentType: string; fileName: string }> {
    const fullPath = path.isAbsolute(storagePath) ? storagePath : path.join(this.baseDir, storagePath);
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(this.baseDir)) {
      throw new AppError('Path traversal detected in file download', 403);
    }
    if (!fs.existsSync(resolved)) {
      throw new AppError('Requested file was not found', 404);
    }

    const buffer = await fs.promises.readFile(resolved);
    return {
      buffer,
      contentType: 'application/octet-stream',
      fileName: path.basename(resolved),
    };
  }
}

export const defaultStorageProvider = new LocalStorageProvider();
