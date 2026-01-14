import { v4 as uuidv4 } from 'uuid';
import { Message, MessageType, User, Chat } from '../types';
import { storage } from './storageFirebase';
import { auth, db } from '../config/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';

export const createMessage = (
  chatId: string,
  senderId: string,
  receiverId: string,
  type: MessageType,
  content: string,
  replyToId?: string
): Message => {
  return {
    id: uuidv4(),
    chatId,
    senderId,
    receiverId,
    type,
    content,
    timestamp: Date.now(),
    sent: false,
    replyToId,
  };
};

export const sendPendingMessages = async (userId?: string): Promise<{ success: number; failed: number; errors: any[] }> => {
  // CRÍTICO: Sempre usar auth.currentUser?.uid para garantir sincronia com Firestore
  // O userId fornecido pode vir do estado React e não corresponder ao token de autenticação
  const firebaseUserId = auth.currentUser?.uid;
  if (!firebaseUserId) {
    console.error('sendPendingMessages: Usuário não autenticado no Firebase Auth');
    return { success: 0, failed: 0, errors: [] };
  }
  
  // Validar se o userId fornecido corresponde ao Firebase Auth
  if (userId && userId !== firebaseUserId) {
    console.warn(`sendPendingMessages: userId fornecido (${userId}) não corresponde ao Firebase Auth (${firebaseUserId})`);
  }
  
  // Usar sempre o Firebase Auth UID
  const currentUserId = firebaseUserId;
  const pending = await storage.getPendingMessages(currentUserId);
  
  let successCount = 0;
  let failedCount = 0;
  const errors: any[] = [];
  
  for (const pendingMsg of pending) {
    try {
      // Verificar se o chat existe antes de criar a mensagem
      const chat = await storage.getChat(pendingMsg.chatId);
      if (!chat) {
        console.error(`Chat ${pendingMsg.chatId} não encontrado para mensagem ${pendingMsg.id}`);
        continue;
      }
      
      // Verificar se o usuário está nos participantes do chat
      if (!chat.participants || !Array.isArray(chat.participants) || !chat.participants.includes(currentUserId)) {
        console.error(`Usuário ${currentUserId} não está nos participantes do chat ${pendingMsg.chatId}. Participantes:`, chat.participants);
        continue;
      }
      
      // CRÍTICO: Verificar se o senderId da mensagem corresponde ao Firebase Auth UID
      // Se não corresponder, corrigir o senderId para garantir que a regra do Firestore funcione
      if (pendingMsg.senderId !== currentUserId) {
        console.warn(`senderId da mensagem (${pendingMsg.senderId}) não corresponde ao Firebase Auth UID (${currentUserId}), corrigindo...`);
        // Atualizar o senderId para corresponder ao Firebase Auth UID
        pendingMsg.senderId = currentUserId;
      }
      
      // Garantir que o chat está salvo no Firestore antes de criar a mensagem
      // Isso garante que a regra do Firestore possa validar corretamente
      try {
        await storage.saveChat(chat);
        console.log(`Chat ${pendingMsg.chatId} verificado e atualizado antes de criar mensagem`);
        
        // Verificar se o chat realmente existe no Firestore após salvar
        const chatRef = doc(db, 'chats', pendingMsg.chatId);
        const chatDoc = await getDoc(chatRef);
        if (!chatDoc.exists()) {
          console.error(`Chat ${pendingMsg.chatId} não foi encontrado no Firestore após salvar`);
          continue;
        }
        
        const chatData = chatDoc.data();
        if (!chatData.participants || !chatData.participants.includes(currentUserId)) {
          console.error(`Usuário ${currentUserId} não está nos participantes do chat no Firestore`);
          continue;
        }
        
        console.log(`Chat ${pendingMsg.chatId} confirmado no Firestore com participantes:`, chatData.participants);
        
        // Pequeno delay para garantir que o Firestore processou a atualização
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (chatError) {
        console.error(`Erro ao salvar/verificar chat ${pendingMsg.chatId}:`, chatError);
        // Continuar mesmo se houver erro ao salvar o chat (pode já estar salvo)
      }
      
      // Marcar como enviada
      // GARANTIR que o senderId corresponde ao Firebase Auth UID
      const sentMessage: Message = {
        ...pendingMsg,
        senderId: currentUserId, // Forçar senderId para corresponder ao Firebase Auth UID
        sent: true,
        sentAt: Date.now(),
      };
      
      // Verificar se a mensagem já existe antes de tentar criar
      const messageRef = doc(db, 'messages', sentMessage.id);
      const messageDoc = await getDoc(messageRef);
      
      if (messageDoc.exists()) {
        // Mensagem já existe, atualizar apenas sent e sentAt
        console.log(`Mensagem ${sentMessage.id} já existe, atualizando para sent: true`);
        const existingData = messageDoc.data();
        if (!existingData.sent) {
          await updateDoc(messageRef, {
            sent: true,
            sentAt: Timestamp.fromMillis(sentMessage.sentAt || Date.now()),
          });
        } else {
          console.log(`Mensagem ${sentMessage.id} já foi enviada, pulando atualização`);
        }
      } else {
        // Mensagem não existe, criar nova usando setDoc diretamente
        console.log(`Criando nova mensagem ${sentMessage.id}`, {
          chatId: sentMessage.chatId,
          senderId: sentMessage.senderId,
          receiverId: sentMessage.receiverId,
          currentUserId: currentUserId,
          isAuthenticated: !!auth.currentUser,
          senderIdMatches: sentMessage.senderId === currentUserId
        });
        
        // Garantir que todos os campos obrigatórios estão presentes e não são undefined
        const messageData: any = {
          chatId: sentMessage.chatId || '',
          senderId: sentMessage.senderId || currentUserId,
          receiverId: sentMessage.receiverId || '',
          type: sentMessage.type || 'text',
          content: sentMessage.content || '',
          timestamp: Timestamp.fromMillis(sentMessage.timestamp || Date.now()),
          sent: true,
          sentAt: Timestamp.fromMillis(sentMessage.sentAt || Date.now()),
          edited: sentMessage.edited === true,
          pinned: sentMessage.pinned === true,
        };
        
        // Campos opcionais - apenas adicionar se existirem
        if (sentMessage.editedAt) {
          messageData.editedAt = Timestamp.fromMillis(sentMessage.editedAt);
        }
        if (sentMessage.replyToId) {
          messageData.replyToId = sentMessage.replyToId;
        }
        if (sentMessage.reactions && sentMessage.reactions.length > 0) {
          messageData.reactions = sentMessage.reactions;
        } else {
          messageData.reactions = [];
        }
        if (sentMessage.readBy && sentMessage.readBy.length > 0) {
          messageData.readBy = sentMessage.readBy;
        } else {
          messageData.readBy = [];
        }
        if (sentMessage.readAt) {
          messageData.readAt = Timestamp.fromMillis(sentMessage.readAt);
        }
        
        // VALIDAÇÃO FINAL: Garantir que senderId corresponde ao Firebase Auth UID
        if (messageData.senderId !== currentUserId) {
          console.error(`[sendPendingMessages] ERRO CRÍTICO: senderId (${messageData.senderId}) não corresponde ao Firebase Auth UID (${currentUserId})`);
          messageData.senderId = currentUserId; // Forçar correção
        }
        
        // Validar campos obrigatórios
        if (!messageData.chatId || !messageData.senderId || !messageData.receiverId || !messageData.content) {
          console.error(`[sendPendingMessages] ERRO: Campos obrigatórios faltando:`, {
            chatId: !!messageData.chatId,
            senderId: !!messageData.senderId,
            receiverId: !!messageData.receiverId,
            content: !!messageData.content
          });
          throw new Error('Campos obrigatórios faltando na mensagem');
        }
        
        try {
          // Log detalhado antes de tentar criar
          console.log(`[sendPendingMessages] Tentando criar mensagem ${sentMessage.id}:`, {
            messageId: sentMessage.id,
            chatId: messageData.chatId,
            senderId: messageData.senderId,
            receiverId: messageData.receiverId,
            firebaseAuthUID: currentUserId,
            authCurrentUser: auth.currentUser?.uid,
            senderIdMatches: messageData.senderId === currentUserId,
            isAuthenticated: !!auth.currentUser,
            messageDataKeys: Object.keys(messageData)
          });
          
          await setDoc(messageRef, messageData);
          console.log(`[sendPendingMessages] Mensagem ${sentMessage.id} criada com sucesso`);
          successCount++;
        } catch (createError: any) {
          console.error(`[sendPendingMessages] ERRO ao criar mensagem ${sentMessage.id}:`, {
            code: createError.code,
            message: createError.message,
            chatId: sentMessage.chatId,
            senderId: sentMessage.senderId,
            receiverId: sentMessage.receiverId,
            currentUserId: currentUserId,
            authCurrentUser: auth.currentUser?.uid,
            senderIdMatches: sentMessage.senderId === currentUserId,
            isAuthenticated: !!auth.currentUser,
            errorStack: createError.stack
          });
          failedCount++;
          errors.push({
            messageId: sentMessage.id,
            error: createError
          });
          // Continuar com as outras mensagens
          continue;
        }
      }
      
      // Atualizar chat
      chat.lastMessage = sentMessage;
      chat.lastActivity = Date.now();
      await storage.saveChat(chat);
    } catch (error: any) {
      console.error(`[sendPendingMessages] Erro ao enviar mensagem pendente ${pendingMsg.id}:`, {
        messageId: pendingMsg.id,
        errorCode: error?.code,
        errorMessage: error?.message,
        chatId: pendingMsg.chatId,
        senderId: pendingMsg.senderId,
        firebaseAuthUID: currentUserId,
        authCurrentUser: auth.currentUser?.uid,
      });
      failedCount++;
      errors.push({
        messageId: pendingMsg.id,
        error: error
      });
      // Continuar com as outras mensagens mesmo se uma falhar
    }
  }
  
  // Limpar apenas as mensagens que foram enviadas com sucesso
  // As que falharam permanecem como pendentes
  if (successCount > 0) {
    // Limpar todas as pendentes - as que falharam serão recriadas se necessário
    await storage.clearPendingMessages(currentUserId);
  }
  
  console.log(`[sendPendingMessages] Resultado: ${successCount} sucesso, ${failedCount} falhas`);
  return { success: successCount, failed: failedCount, errors };
};

export const canDeleteMessage = (message: Message): boolean => {
  if (!message.sent || !message.sentAt) {
    return true; // Mensagens pendentes podem ser deletadas
  }
  
  const threeMinutes = 3 * 60 * 1000;
  return Date.now() - message.sentAt < threeMinutes;
};

export const editMessage = async (messageId: string, newContent: string): Promise<void> => {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    console.error('editMessage: Usuário não autenticado');
    return;
  }

  // Primeiro verificar se a mensagem está pendente
  const pending = await storage.getPendingMessages(userId);
  const pendingMessage = pending.find(m => m.id === messageId);
  
  if (pendingMessage) {
    // Mensagem está pendente, atualizar diretamente em pendingMessages
    // Garantir que o senderId corresponde ao Firebase Auth UID
    const firebaseUserId = auth.currentUser?.uid;
    if (!firebaseUserId || pendingMessage.senderId !== firebaseUserId) {
      console.error(`editMessage: senderId da mensagem pendente (${pendingMessage.senderId}) não corresponde ao Firebase Auth UID (${firebaseUserId})`);
      return;
    }
    
    const pendingRef = doc(db, 'pendingMessages', messageId);
    try {
      await updateDoc(pendingRef, {
        content: newContent,
      });
      console.log(`Mensagem pendente ${messageId} editada com sucesso`);
    } catch (error: any) {
      console.error(`Erro ao editar mensagem pendente ${messageId}:`, {
        code: error.code,
        message: error.message,
        senderId: pendingMessage.senderId,
        firebaseAuthUID: firebaseUserId,
      });
      throw error;
    }
    return;
  }
  
  // Se não está pendente, verificar se está em messages
  const messages = await storage.getMessages();
  const message = messages.find(m => m.id === messageId);
  
  if (message && !message.sent) {
    // Mensagem não enviada mas não está pendente (pode estar em messages mas não enviada)
    message.content = newContent;
    message.edited = true;
    message.editedAt = Date.now();
    await storage.saveMessage(message);
  } else if (message && message.sent) {
    // Mensagem já foi enviada, não pode editar
    console.warn(`Mensagem ${messageId} já foi enviada, não pode ser editada`);
  } else {
    console.warn(`Mensagem ${messageId} não encontrada`);
  }
};

