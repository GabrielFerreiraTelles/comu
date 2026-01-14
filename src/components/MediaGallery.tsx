import { useState, useMemo } from 'react';
import { Message, MessageType } from '../types';
import { formatDate } from '../utils/dateFormat';
import './MediaGallery.css';

interface MediaGalleryProps {
  messages: Message[];
  onClose: () => void;
  onMessageSelect?: (messageId: string) => void;
}

type MediaFilter = 'all' | 'image' | 'video' | 'audio';

export default function MediaGallery({ messages, onClose, onMessageSelect }: MediaGalleryProps) {
  const [filter, setFilter] = useState<MediaFilter>('all');

  const mediaMessages = useMemo(() => {
    return messages.filter(msg => msg.type !== 'text' && msg.sent);
  }, [messages]);

  const filteredMessages = useMemo(() => {
    if (filter === 'all') {
      return mediaMessages;
    }
    return mediaMessages.filter(msg => msg.type === filter);
  }, [mediaMessages, filter]);

  const handleMediaClick = (message: Message) => {
    if (onMessageSelect) {
      onMessageSelect(message.id);
    }
  };

  const getMediaPreview = (message: Message) => {
    switch (message.type) {
      case 'image':
        return (
          <div className="media-preview-image">
            <img src={message.content} alt="Imagem" />
            <div className="media-overlay">
              <span className="media-type-badge"><i className="fas fa-image"></i> Imagem</span>
            </div>
          </div>
        );
      case 'video':
        return (
          <div className="media-preview-video">
            <video src={message.content} />
            <div className="media-overlay">
              <span className="media-type-badge"><i className="fas fa-video"></i> Vídeo</span>
            </div>
          </div>
        );
      case 'audio':
        return (
          <div className="media-preview-audio">
            <div className="audio-icon"><i className="fas fa-music"></i></div>
            <div className="audio-info">
              <span className="media-type-badge"><i className="fas fa-microphone"></i> Áudio</span>
              <audio src={message.content} controls className="audio-player" />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="media-gallery-overlay" onClick={onClose}>
      <div className="media-gallery-modal" onClick={(e) => e.stopPropagation()}>
        <div className="media-gallery-header">
          <h2>Mídias da Conversa</h2>
          <button onClick={onClose} className="close-btn">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="media-gallery-filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Todas ({mediaMessages.length})
          </button>
          <button
            className={`filter-btn ${filter === 'image' ? 'active' : ''}`}
            onClick={() => setFilter('image')}
          >
            <i className="fas fa-image"></i> Imagens ({mediaMessages.filter(m => m.type === 'image').length})
          </button>
          <button
            className={`filter-btn ${filter === 'video' ? 'active' : ''}`}
            onClick={() => setFilter('video')}
          >
            <i className="fas fa-video"></i> Vídeos ({mediaMessages.filter(m => m.type === 'video').length})
          </button>
          <button
            className={`filter-btn ${filter === 'audio' ? 'active' : ''}`}
            onClick={() => setFilter('audio')}
          >
            <i className="fas fa-microphone"></i> Áudios ({mediaMessages.filter(m => m.type === 'audio').length})
          </button>
        </div>

        <div className="media-gallery-content">
          {filteredMessages.length === 0 ? (
            <div className="media-gallery-empty">
              <p>Nenhuma mídia encontrada</p>
            </div>
          ) : (
            <div className="media-grid">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className="media-item"
                  onClick={() => handleMediaClick(message)}
                >
                  {getMediaPreview(message)}
                  <div className="media-date">
                    {formatDate(message.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

