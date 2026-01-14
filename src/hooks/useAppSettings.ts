import { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { settingsStorage } from '../utils/settings';

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(settingsStorage.getAppSettings());

  useEffect(() => {
    // Aplicar configurações ao documento
    const root = document.documentElement;
    
    // Aplicar cores personalizadas como variáveis CSS
    root.style.setProperty('--primary-color', settings.primaryColor || '#000000');
    root.style.setProperty('--secondary-color', settings.secondaryColor || '#ffffff');
    root.style.setProperty('--accent-color', settings.accentColor || '#333333');
    
    // Aplicar tamanho de fonte
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px',
    };
    root.style.setProperty('--base-font-size', fontSizeMap[settings.appearance?.fontSize || 'medium']);
    
    // Aplicar modo compacto
    if (settings.appearance?.compactMode) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }
    
    // Aplicar tema
    root.setAttribute('data-theme', settings.theme);
  }, [settings]);

  useEffect(() => {
    // Listener para mudanças nas configurações
    const handleSettingsUpdate = () => {
      const newSettings = settingsStorage.getAppSettings();
      setSettings(newSettings);
    };
    
    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    
    // Verificar mudanças periodicamente (para mesma aba)
    const interval = setInterval(() => {
      const newSettings = settingsStorage.getAppSettings();
      if (JSON.stringify(newSettings) !== JSON.stringify(settings)) {
        setSettings(newSettings);
      }
    }, 500);
    
    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
      clearInterval(interval);
    };
  }, [settings]);

  return settings;
}

