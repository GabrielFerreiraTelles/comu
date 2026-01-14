import { useState, useEffect, useRef, useCallback } from 'react';
import { Chat, User, Message, MessageType } from '../types';
import { storage } from '../utils/storageFirebase';
import { useAppSettings } from '../hooks/useAppSettings';
import { auth } from '../config/firebase';
import {
  createMessage,
  sendPendingMessages,
  editMessage,
  deleteMessage,
  canDeleteMessage,
} from '../utils/messages';
import { fileToBase64, validateFile } from '../utils/media';
import { settingsStorage } from '../utils/settings';
import {
  checkBlockedWords,
  createBlockedAttempt,
  showBlockedNotification,
} from '../utils/blockedWords';
import { showSuccess } from '../utils/notifications';
import MessageBubble from './MessageBubble';
import ChatSettings from './ChatSettings';
import BlockedWordNotification from './BlockedWordNotification';
import ViewProfile from './ViewProfile';
import MediaGallery from './MediaGallery';
import MessageSearch from './MessageSearch';
import EmojiPicker from './EmojiPicker';
import GifPicker from './GifPicker';
import CallModal from './CallModal';
import CameraModal from './CameraModal';
import './ChatWindow.css';

interface ChatWindowProps {
  chat: Chat;
  currentUser: User;
  onChatUpdate: () => void;
}

