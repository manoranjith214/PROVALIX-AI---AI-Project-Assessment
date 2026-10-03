import fs from 'fs';
import path from 'path';
import { StorageProvider, StoredFileResult } from './StorageProvider.interface';
import { getSupabaseClient } from '../../config/supabase';
import { config } from '../../config/env';
import { AppError } from '../../middleware/errorMiddleware';

export class SupabaseStorageProvider implements StorageProvider {
  readonly driverName = 'supabase';
  private defaultBucket: string;

  constructor(defaultBucket = config.supabase.storageBucket || 'provalix-uploads') {
    this.defaultBucket = defaultBucket;
  }

  private getClient() {
    const client = getSupabaseClient();
    if (!client) {
      throw new AppError('Supabase storage client is not configured (missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY)', 500);
    }
    return client;
  }

  async saveFile(
    file: Express.Multer.File,
    directory = 'submissions',
    options?: { isPrivate?: boolean }
  ): Promise<StoredFileResult> {
    const client = this.getClient();
    const bucket = this.defaultBucket;
    const isPrivate = options?.isPrivate ?? true;

    // Read buffer whether multer used memory or disk
    let fileBuffer: Buffer;
    if (file.buffer) {
      fileBuffer = file.buffer;
    } else if (file.path && fs.existsSync(file.path)) {
      fileBuffer = await fs.promises.readFile(file.path);
    } else {
      throw new AppError('File buffer or path is invalid for storage upload', 400);
    }

    // Sanitize destination path and filename
    const safeBaseName = path.basename(file.originalname).replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeFileName = `${uniquePrefix}-${safeBaseName}`;
    const cleanDir = directory.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9/_-]/g, '_');
    const storagePath = `${cleanDir}/${safeFileName}`;

    try {
      const { data, error } = await client.storage
        .from(bucket)
        .upload(storagePath, fileBuffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        console.error('[SupabaseStorage] Upload error:', error.message);
        throw new AppError(`Supabase storage upload failed: ${error.message}`, 500);
      }

      // Private files use secure download endpoints or signed URLs, not public URLs
      let fileUrl = '';
      if (isPrivate) {
        // Return signed URL or storage API path
        const signed = await client.storage.from(bucket).createSignedUrl(storagePath, 3600);
        fileUrl = signed.data?.signedUrl || `/api/storage/files/${bucket}/${storagePath}`;
      } else {
        const publicData = client.storage.from(bucket).getPublicUrl(storagePath);
        fileUrl = publicData.data.publicUrl;
      }

      return {
        fileName: safeFileName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        url: fileUrl,
        storagePath: data?.path || storagePath,
        bucket,
        isPrivate,
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      console.error('[SupabaseStorage] Unexpected error during saveFile:', err);
      throw new AppError(`Storage provider failed to persist file: ${err?.message || err}`, 500);
    }
  }

  async deleteFile(storagePath: string, bucket = this.defaultBucket): Promise<boolean> {
    try {
      const client = this.getClient();
      const { error } = await client.storage.from(bucket).remove([storagePath]);
      if (error) {
        console.error('[SupabaseStorage] Delete error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[SupabaseStorage] Delete exception:', err);
      return false;
    }
  }

  async getFileUrl(storagePath: string, bucket = this.defaultBucket): Promise<string> {
    return this.getSignedDownloadUrl(storagePath, 3600, bucket);
  }

  async getSignedDownloadUrl(storagePath: string, expiresInSeconds = 3600, bucket = this.defaultBucket): Promise<string> {
    const client = this.getClient();
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new AppError(`Failed to generate signed download URL: ${error?.message || 'Unknown error'}`, 500);
    }
    return data.signedUrl;
  }

  async downloadFile(storagePath: string, bucket = this.defaultBucket): Promise<{ buffer: Buffer; contentType: string; fileName: string }> {
    const client = this.getClient();
    const { data, error } = await client.storage.from(bucket).download(storagePath);

    if (error || !data) {
      throw new AppError(`Failed to download file from Supabase storage: ${error?.message || 'Not found'}`, 404);
    }

    const arrayBuffer = await data.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType: data.type || 'application/octet-stream',
      fileName: path.basename(storagePath),
    };
  }
}
