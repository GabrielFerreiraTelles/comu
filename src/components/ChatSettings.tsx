import { useState, useEffect, useRef } from 'react';
import { ChatSettings as ChatSettingsType } from '../types';
import { settingsStorage } from '../utils/settings';
import { fileToBase64 } from '../utils/media';
import './ChatSettings.css';

interface ChatSettingsProps {
  chatId: string;
  onClose: () => void;
  onSettingsChange: () => void;
}

export default function ChatSettings({ chatId, onClose, onSettingsChange }: ChatSettingsProps) {
  const [settings, setSettings] = useState<ChatSettingsType>(() => {
    const savedSettings = settingsStorage.getChatSettings(chatId);
    // Garantir que todas as propriedades existam
    return {
      chatId: savedSettings.chatId || chatId,
      wallpaper: savedSettings.wallpaper || '',
      textColor: savedSettings.textColor || '#000000',
      inputBoxColor: savedSettings.inputBoxColor || '#ffffff',
      inputTextColor: savedSettings.inputTextColor || '#000000',
      messageBubbleColor: savedSettings.messageBubbleColor || '#000000',
      messageTextColor: savedSettings.messageTextColor || '#ffffff',
      replyPreviewBackgroundColor: savedSettings.replyPreviewBackgroundColor || '#f0f0f0',
      replyPreviewTextColor: savedSettings.replyPreviewTextColor || '#000000',
    };
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    settingsStorage.saveChatSettings(chatId, settings);
    onSettingsChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, chatId]);

  const handleColorChange = (key: keyof Omit<ChatSettingsType, 'chatId' | 'wallpaper'>, value: string) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleWallpaperChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      try {
        const base64 = await fileToBase64(file);
        setSettings({ ...settings, wallpaper: base64 });
      } catch (error) {
        alert('Erro ao carregar imagem');
      }
    } else {
      alert('Por favor, selecione uma imagem');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveWallpaper = () => {
    setSettings({ ...settings, wallpaper: '' });
  };

  const handleReset = () => {
    if (confirm('Tem certeza que deseja redefinir todas as configurações desta conversa?')) {
      settingsStorage.resetChatSettings(chatId);
      setSettings(settingsStorage.getChatSettings(chatId));
      onSettingsChange();
    }
  };

  return (
    <div className="chat-settings-overlay" onClick={onClose}>
      <div className="chat-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chat-settings-header">
          <h2>Configurações da Conversa</h2>
          <button onClick={onClose} className="close-btn">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="chat-settings-content">
          <div className="chat-settings-section">
            <h3>Papel de Parede</h3>
            <div className="wallpaper-preview">
              {settings.wallpaper ? (
                <div className="wallpaper-container">
                  <img src={settings.wallpaper} alt="Wallpaper" className="wallpaper-image" />
                  <button onClick={handleRemoveWallpaper} className="remove-wallpaper-btn">
                    Remover
                  </button>
                </div>
              ) : (
                <div className="no-wallpaper">Nenhum papel de parede</div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleWallpaperChange}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="select-wallpaper-btn"
            >
              Selecionar Imagem
            </button>
          </div>

          <div className="chat-settings-section">
            <h3>Cores</h3>
            <div className="color-options">
              <div className="color-option">
                <label>Cor da Caixa de Texto</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={settings.inputBoxColor}
                    onChange={(e) => handleColorChange('inputBoxColor', e.target.value)}
                    className="color-input"
                  />
                  <input
                    type="text"
                    value={settings.inputBoxColor}
                    onChange={(e) => handleColorChange('inputBoxColor', e.target.value)}
                    className="color-text-input"
                  />
                </div>
              </div>

              <div className="color-option">
                <label>Cor do Texto da Caixa</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={settings.inputTextColor}
                    onChange={(e) => handleColorChange('inputTextColor', e.target.value)}
                    className="color-input"
                  />
                  <input
                    type="text"
                    value={settings.inputTextColor}
                    onChange={(e) => handleColorChange('inputTextColor', e.target.value)}
                    className="color-text-input"
                  />
                </div>
              </div>

              <div className="color-option">
                <label>Cor da Bolha de Mensagem</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={settings.messageBubbleColor}
                    onChange={(e) => handleColorChange('messageBubbleColor', e.target.value)}
                    className="color-input"
                  />
                  <input
                    type="text"
                    value={settings.messageBubbleColor}
                    onChange={(e) => handleColorChange('messageBubbleColor', e.target.value)}
                    className="color-text-input"
                  />
                </div>
              </div>

              <div className="color-option">
                <label>Cor do Texto da Mensagem</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={settings.messageTextColor}
                    onChange={(e) => handleColorChange('messageTextColor', e.target.value)}
                    className="color-input"
                  />
                  <input
                    type="text"
                    value={settings.messageTextColor}
                    onChange={(e) => handleColorChange('messageTextColor', e.target.value)}
                    className="color-text-input"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="chat-settings-section">
            <button onClick={handleReset} className="reset-btn">
              Redefinir Configurações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

