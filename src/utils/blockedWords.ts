import { User, BlockedWordAttempt } from '../types';
import { storage } from './storageFirebase';
import { v4 as uuidv4 } from 'uuid';
import { showError, showWarning } from './notifications';

export const checkBlockedWords = (content: string, receiver: User): string | null => {
  if (!receiver.blockedWords || receiver.blockedWords.length === 0) {
    return null;
  }

  const lowerContent = content.toLowerCase();
  
  for (const blockedWord of receiver.blockedWords) {
    const lowerBlocked = blockedWord.toLowerCase();
    // Verifica se a palavra bloqueada está no conteúdo (como palavra completa ou parte)
    if (lowerContent.includes(lowerBlocked)) {
      return blockedWord;
    }
  }

  return null;
};

export const createBlockedAttempt = (
  chatId: string,
  senderId: string,
  receiverId: string,
  blockedWord: string,
  messageContent: string
): BlockedWordAttempt => {
  return {
    id: uuidv4(),
    chatId,
    senderId,
    receiverId,
    blockedWord,
    messageContent,
    timestamp: Date.now(),
  };
};

export const showBlockedNotification = (blockedWord: string, receiverName: string) => {
  showError(
    'Palavra Bloqueada',
    `Sua mensagem contém a palavra "${blockedWord}" que está bloqueada por ${receiverName}. A mensagem não foi enviada.`
  );
};

export const showBlockedAttemptNotification = (attempt: BlockedWordAttempt, senderName: string) => {
  showWarning(
    'Tentativa de Palavra Bloqueada',
    `${senderName} tentou enviar uma mensagem com a palavra bloqueada "${attempt.blockedWord}".`
  );
};

