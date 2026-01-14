import { useState, useRef } from 'react';
import { Chat, User } from '../../types';
import { storage } from '../../utils/storageFirebase';
import { createOrGetChat } from '../../utils/messages';
import { formatDate } from '../../utils/dateFormat';
import { showSuccess, showError } from '../../utils/notifications';
import './ChatListMobile.css';

interface ChatListMobileProps {
  chats: Chat[];
  currentUserId: string;
  onChatSelect: (chat: Chat) => void;
  showNewChat: boolean;
  onChatCreated: (chat: Chat) => void;
  onUserBlocked?: () => void;
  onChatDeleted?: () => void;
  onNewChat: () => void;
  onProfileClick: () => void;
  onSettingsClick: () => void;
  onLogout: () => void;
  currentUser: User;
  primaryColor: string;
}

export default function ChatListMobile({
  chats,
  currentUserId,
  onChatSelect,
  showNewChat,
  onChatCreated,
  onUserBlocked,
  onChatDeleted,
  onNewChat,
  onProfileClick,
  onSettingsClick,
  onLogout,
  currentUser,
  primaryColor,
}: ChatListMobileProps) {
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<{ chatId: string; x: number; y: number } | null>(null);

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const targetUser = await storage.getUserByCode(codeInput.toUpperCase());
      if (!targetUser) {
        setError('Código de usuário não encontrado');
        return;
      }

      if (targetUser.id === currentUserId) {
        setError('Você não pode iniciar uma conversa consigo mesmo');
        return;
      }

      const chat = await createOrGetChat(currentUserId, targetUser.id);
      onChatCreated(chat);
      setCodeInput('');
    } catch (error: any) {
      console.error('Erro completo ao buscar usuário/criar chat:', error);
      const errorMessage = error?.message || 'Erro desconhecido';
      if (errorMessage.includes('permission') || errorMessage.includes('permissão')) {
        setError('Erro de permissão. Verifique as regras do Firestore.');
      } else if (errorMessage.includes('not found') || errorMessage.includes('não encontrado')) {
        setError('Código de usuário não encontrado');
      } else {
        setError(`Erro: ${errorMessage}`);
      }
    }
  };

  const [participantsCache, setParticipantsCache] = useState<Record<string, User | null>>({});

  useEffect(() => {
    const loadParticipants = async () => {
      try {
        const users = await storage.getUsers();
        const cache: Record<string, User | null> = {};
        chats.forEach(chat => {
          const otherId = chat.participants.find(id => id !== currentUserId);
          if (otherId) {
            cache[chat.id] = users.find(u => u.id === otherId) || null;
          }
        });
        setParticipantsCache(cache);
      } catch (error) {
        console.error('Erro ao carregar participantes:', error);
      }
    };
    loadParticipants();
  }, [chats, currentUserId]);

  const getChatParticipant = (chat: Chat): User | null => {
    return participantsCache[chat.id] || null;
  };

  const formatTime = (timestamp: number) => {
    return formatDate(timestamp);
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      await storage.deleteChat(chatId);
      onChatDeleted?.();
      setShowDeleteConfirm(null);
      showSuccess('Conversa excluída', 'A conversa foi excluída com sucesso.');
    } catch (error) {
      console.error('Erro ao deletar chat:', error);
      showError('Erro', 'Não foi possível excluir a conversa.');
    }
  };

  const handleTouchStart = (e: React.TouchEvent, chatId: string) => {
    const touch = e.touches[0];
    setTouchStart({ chatId, x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent, chat: Chat) => {
    if (!touchStart || touchStart.chatId !== chat.id) {
      setTouchStart(null);
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStart.x);
    const deltaY = Math.abs(touch.clientY - touchStart.y);

    // Se moveu pouco, é um clique normal
    if (deltaX < 10 && deltaY < 10) {
      onChatSelect(chat);
    }

    setTouchStart(null);
  };

  const handleLongPress = (chatId: string) => {
    setShowDeleteConfirm(chatId);
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  return (
    <div className="chat-list-mobile">
      <div className="mobile-header-bar" style={{ background: primaryColor }}>
        <div className="mobile-header-content">
          <div className="mobile-user-info" onClick={onProfileClick}>
            {currentUser.profilePicture ? (
              <img src={currentUser.profilePicture} alt="Profile" className="mobile-user-avatar" />
            ) : (
              <div className="mobile-user-avatar" style={{ background: '#fff', color: primaryColor }}>
                {currentUser.nickname[0].toUpperCase()}
              </div>
            )}
            <div className="mobile-user-details">
              <div className="mobile-user-name">{currentUser.nickname}</div>
              <div className="mobile-user-code">Código: {currentUser.code}</div>
            </div>
          </div>
          <div className="mobile-header-actions">
            <button onClick={onSettingsClick} className="mobile-header-btn">
              <i className="fas fa-cog"></i>
            </button>
            <button onClick={onLogout} className="mobile-header-btn">
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </div>

      {showNewChat ? (
        <div className="mobile-new-chat-form">
          <form onSubmit={handleCodeSubmit} className="mobile-code-form">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="Digite o código do usuário"
              className="mobile-code-input"
              autoFocus
              maxLength={10}
            />
            {error && <div className="mobile-error">{error}</div>}
            <div className="mobile-form-actions">
              <button type="submit" className="mobile-submit-btn" style={{ background: primaryColor }}>
                Iniciar Conversa
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <button onClick={onNewChat} className="mobile-new-chat-btn" style={{ background: primaryColor }}>
            <i className="fas fa-plus"></i>
            <span>Nova Conversa</span>
          </button>
          <div className="mobile-chats-list">
            {chats.length === 0 ? (
              <div className="mobile-empty-state">
                <i className="fas fa-comments"></i>
                <p>Nenhuma conversa ainda</p>
                <p className="mobile-empty-hint">Toque em "Nova Conversa" para começar</p>
              </div>
            ) : (
              chats.map((chat) => {
                const participant = getChatParticipant(chat);
                if (!participant) return null;

                const lastMessage = chat.lastMessage;
                const isBlocked = storage.isUserBlocked(currentUserId, participant.id);

                return (
                  <div
                    key={chat.id}
                    className={`mobile-chat-item ${showDeleteConfirm === chat.id ? 'deleting' : ''}`}
                    onTouchStart={(e) => handleTouchStart(e, chat.id)}
                    onTouchEnd={(e) => handleTouchEnd(e, chat)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleLongPress(chat.id);
                    }}
                  >
                    {participant.profilePicture ? (
                      <img
                        src={participant.profilePicture}
                        alt={participant.nickname}
                        className="mobile-chat-avatar"
                      />
                    ) : (
                      <div className="mobile-chat-avatar" style={{ background: primaryColor }}>
                        {participant.nickname[0].toUpperCase()}
                      </div>
                    )}
                    <div className="mobile-chat-info">
                      <div className="mobile-chat-header">
                        <span className="mobile-chat-name">{participant.nickname}</span>
                        {lastMessage && (
                          <span className="mobile-chat-time">
                            {formatTime(lastMessage.timestamp)}
                          </span>
                        )}
                      </div>
                      <div className="mobile-chat-preview">
                        {isBlocked ? (
                          <span className="mobile-blocked-indicator">Usuário bloqueado</span>
                        ) : lastMessage ? (
                          <>
                            {lastMessage.type === 'image' && <i className="fas fa-image"></i>}
                            {lastMessage.type === 'video' && <i className="fas fa-video"></i>}
                            {lastMessage.type === 'audio' && <i className="fas fa-microphone"></i>}
                            {lastMessage.type === 'gif' && <i className="fas fa-images"></i>}
                            <span>
                              {lastMessage.type === 'text'
                                ? lastMessage.content
                                : lastMessage.type === 'image'
                                ? 'Imagem'
                                : lastMessage.type === 'video'
                                ? 'Vídeo'
                                : lastMessage.type === 'audio'
                                ? 'Áudio'
                                : 'GIF'}
                            </span>
                          </>
                        ) : (
                          <span className="mobile-no-messages">Nenhuma mensagem</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
      
      {showDeleteConfirm && (
        <div className="mobile-delete-confirm">
          <h3>Excluir conversa?</h3>
          <div className="mobile-delete-confirm-actions">
            <button
              onClick={() => {
                handleDeleteChat(showDeleteConfirm);
                setShowDeleteConfirm(null);
              }}
              className="mobile-delete-confirm-btn confirm"
            >
              Excluir
            </button>
            <button
              onClick={() => setShowDeleteConfirm(null)}
              className="mobile-delete-confirm-btn cancel"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

