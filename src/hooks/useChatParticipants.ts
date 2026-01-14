import { useState, useEffect } from 'react';
import { Chat, User } from '../types';
import { storage } from '../utils/storageFirebase';

export function useChatParticipants(chats: Chat[], currentUserId: string) {
  const [participants, setParticipants] = useState<Record<string, User>>({});
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadParticipants = async () => {
      const participantsMap: Record<string, User> = {};
      const blockedSet = new Set<string>();

      for (const chat of chats) {
        const otherId = chat.participants.find(id => id !== currentUserId);
        if (otherId && !participantsMap[otherId]) {
          try {
            const users = await storage.getUsers();
            const user = users.find(u => u.id === otherId);
            if (user) {
              participantsMap[otherId] = user;
              
              // Verificar se está bloqueado
              const isBlocked = await storage.isUserBlocked(currentUserId, otherId);
              if (isBlocked) {
                blockedSet.add(otherId);
              }
            }
          } catch (error) {
            console.error('Erro ao carregar participante:', error);
          }
        }
      }

      setParticipants(participantsMap);
      setBlockedUsers(blockedSet);
    };

    loadParticipants();
  }, [chats, currentUserId]);

  const getParticipant = (chat: Chat): User | null => {
    const otherId = chat.participants.find(id => id !== currentUserId);
    return otherId ? participants[otherId] || null : null;
  };

  const isBlocked = (userId: string): boolean => {
    return blockedUsers.has(userId);
  };

  return { getParticipant, isBlocked };
}