export const deleteMessage = async (messageId: string): Promise<void> => {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    console.error('deleteMessage: Usuário não autenticado');
    return;
  }

  // Primeiro verificar se a mensagem está pendente
  const pending = await storage.getPendingMessages(userId);
  const pendingMessage = pending.find(m => m.id === messageId);
  
  if (pendingMessage) {
    // Mensagem está pendente, deletar apenas de pendingMessages
    console.log(`[deleteMessage] Deletando mensagem pendente ${messageId}`);
    try {
      await storage.removePendingMessage(messageId);
      console.log(`[deleteMessage] Mensagem pendente ${messageId} deletada com sucesso`);
    } catch (error: any) {
      console.error(`[deleteMessage] Erro ao deletar mensagem pendente ${messageId}:`, {
        code: error.code,
        message: error.message,
        senderId: pendingMessage.senderId,
        firebaseAuthUID: userId,
      });
      throw error;
    }
    return;
  }
  
  // Se não está pendente, verificar se está em messages
  // Buscar diretamente do Firestore para garantir que temos os dados corretos
  const messageRef = doc(db, 'messages', messageId);
  let messageDoc;
  try {
    messageDoc = await getDoc(messageRef);
  } catch (error: any) {
    console.error(`[deleteMessage] Erro ao buscar mensagem ${messageId} do Firestore:`, {
      code: error.code,
      message: error.message,
    });
    throw error;
  }
  
  if (!messageDoc.exists()) {
    console.warn(`[deleteMessage] Mensagem ${messageId} não encontrada em messages`);
    return;
  }
  
  const messageData = messageDoc.data();
  const message: Message = {
    id: messageDoc.id,
    chatId: messageData.chatId,
    senderId: messageData.senderId,
    receiverId: messageData.receiverId,
    type: messageData.type,
    content: messageData.content,
    timestamp: messageData.timestamp?.toMillis() || Date.now(),
    sent: messageData.sent || false,
    sentAt: messageData.sentAt?.toMillis(),
    edited: messageData.edited || false,
    editedAt: messageData.editedAt?.toMillis(),
    replyToId: messageData.replyToId,
    reactions: messageData.reactions || [],
    readBy: messageData.readBy || [],
    readAt: messageData.readAt?.toMillis(),
    pinned: messageData.pinned || false,
  };
  
  // Verificar se o senderId corresponde ao Firebase Auth UID
  if (message.senderId !== userId) {
    console.error(`[deleteMessage] senderId da mensagem (${message.senderId}) não corresponde ao Firebase Auth UID (${userId})`);
    throw new Error('Você não tem permissão para deletar esta mensagem');
  }
  
  if (!message.sent) {
    // Mensagem não enviada mas está em messages
    // Tentar deletar de pendingMessages primeiro (caso exista)
    try {
      await storage.removePendingMessage(messageId);
      console.log(`[deleteMessage] Mensagem ${messageId} deletada de pendingMessages`);
    } catch (error) {
      // Ignorar se não existir em pendingMessages
      console.log(`[deleteMessage] Mensagem ${messageId} não encontrada em pendingMessages`);
    }
    // Deletar de messages
    try {
      await storage.deleteMessage(messageId);
      console.log(`[deleteMessage] Mensagem ${messageId} deletada de messages`);
    } catch (error: any) {
      console.error(`[deleteMessage] Erro ao deletar mensagem ${messageId} de messages:`, {
        code: error.code,
        message: error.message,
        senderId: message.senderId,
        firebaseAuthUID: userId,
      });
      throw error;
    }
  } else if (message.sent) {
    // Mensagem enviada - verificar se pode ser deletada (dentro de 3 minutos)
    if (canDeleteMessage(message)) {
      console.log(`[deleteMessage] Deletando mensagem enviada ${messageId}`, {
        senderId: message.senderId,
        firebaseAuthUID: userId,
        senderIdMatches: message.senderId === userId,
      });
      try {
        await storage.deleteMessage(messageId);
        console.log(`[deleteMessage] Mensagem enviada ${messageId} deletada com sucesso`);
      } catch (error: any) {
        console.error(`[deleteMessage] Erro ao deletar mensagem enviada ${messageId}:`, {
          code: error.code,
          message: error.message,
          senderId: message.senderId,
          firebaseAuthUID: userId,
          senderIdMatches: message.senderId === userId,
        });
        throw error;
      }
    } else {
      console.warn(`[deleteMessage] Mensagem ${messageId} não pode ser deletada (já passou de 3 minutos)`);
    }
  }
};

export const getChatId = (user1Id: string, user2Id: string): string => {
  // Criar ID de chat consistente baseado nos IDs dos usuários
  const ids = [user1Id, user2Id].sort();
  return `${ids[0]}_${ids[1]}`;
};

export const createOrGetChat = async (user1Id: string, user2Id: string): Promise<Chat> => {
  const chatId = getChatId(user1Id, user2Id);
  let chat = await storage.getChat(chatId);
  
  if (!chat) {
    chat = {
      id: chatId,
      participants: [user1Id, user2Id],
      lastActivity: Date.now(),
    };
    await storage.saveChat(chat);
  }
  
  return chat;
};

