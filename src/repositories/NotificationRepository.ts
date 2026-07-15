import { Notification } from '../models/Notification';
import { StorageService } from '../services/StorageService';
import { API_BASE_URL } from '../services/api';

const NOTIFICATIONS_KEY = '@notifications_data';

export const NotificationRepository = {
  async getNotifications(): Promise<Notification[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      // La API devuelve { "notifications": [...] }
      const notifications: Notification[] = data.notifications;

      // Guardar en cache local por si se pierde conexión
      await StorageService.setItem(NOTIFICATIONS_KEY, notifications);
      return notifications;
    } catch (error) {
      console.error('Error fetching notifications from API, falling back to cache:', error);
      const cached = await StorageService.getItem<Notification[]>(NOTIFICATIONS_KEY);
      return cached || [];
    }
  },

  async markAsRead(id: number): Promise<Notification> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to mark notification as read');
      const data = await response.json();
      
      // Actualizar cache local
      const cached = await StorageService.getItem<Notification[]>(NOTIFICATIONS_KEY) || [];
      const updated = cached.map(n => n.id === id ? { ...n, leida: true } : n);
      await StorageService.setItem(NOTIFICATIONS_KEY, updated);

      return data;
    } catch (error) {
      console.error(`Error marking notification ${id} as read via API:`, error);
      throw error;
    }
  },

  async sendPushNotification(tipo: string, destinatario_rol: string, mensaje: string, agent_id: string | null): Promise<Notification> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, destinatario_rol, mensaje, agent_id }),
      });
      if (!response.ok) throw new Error('Failed to send push notification simulation');
      const data = await response.json();
      return data.notification;
    } catch (error) {
      console.error('Error sending simulated push notification:', error);
      throw error;
    }
  }
};
