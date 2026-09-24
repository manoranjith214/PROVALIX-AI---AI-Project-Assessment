import { AppNotification } from '../types';
import { apiClient } from './api/apiClient';

export function mapBackendNotification(item: any): AppNotification {
  return {
    id: item.id,
    userId: item.userId,
    type: (item.type || 'system_alert').toLowerCase() as any,
    title: item.title,
    message: item.message,
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
    read: Boolean(item.read),
    link: item.link || ''
  };
}

export const notificationService = {
  async getNotifications(_userId?: string): Promise<AppNotification[]> {
    try {
      const data = await apiClient.get<any[]>('/notifications');
      if (Array.isArray(data)) {
        return data.map(mapBackendNotification);
      }
    } catch (err) {
      console.warn('Backend notification fetch failed:', err);
    }
    return [];
  },

  async getUnreadCount(): Promise<number> {
    try {
      const data = await apiClient.get<{ count: number }>('/notifications/unread-count');
      if (data && typeof data.count === 'number') {
        return data.count;
      }
    } catch {
      // Return 0 if not authenticated or error
    }
    return 0;
  },

  async markAsRead(id: string): Promise<void> {
    try {
      await apiClient.put(`/notifications/${id}/read`);
    } catch (err) {
      console.warn('Backend markAsRead failed:', err);
    }
  },

  async markAllAsRead(_userId?: string): Promise<void> {
    try {
      await apiClient.put('/notifications/read-all');
    } catch (err) {
      console.warn('Backend markAllAsRead failed:', err);
    }
  }
};
