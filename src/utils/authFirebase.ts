import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, query, where, getDocs, collection, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage as firebaseStorage } from '../config/firebase';
import { User } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const generateUserCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Verificar se código já existe
const codeExists = async (code: string): Promise<boolean> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('code', '==', code));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

// Gerar código único
const generateUniqueCode = async (): Promise<string> => {
  let code = generateUserCode();
  while (await codeExists(code)) {
    code = generateUserCode();
  }
  return code;
};

// Função para traduzir erros do Firebase
const translateFirebaseError = (error: any): string => {
  const errorCode = error.code || '';
  
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'Este email já está em uso. Tente fazer login ou use outro email.';
    case 'auth/invalid-email':
      return 'Email inválido. Verifique o formato do email.';
    case 'auth/operation-not-allowed':
      return 'Operação não permitida. Entre em contato com o suporte.';
    case 'auth/weak-password':
      return 'Senha muito fraca. Use pelo menos 6 caracteres.';
    case 'auth/user-disabled':
      return 'Esta conta foi desabilitada. Entre em contato com o suporte.';
    case 'auth/user-not-found':
      return 'Usuário não encontrado. Verifique seu email.';
    case 'auth/wrong-password':
      return 'Senha incorreta. Tente novamente.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
    case 'auth/network-request-failed':
      return 'Erro de conexão. Verifique sua internet.';
    default:
      return error.message || 'Erro ao criar usuário. Tente novamente.';
  }
};

export const createUser = async (
  email: string,
  password: string,
  nickname: string
): Promise<User> => {
  try {
    // Criar usuário no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Gerar código único
    const code = await generateUniqueCode();

    // Criar perfil do usuário no Firestore
    const user: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email || email,
      nickname,
      code,
      createdAt: Date.now(),
      blockedWords: [],
    };

    // Criar perfil no Firestore
    const userRef = doc(db, 'users', user.id);
    await setDoc(userRef, {
      email: user.email,
      nickname: user.nickname,
      code: user.code,
      createdAt: Timestamp.fromMillis(user.createdAt),
      profilePicture: null,
      description: null,
      blockedWords: [],
    });

    // Atualizar displayName no Firebase Auth
    await updateProfile(firebaseUser, { displayName: nickname });

    // Salvar no localStorage após criar no Firestore
    localStorage.setItem('comu_user', JSON.stringify(user));

    return user;
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error);
    const translatedError = translateFirebaseError(error);
    throw new Error(translatedError);
  }
};

export const login = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Buscar dados do usuário no Firestore
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);

    let user: User;

    if (!userDoc.exists()) {
      // Se o perfil não existe no Firestore, criar automaticamente
      // Isso pode acontecer se o usuário foi criado no Auth mas houve erro ao criar no Firestore
      console.log('Perfil não encontrado no Firestore, criando automaticamente...');
      
      const code = await generateUniqueCode();
      const nickname = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário';
      
      user = {
        id: firebaseUser.uid,
        email: firebaseUser.email || email,
        nickname,
        code,
        createdAt: Date.now(),
        profilePicture: null,
        description: null,
        blockedWords: [],
      };

      // Criar perfil no Firestore
      await setDoc(userRef, {
        email: user.email,
        nickname: user.nickname,
        code: user.code,
        createdAt: Timestamp.fromMillis(user.createdAt),
        profilePicture: null,
        description: null,
        blockedWords: [],
      });

      // Atualizar displayName no Firebase Auth se necessário
      if (!firebaseUser.displayName) {
        await updateProfile(firebaseUser, { displayName: nickname });
      }
    } else {
      // Perfil existe, carregar dados
      const userData = userDoc.data();
      user = {
        id: firebaseUser.uid,
        email: firebaseUser.email || email,
        nickname: userData.nickname,
        code: userData.code,
        createdAt: userData.createdAt?.toMillis() || Date.now(),
        profilePicture: userData.profilePicture,
        description: userData.description,
        blockedWords: userData.blockedWords || [],
      };
    }

    // Salvar no localStorage para compatibilidade
    localStorage.setItem('comu_user', JSON.stringify(user));

    return user;
  } catch (error: any) {
    console.error('Erro ao fazer login:', error);
    const translatedError = translateFirebaseError(error);
    throw new Error(translatedError);
  }
};

export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
    localStorage.removeItem('comu_user');
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
  }
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem('comu_user');
  return data ? JSON.parse(data) : null;
};

export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error('Erro ao enviar email de recuperação:', error);
    const translatedError = translateFirebaseError(error);
    throw new Error(translatedError);
  }
};

// Sincronizar usuário do Firestore quando Firebase Auth mudar
export const syncUserFromFirebase = async (firebaseUser: FirebaseUser): Promise<User | null> => {
  try {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // Se o documento não existe, tentar pegar do localStorage como fallback
      const localUser = getCurrentUser();
      if (localUser && localUser.id === firebaseUser.uid) {
        return localUser;
      }
      return null;
    }

    const userData = userDoc.data();
    const user: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      nickname: userData.nickname,
      code: userData.code,
      createdAt: userData.createdAt?.toMillis() || Date.now(),
      profilePicture: userData.profilePicture,
      description: userData.description,
      blockedWords: userData.blockedWords || [],
    };

    localStorage.setItem('comu_user', JSON.stringify(user));
    return user;
  } catch (error: any) {
    console.error('Erro ao sincronizar usuário:', error);
    // Se der erro de permissão, tentar pegar do localStorage
    const localUser = getCurrentUser();
    if (localUser && localUser.id === firebaseUser.uid) {
      return localUser;
    }
    return null;
  }
};
