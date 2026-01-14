import { useState, useEffect } from 'react';
import { notificationManager, Notification } from '../utils/notifications';
import { settingsStorage } from '../utils/settings';
import './NotificationSystem.css';

export default function NotificationSystem() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unsubscribe = notificationManager.subscribe((notification) => {
      const settings = settingsStorage.getAppSettings();
      
      // Verificar se notificações estão habilitadas
      if (!settings.notifications.enabled) {
        return;
      }
      
      setNotifications(prev => [...prev, notification]);

      // Remover automaticamente após a duração especificada
      if (notification.duration && notification.duration > 0) {
        setTimeout(() => {
          removeNotification(notification.id);
        }, notification.duration);
      }
      
      // Tocar som se habilitado
      if (settings.notifications.sound) {
        // Criar um som de notificação simples
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      }
    });

    return unsubscribe;
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    notificationManager.remove(id);
  };

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
          onClick={() => removeNotification(notification.id)}
        >
          <div className="notification-icon">
            {notification.type === 'success' && <i className="fas fa-check"></i>}
            {notification.type === 'error' && <i className="fas fa-times"></i>}
            {notification.type === 'warning' && <i className="fas fa-exclamation-triangle"></i>}
            {notification.type === 'info' && <i className="fas fa-info"></i>}
          </div>
          <div className="notification-content">
            <div className="notification-title">{notification.title}</div>
            <div className="notification-message">{notification.message}</div>
          </div>
          <button
            className="notification-close"
            onClick={(e) => {
              e.stopPropagation();
              removeNotification(notification.id);
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      ))}
    </div>
  );
}

