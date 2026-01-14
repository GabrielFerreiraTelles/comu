export interface User {
  id: string;
  email: string;
  nickname: string;
  code: string; // Código único para iniciar conversas
  createdAt: number;
  profilePicture?: string; // Base64 da foto
  bio?: string;
  description?: string;
  blockedWords: string[]; // Palavras bloqueadas
}

export interface BlockedUser {
  userId: string;
  blockedAt: number;
}

export type MessageType = 'text' | 'audio' | 'image' | 'video' | 'gif';

export interface MessageReaction {
  emoji: string;
  userId: string;
  timestamp: number;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  type: MessageType;
  content: string; // Texto ou URL/base64 para mídia
  timestamp: number;
  sent: boolean; // Se foi enviada ou está pendente
  sentAt?: number; // Timestamp quando foi enviada
  edited?: boolean;
  editedAt?: number;
  // Novos campos
  replyToId?: string; // ID da mensagem respondida
  reactions?: MessageReaction[]; // Reações na mensagem
  readAt?: number; // Timestamp quando foi lida
  readBy?: string[]; // IDs dos usuários que leram
  pinned?: boolean; // Se a mensagem está fixada
}

export interface Chat {
  id: string;
  participants: string[]; // IDs dos usuários
  lastMessage?: Message;
  lastActivity: number;
  pinnedMessages?: string[]; // IDs das mensagens fixadas
  typingUsers?: string[]; // IDs dos usuários que estão digitando
}

export interface PendingMessage extends Message {
  pending: true;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'black-white';
  timezone: string;
  primaryColor: string; // Cor primária personalizada
  secondaryColor: string; // Cor secundária personalizada
  accentColor: string; // Cor de destaque
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
  };
  privacy: {
    showOnlineStatus: boolean;
    allowMessageRequests: boolean;
  };
  appearance: {
    fontSize: 'small' | 'medium' | 'large';
    compactMode: boolean;
  };
}

export interface ChatSettings {
  chatId: string;
  wallpaper: string; // URL ou base64 da imagem
  textColor: string;
  inputBoxColor: string;
  inputTextColor: string;
  messageBubbleColor: string;
  messageTextColor: string;
  replyPreviewBackgroundColor: string; // Cor de fundo da bolha de resposta
  replyPreviewTextColor: string; // Cor do texto da bolha de resposta
}

export interface BlockedWordAttempt {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  blockedWord: string;
  messageContent: string;
  timestamp: number;
  action?: 'blocked' | 'ignored';
}

