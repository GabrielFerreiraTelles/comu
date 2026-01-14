export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const validateFile = (file: File, type: 'image' | 'video' | 'audio'): boolean => {
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const videoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
  const audioTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'];
  
  switch (type) {
    case 'image':
      return imageTypes.includes(file.type);
    case 'video':
      return videoTypes.includes(file.type);
    case 'audio':
      return audioTypes.includes(file.type);
    default:
      return false;
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};



