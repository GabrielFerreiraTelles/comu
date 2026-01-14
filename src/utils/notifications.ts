import { v4 as uuidv4 } from 'uuid';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  duration?: number; // em milissegundos, 0 = não fecha automaticamente
  timestamp: number;
}

type NotificationListener = (notification: Notification) => void;

class NotificationManager {
  private listeners: NotificationListener[] = [];
  private notifications: Notification[] = [];

  subscribe(listener: NotificationListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(notification: Notification) {
    this.notifications.push(notification);
    this.listeners.forEach(listener => listener(notification));
  }

  show(title: string, message: string, type: NotificationType = 'info', duration: number = 5000) {
    const notification: Notification = {
      id: uuidv4(),
      title,
      message,
      type,
      duration,
      timestamp: Date.now(),
    };
    this.notify(notification);
    return notification.id;
  }

  remove(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  getNotifications(): Notification[] {
    return this.notifications;
  }
}

export const notificationManager = new NotificationManager();

// Funções auxiliares
export const showNotification = (
  title: string,
  message: string,
  type: NotificationType = 'info',
  duration?: number
) => {
  return notificationManager.show(title, message, type, duration);
};

export const showSuccess = (title: string, message: string, duration?: number) => {
  return showNotification(title, message, 'success', duration);
};

export const showError = (title: string, message: string, duration?: number) => {
  return showNotification(title, message, 'error', duration);
};

export const showWarning = (title: string, message: string, duration?: number) => {
  return showNotification(title, message, 'warning', duration);
};

export const showInfo = (title: string, message: string, duration?: number) => {
  return showNotification(title, message, 'info', duration);
};



