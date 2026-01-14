import { v4 as uuidv4 } from 'uuid';
import { User } from '../types';
import { storage } from './storage';

export const generateUserCode = (): string => {
  // Gera um código único de 8 caracteres alfanuméricos
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const createUser = (email: string, password: string, nickname: string): User => {
  const code = generateUserCode();
  const user: User = {
    id: uuidv4(),
    email,
    nickname,
    code,
    createdAt: Date.now(),
    blockedWords: [],
  };
  
  // Em um sistema real, a senha seria hasheada
  // Por simplicidade, vamos armazenar apenas o hash básico
  const userWithPassword = { ...user, passwordHash: btoa(password) };
  storage.saveUser(user);
  
  // Salvar credenciais separadamente (em produção, usar backend)
  const credentials = JSON.parse(localStorage.getItem('comu_credentials') || '[]');
  credentials.push({
    email,
    passwordHash: btoa(password),
    userId: user.id,
  });
  localStorage.setItem('comu_credentials', JSON.stringify(credentials));
  
  return user;
};

export const login = (email: string, password: string): User | null => {
  const credentials = JSON.parse(localStorage.getItem('comu_credentials') || '[]');
  const credential = credentials.find((c: any) => c.email === email);
  
  if (!credential || atob(credential.passwordHash) !== password) {
    return null;
  }
  
  const users = storage.getUsers();
  const user = users.find(u => u.id === credential.userId);
  
  if (user) {
    storage.saveUser(user);
  }
  
  return user || null;
};

export const getCurrentUser = (): User | null => {
  return storage.getUser();
};

export const logout = (): void => {
  localStorage.removeItem('comu_user');
};

