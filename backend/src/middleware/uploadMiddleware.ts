import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import { AppError } from './errorMiddleware';

// Ensure upload directory exists
const uploadDirectory = path.resolve(config.storage.uploadDir);
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

// Disallowed dangerous extensions - ALWAYS rejected
const FORBIDDEN_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.msi', '.dll', '.com', '.scr',
  '.php', '.php3', '.php4', '.php5', '.phtml', '.jsp', '.asp', '.aspx', '.cgi',
  '.pl', '.pyc', '.class', '.jar', '.war', '.ear', '.svg', '.html', '.htm',
  '.xhtml', '.hta', '.wsf', '.lnk'
]);

// Map of allowed extension -> acceptable MIME types
const EXTENSION_MIME_MAP: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.ppt': ['application/vnd.ms-powerpoint'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.zip': ['application/zip', 'application/x-zip-compressed', 'multipart/x-zip'],
  '.tar': ['application/x-tar', 'application/tar'],
  '.gz': ['application/gzip', 'application/x-gzip'],
  '.jpg': ['image/jpeg', 'image/pjpeg'],
  '.jpeg': ['image/jpeg', 'image/pjpeg'],
  '.png': ['image/png'],
  '.webp': ['image/webp'],
  '.gif': ['image/gif'],
  '.mp4': ['video/mp4'],
  '.webm': ['video/webm'],
  '.txt': ['text/plain', 'text/x-log'],
  '.json': ['application/json', 'text/plain'],
  '.ts': ['text/plain', 'application/typescript', 'video/mp2t', 'text/x-typescript'],
  '.js': ['text/plain', 'application/javascript', 'text/javascript'],
  '.py': ['text/plain', 'text/x-python', 'application/x-python'],
};

/**
 * Validates magic bytes / file signatures to prevent disguised executables
 */
export function validateFileSignature(buffer: Buffer, ext: string): { valid: boolean; reason?: string } {
  if (buffer.length < 4) {
    return { valid: false, reason: 'File content is corrupted or empty' };
  }

  // Check for dangerous binary executable headers (PE / ELF / Mach-O) in any file
  // MZ header for Windows PE executables
  if (buffer[0] === 0x4D && buffer[1] === 0x5A) {
    return { valid: false, reason: 'Executable Windows PE binary files are prohibited' };
  }
  // ELF header for Linux/Unix executables
  if (buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46) {
    return { valid: false, reason: 'Executable Linux ELF binary files are prohibited' };
  }
  // Mach-O header for macOS binaries
  if (
    (buffer[0] === 0xFE && buffer[1] === 0xED && buffer[2] === 0xFA && (buffer[3] === 0xCE || buffer[3] === 0xCF)) ||
    (buffer[0] === 0xCF && buffer[1] === 0xFA && buffer[2] === 0xED && buffer[3] === 0xFE)
  ) {
    return { valid: false, reason: 'Executable Mach-O binary files are prohibited' };
  }

  switch (ext) {
    case '.pdf':
      // %PDF (25 50 44 46)
      if (buffer[0] !== 0x25 || buffer[1] !== 0x50 || buffer[2] !== 0x44 || buffer[3] !== 0x46) {
        return { valid: false, reason: 'File signature does not match valid PDF document' };
      }
      break;

    case '.png':
      // 89 50 4E 47 0D 0A 1A 0A
      if (
        buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4E || buffer[3] !== 0x47 ||
        buffer[4] !== 0x0D || buffer[5] !== 0x0A || buffer[6] !== 0x1A || buffer[7] !== 0x0A
      ) {
        return { valid: false, reason: 'File signature does not match valid PNG image' };
      }
      break;

    case '.jpg':
    case '.jpeg':
      // FF D8 FF
      if (buffer[0] !== 0xFF || buffer[1] !== 0xD8 || buffer[2] !== 0xFF) {
        return { valid: false, reason: 'File signature does not match valid JPEG image' };
      }
      break;

    case '.gif':
      // GIF8 (47 49 46 38)
      if (buffer[0] !== 0x47 || buffer[1] !== 0x49 || buffer[2] !== 0x46 || buffer[3] !== 0x38) {
        return { valid: false, reason: 'File signature does not match valid GIF image' };
      }
      break;

    case '.webp':
      // RIFF at 0, WEBP at 8
      if (
        buffer.toString('ascii', 0, 4) !== 'RIFF' ||
        buffer.toString('ascii', 8, 12) !== 'WEBP'
      ) {
        return { valid: false, reason: 'File signature does not match valid WEBP image' };
      }
      break;

    case '.zip':
    case '.pptx':
    case '.docx':
      // PK\x03\x04 (50 4B 03 04) or PK\x05\x06 (empty zip)
      if (
        buffer[0] !== 0x50 || buffer[1] !== 0x4B ||
        !((buffer[2] === 0x03 && buffer[3] === 0x04) || (buffer[2] === 0x05 && buffer[3] === 0x06))
      ) {
        return { valid: false, reason: `File signature does not match valid archive or ${ext} document` };
      }
      break;

    case '.gz':
      // 1F 8B
      if (buffer[0] !== 0x1F || buffer[1] !== 0x8B) {
        return { valid: false, reason: 'File signature does not match valid GZIP archive' };
      }
      break;

    case '.mp4':
      // ftyp at byte offset 4
      if (buffer.length >= 8 && buffer.toString('ascii', 4, 8) !== 'ftyp') {
        return { valid: false, reason: 'File signature does not match valid MP4 video' };
      }
      break;

    case '.webm':
      // 1A 45 DF A3 (EBML header)
      if (buffer[0] !== 0x1A || buffer[1] !== 0x45 || buffer[2] !== 0xDF || buffer[3] !== 0xA3) {
        return { valid: false, reason: 'File signature does not match valid WebM container' };
      }
      break;

    case '.txt':
    case '.json':
    case '.ts':
    case '.js':
    case '.py':
      // Plain text files must not contain binary null bytes in the first 512 bytes
      const sample = buffer.slice(0, Math.min(buffer.length, 512));
      for (let i = 0; i < sample.length; i++) {
        if (sample[i] === 0x00) {
          return { valid: false, reason: 'Binary contents detected in text resource file' };
        }
      }
      break;
  }

  return { valid: true };
}

