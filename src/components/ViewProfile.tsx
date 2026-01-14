import { User } from '../types';
import './ViewProfile.css';

interface ViewProfileProps {
  user: User;
  currentUserId: string;
  onClose: () => void;
  onBlock?: (userId: string) => void;
  onUnblock?: (userId: string) => void;
  isBlocked?: boolean;
}

export default function ViewProfile({
  user,
  currentUserId,
  onClose,
  onBlock,
  onUnblock,
  isBlocked = false,
}: ViewProfileProps) {
  const isOwnProfile = user.id === currentUserId;

  return (
    <div className="view-profile-overlay" onClick={onClose}>
      <div className="view-profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="view-profile-header">
          <h2>Perfil</h2>
          <button onClick={onClose} className="close-btn">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="view-profile-content">
          <div className="view-profile-picture">
            {user.profilePicture ? (
              <img src={user.profilePicture} alt="Profile" className="profile-picture-large" />
            ) : (
              <div className="profile-picture-placeholder-large">
                {user.nickname[0].toUpperCase()}
              </div>
            )}
          </div>

          <div className="view-profile-info">
            <h3 className="profile-nickname">{user.nickname}</h3>
            <div className="profile-code">Código: {user.code}</div>

            {user.description && (
              <div className="profile-section">
                <h4>Descrição</h4>
                <p className="profile-text">{user.description}</p>
              </div>
            )}

            {!user.description && (
              <div className="profile-empty">
                <p>Este usuário ainda não adicionou informações ao perfil.</p>
              </div>
            )}
          </div>

          {!isOwnProfile && (
            <div className="view-profile-actions">
              {isBlocked ? (
                <button
                  onClick={() => {
                    onUnblock?.(user.id);
                    onClose();
                  }}
                  className="unblock-btn"
                >
                  Desbloquear Usuário
                </button>
              ) : (
                <button
                  onClick={() => {
                    onBlock?.(user.id);
                    onClose();
                  }}
                  className="block-btn"
                >
                  Bloquear Usuário
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

