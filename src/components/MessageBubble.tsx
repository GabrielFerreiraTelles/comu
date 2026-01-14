import { useState, useEffect, useRef } from 'react';
import { Message, ChatSettings } from '../types';
import { formatTime as formatTimeWithTZ } from '../utils/dateFormat';
import { parseMarkdown, hasMarkdown } from '../utils/markdown';
import { storage } from '../utils/storageFirebase';
import './MessageBubble.css';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
  canEdit: boolean;
  chatSettings?: ChatSettings;
  onReply?: (message: Message) => void;
  onPin?: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
  onNavigateToMessage?: (messageId: string) => void;
  currentUserId: string;
  replyToMessage?: Message | null;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function MessageBubble({
  message,
  isOwn,
  onEdit,
  onDelete,
  canDelete,
  canEdit,
  chatSettings,
  onReply,
  onPin,
  onUnpin,
  onNavigateToMessage,
  currentUserId,
  replyToMessage,
}: MessageBubbleProps) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const formatTime = (timestamp: number) => {
    return formatTimeWithTZ(timestamp);
  };

  const handleReaction = async (emoji: string) => {
    try {
      const existingReaction = message.reactions?.find(r => r.userId === currentUserId && r.emoji === emoji);
      if (existingReaction) {
        await storage.removeReaction(message.id, currentUserId);
      } else {
        await storage.addReaction(message.id, emoji, currentUserId);
      }
      setShowReactionPicker(false);
    } catch (error) {
      console.error('Erro ao adicionar/remover reação:', error);
    }
  };

  const getReactionCount = (emoji: string) => {
    return message.reactions?.filter(r => r.emoji === emoji).length || 0;
  };

  const hasUserReacted = (emoji: string) => {
    return message.reactions?.some(r => r.userId === currentUserId && r.emoji === emoji) || false;
  };

  const renderContent = () => {
    switch (message.type) {
      case 'text':
        const content = message.content;
        if (hasMarkdown(content)) {
          return <div className="message-text" dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }} />;
        }
        return <div className="message-text">{content}</div>;
      case 'image':
        return (
          <div className="message-media-container">
            <img
              src={message.content}
              alt="Imagem"
              className="message-media"
              onClick={() => window.open(message.content, '_blank')}
            />
            <button
              className="download-media-btn"
              onClick={(e) => {
                e.stopPropagation();
                const downloadFile = async () => {
                  try {
                    const response = await fetch(message.content);
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `image-${message.id}.jpg`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                  } catch (error) {
                    // Fallback para base64 ou URLs diretas
                    const link = document.createElement('a');
                    link.href = message.content;
                    link.download = `image-${message.id}.jpg`;
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }
                };
                downloadFile();
              }}
              title="Baixar imagem"
            >
              <i className="fas fa-download"></i>
            </button>
          </div>
        );
      case 'video':
        return (
          <div className="message-media-container">
            <video
              src={message.content}
              controls
              className="message-media"
            />
            <button
              className="download-media-btn"
              onClick={(e) => {
                e.stopPropagation();
                const downloadFile = async () => {
                  try {
                    const response = await fetch(message.content);
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `video-${message.id}.mp4`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                  } catch (error) {
                    // Fallback para base64 ou URLs diretas
                    const link = document.createElement('a');
                    link.href = message.content;
                    link.download = `video-${message.id}.mp4`;
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }
                };
                downloadFile();
              }}
              title="Baixar vídeo"
            >
              <i className="fas fa-download"></i>
            </button>
          </div>
        );
      case 'audio':
        return (
          <audio
            src={message.content}
            controls
            className="message-audio"
          />
        );
      case 'gif':
        return (
          <img
            src={message.content}
            alt="GIF"
            className="message-media message-gif"
            onClick={() => window.open(message.content, '_blank')}
          />
        );
      default:
        return <div className="message-text">{message.content}</div>;
    }
  };

  const bubbleStyle = chatSettings
    ? isOwn
      ? {
          backgroundColor: chatSettings.messageBubbleColor,
          color: chatSettings.messageTextColor,
        }
      : {
          color: chatSettings.textColor,
        }
    : {};

  const isRead = message.readBy?.includes(currentUserId) || false;
  const readStatus = isOwn && message.sent ? (
    message.readBy?.length ? (
      <span className="message-read" title={`Lido em ${message.readAt ? formatTime(message.readAt) : ''}`}>
        <i className="fas fa-check-double"></i>
      </span>
    ) : (
      <span className="message-sent">
        <i className="fas fa-check"></i>
      </span>
    )
  ) : null;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Fechar todos os outros menus de contexto antes de abrir este
    window.dispatchEvent(new CustomEvent('closeAllContextMenus'));
    setShowContextMenu(true);
  };

  // Handlers para mobile (touch and hold)
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    
    touchTimerRef.current = setTimeout(() => {
      // Vibrar o dispositivo se suportado
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      // Fechar todos os outros menus de contexto antes de abrir este
      window.dispatchEvent(new CustomEvent('closeAllContextMenus'));
      setShowContextMenu(true);
      
      // Prevenir o menu de contexto padrão
      e.preventDefault();
    }, 500); // 500ms de pressão
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Se o usuário mover o dedo muito, cancelar o touch and hold
    if (touchStartPosRef.current) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);
      
      // Se moveu mais de 10px, cancelar
      if (deltaX > 10 || deltaY > 10) {
        handleTouchEnd();
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(false);
      setShowReactionPicker(false);
    };

    const handleModalOpen = () => {
      setShowContextMenu(false);
      setShowReactionPicker(false);
    };

    const handleCloseAllContextMenus = () => {
      setShowContextMenu(false);
      setShowReactionPicker(false);
    };

    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      window.addEventListener('modalOpen', handleModalOpen);
      window.addEventListener('closeAllContextMenus', handleCloseAllContextMenus);
      return () => {
        document.removeEventListener('click', handleClickOutside);
        window.removeEventListener('modalOpen', handleModalOpen);
        window.removeEventListener('closeAllContextMenus', handleCloseAllContextMenus);
      };
    }
  }, [showContextMenu]);

  useEffect(() => {
    return () => {
      // Limpar timer ao desmontar
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
      }
    };
  }, []);

  return (
    <div 
      className={`message-bubble ${isOwn ? 'own' : 'other'} ${!message.sent ? 'pending' : ''} ${message.pinned ? 'pinned' : ''}`}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {replyToMessage && (
        <div 
          className="message-reply-preview"
          onClick={() => {
            if (onNavigateToMessage && replyToMessage.id) {
              onNavigateToMessage(replyToMessage.id);
            }
          }}
          style={{ 
            cursor: onNavigateToMessage ? 'pointer' : 'default',
            backgroundColor: chatSettings?.replyPreviewBackgroundColor || '#f0f0f0',
            color: chatSettings?.replyPreviewTextColor || '#000000',
          }}
          title={onNavigateToMessage ? 'Clique para ver a mensagem original' : ''}
        >
          <div 
            className="reply-preview-header"
            style={{ color: chatSettings?.replyPreviewTextColor || '#000000' }}
          >
            <i className="fas fa-reply"></i>
            <span>{replyToMessage.senderId === currentUserId ? 'Você' : 'Outro usuário'}</span>
          </div>
          <div 
            className="reply-preview-content"
            style={{ color: chatSettings?.replyPreviewTextColor || '#000000' }}
          >
            {replyToMessage.type === 'text' 
              ? (replyToMessage.content.length > 50 ? replyToMessage.content.substring(0, 50) + '...' : replyToMessage.content)
              : replyToMessage.type === 'image' ? '📷 Imagem'
              : replyToMessage.type === 'video' ? '🎥 Vídeo'
              : replyToMessage.type === 'audio' ? '🎤 Áudio'
              : replyToMessage.type === 'gif' ? 'GIF'
              : 'Mídia'}
          </div>
        </div>
      )}
      <div className="message-content" style={bubbleStyle}>
        {renderContent()}
        <div className="message-footer">
          <span className="message-time">{formatTime(message.timestamp)}</span>
          {message.edited && <span className="message-edited">(editado)</span>}
          {readStatus}
          {!message.sent && (
            <span className="message-pending">
              <i className="fas fa-clock"></i> Pendente
            </span>
          )}
        </div>
        {message.reactions && message.reactions.length > 0 && (
          <div className="message-reactions">
            {Array.from(new Set(message.reactions.map(r => r.emoji))).map(emoji => (
              <button
                key={emoji}
                className={`reaction-badge ${hasUserReacted(emoji) ? 'active' : ''}`}
                onClick={() => handleReaction(emoji)}
                title={`${getReactionCount(emoji)} reação(ões)`}
              >
                {emoji} {getReactionCount(emoji)}
              </button>
            ))}
          </div>
        )}
      </div>
      {showContextMenu && (
        <div 
          className="message-context-menu-overlay"
          onClick={(e) => {
            e.stopPropagation();
            setShowContextMenu(false);
          }}
        >
          <div 
            className="message-context-menu"
            onClick={(e) => e.stopPropagation()}
          >
          {showReactionPicker ? (
            <div className="context-menu-section">
              <div className="context-menu-header">
                <button 
                  className="context-menu-back"
                  onClick={() => setShowReactionPicker(false)}
                >
                  <i className="fas fa-arrow-left"></i>
                </button>
                <span>Reagir</span>
              </div>
              <div className="reaction-picker">
                {QUICK_REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    className="reaction-option"
                    onClick={() => {
                      handleReaction(emoji);
                      setShowContextMenu(false);
                    }}
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {onReply && (
                <button
                  className="context-menu-item"
                  onClick={() => {
                    onReply(message);
                    setShowContextMenu(false);
                  }}
                >
                  <i className="fas fa-reply"></i>
                  <span>Responder</span>
                </button>
              )}
              <button
                className="context-menu-item"
                onClick={() => {
                  setShowReactionPicker(true);
                }}
              >
                <i className="fas fa-smile"></i>
                <span>Reagir</span>
              </button>
              {onPin && !message.pinned && (
                <button
                  className="context-menu-item"
                  onClick={() => {
                    onPin(message.id);
                    setShowContextMenu(false);
                  }}
                >
                  <i className="fas fa-thumbtack"></i>
                  <span>Fixar mensagem</span>
                </button>
              )}
              {onUnpin && message.pinned && (
                <button
                  className="context-menu-item"
                  onClick={() => {
                    onUnpin(message.id);
                    setShowContextMenu(false);
                  }}
                >
                  <i className="fas fa-thumbtack"></i>
                  <span>Desfixar mensagem</span>
                </button>
              )}
              {isOwn && canEdit && (
                <button
                  className="context-menu-item"
                  onClick={() => {
                    onEdit();
                    setShowContextMenu(false);
                  }}
                >
                  <i className="fas fa-edit"></i>
                  <span>Editar</span>
                </button>
              )}
              {isOwn && canDelete && (
                <button
                  className="context-menu-item danger"
                  onClick={() => {
                    onDelete();
                    setShowContextMenu(false);
                  }}
                >
                  <i className="fas fa-trash"></i>
                  <span>Excluir</span>
                </button>
              )}
            </>
          )}
          <button
            className="context-menu-close-btn"
            onClick={() => setShowContextMenu(false)}
          >
            Fechar
          </button>
        </div>
        </div>
      )}
    </div>
  );
}
