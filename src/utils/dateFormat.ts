import { settingsStorage } from './settings';

export const formatTime = (timestamp: number): string => {
  const settings = settingsStorage.getAppSettings();
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    timeZone: settings.timezone,
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDate = (timestamp: number): string => {
  const settings = settingsStorage.getAppSettings();
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString('pt-BR', {
      timeZone: settings.timezone,
      hour: '2-digit',
      minute: '2-digit',
    });
  } else if (days === 1) {
    return 'Ontem';
  } else if (days < 7) {
    return date.toLocaleDateString('pt-BR', {
      timeZone: settings.timezone,
      weekday: 'short',
    });
  } else {
    return date.toLocaleDateString('pt-BR', {
      timeZone: settings.timezone,
      day: '2-digit',
      month: '2-digit',
    });
  }
};

export const formatFullDate = (timestamp: number): string => {
  const settings = settingsStorage.getAppSettings();
  return new Date(timestamp).toLocaleString('pt-BR', {
    timeZone: settings.timezone,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};



