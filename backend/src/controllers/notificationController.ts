import { Response, NextFunction } from 'express';
import { notificationService } from '../services/notificationService';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class NotificationController {
  async getNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const list = await notificationService.getUserNotifications(req.user!.id);
      return sendSuccess(res, list, 'Notifications retrieved', 200);
    } catch (err) {
      next(err);
    }
  }

  async getUnreadCount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const count = await notificationService.getUnreadCount(req.user!.id);
      return sendSuccess(res, count, 'Unread count retrieved', 200);
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await notificationService.markAsRead(req.params.id, req.user!.id);
      return sendSuccess(res, result, 'Notification marked as read', 200);
    } catch (err) {
      next(err);
    }
  }

  async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await notificationService.markAllAsRead(req.user!.id);
      return sendSuccess(res, result, 'All notifications marked as read', 200);
    } catch (err) {
      next(err);
    }
  }
}

export const notificationController = new NotificationController();
