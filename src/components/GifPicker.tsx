import { useState, useEffect, useRef } from 'react';
import './GifPicker.css';

interface GifPickerProps {
  onGifSelect: (gifUrl: string) => void;
  onClose: () => void;
}

// Usando Giphy API
const GIPHY_API_KEY = 'xdIkFSbgeTXHvyJKEzDi8bfSCt196yGW';
const GIPHY_TRENDING_URL = `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20`;
const GIPHY_SEARCH_URL = (query: string) => `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20`;

interface GifData {
  id: string;
  images: {
    fixed_height: {
      url: string;
    };
    original: {
      url: string;
    };
  };
  title: string;
}

export default function GifPicker({ onGifSelect, onClose }: GifPickerProps) {
  const [gifs, setGifs] = useState<GifData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTrendingGifs();
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        searchGifs(searchQuery);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      loadTrendingGifs();
    }
  }, [searchQuery]);

  const loadTrendingGifs = async () => {
    setLoading(true);
    try {
      const response = await fetch(GIPHY_TRENDING_URL);
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error('Erro ao carregar GIFs:', error);
      setGifs([]);
    } finally {
      setLoading(false);
    }
  };

  const searchGifs = async (query: string) => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(GIPHY_SEARCH_URL(query));
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error('Erro ao buscar GIFs:', error);
      setGifs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGifClick = (gif: GifData) => {
    onGifSelect(gif.images.original.url);
    onClose();
  };

  return (
    <div className="gif-picker-overlay" onClick={onClose}>
      <div className="gif-picker" onClick={(e) => e.stopPropagation()}>
        <div className="gif-picker-header">
          <h3>GIFs</h3>
          <button onClick={onClose} className="gif-picker-close">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="gif-picker-search">
          <i className="fas fa-search"></i>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar GIFs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="gif-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="gif-search-clear"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
        <div className="gif-picker-content">
          {loading ? (
            <div className="gif-picker-loading">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Carregando GIFs...</p>
            </div>
          ) : gifs.length === 0 ? (
            <div className="gif-picker-empty">
              <i className="fas fa-image"></i>
              <p>Nenhum GIF encontrado</p>
            </div>
          ) : (
            <div className="gif-grid">
              {gifs.map((gif) => (
                <div
                  key={gif.id}
                  className="gif-item"
                  onClick={() => handleGifClick(gif)}
                  title={gif.title}
                >
                  <img
                    src={gif.images.fixed_height.url}
                    alt={gif.title}
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

