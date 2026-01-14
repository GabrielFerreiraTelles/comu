import { useState, useEffect } from 'react';
import { getCurrentUser, syncUserFromFirebase } from './utils/authFirebase';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';
import { User } from './types';
import { useAppSettings } from './hooks/useAppSettings';
import { useIsMobile } from './hooks/useIsMobile';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import DashboardMobile from './components/mobile/DashboardMobile';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  
  // Aplicar configurações globais
  useAppSettings();

  useEffect(() => {
    // Escutar mudanças no estado de autenticação
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Aguardar um pouco para garantir que o documento foi criado
          await new Promise(resolve => setTimeout(resolve, 500));
          const syncedUser = await syncUserFromFirebase(firebaseUser);
          if (syncedUser) {
            setUser(syncedUser);
          } else {
            // Fallback para localStorage
            const currentUser = getCurrentUser();
            if (currentUser && currentUser.id === firebaseUser.uid) {
              setUser(currentUser);
            }
          }
        } catch (error) {
          console.error('Erro ao sincronizar usuário:', error);
          // Fallback para localStorage
          const currentUser = getCurrentUser();
          if (currentUser && currentUser.id === firebaseUser.uid) {
            setUser(currentUser);
          }
        }
      } else {
        // Usuário não autenticado, tentar pegar do localStorage
        const currentUser = getCurrentUser();
        setUser(currentUser);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return showRegister ? (
      <Register onRegister={(user) => setUser(user)} onBack={() => setShowRegister(false)} />
    ) : (
      <Login onLogin={(user) => setUser(user)} onRegister={() => setShowRegister(true)} />
    );
  }

  return isMobile ? (
    <DashboardMobile user={user} onLogout={() => setUser(null)} />
  ) : (
    <Dashboard user={user} onLogout={() => setUser(null)} />
  );
}

export default App;

