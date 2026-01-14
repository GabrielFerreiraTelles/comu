import { useState, useMemo, useRef, useEffect } from 'react';
import { Message, MessageType } from '../types';
import { formatDate, formatTime } from '../utils/dateFormat';
import './MessageSearch.css';

interface MessageSearchProps {
  messages: Message[];
  onClose: () => void;
  onMessageSelect: (messageId: string) => void;
  currentUserId: string;
}

type FilterType = 'all' | MessageType;
type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year';

export default function MessageSearch({ messages, onClose, onMessageSelect, currentUserId }: MessageSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [senderFilter, setSenderFilter] = useState<string>('all');
  const [pinnedFilter, setPinnedFilter] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const uniqueSenders = useMemo(() => {
    const senders = new Set(messages.map(m => m.senderId));
    return Array.from(senders);
  }, [messages]);

  const filteredMessages = useMemo(() => {
    let filtered = messages;

    // Filtro por texto
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(msg => {
        if (msg.type === 'text') {
          return msg.content.toLowerCase().includes(query);
        }
        return false;
      });
    }

    // Filtro por tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter(msg => msg.type === typeFilter);
    }

    // Filtro por data
    if (dateFilter !== 'all') {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      const oneWeek = 7 * oneDay;
      const oneMonth = 30 * oneDay;
      const oneYear = 365 * oneDay;

      filtered = filtered.filter(msg => {
        const diff = now - msg.timestamp;
        switch (dateFilter) {
          case 'today':
            return diff < oneDay;
          case 'week':
            return diff < oneWeek;
          case 'month':
            return diff < oneMonth;
          case 'year':
            return diff < oneYear;
          default:
            return true;
        }
      });
    }

    // Filtro por remetente
    if (senderFilter !== 'all') {
      filtered = filtered.filter(msg => msg.senderId === senderFilter);
    }

    // Filtro por mensagens fixadas
    if (pinnedFilter) {
      filtered = filtered.filter(msg => msg.pinned === true);
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [messages, searchQuery, typeFilter, dateFilter, senderFilter, pinnedFilter]);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchQuery, typeFilter, dateFilter, senderFilter, pinnedFilter]);

  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < filteredMessages.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleMessageClick(filteredMessages[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleMessageClick = (message: Message) => {
    onMessageSelect(message.id);
    onClose();
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="search-highlight">{part}</mark>
      ) : (
        part
      )
    );
  };

  const getSenderName = (senderId: string): string => {
    if (senderId === currentUserId) return 'Você';
    // Aqui você pode buscar o nome do usuário se necessário
    return 'Outro usuário';
  };

  return (
    <div className="message-search-overlay" onClick={onClose}>
      <div className="message-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="message-search-header">
          <h2>Busca Avançada</h2>
          <button onClick={onClose} className="close-btn">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="message-search-input-container">
          <i className="fas fa-search"></i>
          <input
            ref={searchInputRef}
            type="text"
            className="message-search-input"
            placeholder="Digite para buscar nas mensagens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {searchQuery && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
              title="Limpar busca"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        <div className="message-search-filters">
          <div className="filter-group">
            <label>Tipo:</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as FilterType)}>
              <option value="all">Todos</option>
              <option value="text">Texto</option>
              <option value="image">Imagem</option>
              <option value="video">Vídeo</option>
              <option value="audio">Áudio</option>
              <option value="gif">GIF</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Data:</label>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)}>
              <option value="all">Todas</option>
              <option value="today">Hoje</option>
              <option value="week">Última semana</option>
              <option value="month">Último mês</option>
              <option value="year">Último ano</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Remetente:</label>
            <select value={senderFilter} onChange={(e) => setSenderFilter(e.target.value)}>
              <option value="all">Todos</option>
              {uniqueSenders.map(senderId => (
                <option key={senderId} value={senderId}>
                  {getSenderName(senderId)}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={pinnedFilter}
                onChange={(e) => setPinnedFilter(e.target.checked)}
              />
              Apenas fixadas
            </label>
          </div>
        </div>

        <div className="message-search-results" ref={resultsRef}>
          {filteredMessages.length === 0 ? (
            <div className="message-search-empty">
              <p>Nenhuma mensagem encontrada</p>
            </div>
          ) : (
            <>
              <div className="message-search-count">
                {filteredMessages.length} mensagem(ns) encontrada(s)
              </div>
              {filteredMessages.map((message, index) => (
                <div
                  key={message.id}
                  className={`message-search-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={() => handleMessageClick(message)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="message-search-content">
                    {message.type === 'text' ? (
                      <div className="message-search-text">
                        {highlightText(message.content, searchQuery)}
                      </div>
                    ) : (
                      <div className="message-search-media">
                        {message.type === 'image' && <><i className="fas fa-image"></i> Imagem</>}
                        {message.type === 'video' && <><i className="fas fa-video"></i> Vídeo</>}
                        {message.type === 'audio' && <><i className="fas fa-microphone"></i> Áudio</>}
                        {message.type === 'gif' && <><i className="fas fa-images"></i> GIF</>}
                      </div>
                    )}
                    <div className="message-search-meta">
                      <span className="message-search-time">
                        {formatDate(message.timestamp)} às {formatTime(message.timestamp)}
                      </span>
                      <span className="message-search-sender">
                        {getSenderName(message.senderId)}
                      </span>
                      {message.edited && (
                        <span className="message-search-edited">(editado)</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
