import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/authMiddleware';
import { getStorageProvider } from '../integrations/storage';
import { config } from '../config/env';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../config/prisma';

const router = Router();

/**
 * Validates whether the authenticated user has permission to access a file
 */
async function authorizeFileAccess(userId: string, storagePath: string): Promise<boolean> {
  // Public assets like avatars and logos are accessible by any authenticated user
  if (storagePath.includes('user-avatars') || storagePath.includes('team-logos')) {
    return true;
  }

  // Check ProjectChecker resources
  const pcResource = await prisma.projectCheckerResource.findFirst({
    where: {
      OR: [
        { path: storagePath },
        { url: { contains: path.basename(storagePath) } },
      ],
    },
    include: { project: true },
  });

  if (pcResource) {
    return pcResource.project.userId === userId;
  }

  // Check Classroom Submission resources
  const subResource = await prisma.submissionResource.findFirst({
    where: {
      OR: [
        { path: storagePath },
        { url: { contains: path.basename(storagePath) } },
      ],
    },
    include: {
      submission: {
        include: {
          classroom: { include: { evaluators: true } },
          team: { include: { members: true } },
        },
      },
    },
  });

  if (subResource) {
    const sub = subResource.submission;
    if (sub.submitterId === userId) return true;
    if (sub.team?.members?.some((m: any) => m.userId === userId)) return true;
    if (sub.classroom.ownerId === userId) return true;
    if (sub.assignedEvaluatorId === userId) return true;
    if (sub.classroom.evaluators?.some((e: any) => e.evaluatorId === userId)) return true;
    return false;
  }

  // Fallback: If not matched in resources, allow if user is authenticated and path is not traversing
  return true;
}

/**
 * Generate secure, time-limited signed download URL
 */
router.get('/signed-url', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawPath = req.query.path as string;
    const bucket = (req.query.bucket as string) || undefined;

    if (!rawPath) {
      return sendError(res, 'File path query parameter is required', 400);
    }

    const cleanPath = path.normalize(rawPath).replace(/^(\.\.[\/\\])+/, '');
    const authorized = await authorizeFileAccess(req.user!.id, cleanPath);
    if (!authorized) {
      return sendError(res, 'Access denied: You do not have permission to access this resource', 403);
    }

    const storage = getStorageProvider();
    const signedUrl = await storage.getSignedDownloadUrl(cleanPath, 3600, bucket);
    return sendSuccess(res, { signedUrl }, 'Signed download URL generated', 200);
  } catch (err: any) {
    return sendError(res, 'Failed to generate signed download URL: ' + err.message, 500);
  }
});

/**
 * Authenticated file download/stream endpoint
 */
router.get('/files/:bucket/*', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const bucket = req.params.bucket;
    const filePath = req.params[0];

    if (!filePath) {
      return sendError(res, 'File path is required', 400);
    }

    // Path traversal check
    const normalized = path.normalize(filePath);
    if (normalized.includes('..')) {
      return sendError(res, 'Invalid file path traversal detected', 403);
    }

    const authorized = await authorizeFileAccess(req.user!.id, normalized);
    if (!authorized) {
      return sendError(res, 'Access denied: You do not have permission to access this resource', 403);
    }

    const storage = getStorageProvider();

    if (storage.driverName === 'supabase') {
      const signedUrl = await storage.getSignedDownloadUrl(normalized, 3600, bucket);
      return res.redirect(signedUrl);
    } else {
      // Local storage download
      const targetPath = path.resolve(config.storage.uploadDir, normalized);
      if (!targetPath.startsWith(path.resolve(config.storage.uploadDir))) {
        return sendError(res, 'Path traversal detected', 403);
      }
      if (!fs.existsSync(targetPath)) {
        return sendError(res, 'File not found', 404);
      }

      const fileName = path.basename(targetPath);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'");
      return res.sendFile(targetPath);
    }
  } catch (err: any) {
    return sendError(res, 'Failed to retrieve file: ' + err.message, 500);
  }
});

export default router;
