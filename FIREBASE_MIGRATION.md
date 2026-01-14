# Migração para Firebase

Este documento explica como migrar do localStorage para Firebase Firestore.

## Status

✅ Firebase configurado (`src/config/firebase.ts`)
✅ Storage com Firestore criado (`src/utils/storageFirebase.ts`)
⏳ Migração gradual em andamento

## Estrutura do Firestore

### Coleções

- **users/** - Usuários do sistema
  - `email`, `nickname`, `code`, `createdAt`, `profilePicture`, `description`, `blockedWords`

- **chats/** - Conversas entre usuários
  - `participants`, `lastActivity`, `lastMessage`, `pinnedMessages`, `typingUsers`

- **messages/** - Mensagens
  - `chatId`, `senderId`, `receiverId`, `type`, `content`, `timestamp`, `sent`, `edited`, `replyToId`, `reactions`, `readBy`, `readAt`, `pinned`

- **pendingMessages/** - Mensagens pendentes de envio

- **blockedAttempts/** - Tentativas de palavras bloqueadas

- **blockedUsers/** - Usuários bloqueados

- **typingStatus/** - Status de digitação por chat

## Como Migrar

### Opção 1: Migração Gradual (Recomendado)

1. Mantenha `storage.ts` (localStorage) funcionando
2. Use `storageFirebase.ts` para novas funcionalidades
3. Migre componente por componente

### Opção 2: Migração Completa

1. Substitua todas as importações de `storage` por `storageFirebase`
2. Atualize todas as chamadas síncronas para assíncronas (async/await)
3. Use listeners em tempo real onde apropriado

## Exemplo de Uso

### Antes (localStorage):
```typescript
import { storage } from './utils/storage';

const user = storage.getUser(); // Síncrono
storage.saveUser(user); // Síncrono
```

### Depois (Firestore):
```typescript
import { storage } from './utils/storageFirebase';

const user = await storage.getUser(); // Assíncrono
await storage.saveUser(user); // Assíncrono
```

## Listeners em Tempo Real

O Firestore permite listeners em tempo real:

```typescript
// Escutar mensagens de um chat
const unsubscribe = storage.subscribeToMessages(chatId, (messages) => {
  setMessages(messages);
});

// Limpar listener
return () => unsubscribe();
```

## Próximos Passos

1. ✅ Configurar Firebase
2. ✅ Criar storageFirebase.ts
3. ⏳ Migrar auth.ts para Firebase Auth
4. ⏳ Migrar componentes para usar Firestore
5. ⏳ Implementar listeners em tempo real
6. ⏳ Configurar regras de segurança do Firestore


