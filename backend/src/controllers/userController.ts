import { Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { updateProfileSchema, updatePasswordSchema } from '../validators/userValidator';
import { sendSuccess, sendError } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class UserController {
  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.getProfile(req.user!.id);
      return sendSuccess(res, user, 'Profile fetched successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  async updateMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = updateProfileSchema.parse(req.body);
      const updated = await userService.updateProfile(req.user!.id, validated);
      return sendSuccess(res, updated, 'Profile updated successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  async updatePassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = updatePasswordSchema.parse(req.body);
      const result = await userService.changePassword(req.user!.id, currentPassword, newPassword);
      return sendSuccess(res, result, result.message, 200);
    } catch (err) {
      next(err);
    }
  }

  async uploadAvatar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return sendError(res, 'No image file was uploaded', 400);
      }
      const avatarUrl = `/uploads/${req.file.filename}`;
      const updated = await userService.updateProfile(req.user!.id, {
        profileImage: avatarUrl,
      });
      return sendSuccess(res, { avatarUrl, user: updated }, 'Profile photo uploaded successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  async getUserById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.getPublicProfile(req.params.userId);
      return sendSuccess(res, user, 'User found', 200);
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
