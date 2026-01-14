import { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { storage } from '../utils/storageFirebase';
import { fileToBase64 } from '../utils/media';
import { showSuccess, showError } from '../utils/notifications';
import './UserProfile.css';

interface UserProfileProps {
  user: User;
  onClose: () => void;
  onUpdate: (user: User) => void;
}

export default function UserProfile({ user, onClose, onUpdate }: UserProfileProps) {
  const [profile, setProfile] = useState<User>(user);
  const [newBlockedWord, setNewBlockedWord] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfile(user);
  }, [user]);

  const handleSave = async () => {
    try {
      await storage.saveUser(profile);
      onUpdate(profile);
      onClose();
      showSuccess('Perfil Atualizado', 'Suas informações foram salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      showError('Erro', 'Não foi possível salvar o perfil. Tente novamente.');
    }
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      try {
        const base64 = await fileToBase64(file);
        setProfile({ ...profile, profilePicture: base64 });
      } catch (error) {
        showError('Erro', 'Não foi possível carregar a imagem. Tente novamente.');
      }
    } else {
      alert('Por favor, selecione uma imagem');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveProfilePicture = () => {
    setProfile({ ...profile, profilePicture: undefined });
  };

  const handleAddBlockedWord = () => {
    const word = newBlockedWord.trim().toLowerCase();
    if (word && !profile.blockedWords?.includes(word)) {
      setProfile({
        ...profile,
        blockedWords: [...(profile.blockedWords || []), word],
      });
      setNewBlockedWord('');
    }
  };

  const handleRemoveBlockedWord = (word: string) => {
    setProfile({
      ...profile,
      blockedWords: profile.blockedWords?.filter(w => w !== word) || [],
    });
  };

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-header">
          <h2>Perfil</h2>
          <button onClick={onClose} className="close-btn">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="profile-content">
          <div className="profile-section">
            <h3>Foto de Perfil</h3>
            <div className="profile-picture-container">
              {profile.profilePicture ? (
                <div className="profile-picture-wrapper">
                  <img
                    src={profile.profilePicture}
                    alt="Profile"
                    className="profile-picture"
                  />
                  <button
                    onClick={handleRemoveProfilePicture}
                    className="remove-picture-btn"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <div className="profile-picture-placeholder">
                  {profile.nickname[0].toUpperCase()}
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleProfilePictureChange}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="select-picture-btn"
            >
              {profile.profilePicture ? 'Alterar Foto' : 'Adicionar Foto'}
            </button>
          </div>

          <div className="profile-section">
            <h3>Informações Básicas</h3>
            <div className="form-group">
              <label>Nickname</label>
              <input
                type="text"
                value={profile.nickname}
                onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
                className="profile-input"
              />
            </div>
            <div className="form-group">
              <label>Descrição</label>
              <textarea
                value={profile.description || ''}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                placeholder="Adicione mais detalhes sobre você..."
                className="profile-textarea"
                rows={5}
                maxLength={500}
              />
              <div className="char-count">{profile.description?.length || 0}/500</div>
            </div>
          </div>

          <div className="profile-section">
            <h3>Palavras Bloqueadas</h3>
            <p className="section-description">
              Palavras que você não quer receber em mensagens. Quando alguém tentar enviar uma mensagem contendo essas palavras, ela será bloqueada.
            </p>
            <div className="blocked-words-input">
              <input
                type="text"
                value={newBlockedWord}
                onChange={(e) => setNewBlockedWord(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddBlockedWord();
                  }
                }}
                placeholder="Digite uma palavra para bloquear"
                className="blocked-word-input"
              />
              <button onClick={handleAddBlockedWord} className="add-word-btn">
                Adicionar
              </button>
            </div>
            <div className="blocked-words-list">
              {profile.blockedWords && profile.blockedWords.length > 0 ? (
                profile.blockedWords.map((word) => (
                  <div key={word} className="blocked-word-item">
                    <span>{word}</span>
                    <button
                      onClick={() => handleRemoveBlockedWord(word)}
                      className="remove-word-btn"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))
              ) : (
                <div className="no-blocked-words">Nenhuma palavra bloqueada</div>
              )}
            </div>
          </div>

          <div className="profile-actions">
            <button onClick={handleSave} className="save-btn">
              Salvar Alterações
            </button>
            <button onClick={onClose} className="cancel-btn">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

