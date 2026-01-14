# Comu - Sistema de Comunicação

Sistema de comunicação completo com suporte a mensagens de texto, áudio, imagens e vídeos. Funciona offline e permite enviar mensagens em fila.

## Funcionalidades

- ✅ Autenticação com email, senha e nickname
- ✅ Código único por usuário para iniciar conversas
- ✅ Mensagens de texto, áudio, imagem e vídeo
- ✅ Funcionamento offline com localStorage
- ✅ Sistema de fila de mensagens pendentes
- ✅ Editar/excluir mensagens pendentes
- ✅ Excluir mensagens enviadas (até 3 minutos após envio)
- ✅ Interface moderna e responsiva

## Como usar

### Instalação

```bash
npm install
```

### Executar em desenvolvimento

```bash
npm run dev
```

### Build para produção

```bash
npm run build
```

## Funcionamento

### Criar Conta
1. Ao abrir o app, clique em "Criar conta"
2. Preencha email, nickname e senha (mínimo 6 caracteres)
3. Um código único será gerado automaticamente

### Iniciar Conversa
1. Clique em "Nova Conversa"
2. Digite o código do usuário com quem deseja conversar
3. A conversa será criada automaticamente

### Enviar Mensagens
- **Texto**: Digite e pressione Enter ou clique no botão de enviar
- **Arquivo**: Clique no ícone de anexo (📎) e selecione imagem ou vídeo
- **Áudio**: Clique no ícone de microfone (🎤) para gravar

### Mensagens Pendentes
- Mensagens criadas offline ou antes de clicar em "Enviar" ficam pendentes
- Você pode editar ou excluir mensagens pendentes
- Clique em "Enviar Agora" na barra de pendentes para enviar todas de uma vez

### Editar/Excluir
- **Mensagens pendentes**: Podem ser editadas e excluídas a qualquer momento
- **Mensagens enviadas**: Podem ser excluídas apenas nos primeiros 3 minutos após o envio

## Tecnologias

- React 18
- TypeScript
- Vite
- localStorage (para armazenamento offline)

## Estrutura do Projeto

```
src/
├── components/      # Componentes React
├── utils/          # Funções utilitárias
├── types.ts        # Definições de tipos TypeScript
└── App.tsx         # Componente principal
```

## Notas

- Este sistema usa localStorage para simular um banco de dados
- Em produção, seria necessário um backend real para sincronização entre dispositivos
- As senhas são armazenadas em base64 (não recomendado para produção - use hash seguro)
- Os arquivos de mídia são convertidos para base64 e armazenados localmente



