import { useState, useRef, useEffect } from 'react';
import { Chat, User } from '../types';
import { storage } from '../utils/storageFirebase';
import { createOrGetChat } from '../utils/messages';
import { useAppSettings } from '../hooks/useAppSettings';
import { formatDate } from '../utils/dateFormat';
import ContextMenu from './ContextMenu';
import ViewProfile from './ViewProfile';
import { showSuccess, showError } from '../utils/notifications';
import './ChatList.css';

interface ChatListProps {
  chats: Chat[];
  currentUserId: string;
  onChatSelect: (chat: Chat) => void;
  showNewChat: boolean;
  onChatCreated: (chat: Chat) => void;
  onUserBlocked?: () => void;
  onChatDeleted?: () => void;
}

export default function ChatList({
  chats,
  currentUserId,
  onChatSelect,
  showNewChat,
  onChatCreated,
  onUserBlocked,
  onChatDeleted,
}: ChatListProps) {
  const appSettings = useAppSettings();
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; chat: Chat } | null>(null);
  const [viewProfile, setViewProfile] = useState<User | null>(null);
  const chatItemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [participantsCache, setParticipantsCache] = useState<Record<string, User | null>>({});
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  
  const primaryColor = appSettings.primaryColor || '#000000';

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

  useEffect(() => {
    const loadBlockedUsers = async () => {
      try {
        const blocked = await storage.getBlockedUsers(currentUserId);
        setBlockedUsers(new Set(blocked.map(b => b.userId)));
      } catch (error) {
        console.error('Erro ao carregar usuários bloqueados:', error);
      }
    };
    loadBlockedUsers();
  }, [currentUserId]);

  const getChatParticipant = (chat: Chat): User | null => {
    return participantsCache[chat.id] || null;
  };

  const getParticipant = (chat: Chat): User | null => {
    return getChatParticipant(chat);
  };

  const isBlocked = (userId: string): boolean => {
    return blockedUsers.has(userId);
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      await storage.deleteChat(chatId);
      onChatDeleted?.();
    } catch (error) {
      console.error('Erro ao deletar chat:', error);
      showError('Erro', 'Não foi possível excluir a conversa.');
    }
  };

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


  const formatTime = (timestamp: number) => {
    return formatDate(timestamp);
  };

  const handleContextMenu = (e: React.MouseEvent, chat: Chat) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, chat });
  };

  const handleViewProfile = (chat: Chat) => {
    const participant = getChatParticipant(chat);
    if (participant) {
      setViewProfile(participant);
      setContextMenu(null);
    }
  };

  const handleBlockUser = async (chat: Chat) => {
    const participant = getChatParticipant(chat);
    if (participant) {
      if (confirm(`Tem certeza que deseja bloquear ${participant.nickname}?`)) {
        try {
          await storage.blockUser(currentUserId, participant.id);
          onUserBlocked?.();
          setContextMenu(null);
          showSuccess('Usuário Bloqueado', `${participant.nickname} foi bloqueado com sucesso.`);
        } catch (error) {
          console.error('Erro ao bloquear usuário:', error);
          showError('Erro', 'Não foi possível bloquear o usuário.');
        }
      }
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      const users = await storage.getUsers();
      const user = users.find(u => u.id === userId);
      await storage.unblockUser(currentUserId, userId);
      onUserBlocked?.();
      if (user) {
        showSuccess('Usuário Desbloqueado', `${user.nickname} foi desbloqueado.`);
      }
    } catch (error) {
      console.error('Erro ao desbloquear usuário:', error);
      showError('Erro', 'Não foi possível desbloquear o usuário.');
    }
  };


  const handleDeleteChatConfirm = async (chat: Chat) => {
    const participant = getChatParticipant(chat);
    const participantName = participant ? participant.nickname : 'esta conversa';
    
    if (confirm(`Tem certeza que deseja excluir a conversa com ${participantName}? Esta ação não pode ser desfeita.`)) {
      await handleDeleteChat(chat.id);
      setContextMenu(null);
      showSuccess('Conversa Excluída', `A conversa com ${participantName} foi excluída.`);
    }
  };

  return (
    <div className="chat-list">
      {showNewChat && (
        <div className="new-chat-form">
          <form onSubmit={handleCodeSubmit}>
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="Digite o código do usuário"
              maxLength={8}
              className="code-input"
            />
            <button type="submit" className="code-submit-btn" style={{ background: primaryColor }}>
              Iniciar
            </button>
          </form>
          {error && <div className="error-text">{error}</div>}
        </div>
      )}
      <div className="chats">
        {chats.length === 0 ? (
          <div className="no-chats">Nenhuma conversa ainda</div>
        ) : (
          chats.map((chat) => {
            const participant = getParticipant(chat);
            if (!participant) return null;

            const blocked = isBlocked(participant.id);

            return (
              <div
                key={chat.id}
                ref={(el) => (chatItemRefs.current[chat.id] = el)}
                className={`chat-item ${blocked ? 'blocked' : ''}`}
                onClick={() => !blocked && onChatSelect(chat)}
                onContextMenu={(e) => handleContextMenu(e, chat)}
              >
                {participant.profilePicture ? (
                  <img
                    src={participant.profilePicture}
                    alt={participant.nickname}
                    className="chat-avatar-img"
                  />
                ) : (
                  <div className="chat-avatar">
                    {participant.nickname[0].toUpperCase()}
                  </div>
                )}
                <div className="chat-info">
                  <div className="chat-name">
                    {participant.nickname}
                    {blocked && <span className="blocked-badge">Bloqueado</span>}
                  </div>
                  {chat.lastMessage && !blocked && (
                    <div className="chat-preview">
                      {chat.lastMessage.type === 'text' ? (
                        chat.lastMessage.content
                      ) : chat.lastMessage.type === 'image' ? (
                        <><i className="fas fa-image"></i> Imagem</>
                      ) : chat.lastMessage.type === 'video' ? (
                        <><i className="fas fa-video"></i> Vídeo</>
                      ) : (
                        <><i className="fas fa-microphone"></i> Áudio</>
                      )}
                    </div>
                  )}
                  {blocked && (
                    <div className="chat-preview blocked-message">Usuário bloqueado</div>
                  )}
                </div>
                {chat.lastMessage && !blocked && (
                  <div className="chat-time">
                    {formatTime(chat.lastMessage.timestamp)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          options={[
            {
              label: 'Ver Perfil',
              icon: <i className="fas fa-user"></i>,
              onClick: () => handleViewProfile(contextMenu.chat),
            },
            {
              label: 'Excluir Conversa',
              icon: <i className="fas fa-trash"></i>,
              onClick: () => handleDeleteChatConfirm(contextMenu.chat),
              danger: true,
            },
            {
              label: isBlocked(getParticipant(contextMenu.chat)?.id || '') 
                ? 'Desbloquear' 
                : 'Bloquear',
              icon: isBlocked(getParticipant(contextMenu.chat)?.id || '') 
                ? <i className="fas fa-unlock"></i>
                : <i className="fas fa-ban"></i>,
              onClick: () => {
                const participant = getParticipant(contextMenu.chat);
                if (participant) {
                  if (isBlocked(participant.id)) {
                    handleUnblockUser(participant.id);
                  } else {
                    handleBlockUser(contextMenu.chat);
                  }
                }
              },
              danger: !isBlocked(getParticipant(contextMenu.chat)?.id || ''),
            },
          ]}
        />
      )}
      {viewProfile && (
        <ViewProfile
          user={viewProfile}
          currentUserId={currentUserId}
          onClose={() => setViewProfile(null)}
          onBlock={async (userId) => {
            await storage.blockUser(currentUserId, userId);
            onUserBlocked?.();
          }}
          onUnblock={handleUnblockUser}
          isBlocked={isBlocked(viewProfile.id)}
        />
      )}
    </div>
  );
}

