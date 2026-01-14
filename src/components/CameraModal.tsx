import { useState, useRef, useEffect } from 'react';
import './CameraModal.css';

interface CameraModalProps {
  onCapture: (file: File, type: 'image' | 'video') => void;
  onClose: () => void;
}

export default function CameraModal({ onCapture, onClose }: CameraModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [mode]);

  const startCamera = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: mode === 'video',
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      alert('Não foi possível acessar a câmera. Verifique as permissões.');
      onClose();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file, 'image');
          stopCamera();
          onClose();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    recordedChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp8,opus',
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const file = new File([blob], `video-${Date.now()}.webm`, { type: 'video/webm' });
      onCapture(file, 'video');
      stopCamera();
      onClose();
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="camera-modal-overlay" onClick={onClose}>
      <div className="camera-modal" onClick={(e) => e.stopPropagation()}>
        <div className="camera-header">
          <button className="camera-close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
          <div className="camera-mode-toggle">
            <button
              className={mode === 'photo' ? 'active' : ''}
              onClick={() => setMode('photo')}
            >
              <i className="fas fa-camera"></i> Foto
            </button>
            <button
              className={mode === 'video' ? 'active' : ''}
              onClick={() => setMode('video')}
            >
              <i className="fas fa-video"></i> Vídeo
            </button>
          </div>
        </div>
        <div className="camera-preview">
          <video ref={videoRef} autoPlay playsInline muted={mode === 'photo'} />
          {isRecording && (
            <div className="recording-indicator">
              <span className="recording-dot"></span>
              Gravando...
            </div>
          )}
        </div>
        <div className="camera-controls">
          {mode === 'photo' ? (
            <button className="capture-btn" onClick={capturePhoto}>
              <i className="fas fa-circle"></i>
            </button>
          ) : (
            <>
              {!isRecording ? (
                <button className="capture-btn record-btn" onClick={startRecording}>
                  <i className="fas fa-circle"></i>
                </button>
              ) : (
                <button className="capture-btn stop-btn" onClick={stopRecording}>
                  <i className="fas fa-stop"></i>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


