import { useState, useEffect } from 'react';
import { User, Chat } from '../types';
import { storage } from '../utils/storageFirebase';
import { logout } from '../utils/authFirebase';
import { useAppSettings } from '../hooks/useAppSettings';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import Settings from './Settings';
import UserProfile from './UserProfile';
import BlockedWordNotification from './BlockedWordNotification';
import NotificationSystem from './NotificationSystem';
import './Dashboard.css';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const appSettings = useAppSettings();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(user);

  useEffect(() => {
    loadChats();
    loadUser();
    
    // Listener em tempo real para chats
    const unsubscribe = storage.subscribeToUserChats(user.id, (updatedChats) => {
      setChats(updatedChats);
    });

    return () => unsubscribe();
  }, [user.id]);

  const loadUser = async () => {
    try {
      const updatedUser = await storage.getUser(user.id);
      if (updatedUser) {
        setCurrentUser(updatedUser);
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
    }
  };

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
  };

  const handleNewChat = () => {
    setShowNewChat(true);
    setSelectedChat(null);
  };

  const handleChatCreated = (chat: Chat) => {
    loadChats();
    setSelectedChat(chat);
    setShowNewChat(false);
  };

  const primaryColor = appSettings.primaryColor || '#000000';
  const secondaryColor = appSettings.secondaryColor || '#ffffff';
  const accentColor = appSettings.accentColor || '#333333';

  return (
    <div className="dashboard" style={{ fontSize: appSettings.appearance?.fontSize === 'small' ? '14px' : appSettings.appearance?.fontSize === 'large' ? '18px' : '16px' }}>
      <div className="dashboard-sidebar">
        <div className="sidebar-header" style={{ background: primaryColor }}>
          <div className="user-info" onClick={() => setShowProfile(true)} style={{ cursor: 'pointer' }}>
            {currentUser.profilePicture ? (
              <img src={currentUser.profilePicture} alt="Profile" className="user-avatar-img" />
            ) : (
              <div className="user-avatar" style={{ background: secondaryColor, color: primaryColor }}>{currentUser.nickname[0].toUpperCase()}</div>
            )}
            <div>
              <div className="user-name">{currentUser.nickname}</div>
              <div className="user-code">Código: {currentUser.code}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn" style={{ background: secondaryColor, color: primaryColor, borderColor: secondaryColor }}>
            Sair
          </button>
        </div>
        <div className="sidebar-content">
          <button onClick={handleNewChat} className="new-chat-btn" style={{ background: primaryColor }}>
            + Nova Conversa
          </button>
          <ChatList
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
          />
        </div>
        <div className="sidebar-footer">
          <button onClick={() => setShowSettings(true)} className="settings-footer-btn" title="Configurações" style={{ background: primaryColor }}>
            <i className="fas fa-cog"></i> Configurações
          </button>
        </div>
      </div>
      <div className="dashboard-main">
        {selectedChat ? (
          <ChatWindow
            chat={selectedChat}
            currentUser={currentUser}
            onChatUpdate={loadChats}
          />
        ) : showNewChat ? (
          <div className="empty-chat">
            <h2>Iniciar Nova Conversa</h2>
            <p>Digite o código do usuário para começar uma conversa</p>
          </div>
        ) : (
          <div className="empty-chat">
            <h2>Bem-vindo, {currentUser.nickname}!</h2>
            <p>Selecione uma conversa ou inicie uma nova</p>
          </div>
        )}
      </div>
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
          // Implementar bloqueio de usuário se necessário
          console.log('Bloquear usuário:', userId);
        }}
        onIgnore={(userId) => {
          // Implementar ignorar se necessário
          console.log('Ignorar usuário:', userId);
        }}
      />
      <NotificationSystem />
    </div>
  );
}

