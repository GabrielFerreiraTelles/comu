import { useState, useEffect } from 'react';
import { BlockedWordAttempt, User } from '../types';
import { storage } from '../utils/storageFirebase';
import './BlockedWordNotification.css';

interface BlockedWordNotificationProps {
  currentUser: User;
  onBlock: (attemptId: string) => void;
  onIgnore: (attemptId: string) => void;
}

export default function BlockedWordNotification({
  currentUser,
  onBlock,
  onIgnore,
}: BlockedWordNotificationProps) {
  const [attempts, setAttempts] = useState<BlockedWordAttempt[]>([]);
  const [previousCount, setPreviousCount] = useState(0);

  useEffect(() => {
    loadAttempts();
    const interval = setInterval(loadAttempts, 2000); // Verificar a cada 2 segundos
    return () => clearInterval(interval);
  }, [currentUser.id]);

  const loadAttempts = async () => {
    try {
      const userAttempts = await storage.getBlockedAttemptsByUser(currentUser.id);
      const currentCount = userAttempts.length;
      
      setAttempts(userAttempts);
      setPreviousCount(currentCount);
    } catch (error) {
      console.error('Erro ao carregar tentativas bloqueadas:', error);
    }
  };

  const handleBlock = async (attempt: BlockedWordAttempt) => {
    try {
      await storage.updateBlockedAttempt(attempt.id, 'blocked');
      onBlock(attempt.senderId);
      await loadAttempts();
    } catch (error) {
      console.error('Erro ao bloquear tentativa:', error);
    }
  };

  const handleIgnore = async (attempt: BlockedWordAttempt) => {
    try {
      await storage.updateBlockedAttempt(attempt.id, 'ignored');
      onIgnore(attempt.senderId);
      await loadAttempts();
    } catch (error) {
      console.error('Erro ao ignorar tentativa:', error);
    }
  };

  if (attempts.length === 0) {
    return null;
  }

  const [senders, setSenders] = useState<Record<string, User>>({});

  useEffect(() => {
    const loadSenders = async () => {
      try {
        const users = await storage.getUsers();
        const sendersMap: Record<string, User> = {};
        attempts.forEach(attempt => {
          const sender = users.find(u => u.id === attempt.senderId);
          if (sender) {
            sendersMap[attempt.senderId] = sender;
          }
        });
        setSenders(sendersMap);
      } catch (error) {
        console.error('Erro ao carregar remetentes:', error);
      }
    };
    if (attempts.length > 0) {
      loadSenders();
    }
  }, [attempts]);

  return (
    <div className="blocked-notifications-container">
      {attempts.map((attempt) => {
        const sender = senders[attempt.senderId];
        if (!sender) return null;

        return (
          <div key={attempt.id} className="blocked-notification">
            <div className="notification-content">
              <div className="notification-icon">⚠️</div>
              <div className="notification-text">
                <strong>{sender.nickname}</strong> tentou enviar uma mensagem com a palavra bloqueada{' '}
                <strong>"{attempt.blockedWord}"</strong>
                <div className="notification-message">"{attempt.messageContent}"</div>
              </div>
            </div>
            <div className="notification-actions">
              <button
                onClick={() => handleBlock(attempt)}
                className="block-btn"
              >
                Bloquear
              </button>
              <button
                onClick={() => handleIgnore(attempt)}
                className="ignore-btn"
              >
                Ignorar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

