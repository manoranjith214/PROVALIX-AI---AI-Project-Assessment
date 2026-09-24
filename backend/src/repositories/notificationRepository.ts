import { prisma } from '../config/prisma';

export class NotificationRepository {
  async listByUserId(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async countUnread(userId: string) {
    return prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  async markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async create(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    link?: string;
  }) {
    return prisma.notification.create({
      data,
    });
  }
}

export const notificationRepository = new NotificationRepository();
