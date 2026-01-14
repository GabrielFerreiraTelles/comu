import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage as firebaseStorage, auth } from '../config/firebase';
import { User, Message, Chat, BlockedWordAttempt, BlockedUser } from '../types';

// Helper para converter Timestamp do Firestore para number
const timestampToNumber = (timestamp: any): number => {
  if (timestamp?.toMillis) {
    return timestamp.toMillis();
  }
  if (timestamp?.seconds) {
    return timestamp.seconds * 1000;
  }
  return timestamp || Date.now();
};

// Helper para converter number para Timestamp do Firestore
const numberToTimestamp = (num: number) => {
  return Timestamp.fromMillis(num);
};

// Converter dados do Firestore para tipos da aplicação
const convertFirestoreData = (data: any, id: string) => {
  return {
    ...data,
    id,
    createdAt: timestampToNumber(data.createdAt),
    timestamp: timestampToNumber(data.timestamp),
    sentAt: data.sentAt ? timestampToNumber(data.sentAt) : undefined,
    editedAt: data.editedAt ? timestampToNumber(data.editedAt) : undefined,
    readAt: data.readAt ? timestampToNumber(data.readAt) : undefined,
    lastActivity: timestampToNumber(data.lastActivity),
    blockedAt: data.blockedAt ? timestampToNumber(data.blockedAt) : undefined,
    reactions: data.reactions?.map((r: any) => ({
      ...r,
      timestamp: timestampToNumber(r.timestamp),
    })) || [],
  };
};

