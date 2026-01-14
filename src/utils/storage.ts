import { User, Message, Chat, BlockedWordAttempt, BlockedUser } from '../types';

const STORAGE_KEYS = {
  USER: 'comu_user',
  MESSAGES: 'comu_messages',
  CHATS: 'comu_chats',
  PENDING_MESSAGES: 'comu_pending_messages',
  USERS: 'comu_users', // Para simular banco de dados local
  BLOCKED_ATTEMPTS: 'comu_blocked_attempts',
  BLOCKED_USERS: 'comu_blocked_users',
  TYPING_STATUS: 'comu_typing_status', // Status de digitação por chat
};

export const storage = {
  // User
  saveUser: (user: User): void => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    // Salvar também na lista de usuários (simulando banco)
    const users = storage.getUsers();
    const existingIndex = users.findIndex(u => u.id === user.id);
    if (existingIndex >= 0) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  getUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  },

  getUsers: (): User[] => {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  },

  getUserByCode: (code: string): User | null => {
    const users = storage.getUsers();
    return users.find(u => u.code === code) || null;
  },

  // Messages
  saveMessage: (message: Message): void => {
    const messages = storage.getMessages();
    const existingIndex = messages.findIndex(m => m.id === message.id);
    if (existingIndex >= 0) {
      messages[existingIndex] = message;
    } else {
      messages.push(message);
    }
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  },

  getMessages: (): Message[] => {
    const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return data ? JSON.parse(data) : [];
  },

  getMessagesByChat: (chatId: string): Message[] => {
    const messages = storage.getMessages();
    return messages.filter(m => m.chatId === chatId).sort((a, b) => a.timestamp - b.timestamp);
  },

  deleteMessage: (messageId: string): void => {
    const messages = storage.getMessages();
    const filtered = messages.filter(m => m.id !== messageId);
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(filtered));
  },

  // Pending Messages
  addPendingMessage: (message: Message): void => {
    const pending = storage.getPendingMessages();
    pending.push(message);
    localStorage.setItem(STORAGE_KEYS.PENDING_MESSAGES, JSON.stringify(pending));
  },

  getPendingMessages: (): Message[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PENDING_MESSAGES);
    return data ? JSON.parse(data) : [];
  },

  clearPendingMessages: (): void => {
    localStorage.removeItem(STORAGE_KEYS.PENDING_MESSAGES);
  },

  removePendingMessage: (messageId: string): void => {
    const pending = storage.getPendingMessages();
    const filtered = pending.filter(m => m.id !== messageId);
    localStorage.setItem(STORAGE_KEYS.PENDING_MESSAGES, JSON.stringify(filtered));
  },

  // Chats
  saveChat: (chat: Chat): void => {
    const chats = storage.getChats();
    const existingIndex = chats.findIndex(c => c.id === chat.id);
    if (existingIndex >= 0) {
      chats[existingIndex] = chat;
    } else {
      chats.push(chat);
    }
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
  },

  getChats: (): Chat[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CHATS);
    return data ? JSON.parse(data) : [];
  },

  getChat: (chatId: string): Chat | null => {
    const chats = storage.getChats();
    return chats.find(c => c.id === chatId) || null;
  },

  deleteChat: (chatId: string): void => {
    const chats = storage.getChats();
    const filtered = chats.filter(c => c.id !== chatId);
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(filtered));
  },

  // Blocked Word Attempts
  addBlockedAttempt: (attempt: BlockedWordAttempt): void => {
    const attempts = storage.getBlockedAttempts();
    attempts.push(attempt);
    localStorage.setItem(STORAGE_KEYS.BLOCKED_ATTEMPTS, JSON.stringify(attempts));
  },

  getBlockedAttempts: (): BlockedWordAttempt[] => {
    const data = localStorage.getItem(STORAGE_KEYS.BLOCKED_ATTEMPTS);
    return data ? JSON.parse(data) : [];
  },

  getBlockedAttemptsByUser: (userId: string): BlockedWordAttempt[] => {
    const attempts = storage.getBlockedAttempts();
    return attempts.filter(a => a.receiverId === userId && !a.action);
  },

  updateBlockedAttempt: (attemptId: string, action: 'blocked' | 'ignored'): void => {
    const attempts = storage.getBlockedAttempts();
    const index = attempts.findIndex(a => a.id === attemptId);
    if (index >= 0) {
      attempts[index].action = action;
      localStorage.setItem(STORAGE_KEYS.BLOCKED_ATTEMPTS, JSON.stringify(attempts));
    }
  },

  // Blocked Users
  blockUser: (currentUserId: string, userIdToBlock: string): void => {
    const blocked = storage.getBlockedUsers(currentUserId);
    if (!blocked.find(b => b.userId === userIdToBlock)) {
      blocked.push({ userId: userIdToBlock, blockedAt: Date.now() });
      localStorage.setItem(`${STORAGE_KEYS.BLOCKED_USERS}_${currentUserId}`, JSON.stringify(blocked));
    }
  },

  unblockUser: (currentUserId: string, userIdToUnblock: string): void => {
    const blocked = storage.getBlockedUsers(currentUserId);
    const filtered = blocked.filter(b => b.userId !== userIdToUnblock);
    localStorage.setItem(`${STORAGE_KEYS.BLOCKED_USERS}_${currentUserId}`, JSON.stringify(filtered));
  },

  getBlockedUsers: (userId: string): BlockedUser[] => {
    const data = localStorage.getItem(`${STORAGE_KEYS.BLOCKED_USERS}_${userId}`);
    return data ? JSON.parse(data) : [];
  },

  isUserBlocked: (currentUserId: string, userIdToCheck: string): boolean => {
    const blocked = storage.getBlockedUsers(currentUserId);
    return blocked.some(b => b.userId === userIdToCheck);
  },

  // Typing Status
  setTypingStatus: (chatId: string, userId: string, isTyping: boolean): void => {
    const data = localStorage.getItem(STORAGE_KEYS.TYPING_STATUS);
    const typingStatus: Record<string, string[]> = data ? JSON.parse(data) : {};
    
    if (!typingStatus[chatId]) {
      typingStatus[chatId] = [];
    }
    
    if (isTyping) {
      if (!typingStatus[chatId].includes(userId)) {
        typingStatus[chatId].push(userId);
      }
    } else {
      typingStatus[chatId] = typingStatus[chatId].filter(id => id !== userId);
    }
    
    localStorage.setItem(STORAGE_KEYS.TYPING_STATUS, JSON.stringify(typingStatus));
  },

  getTypingUsers: (chatId: string): string[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TYPING_STATUS);
    const typingStatus: Record<string, string[]> = data ? JSON.parse(data) : {};
    return typingStatus[chatId] || [];
  },

  // Message Reactions
  addReaction: (messageId: string, emoji: string, userId: string): void => {
    const messages = storage.getMessages();
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    if (!message.reactions) {
      message.reactions = [];
    }

    // Remover reação existente do usuário se houver
    message.reactions = message.reactions.filter(r => r.userId !== userId);
    
    // Adicionar nova reação
    message.reactions.push({
      emoji,
      userId,
      timestamp: Date.now(),
    });

    storage.saveMessage(message);
  },

  removeReaction: (messageId: string, userId: string): void => {
    const messages = storage.getMessages();
    const message = messages.find(m => m.id === messageId);
    if (!message || !message.reactions) return;

    message.reactions = message.reactions.filter(r => r.userId !== userId);
    storage.saveMessage(message);
  },

  // Read Receipts
  markAsRead: (messageId: string, userId: string): void => {
    const messages = storage.getMessages();
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    if (!message.readBy) {
      message.readBy = [];
    }

    if (!message.readBy.includes(userId)) {
      message.readBy.push(userId);
      message.readAt = Date.now();
      storage.saveMessage(message);
    }
  },

  markChatAsRead: (chatId: string, userId: string): void => {
    const messages = storage.getMessagesByChat(chatId);
    messages.forEach(message => {
      if (message.senderId !== userId && message.sent) {
        storage.markAsRead(message.id, userId);
      }
    });
  },

  // Pinned Messages
  pinMessage: (messageId: string, chatId: string): void => {
    const chats = storage.getChats();
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    if (!chat.pinnedMessages) {
      chat.pinnedMessages = [];
    }

    if (!chat.pinnedMessages.includes(messageId)) {
      chat.pinnedMessages.push(messageId);
      storage.saveChat(chat);
    }

    // Marcar mensagem como fixada
    const messages = storage.getMessages();
    const message = messages.find(m => m.id === messageId);
    if (message) {
      message.pinned = true;
      storage.saveMessage(message);
    }
  },

  unpinMessage: (messageId: string, chatId: string): void => {
    const chats = storage.getChats();
    const chat = chats.find(c => c.id === chatId);
    if (!chat || !chat.pinnedMessages) return;

    chat.pinnedMessages = chat.pinnedMessages.filter(id => id !== messageId);
    storage.saveChat(chat);

    // Desmarcar mensagem
    const messages = storage.getMessages();
    const message = messages.find(m => m.id === messageId);
    if (message) {
      message.pinned = false;
      storage.saveMessage(message);
    }
  },

  getPinnedMessages: (chatId: string): string[] => {
    const chats = storage.getChats();
    const chat = chats.find(c => c.id === chatId);
    return chat?.pinnedMessages || [];
  },
};

