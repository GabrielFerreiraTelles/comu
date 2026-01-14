import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCEXb--iJ6iSeIk5e3EhdYSGqtp2F8n5rQ",
  authDomain: "comu-chat-c6f38.firebaseapp.com",
  projectId: "comu-chat-c6f38",
  storageBucket: "comu-chat-c6f38.firebasestorage.app",
  messagingSenderId: "402792735232",
  appId: "1:402792735232:web:e04680ebd6fe2bec26aee5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;


