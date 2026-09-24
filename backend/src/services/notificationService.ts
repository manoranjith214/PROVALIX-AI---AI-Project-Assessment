import { notificationRepository } from '../repositories/notificationRepository';

export class NotificationService {
  async notify(userId: string, type: string, title: string, message: string, link?: string) {
    try {
      return await notificationRepository.create({
        userId,
        type,
        title,
        message,
        link,
      });
    } catch (err) {
      console.error(`Failed to send notification to user ${userId}:`, err);
    }
  }

  async getUserNotifications(userId: string) {
    return notificationRepository.listByUserId(userId);
  }

  async getUnreadCount(userId: string) {
    const count = await notificationRepository.countUnread(userId);
    return { count };
  }

  async markAsRead(id: string, userId: string) {
    await notificationRepository.markAsRead(id, userId);
    return { success: true };
  }

  async markAllAsRead(userId: string) {
    await notificationRepository.markAllAsRead(userId);
    return { success: true };
  }
}

export const notificationService = new NotificationService();
