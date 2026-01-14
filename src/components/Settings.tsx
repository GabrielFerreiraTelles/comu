import { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { settingsStorage, getTimeZones } from '../utils/settings';
import './Settings.css';

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings>(settingsStorage.getAppSettings());
  const [timezones] = useState<string[]>(getTimeZones());

  useEffect(() => {
    settingsStorage.saveAppSettings(settings);
    // Disparar evento para atualizar a UI
    window.dispatchEvent(new Event('settingsUpdated'));
  }, [settings]);

  const handleThemeChange = (theme: 'light' | 'dark' | 'black-white') => {
    setSettings({ ...settings, theme });
  };

  const handleTimezoneChange = (timezone: string) => {
    setSettings({ ...settings, timezone });
  };

  const handleNotificationChange = (key: keyof AppSettings['notifications'], value: boolean) => {
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value,
      },
    });
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Configurações</h2>
          <button onClick={onClose} className="close-btn">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3>Tema</h3>
            <div className="settings-options">
              <label className="radio-option">
                <input
                  type="radio"
                  name="theme"
                  value="black-white"
                  checked={settings.theme === 'black-white'}
                  onChange={() => handleThemeChange('black-white')}
                />
                <span>Preto e Branco</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={settings.theme === 'light'}
                  onChange={() => handleThemeChange('light')}
                />
                <span>Claro</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={settings.theme === 'dark'}
                  onChange={() => handleThemeChange('dark')}
                />
                <span>Escuro</span>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>Cores Personalizadas</h3>
            <div className="color-settings">
              <div className="color-setting-item">
                <label>Cor Primária</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={settings.primaryColor || '#000000'}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="color-input"
                  />
                  <input
                    type="text"
                    value={settings.primaryColor || '#000000'}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="color-text-input"
                  />
                </div>
              </div>
              <div className="color-setting-item">
                <label>Cor Secundária</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={settings.secondaryColor || '#ffffff'}
                    onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                    className="color-input"
                  />
                  <input
                    type="text"
                    value={settings.secondaryColor || '#ffffff'}
                    onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                    className="color-text-input"
                  />
                </div>
              </div>
              <div className="color-setting-item">
                <label>Cor de Destaque</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={settings.accentColor || '#333333'}
                    onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                    className="color-input"
                  />
                  <input
                    type="text"
                    value={settings.accentColor || '#333333'}
                    onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                    className="color-text-input"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>Fuso Horário</h3>
            <select
              value={settings.timezone}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              className="timezone-select"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-section">
            <h3>Notificações</h3>
            <div className="settings-options">
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={settings.notifications.enabled}
                  onChange={(e) => handleNotificationChange('enabled', e.target.checked)}
                />
                <span>Ativar notificações</span>
              </label>
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={settings.notifications.sound}
                  onChange={(e) => handleNotificationChange('sound', e.target.checked)}
                  disabled={!settings.notifications.enabled}
                />
                <span>Som de notificação</span>
              </label>
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={settings.notifications.desktop}
                  onChange={(e) => handleNotificationChange('desktop', e.target.checked)}
                  disabled={!settings.notifications.enabled}
                />
                <span>Notificações na área de trabalho</span>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>Privacidade</h3>
            <div className="settings-options">
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={settings.privacy?.showOnlineStatus ?? true}
                  onChange={(e) => setSettings({
                    ...settings,
                    privacy: { ...settings.privacy, showOnlineStatus: e.target.checked }
                  })}
                />
                <span>Mostrar status online</span>
              </label>
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={settings.privacy?.allowMessageRequests ?? true}
                  onChange={(e) => setSettings({
                    ...settings,
                    privacy: { ...settings.privacy, allowMessageRequests: e.target.checked }
                  })}
                />
                <span>Permitir solicitações de mensagem</span>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>Aparência</h3>
            <div className="settings-options">
              <label className="radio-option">
                <input
                  type="radio"
                  name="fontSize"
                  value="small"
                  checked={settings.appearance?.fontSize === 'small'}
                  onChange={() => setSettings({
                    ...settings,
                    appearance: { ...settings.appearance, fontSize: 'small' }
                  })}
                />
                <span>Fonte Pequena</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="fontSize"
                  value="medium"
                  checked={settings.appearance?.fontSize === 'medium' || !settings.appearance?.fontSize}
                  onChange={() => setSettings({
                    ...settings,
                    appearance: { ...settings.appearance, fontSize: 'medium' }
                  })}
                />
                <span>Fonte Média</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="fontSize"
                  value="large"
                  checked={settings.appearance?.fontSize === 'large'}
                  onChange={() => setSettings({
                    ...settings,
                    appearance: { ...settings.appearance, fontSize: 'large' }
                  })}
                />
                <span>Fonte Grande</span>
              </label>
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={settings.appearance?.compactMode ?? false}
                  onChange={(e) => setSettings({
                    ...settings,
                    appearance: { ...settings.appearance, compactMode: e.target.checked }
                  })}
                />
                <span>Modo Compacto</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

