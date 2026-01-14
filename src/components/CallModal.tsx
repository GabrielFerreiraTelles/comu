import { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import './CallModal.css';

interface CallModalProps {
  isOpen: boolean;
  callType: 'voice' | 'video' | null;
  caller: User | null;
  currentUser: User;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  isIncoming: boolean;
  isActive: boolean;
}

export default function CallModal({
  isOpen,
  callType,
  caller,
  currentUser,
  onAccept,
  onReject,
  onEnd,
  isIncoming,
  isActive,
}: CallModalProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [callDuration, setCallDuration] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && callType) {
      startMedia();
      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
      durationIntervalRef.current = interval;
      return () => {
        clearInterval(interval);
      };
    } else {
      stopMedia();
      setCallDuration(0);
    }
  }, [isActive, callType]);

  const startMedia = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Em uma implementação real, você enviaria o stream via WebRTC
      // Por enquanto, apenas mostramos o stream local
    } catch (error) {
      console.error('Erro ao acessar mídia:', error);
    }
  };

  const stopMedia = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const handleMuteToggle = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const handleVideoToggle = () => {
    if (localStreamRef.current && callType === 'video') {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const displayUser = isIncoming ? caller : currentUser;
  const otherUser = isIncoming ? currentUser : caller;

  return (
    <div className="call-modal-overlay">
      <div className={`call-modal ${isActive ? 'active' : ''}`}>
        {isIncoming && !isActive ? (
          <>
            <div className="call-header">
              <div className="caller-avatar">
                {displayUser?.profilePicture ? (
                  <img src={displayUser.profilePicture} alt={displayUser.nickname} />
                ) : (
                  <div className="caller-avatar-placeholder">
                    {displayUser?.nickname[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="caller-info">
                <h2>{displayUser?.nickname}</h2>
                <p>{callType === 'video' ? 'Chamada de vídeo' : 'Chamada de voz'}</p>
              </div>
            </div>
            <div className="call-actions">
              <button className="call-btn reject-btn" onClick={onReject} title="Recusar">
                <i className="fas fa-phone-slash"></i>
              </button>
              <button className="call-btn accept-btn" onClick={onAccept} title="Aceitar">
                <i className={`fas fa-${callType === 'video' ? 'video' : 'phone'}`}></i>
              </button>
            </div>
          </>
        ) : isActive ? (
          <>
            <div className="call-active-header">
              <div className="call-duration">{formatDuration(callDuration)}</div>
              <div className="call-active-info">
                <h3>{otherUser?.nickname}</h3>
                <p>{callType === 'video' ? 'Chamada de vídeo' : 'Chamada de voz'}</p>
              </div>
            </div>
            <div className="call-video-container">
              {callType === 'video' ? (
                <>
                  <video
                    ref={remoteVideoRef}
                    className="remote-video"
                    autoPlay
                    playsInline
                  />
                  <video
                    ref={localVideoRef}
                    className="local-video"
                    autoPlay
                    playsInline
                    muted
                  />
                </>
              ) : (
                <div className="voice-call-view">
                  <div className="voice-call-avatar">
                    {otherUser?.profilePicture ? (
                      <img src={otherUser.profilePicture} alt={otherUser.nickname} />
                    ) : (
                      <div className="voice-call-avatar-placeholder">
                        {otherUser?.nickname[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <h3>{otherUser?.nickname}</h3>
                </div>
              )}
            </div>
            <div className="call-controls">
              <button
                className={`control-btn ${isMuted ? 'active' : ''}`}
                onClick={handleMuteToggle}
                title={isMuted ? 'Desativar mudo' : 'Ativar mudo'}
              >
                <i className={`fas fa-microphone${isMuted ? '-slash' : ''}`}></i>
              </button>
              {callType === 'video' && (
                <button
                  className={`control-btn ${!isVideoEnabled ? 'active' : ''}`}
                  onClick={handleVideoToggle}
                  title={isVideoEnabled ? 'Desativar vídeo' : 'Ativar vídeo'}
                >
                  <i className={`fas fa-video${!isVideoEnabled ? '-slash' : ''}`}></i>
                </button>
              )}
              <button className="control-btn end-call-btn" onClick={onEnd} title="Encerrar chamada">
                <i className="fas fa-phone-slash"></i>
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}


