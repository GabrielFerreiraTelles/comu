import { useState } from 'react';
import { login, resetPassword } from '../utils/authFirebase';
import { User } from '../types';
import './Login.css';

interface LoginProps {
  onLogin: (user: User) => void;
  onRegister: () => void;
}

export default function Login({ onLogin, onRegister }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Email ou senha incorretos');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage('');
    setError('');

    if (!resetEmail) {
      setError('Digite seu email');
      return;
    }

    try {
      await resetPassword(resetEmail);
      setResetMessage('Email de recuperação enviado! Verifique sua caixa de entrada.');
      setTimeout(() => {
        setShowResetPassword(false);
        setResetEmail('');
        setResetMessage('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar email de recuperação');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Comu</h1>
        <h2>{showResetPassword ? 'Recuperar Senha' : 'Entrar'}</h2>
        
        {showResetPassword ? (
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                placeholder="seu@email.com"
              />
            </div>
            {resetMessage && <div className="success-message">{resetMessage}</div>}
            {error && <div className="error-message">{error}</div>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Email de Recuperação'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowResetPassword(false);
                  setResetEmail('');
                  setError('');
                  setResetMessage('');
                }}
                className="link-button"
              >
                Voltar ao login
              </button>
            </div>
          </form>
        ) : (
          <>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                />
              </div>
              <div className="form-group">
                <label>Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
            <p className="auth-switch">
              <button
                type="button"
                onClick={() => setShowResetPassword(true)}
                className="link-button"
                style={{ display: 'block', margin: '0 auto 10px auto' }}
              >
                Esqueceu sua senha?
              </button>
              Não tem uma conta?{' '}
              <button type="button" onClick={onRegister} className="link-button">
                Criar conta
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}