/**
 * Sanitizes original filenames and storage paths, preventing path traversal
 */
export function sanitizeFileName(originalName: string): string {
  // Take only the basename (strips any ../ or ..\ or absolute paths)
  let name = path.basename(originalName || '');
  // Remove null bytes, traversal sequences, and replace forbidden chars with underscore
  name = name.replace(/\0/g, '').replace(/\.\./g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  return name.length > 0 ? name : 'unnamed_file';
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    const sanitized = sanitizeFileName(file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${sanitized}`);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Reject dangerous extensions immediately
  if (FORBIDDEN_EXTENSIONS.has(ext)) {
    return cb(new AppError(`Executable or dangerous file extension rejected: ${ext}`, 400));
  }

  const allowedMimes = EXTENSION_MIME_MAP[ext];
  if (!allowedMimes) {
    return cb(new AppError(`Unsupported file extension: ${ext}. Supported project resource types include PDF, PPT, DOC, ZIP, image, video, and code/text files.`, 400));
  }

  // Validate declared MIME matches extension
  const matchesMime = allowedMimes.includes(file.mimetype) || file.mimetype === 'application/octet-stream';
  if (!matchesMime) {
    return cb(new AppError(`MIME type mismatch for ${ext}: declared ${file.mimetype}. Expected ${allowedMimes.join(' or ')}.`, 400));
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  limits: {
    fileSize: config.storage.maxFileSizeMb * 1024 * 1024,
  },
  fileFilter,
});

/**
 * Express middleware to verify uploaded file signatures after multer writes to disk
 */
export async function verifyUploadedFile(req: Request, res: Response, next: NextFunction) {
  const file = req.file;
  if (!file) return next();

  try {
    const ext = path.extname(file.originalname).toLowerCase();
    // Read first 2KB for magic bytes inspection
    const fd = await fs.promises.open(file.path, 'r');
    const headerBuffer = Buffer.alloc(2048);
    const { bytesRead } = await fd.read(headerBuffer, 0, 2048, 0);
    await fd.close();

    const check = validateFileSignature(headerBuffer.slice(0, bytesRead), ext);
    if (!check.valid) {
      // Remove malicious/corrupt file from disk
      await fs.promises.unlink(file.path).catch(() => {});
      return next(new AppError(`File upload security check failed: ${check.reason}`, 400));
    }

    next();
  } catch (err: any) {
    if (file.path && fs.existsSync(file.path)) {
      await fs.promises.unlink(file.path).catch(() => {});
    }
    next(new AppError(`Unable to verify uploaded file: ${err.message}`, 400));
  }
}