export default function ChatWindow({ chat, currentUser, onChatUpdate }: ChatWindowProps) {
  const appSettings = useAppSettings();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [callState, setCallState] = useState<{
    isOpen: boolean;
    callType: 'voice' | 'video' | null;
    isIncoming: boolean;
    isActive: boolean;
  }>({
    isOpen: false,
    callType: null,
    isIncoming: false,
    isActive: false,
  });
  const [chatSettings, setChatSettings] = useState(settingsStorage.getChatSettings(chat.id));
  const [pendingCount, setPendingCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    loadMessages();
    setChatSettings(settingsStorage.getChatSettings(chat.id));
    
    // Listener em tempo real para mensagens
    const unsubscribe = storage.subscribeToMessages(chat.id, async (updatedMessages) => {
      try {
        const pendingMessages = await storage.getPendingMessages(currentUser.id);
        const pending = pendingMessages.filter(m => m.chatId === chat.id);
        const pendingIds = new Set(pending.map(m => m.id));
        const filtered = updatedMessages.filter(m => !pendingIds.has(m.id));
        setMessages([...filtered, ...pending].sort((a, b) => a.timestamp - b.timestamp));
        setPendingCount(pending.length);
      } catch (error) {
        console.error('Erro ao atualizar mensagens:', error);
      }
    }, currentUser.id);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [chat.id]);

  // Fechar menu de mídia ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showMediaMenu && !target.closest('.media-menu-container')) {
        setShowMediaMenu(false);
      }
    };

    if (showMediaMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMediaMenu]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Verificar status de digitação periodicamente
    const interval = setInterval(async () => {
      try {
        const typing = await storage.getTypingUsers(chat.id);
        setTypingUsers(typing.filter(id => id !== currentUser.id));
      } catch (error) {
        console.error('Erro ao buscar status de digitação:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [chat.id, currentUser.id]);

  useEffect(() => {
    // Marcar mensagens como lidas quando visualizadas
    const unreadMessages = messages.filter(
      m => m.senderId !== currentUser.id && m.sent && !m.readBy?.includes(currentUser.id)
    );
    if (unreadMessages.length > 0) {
      unreadMessages.forEach(async (msg) => {
        await storage.markAsRead(msg.id, currentUser.id);
      });
      // Atualizar apenas as mensagens marcadas como lidas
      setMessages(prevMessages => 
        prevMessages.map(msg => {
          if (unreadMessages.some(u => u.id === msg.id)) {
            return {
              ...msg,
              readBy: [...(msg.readBy || []), currentUser.id],
              readAt: Date.now(),
            };
          }
          return msg;
        })
      );
    }
  }, [messages.length, currentUser.id]);

  const loadMessages = async () => {
    try {
      const [chatMessages, pendingMessages] = await Promise.all([
        storage.getMessagesByChat(chat.id, currentUser.id),
        storage.getPendingMessages(currentUser.id),
      ]);
      
      const pending = pendingMessages.filter(m => m.chatId === chat.id);
      // Filtrar mensagens pendentes que já estão nas mensagens normais (evitar duplicação)
      const pendingIds = new Set(pending.map(m => m.id));
      const normalMessages = chatMessages.filter(m => !pendingIds.has(m.id));
      
      setMessages([...normalMessages, ...pending].sort((a, b) => a.timestamp - b.timestamp));
      setPendingCount(pending.length);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const [otherUser, setOtherUser] = useState<User | null>(null);

  useEffect(() => {
    const loadOtherUser = async () => {
      const otherId = chat.participants.find(id => id !== currentUser.id);
      if (!otherId) return;
      try {
        const users = await storage.getUsers();
        const user = users.find(u => u.id === otherId);
        setOtherUser(user || null);
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
      }
    };
    loadOtherUser();
  }, [chat.participants, currentUser.id]);

  const getOtherUser = (): User | null => {
    return otherUser;
  };

  // Verificar se o usuário está bloqueado quando o perfil é aberto
  useEffect(() => {
    if (showProfile && otherUser) {
      storage.isUserBlocked(currentUser.id, otherUser.id).then(setIsUserBlocked).catch(() => setIsUserBlocked(false));
    }
  }, [showProfile, otherUser, currentUser.id]);

  const handleSendMessage = async (type: MessageType = 'text', content?: string) => {
    const otherUser = getOtherUser();
    if (!otherUser) return;

    const messageContent = content || inputText.trim();
    if (!messageContent && (type === 'text' || type === 'gif')) return;

    // Verificar palavras bloqueadas apenas para mensagens de texto
    if (type === 'text' && otherUser.blockedWords && otherUser.blockedWords.length > 0) {
      const blockedWord = checkBlockedWords(messageContent, otherUser);
      if (blockedWord) {
        // Criar tentativa bloqueada
        const attempt = createBlockedAttempt(
          chat.id,
          currentUser.id,
          otherUser.id,
          blockedWord,
          messageContent
        );
        await storage.addBlockedAttempt(attempt);
        
        // Mostrar notificação para o remetente
        showBlockedNotification(blockedWord, otherUser.nickname);
        
        // Notificação para o receptor será mostrada pelo BlockedWordNotification component
        
        return; // Não enviar a mensagem
      }
    }

    // CRÍTICO: Usar auth.currentUser?.uid ao invés de currentUser.id para garantir sincronia com Firestore
    const firebaseUserId = auth.currentUser?.uid;
    if (!firebaseUserId) {
      console.error('handleSendMessage: Usuário não autenticado no Firebase Auth');
      return;
    }
    
    // Validar se currentUser.id corresponde ao Firebase Auth UID
    if (currentUser.id !== firebaseUserId) {
      console.warn(`currentUser.id (${currentUser.id}) não corresponde ao Firebase Auth UID (${firebaseUserId})`);
    }
    
    const message = createMessage(
      chat.id,
      firebaseUserId, // Usar Firebase Auth UID
      otherUser.id,
      type,
      messageContent,
      replyingTo?.id
    );

    // Adicionar como pendente (não salvar em saveMessage ainda para evitar duplicação)
    await storage.addPendingMessage(message);
    await loadMessages();
    setInputText('');
    setEditingMessage(null);
    setReplyingTo(null);
    onChatUpdate();
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    
    // Gerenciar status de digitação
    if (!isTyping && e.target.value.trim()) {
      try {
        await storage.setTypingStatus(chat.id, currentUser.id, true);
        setIsTyping(true);
      } catch (error) {
        console.error('Erro ao definir status de digitação:', error);
      }
    }

    // Limpar timeout anterior
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Parar status após 3 segundos sem digitar
    typingTimeoutRef.current = setTimeout(async () => {
      try {
        await storage.setTypingStatus(chat.id, currentUser.id, false);
        setIsTyping(false);
      } catch (error) {
        console.error('Erro ao remover status de digitação:', error);
      }
    }, 3000);
  };

  const handleSendPending = async () => {
    try {
      // Usar Firebase Auth UID para buscar mensagens pendentes
      const firebaseUserId = auth.currentUser?.uid;
      if (!firebaseUserId) {
        console.error('handleSendPending: Usuário não autenticado no Firebase Auth');
        return;
      }
      
      const pendingMessages = await storage.getPendingMessages(firebaseUserId);
      const pendingCount = pendingMessages.filter(m => m.chatId === chat.id).length;
      
      if (pendingCount === 0) {
        console.log('Nenhuma mensagem pendente para enviar');
        return;
      }
      
      // Enviar mensagens pendentes (a função já usa auth.currentUser?.uid internamente)
      const result = await sendPendingMessages(firebaseUserId);
      
      await loadMessages();
      onChatUpdate();
      
      if (result.success > 0) {
        showSuccess('Mensagens Enviadas', `${result.success} mensagem(ns) enviada(s) com sucesso!`);
      }
      
      if (result.failed > 0) {
        console.error(`[handleSendPending] ${result.failed} mensagem(ns) falharam ao enviar:`, result.errors);
        // Opcional: mostrar erro ao usuário
      }
    } catch (error) {
      console.error('[handleSendPending] Erro ao enviar mensagens pendentes:', error);
      // Não mostrar popup de sucesso em caso de erro
    }
  };

  const handleEdit = (message: Message) => {
    if (!message.sent) {
      setEditingMessage(message);
      setInputText(message.content);
    }
  };

  const handleSaveEdit = async () => {
    if (editingMessage) {
      try {
        await editMessage(editingMessage.id, inputText);
        
        // Atualizar o estado local imediatamente para refletir a edição
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === editingMessage.id 
              ? { ...msg, content: inputText, edited: true, editedAt: Date.now() }
              : msg
          )
        );
        
        setEditingMessage(null);
        setInputText('');
        
        // Recarregar mensagens para garantir sincronia com Firestore
        await loadMessages();
      } catch (error) {
        console.error('Erro ao editar mensagem:', error);
      }
    }
  };

  const handleDelete = async (message: Message) => {
    if (confirm('Tem certeza que deseja excluir esta mensagem?')) {
      try {
        await deleteMessage(message.id);
        // Atualizar estado local imediatamente
        setMessages(prevMessages => prevMessages.filter(m => m.id !== message.id));
        await loadMessages();
        onChatUpdate();
      } catch (error) {
        console.error('Erro ao deletar mensagem:', error);
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let type: MessageType;
    if (file.type.startsWith('image/')) {
      if (!validateFile(file, 'image')) {
        alert('Tipo de imagem não suportado');
        return;
      }
      type = 'image';
    } else if (file.type.startsWith('video/')) {
      if (!validateFile(file, 'video')) {
        alert('Tipo de vídeo não suportado');
        return;
      }
      type = 'video';
    } else {
      alert('Tipo de arquivo não suportado');
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      await handleSendMessage(type, base64);
    } catch (error) {
      alert('Erro ao processar arquivo');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCameraCapture = async (file: File, captureType: 'image' | 'video') => {
    try {
      const type: MessageType = captureType === 'image' ? 'image' : 'video';
      const base64 = await fileToBase64(file);
      await handleSendMessage(type, base64);
    } catch (error) {
      alert('Erro ao processar captura da câmera');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const base64 = await fileToBase64(new File([blob], 'audio.webm', { type: 'audio/webm' }));
        await handleSendMessage('audio', base64);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      audioRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (error) {
      alert('Erro ao acessar o microfone');
    }
  };

  const stopRecording = () => {
    if (audioRecorderRef.current && isRecording) {
      audioRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // pendingCount já está sendo gerenciado pelo useState acima
  const primaryColor = appSettings.primaryColor || '#000000';

  // Função para fechar todos os modais
  const closeAllModals = () => {
    setShowChatSettings(false);
    setShowProfile(false);
    setShowMediaGallery(false);
    setShowMessageSearch(false);
    setShowEmojiPicker(false);
    setShowGifPicker(false);
    setShowMediaMenu(false);
    setShowCamera(false);
    // Disparar evento para fechar menus de contexto
    window.dispatchEvent(new CustomEvent('modalOpen'));
  };

  const handleSettingsChange = useCallback(() => {
    setChatSettings(settingsStorage.getChatSettings(chat.id));
  }, [chat.id]);

  // Aplicar configurações de privacidade
  const shouldShowOnlineStatus = appSettings.privacy?.showOnlineStatus ?? true;

  const handleMessageSelect = useCallback((messageId: string) => {
    setHighlightedMessageId(messageId);
    
    // Scroll até a mensagem
    setTimeout(() => {
      const messageElement = messageRefs.current[messageId];
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Remover highlight após 3 segundos
        setTimeout(() => {
          setHighlightedMessageId(null);
        }, 3000);
      }
    }, 100);
  }, []);

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    // Focar no input
    const input = document.querySelector('.message-input') as HTMLInputElement;
    if (input) {
      input.focus();
    }
  };

  const handlePinMessage = (messageId: string) => {
    storage.pinMessage(messageId, chat.id);
    loadMessages();
    onChatUpdate();
  };

  const handleUnpinMessage = (messageId: string) => {
    storage.unpinMessage(messageId, chat.id);
    loadMessages();
    onChatUpdate();
  };

  const getReplyToMessage = (replyToId?: string): Message | null => {
    if (!replyToId) return null;
    return messages.find(m => m.id === replyToId) || null;
  };

  const handleStartCall = (type: 'voice' | 'video') => {
    const otherUser = getOtherUser();
    if (!otherUser) return;
    
    setCallState({
      isOpen: true,
      callType: type,
      isIncoming: false,
      isActive: false,
    });

    // Simular chamada sendo iniciada
    // Em uma implementação real, você enviaria um sinal via WebSocket/WebRTC
    setTimeout(() => {
      setCallState(prev => ({ ...prev, isActive: true }));
    }, 2000);
  };

  const handleAcceptCall = () => {
    setCallState(prev => ({ ...prev, isIncoming: false, isActive: true }));
  };

  const handleRejectCall = () => {
    setCallState({
      isOpen: false,
      callType: null,
      isIncoming: false,
      isActive: false,
    });
  };

  const handleEndCall = () => {
    setCallState({
      isOpen: false,
      callType: null,
      isIncoming: false,
      isActive: false,
    });
  };

  // Simular chamada recebida (em produção, isso viria de um WebSocket)
  useEffect(() => {
    const handleIncomingCall = (event: CustomEvent) => {
      const { type } = event.detail;
      setCallState({
        isOpen: true,
        callType: type,
        isIncoming: true,
        isActive: false,
      });
    };

    window.addEventListener('incomingCall' as any, handleIncomingCall as EventListener);
    return () => {
      window.removeEventListener('incomingCall' as any, handleIncomingCall as EventListener);
    };
  }, []);

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-header-info">
          {otherUser?.profilePicture ? (
            <img
              src={otherUser.profilePicture}
              alt={otherUser.nickname}
              className="chat-header-avatar-img"
            />
          ) : (
            <div className="chat-header-avatar" style={{ background: primaryColor }}>
              {otherUser?.nickname[0].toUpperCase()}
            </div>
          )}
          <div>
            <div
              className="chat-header-name"
              onClick={() => {
                if (otherUser) {
                  closeAllModals();
                  setShowProfile(true);
                }
              }}
              style={{ cursor: 'pointer' }}
              title="Clique para ver o perfil"
            >
              {otherUser?.nickname}
            </div>
            {shouldShowOnlineStatus && (
              <div className="chat-header-status">
                {isOnline ? 'Online' : 'Offline'}
              </div>
            )}
          </div>
        </div>
        <div className="chat-header-actions">
          <button
            onClick={() => handleStartCall('voice')}
            className="header-action-btn call-btn"
            title="Ligação de voz"
          >
            <i className="fas fa-phone"></i>
          </button>
          <button
            onClick={() => handleStartCall('video')}
            className="header-action-btn call-btn"
            title="Chamada de vídeo"
          >
            <i className="fas fa-video"></i>
          </button>
          <button
            onClick={() => {
              closeAllModals();
              setShowMessageSearch(true);
            }}
            className="header-action-btn"
            title="Buscar mensagens"
          >
            <i className="fas fa-search"></i>
          </button>
          <button
            onClick={() => {
              closeAllModals();
              setShowMediaGallery(true);
            }}
            className="header-action-btn"
            title="Ver mídias"
          >
            <i className="fas fa-images"></i>
          </button>
          <button
            onClick={() => {
              closeAllModals();
              setShowChatSettings(true);
            }}
            className="header-action-btn"
            title="Configurações da conversa"
          >
            <i className="fas fa-cog"></i>
          </button>
        </div>
      </div>

      <div
        className="chat-messages"
        style={{
          backgroundImage: chatSettings.wallpaper ? `url(${chatSettings.wallpaper})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          color: chatSettings.textColor,
        }}
      >
        {messages.map((message) => {
          const isOwn = message.senderId === currentUser.id;
          return (
            <div
              key={message.id}
              ref={(el) => (messageRefs.current[message.id] = el)}
              className={`message-wrapper ${isOwn ? 'own' : 'other'} ${highlightedMessageId === message.id ? 'highlighted' : ''}`}
            >
              <MessageBubble
                message={message}
                isOwn={isOwn}
                onEdit={() => handleEdit(message)}
                onDelete={() => handleDelete(message)}
                canDelete={canDeleteMessage(message)}
                canEdit={!message.sent}
                chatSettings={chatSettings}
                onReply={handleReply}
                onPin={handlePinMessage}
                onUnpin={handleUnpinMessage}
                onNavigateToMessage={handleMessageSelect}
                currentUserId={currentUser.id}
                replyToMessage={getReplyToMessage(message.replyToId)}
              />
            </div>
          );
        })}
        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="typing-text">
              {typingUsers.length === 1 ? 'está digitando...' : 'estão digitando...'}
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {pendingCount > 0 && (
        <div className="pending-messages-bar">
          <span>{pendingCount} mensagem(ns) pendente(s)</span>
          <button onClick={handleSendPending} className="send-pending-btn" style={{ background: primaryColor }}>
            Enviar Agora
          </button>
        </div>
      )}

      <div className="chat-input-container">
        {editingMessage && (
          <div className="editing-indicator">
            Editando mensagem...
            <button onClick={() => { setEditingMessage(null); setInputText(''); }} className="cancel-edit-btn">
              Cancelar
            </button>
          </div>
        )}
        <div className="chat-input" style={{ position: 'relative' }}>
          {replyingTo && (
            <div className="reply-indicator">
              <div className="reply-indicator-content">
                <i className="fas fa-reply"></i>
                <span>Respondendo a: {replyingTo.content.length > 30 ? replyingTo.content.substring(0, 30) + '...' : replyingTo.content}</span>
                <button onClick={() => setReplyingTo(null)} className="reply-cancel-btn">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,video/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <div className="media-menu-container">
            <button
              onClick={() => {
                if (!showMediaMenu) {
                  closeAllModals();
                }
                setShowMediaMenu(!showMediaMenu);
              }}
              className="input-icon-btn"
              title="Mídia e mais"
            >
              <i className="fas fa-plus"></i>
            </button>
            {showMediaMenu && (
              <div className="media-menu">
                <button
                  onClick={() => {
                    closeAllModals();
                    setShowCamera(true);
                  }}
                  className="media-menu-item"
                  title="Câmera"
                >
                  <i className="fas fa-camera"></i>
                  <span>Câmera</span>
                </button>
                <button
                  onClick={() => {
                    closeAllModals();
                    fileInputRef.current?.click();
                  }}
                  className="media-menu-item"
                  title="Enviar arquivo"
                >
                  <i className="fas fa-paperclip"></i>
                  <span>Arquivo</span>
                </button>
                <button
                  onClick={() => {
                    closeAllModals();
                    setShowGifPicker(true);
                  }}
                  className="media-menu-item"
                  title="GIFs"
                >
                  <i className="fas fa-images"></i>
                  <span>GIF</span>
                </button>
                <button
                  onClick={() => {
                    closeAllModals();
                    setShowEmojiPicker(true);
                  }}
                  className="media-menu-item"
                  title="Emojis"
                >
                  <i className="fas fa-smile"></i>
                  <span>Emoji</span>
                </button>
              </div>
            )}
          </div>
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (editingMessage) {
                  handleSaveEdit();
                } else {
                  handleSendMessage();
                }
              }
            }}
            placeholder={editingMessage ? "Edite sua mensagem..." : replyingTo ? "Digite sua resposta..." : "Digite uma mensagem..."}
            className="message-input"
            style={{
              backgroundColor: chatSettings.inputBoxColor,
              color: chatSettings.inputTextColor,
            }}
          />
          {isRecording ? (
            <button onClick={stopRecording} className="record-btn recording">
              <i className="fas fa-stop"></i>
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="record-btn"
              title="Gravar áudio"
            >
              <i className="fas fa-microphone"></i>
            </button>
          )}
          {editingMessage ? (
            <button onClick={handleSaveEdit} className="send-btn" style={{ background: primaryColor }}>
              <i className="fas fa-check"></i>
            </button>
          ) : (
            <button onClick={() => handleSendMessage()} className="send-btn" style={{ background: primaryColor }}>
              <i className="fas fa-paper-plane"></i>
            </button>
          )}
        </div>
      </div>
      {showChatSettings && (
        <ChatSettings
          chatId={chat.id}
          onClose={() => setShowChatSettings(false)}
          onSettingsChange={handleSettingsChange}
        />
      )}
      {showProfile && otherUser && (
        <ViewProfile
          user={otherUser}
          currentUserId={currentUser.id}
          onClose={() => setShowProfile(false)}
          onBlock={async (userId) => {
            await storage.blockUser(currentUser.id, userId);
            setIsUserBlocked(true);
            onChatUpdate();
          }}
          onUnblock={async (userId) => {
            await storage.unblockUser(currentUser.id, userId);
            setIsUserBlocked(false);
            onChatUpdate();
          }}
          isBlocked={isUserBlocked}
        />
      )}
      {showMediaGallery && (
        <MediaGallery
          messages={messages}
          onClose={() => setShowMediaGallery(false)}
          onMessageSelect={handleMessageSelect}
        />
      )}
      {showMessageSearch && (
        <MessageSearch
          messages={messages}
          onClose={() => setShowMessageSearch(false)}
          onMessageSelect={handleMessageSelect}
          currentUserId={currentUser.id}
        />
      )}
      {showEmojiPicker && (
        <EmojiPicker
          onEmojiSelect={(emoji) => {
            setInputText(prev => prev + emoji);
            setShowEmojiPicker(false);
          }}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}
      {showGifPicker && (
        <GifPicker
          onGifSelect={(gifUrl) => {
            handleSendMessage('gif', gifUrl);
            setShowGifPicker(false);
          }}
          onClose={() => setShowGifPicker(false)}
        />
      )}
      {showCamera && (
        <CameraModal
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
      <CallModal
        isOpen={callState.isOpen}
        callType={callState.callType}
        caller={getOtherUser()}
        currentUser={currentUser}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
        onEnd={handleEndCall}
        isIncoming={callState.isIncoming}
        isActive={callState.isActive}
      />
    </div>
  );
}