export const storage = {
  // User
  saveUser: async (user: User): Promise<void> => {
    const userRef = doc(db, 'users', user.id);
    await setDoc(userRef, {
      email: user.email,
      nickname: user.nickname,
      code: user.code,
      createdAt: numberToTimestamp(user.createdAt),
      profilePicture: user.profilePicture || null,
      description: user.description || null,
      blockedWords: user.blockedWords || [],
    }, { merge: true });
    
    // Salvar também no localStorage para compatibilidade temporária
    localStorage.setItem('comu_user', JSON.stringify(user));
  },

  getUser: async (userId?: string): Promise<User | null> => {
    // Se userId for fornecido, buscar do Firestore
    if (userId) {
      try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) return null;
        
        const data = userDoc.data();
        // Converter dados do usuário manualmente
        return {
          id: userDoc.id,
          email: data.email,
          nickname: data.nickname,
          code: data.code,
          createdAt: data.createdAt?.toMillis() || Date.now(),
          profilePicture: data.profilePicture || null,
          description: data.description || null,
          blockedWords: data.blockedWords || [],
        } as User;
      } catch (error) {
        console.error('Erro ao buscar usuário do Firestore:', error);
        return null;
      }
    }
    
    // Se não, tentar do localStorage (compatibilidade)
    const localData = localStorage.getItem('comu_user');
    if (localData) {
      try {
        return JSON.parse(localData);
      } catch {
        // Ignora erro
      }
    }
    return null;
  },

  getUsers: async (): Promise<User[]> => {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      // Converter dados do usuário manualmente (sem usar convertFirestoreData que é para mensagens/chats)
      return {
        id: doc.id,
        email: data.email,
        nickname: data.nickname,
        code: data.code,
        createdAt: data.createdAt?.toMillis() || Date.now(),
        profilePicture: data.profilePicture || null,
        description: data.description || null,
        blockedWords: data.blockedWords || [],
      } as User;
    });
  },

  getUserByCode: async (code: string): Promise<User | null> => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('code', '==', code));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('Código não encontrado:', code);
        return null;
      }
      
      const doc = snapshot.docs[0];
      const data = doc.data();
      
      console.log('Usuário encontrado:', { id: doc.id, code: data.code, nickname: data.nickname });
      
      // Converter dados do usuário manualmente (sem usar convertFirestoreData que é para mensagens/chats)
      const user = {
        id: doc.id,
        email: data.email,
        nickname: data.nickname,
        code: data.code,
        createdAt: data.createdAt?.toMillis() || Date.now(),
        profilePicture: data.profilePicture || null,
        description: data.description || null,
        blockedWords: data.blockedWords || [],
      } as User;
      
      return user;
    } catch (error: any) {
      console.error('Erro ao buscar usuário por código:', error);
      console.error('Detalhes do erro:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      throw new Error(`Erro ao buscar usuário: ${error.message || 'Erro desconhecido'}`);
    }
  },

  // Messages
  saveMessage: async (message: Message, forceCreate: boolean = false): Promise<void> => {
    const messageRef = doc(db, 'messages', message.id);
    const messageData = {
      chatId: message.chatId,
      senderId: message.senderId,
      receiverId: message.receiverId,
      type: message.type,
      content: message.content,
      timestamp: numberToTimestamp(message.timestamp),
      sent: message.sent,
      sentAt: message.sentAt ? numberToTimestamp(message.sentAt) : null,
      edited: message.edited || false,
      editedAt: message.editedAt ? numberToTimestamp(message.editedAt) : null,
      replyToId: message.replyToId || null,
      reactions: message.reactions || [],
      readBy: message.readBy || [],
      readAt: message.readAt ? numberToTimestamp(message.readAt) : null,
      pinned: message.pinned || false,
    };
    
    // Se forceCreate for true, verificar se existe e decidir entre create e update
    if (forceCreate) {
      try {
        const messageDoc = await getDoc(messageRef);
        if (!messageDoc.exists()) {
          // Documento não existe, criar novo
          console.log(`Criando nova mensagem ${message.id} com chatId ${messageData.chatId}, senderId ${messageData.senderId}`);
          await setDoc(messageRef, messageData);
        } else {
          // Documento já existe, atualizar apenas sent e sentAt (permitido pelas regras se sent era false)
          const existingData = messageDoc.data();
          console.log(`Mensagem ${message.id} já existe, sent atual: ${existingData.sent}`);
          if (!existingData.sent) {
            // Mensagem ainda não foi enviada, podemos atualizar para enviada
            console.log(`Atualizando mensagem ${message.id} para sent: true`);
            await updateDoc(messageRef, {
              sent: messageData.sent,
              sentAt: messageData.sentAt,
            });
          } else {
            console.log(`Mensagem ${message.id} já foi enviada, pulando`);
          }
        }
      } catch (error: any) {
        console.error(`Erro ao salvar mensagem ${message.id}:`, {
          code: error.code,
          message: error.message,
          chatId: messageData.chatId,
          senderId: messageData.senderId,
          currentUserId: auth.currentUser?.uid
        });
        throw error;
      }
    } else {
      // Caso contrário, usar merge para permitir atualizações
      await setDoc(messageRef, messageData, { merge: true });
    }
  },

  getMessages: async (): Promise<Message[]> => {
    const messagesRef = collection(db, 'messages');
    const snapshot = await getDocs(messagesRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...convertFirestoreData(doc.data(), doc.id),
    } as Message));
  },

  getMessagesByChat: async (chatId: string, userId: string): Promise<Message[]> => {
    const messagesRef = collection(db, 'messages');
    // Buscar mensagens onde o usuário é senderId ou receiverId
    // Depois filtrar por chatId no cliente (necessário para regras de segurança)
    const q = query(
      messagesRef,
      where('senderId', '==', userId)
    );
    const q2 = query(
      messagesRef,
      where('receiverId', '==', userId)
    );
    
    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(q),
      getDocs(q2)
    ]);
    
    // Combinar resultados e remover duplicatas
    const allMessages = new Map<string, Message>();
    
    [...snapshot1.docs, ...snapshot2.docs].forEach(doc => {
      const message = {
        id: doc.id,
        ...convertFirestoreData(doc.data(), doc.id),
      } as Message;
      allMessages.set(message.id, message);
    });
    
    // Filtrar por chatId e ordenar
    const messages = Array.from(allMessages.values())
      .filter(m => m.chatId === chatId)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    return messages;
  },

  // Listener em tempo real para mensagens de um chat
  subscribeToMessages: (
    chatId: string,
    callback: (messages: Message[]) => void,
    userId: string
  ): (() => void) => {
    const messagesRef = collection(db, 'messages');
    // Buscar mensagens onde o usuário é senderId ou receiverId
    // Depois filtrar por chatId no cliente (necessário para regras de segurança)
    const q1 = query(
      messagesRef,
      where('senderId', '==', userId)
    );
    const q2 = query(
      messagesRef,
      where('receiverId', '==', userId)
    );
    
    let unsubscribe1: (() => void) | null = null;
    let unsubscribe2: (() => void) | null = null;
    const allMessages = new Map<string, Message>();
    
    const updateMessages = () => {
      const filtered = Array.from(allMessages.values())
        .filter(m => m.chatId === chatId)
        .sort((a, b) => a.timestamp - b.timestamp);
      callback(filtered);
    };
    
    unsubscribe1 = onSnapshot(q1, (snapshot) => {
      snapshot.docs.forEach(doc => {
        const message = {
          id: doc.id,
          ...convertFirestoreData(doc.data(), doc.id),
        } as Message;
        allMessages.set(message.id, message);
      });
      updateMessages();
    }, (error) => {
      console.error('Erro no listener de mensagens (senderId):', error);
    });
    
    unsubscribe2 = onSnapshot(q2, (snapshot) => {
      snapshot.docs.forEach(doc => {
        const message = {
          id: doc.id,
          ...convertFirestoreData(doc.data(), doc.id),
        } as Message;
        allMessages.set(message.id, message);
      });
      updateMessages();
    }, (error) => {
      console.error('Erro no listener de mensagens (receiverId):', error);
    });
    
    return () => {
      if (unsubscribe1) unsubscribe1();
      if (unsubscribe2) unsubscribe2();
    };
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    const messageRef = doc(db, 'messages', messageId);
    await deleteDoc(messageRef);
  },

  // Pending Messages
  addPendingMessage: async (message: Message): Promise<void> => {
    // CRÍTICO: Garantir que o senderId corresponde ao Firebase Auth UID
    const firebaseUserId = auth.currentUser?.uid;
    if (!firebaseUserId) {
      throw new Error('Usuário não autenticado no Firebase Auth');
    }
    
    // Se o senderId não corresponder, corrigir
    const correctSenderId = message.senderId === firebaseUserId ? message.senderId : firebaseUserId;
    
    const pendingRef = doc(db, 'pendingMessages', message.id);
    await setDoc(pendingRef, {
      chatId: message.chatId,
      senderId: correctSenderId, // Garantir que corresponde ao Firebase Auth UID
      receiverId: message.receiverId,
      type: message.type,
      content: message.content,
      timestamp: numberToTimestamp(message.timestamp),
      sent: false,
      replyToId: message.replyToId || null,
    });
  },

  getPendingMessages: async (userId?: string): Promise<Message[]> => {
    const pendingRef = collection(db, 'pendingMessages');
    
    // Sempre filtrar por senderId para garantir que as regras de segurança funcionem
    // Usar userId fornecido ou pegar do Firebase Auth
    const currentUserId = userId || auth.currentUser?.uid;
    
    if (!currentUserId) {
      console.warn('getPendingMessages: Nenhum userId fornecido e usuário não autenticado');
      return [];
    }
    
    const q = query(pendingRef, where('senderId', '==', currentUserId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...convertFirestoreData(doc.data(), doc.id),
      sent: false,
    } as Message));
  },

  clearPendingMessages: async (userId?: string): Promise<void> => {
    const pendingRef = collection(db, 'pendingMessages');
    
    // Sempre filtrar por senderId para garantir que as regras de segurança funcionem
    const currentUserId = userId || auth.currentUser?.uid;
    
    if (!currentUserId) {
      console.warn('clearPendingMessages: Nenhum userId fornecido e usuário não autenticado');
      return;
    }
    
    const q = query(pendingRef, where('senderId', '==', currentUserId));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  },

  removePendingMessage: async (messageId: string): Promise<void> => {
    const pendingRef = doc(db, 'pendingMessages', messageId);
    await deleteDoc(pendingRef);
  },

  // Chats
  saveChat: async (chat: Chat): Promise<void> => {
    const chatRef = doc(db, 'chats', chat.id);
    await setDoc(chatRef, {
      participants: chat.participants,
      lastActivity: numberToTimestamp(chat.lastActivity),
      lastMessage: chat.lastMessage ? {
        id: chat.lastMessage.id,
        content: chat.lastMessage.content,
        timestamp: numberToTimestamp(chat.lastMessage.timestamp),
        type: chat.lastMessage.type,
      } : null,
      pinnedMessages: chat.pinnedMessages || [],
      typingUsers: chat.typingUsers || [],
    }, { merge: true });
  },

  getChats: async (userId?: string): Promise<Chat[]> => {
    const chatsRef = collection(db, 'chats');
    let snapshot;
    
    // Se userId for fornecido, usar query filtrada (mais eficiente e seguro)
    if (userId) {
      const q = query(
        chatsRef,
        where('participants', 'array-contains', userId)
      );
      snapshot = await getDocs(q);
    } else {
      // Se não, buscar todos (menos seguro, mas necessário para compatibilidade)
      snapshot = await getDocs(chatsRef);
    }
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...convertFirestoreData(doc.data(), doc.id),
    } as Chat));
  },

  getChat: async (chatId: string): Promise<Chat | null> => {
    const chatRef = doc(db, 'chats', chatId);
    const snapshot = await getDoc(chatRef);
    
    if (!snapshot.exists()) return null;
    
    return {
      id: snapshot.id,
      ...convertFirestoreData(snapshot.data(), snapshot.id),
    } as Chat;
  },

  deleteChat: async (chatId: string): Promise<void> => {
    const chatRef = doc(db, 'chats', chatId);
    await deleteDoc(chatRef);
  },

  // Listener em tempo real para chats de um usuário
  subscribeToUserChats: (
    userId: string,
    callback: (chats: Chat[]) => void
  ): (() => void) => {
    const chatsRef = collection(db, 'chats');
    // Usar apenas array-contains sem orderBy para evitar necessidade de índice composto
    // A ordenação será feita no cliente
    const q = query(
      chatsRef,
      where('participants', 'array-contains', userId)
    );
    
    return onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertFirestoreData(doc.data(), doc.id),
      } as Chat));
      // Ordenar no cliente por lastActivity (descendente)
      chats.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0));
      callback(chats);
    }, (error) => {
      console.error('Erro no listener de chats:', error);
    });
  },

  // Blocked Word Attempts
  addBlockedAttempt: async (attempt: BlockedWordAttempt): Promise<void> => {
    const attemptRef = doc(db, 'blockedAttempts', attempt.id);
    await setDoc(attemptRef, {
      chatId: attempt.chatId,
      senderId: attempt.senderId,
      receiverId: attempt.receiverId,
      blockedWord: attempt.blockedWord,
      messageContent: attempt.messageContent,
      timestamp: numberToTimestamp(attempt.timestamp),
      action: attempt.action || null,
    });
  },

  getBlockedAttempts: async (): Promise<BlockedWordAttempt[]> => {
    const attemptsRef = collection(db, 'blockedAttempts');
    const snapshot = await getDocs(attemptsRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...convertFirestoreData(doc.data(), doc.id),
    } as BlockedWordAttempt));
  },

  getBlockedAttemptsByUser: async (userId: string): Promise<BlockedWordAttempt[]> => {
    const attemptsRef = collection(db, 'blockedAttempts');
    const q = query(
      attemptsRef,
      where('receiverId', '==', userId),
      where('action', '==', null)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...convertFirestoreData(doc.data(), doc.id),
    } as BlockedWordAttempt));
  },

  updateBlockedAttempt: async (
    attemptId: string,
    action: 'blocked' | 'ignored'
  ): Promise<void> => {
    const attemptRef = doc(db, 'blockedAttempts', attemptId);
    await updateDoc(attemptRef, { action });
  },

  // Blocked Users
  blockUser: async (currentUserId: string, userIdToBlock: string): Promise<void> => {
    const blockedRef = doc(db, 'blockedUsers', `${currentUserId}_${userIdToBlock}`);
    await setDoc(blockedRef, {
      userId: currentUserId,
      blockedUserId: userIdToBlock,
      blockedAt: serverTimestamp(),
    });
  },

  unblockUser: async (currentUserId: string, userIdToUnblock: string): Promise<void> => {
    const blockedRef = doc(db, 'blockedUsers', `${currentUserId}_${userIdToUnblock}`);
    await deleteDoc(blockedRef);
  },

  getBlockedUsers: async (userId: string): Promise<BlockedUser[]> => {
    const blockedRef = collection(db, 'blockedUsers');
    const q = query(blockedRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      userId: doc.data().blockedUserId,
      blockedAt: timestampToNumber(doc.data().blockedAt),
    } as BlockedUser));
  },

  isUserBlocked: async (currentUserId: string, userIdToCheck: string): Promise<boolean> => {
    const blockedRef = doc(db, 'blockedUsers', `${currentUserId}_${userIdToCheck}`);
    const snapshot = await getDoc(blockedRef);
    return snapshot.exists();
  },

  // Typing Status
  setTypingStatus: async (
    chatId: string,
    userId: string,
    isTyping: boolean
  ): Promise<void> => {
    const typingRef = doc(db, 'typingStatus', chatId);
    const typingDoc = await getDoc(typingRef);
    
    if (isTyping) {
      if (typingDoc.exists()) {
        const currentUsers = typingDoc.data().users || [];
        if (!currentUsers.includes(userId)) {
          await updateDoc(typingRef, {
            users: arrayUnion(userId),
            lastUpdate: serverTimestamp(),
          });
        }
      } else {
        await setDoc(typingRef, {
          users: [userId],
          lastUpdate: serverTimestamp(),
        });
      }
    } else {
      if (typingDoc.exists()) {
        await updateDoc(typingRef, {
          users: arrayRemove(userId),
          lastUpdate: serverTimestamp(),
        });
      }
    }
  },

  getTypingUsers: async (chatId: string): Promise<string[]> => {
    const typingRef = doc(db, 'typingStatus', chatId);
    const snapshot = await getDoc(typingRef);
    
    if (!snapshot.exists()) return [];
    
    return snapshot.data().users || [];
  },

  removeTypingStatus: async (chatId: string, userId: string): Promise<void> => {
    await storage.setTypingStatus(chatId, userId, false);
  },

  // Reactions
  addReaction: async (
    messageId: string,
    emoji: string,
    userId: string
  ): Promise<void> => {
    const messageRef = doc(db, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) return;
    
    const currentReactions = messageDoc.data().reactions || [];
    const filteredReactions = currentReactions.filter((r: any) => r.userId !== userId);
    
    // Usar Timestamp.fromMillis ao invés de serverTimestamp() porque serverTimestamp() não funciona em arrays
    await updateDoc(messageRef, {
      reactions: [
        ...filteredReactions,
        {
          emoji,
          userId,
          timestamp: Timestamp.fromMillis(Date.now()),
        },
      ],
    });
  },

  removeReaction: async (messageId: string, userId: string): Promise<void> => {
    const messageRef = doc(db, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) return;
    
    const currentReactions = messageDoc.data().reactions || [];
    const filteredReactions = currentReactions.filter((r: any) => r.userId !== userId);
    
    await updateDoc(messageRef, {
      reactions: filteredReactions,
    });
  },

  // Read Receipts
  markAsRead: async (messageId: string, userId: string): Promise<void> => {
    const messageRef = doc(db, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) return;
    
    const readBy = messageDoc.data().readBy || [];
    if (!readBy.includes(userId)) {
      await updateDoc(messageRef, {
        readBy: arrayUnion(userId),
        readAt: serverTimestamp(),
      });
    }
  },

  markChatAsRead: async (chatId: string, userId: string): Promise<void> => {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('chatId', '==', chatId),
      where('sent', '==', true)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    snapshot.docs.forEach(doc => {
      const message = doc.data();
      if (message.senderId !== userId) {
        const readBy = message.readBy || [];
        if (!readBy.includes(userId)) {
          batch.update(doc.ref, {
            readBy: arrayUnion(userId),
            readAt: serverTimestamp(),
          });
        }
      }
    });
    
    await batch.commit();
  },

  // Pinned Messages
  pinMessage: async (messageId: string, chatId: string): Promise<void> => {
    const chatRef = doc(db, 'chats', chatId);
    const messageRef = doc(db, 'messages', messageId);
    
    const batch = writeBatch(db);
    
    // Adicionar ao chat
    const chatDoc = await getDoc(chatRef);
    if (chatDoc.exists()) {
      const pinnedMessages = chatDoc.data().pinnedMessages || [];
      if (!pinnedMessages.includes(messageId)) {
        batch.update(chatRef, {
          pinnedMessages: arrayUnion(messageId),
        });
      }
    }
    
    // Marcar mensagem como fixada
    batch.update(messageRef, {
      pinned: true,
    });
    
    await batch.commit();
  },

  unpinMessage: async (messageId: string, chatId: string): Promise<void> => {
    const chatRef = doc(db, 'chats', chatId);
    const messageRef = doc(db, 'messages', messageId);
    
    const batch = writeBatch(db);
    
    // Remover do chat
    batch.update(chatRef, {
      pinnedMessages: arrayRemove(messageId),
    });
    
    // Desmarcar mensagem
    batch.update(messageRef, {
      pinned: false,
    });
    
    await batch.commit();
  },

  getPinnedMessages: async (chatId: string): Promise<string[]> => {
    const chatRef = doc(db, 'chats', chatId);
    const snapshot = await getDoc(chatRef);
    
    if (!snapshot.exists()) return [];
    
    return snapshot.data().pinnedMessages || [];
  },

  // Upload de mídia para Firebase Storage
  uploadMedia: async (
    file: File,
    userId: string,
    messageId: string
  ): Promise<string> => {
    const fileRef = ref(firebaseStorage, `messages/${userId}/${messageId}/${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  },
};

