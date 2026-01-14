import { useState, useEffect } from 'react';
import { User, Chat } from '../../types';
import { storage } from '../../utils/storageFirebase';
import { logout } from '../../utils/authFirebase';
import { useAppSettings } from '../../hooks/useAppSettings';
import ChatListMobile from './ChatListMobile';
import ChatWindowMobile from './ChatWindowMobile';
import Settings from '../Settings';
import UserProfile from '../UserProfile';
import BlockedWordNotification from '../BlockedWordNotification';
import NotificationSystem from '../NotificationSystem';
import './DashboardMobile.css';

interface DashboardMobileProps {
  user: User;
  onLogout: () => void;
}

export default function DashboardMobile({ user, onLogout }: DashboardMobileProps) {
  const appSettings = useAppSettings();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showChatList, setShowChatList] = useState(true);
  const [currentUser, setCurrentUser] = useState<User>(user);

  useEffect(() => {
    const init = async () => {
      await loadChats();
      const updatedUser = await storage.getUser(user.id);
      if (updatedUser) {
        setCurrentUser(updatedUser);
      }
    };
    init();
  }, [user.id]);

  const loadChats = async () => {
    try {
      // Usar query filtrada por userId para melhor segurança e performance
      const userChats = await storage.getChats(user.id);
      setChats(userChats.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0)));
    } catch (error) {
      console.error('Erro ao carregar chats:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      onLogout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      onLogout(); // Logout local mesmo se der erro
    }
  };

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    setShowNewChat(false);
    setShowChatList(false);
  };

  const handleNewChat = () => {
    setShowNewChat(true);
    setSelectedChat(null);
    setShowChatList(false);
  };

  const handleChatCreated = (chat: Chat) => {
    loadChats();
    setSelectedChat(chat);
    setShowNewChat(false);
    setShowChatList(false);
  };

  const handleBackToChatList = () => {
    setSelectedChat(null);
    setShowNewChat(false);
    setShowChatList(true);
  };

  const primaryColor = appSettings.primaryColor || '#000000';
  const secondaryColor = appSettings.secondaryColor || '#ffffff';

  return (
    <div className="dashboard-mobile">
      {showChatList ? (
        <ChatListMobile
          chats={chats}
          currentUserId={currentUser.id}
          onChatSelect={handleChatSelect}
          showNewChat={showNewChat}
          onChatCreated={handleChatCreated}
          onUserBlocked={loadChats}
          onChatDeleted={async () => {
            await loadChats();
            setSelectedChat(null);
          }}
          onNewChat={handleNewChat}
          onProfileClick={() => setShowProfile(true)}
          onSettingsClick={() => setShowSettings(true)}
          onLogout={handleLogout}
          currentUser={currentUser}
          primaryColor={primaryColor}
        />
      ) : selectedChat ? (
        <ChatWindowMobile
          chat={selectedChat}
          currentUser={currentUser}
          onChatUpdate={loadChats}
          onBack={handleBackToChatList}
        />
      ) : showNewChat ? (
        <div className="mobile-new-chat-view">
          <div className="mobile-header">
            <button onClick={handleBackToChatList} className="mobile-back-btn">
              <i className="fas fa-arrow-left"></i>
            </button>
            <h2>Nova Conversa</h2>
          </div>
          <div className="mobile-new-chat-content">
            <p>Digite o código do usuário para começar uma conversa</p>
          </div>
        </div>
      ) : null}
      
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      {showProfile && (
        <UserProfile
          user={currentUser}
          onClose={() => setShowProfile(false)}
          onUpdate={(updatedUser) => {
            setCurrentUser(updatedUser);
            setShowProfile(false);
          }}
        />
      )}
      <BlockedWordNotification
        currentUser={currentUser}
        onBlock={(userId) => {
          console.log('Bloquear usuário:', userId);
        }}
        onIgnore={(userId) => {
          console.log('Ignorar usuário:', userId);
        }}
      />
      <NotificationSystem />
    </div>
  );
}

