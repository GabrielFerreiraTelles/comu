import { useState, useEffect } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    // Verificação inicial mais robusta
    if (typeof window === 'undefined') return false;
    
    // Verificar por largura
    const widthCheck = window.innerWidth <= 768;
    
    // Verificar por user agent (dispositivos móveis)
    const userAgentCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    
    // Verificar por touch support
    const touchCheck = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Considerar mobile se qualquer condição for verdadeira
    return widthCheck || (userAgentCheck && touchCheck);
  });

  useEffect(() => {
    const checkMobile = () => {
      const widthCheck = window.innerWidth <= 768;
      const userAgentCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      const touchCheck = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      setIsMobile(widthCheck || (userAgentCheck && touchCheck));
    };

    // Verificar no mount
    checkMobile();

    // Adicionar listener para mudanças de tamanho
    window.addEventListener('resize', checkMobile);
    
    // Adicionar listener para orientação (mobile)
    window.addEventListener('orientationchange', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  return isMobile;
}

