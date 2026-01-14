import { AppSettings, ChatSettings } from '../types';

const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'black-white',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  primaryColor: '#000000',
  secondaryColor: '#ffffff',
  accentColor: '#333333',
  notifications: {
    enabled: true,
    sound: true,
    desktop: false,
  },
  privacy: {
    showOnlineStatus: true,
    allowMessageRequests: true,
  },
  appearance: {
    fontSize: 'medium',
    compactMode: false,
  },
};

const DEFAULT_CHAT_SETTINGS: Omit<ChatSettings, 'chatId'> = {
  wallpaper: '',
  textColor: '#000000',
  inputBoxColor: '#ffffff',
  inputTextColor: '#000000',
  messageBubbleColor: '#000000',
  messageTextColor: '#ffffff',
  replyPreviewBackgroundColor: '#f0f0f0', // Cor padrão mais visível
  replyPreviewTextColor: '#000000',
};

export const settingsStorage = {
  // App Settings
  getAppSettings: (): AppSettings => {
    const data = localStorage.getItem('comu_app_settings');
    if (data) {
      return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(data) };
    }
    return DEFAULT_APP_SETTINGS;
  },

  saveAppSettings: (settings: Partial<AppSettings>): void => {
    const current = settingsStorage.getAppSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem('comu_app_settings', JSON.stringify(updated));
  },

  // Chat Settings
  getChatSettings: (chatId: string): ChatSettings => {
    const data = localStorage.getItem('comu_chat_settings');
    const allSettings: Record<string, ChatSettings> = data ? JSON.parse(data) : {};
    if (allSettings[chatId]) {
      return allSettings[chatId];
    }
    return { ...DEFAULT_CHAT_SETTINGS, chatId };
  },

  saveChatSettings: (chatId: string, settings: Partial<Omit<ChatSettings, 'chatId'>>): void => {
    const data = localStorage.getItem('comu_chat_settings');
    const allSettings: Record<string, ChatSettings> = data ? JSON.parse(data) : {};
    const current = allSettings[chatId] || { ...DEFAULT_CHAT_SETTINGS, chatId };
    allSettings[chatId] = { ...current, ...settings };
    localStorage.setItem('comu_chat_settings', JSON.stringify(allSettings));
  },

  resetChatSettings: (chatId: string): void => {
    const data = localStorage.getItem('comu_chat_settings');
    const allSettings: Record<string, ChatSettings> = data ? JSON.parse(data) : {};
    delete allSettings[chatId];
    localStorage.setItem('comu_chat_settings', JSON.stringify(allSettings));
  },
};

export const getTimeZones = (): string[] => {
  return Intl.supportedValuesOf('timeZone');
};

export const formatTimeWithTimezone = (timestamp: number, timezone: string): string => {
  return new Date(timestamp).toLocaleString('pt-BR', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

