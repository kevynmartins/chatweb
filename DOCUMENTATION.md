# Documentação Técnica do ChatWeb

## 1. Visão Geral

O ChatWeb é um aplicativo de chat corporativo em tempo real construído com **Next.js 13 (App Router)**, **TypeScript**, **React Hooks** e **Tailwind CSS**. Ele reproduz a interface do WhatsApp com conversas, chats diretos e em grupo, compartilhamento de imagens/arquivos, gravação de voz e perfis de usuário. O aplicativo funciona em desktops e dispositivos móveis, com comportamento responsivo da barra lateral.

Recursos incluem:
- Autenticação de usuário (JWT)
- Mensageria em tempo real via Socket.io
- Criação e gerenciamento de grupos
- Upload de imagem/arquivo com pré‑visualização
- Gravação de mensagens de voz
- Notificações push (navegador)
- Modal de perfil de usuário e painel de informações de grupo

O sistema foi projetado para rodar em ambientes modernos: serverless (Vercel), Docker, Windows Server, Electron (desktop) e navegadores mobile.

## 2. Tecnologias Utilizadas

| Camada          | Tecnologias                     |
|----------------|----------------------------------|
| Frontend       | Next.js 13 (App Router), React, TypeScript, Tailwind CSS, ícones lucide-react |
| Estado         | React `useState`, `useEffect`, `useRef` |
| Tempo real     | Socket.io (cliente e servidor)  |
| API backend    | Rotas de API do Next.js (`/src/app/api/...`) usando Node.js
| Banco de dados | PostgreSQL / MongoDB (configurável via `DATABASE_URL`)
| Deploy         | Vercel, Docker, PM2/Nginx, Electron, Windows Server
| Autenticação   | JWT armazenado em localStorage  |

## 3. Estrutura do Projeto

```
chatweb/
├── src/
│   ├── app/
│   │   ├── chat/          # componente principal de chat (page.tsx)
│   │   ├── api/           # rotas de API (users, auth, chat etc.)
│   │   ├── login/, logout/ ...
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── lib/              # módulos auxiliares (auth.ts, prisma.ts)
│   └── ...
├── public/               # ativos estáticos
├── prisma/               # esquema Prisma e migrações
├── package.json
├── next.config.js
├── tsconfig.json
└── server.js             # servidor Node opcional (para socket)
```

### Arquivos principais

- `src/app/chat/page.tsx` — UI do chat, gerenciamento de estado, comportamento da barra lateral, modais e handlers.
- `src/app/api/chat/...` — Endpoints para buscar, criar e atualizar mensagens.
- `lib/auth.ts` — Utilitários JWT para proteção das rotas de API.
- `lib/prisma.ts` — Instância do cliente Prisma.

## 4. Configuração para Desenvolvimento

1. Clone o repositório e instale as dependências:
   ```bash
   git clone https://github.com/youruser/chatweb.git
   cd chatweb
   npm install
   ```

2. Crie o arquivo `.env` com variáveis de desenvolvimento:
   ```env
   DATABASE_URL=postgres://user:pass@localhost:5432/chatdb
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
   JWT_SECRET=seu_seguro_jwt
   ```

3. Execute as migrações do banco (se usar Prisma):
   ```bash
   npx prisma migrate dev --name init
   ```

4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

O app ficará disponível em `http://localhost:3000`. O servidor de socket utiliza a mesma porta (ou `server.js` separado).

## 5. Fluxo da Aplicação

### Autenticação
- O usuário faz login via `/login/route.ts`. O servidor valida e devolve um JWT.
- O token é armazenado em `localStorage` e enviado no cabeçalho `Authorization` em chamadas posteriores.
- O utilitário `auth.ts` decodifica e verifica o token; é usado nas rotas de API para autenticar.

### Interface de Chat (`src/app/chat/page.tsx`)
- **Barra lateral**: lista conversas obtidas em `/api/chat/conversations`. Ao clicar, `currentChat` é definido e as mensagens são carregadas.
- **Mensagens**: exibidas com estilo condicional; suportam texto, imagem, arquivo e voz. Os usuários podem editar suas próprias mensagens e apagá-las tanto para si mesmos quanto para todos, com sincronização em tempo real. Para editar, clique na seta ao lado da mensagem para abrir o menu de ações, selecione **Editar** e faça alterações no campo inline. O botão de confirmação (ícone de ✔️ à direita) é grande e destacável; pressioná‑lo salva imediatamente a nova mensagem e notifica todos na conversa.
- **Toggle da sidebar**: controlado por `isConversationsOpen`. No mobile, aparece como overlay full‑screen (`z-[999]`).
- **Modal de perfil**: abre ao clicar no avatar do usuário ou via `setIsProfileOpen(true)`.
- **Painel de informações de grupo**: para chats em grupo, mostra participantes e permite gerenciar.

### Eventos em Tempo Real
Eventos Socket.io:
- `message` — nova mensagem broadcast; adicionada ao estado `messages`.
- `conversation` — nova conversa criada; atualiza lista `conversations`.
- Outros: indicadores de digitação, leitura, etc.

### Endpoints de API (simplificados)

```
GET  /api/chat/conversations?userId={id}
GET  /api/chat/messages?conversationId={cid}
POST /api/chat         # enviar mensagem (type, content, conversationId)
POST /api/auth/login
POST /api/users        # cadastrar
PUT  /api/users/:id    # atualizar perfil
...
```

Todas as rotas exigem JWT válido, exceto login e registro.

## 6. Esquema do Banco de Dados (exemplo Prisma)

```prisma
model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String
  image     String?
  status    String   @default("OFFLINE")
  chats     ChatParticipant[]
}

model Conversation {
  id        String   @id @default(uuid())
  name      String?
  isGroup   Boolean  @default(false)
  participants ChatParticipant[]
  messages   Message[]
  createdAt  DateTime @default(now())
}

model ChatParticipant {
  id            String       @id @default(uuid())
  conversation  Conversation @relation(fields: [conversationId], references: [id])
  conversationId String
  user          User         @relation(fields: [userId], references: [id])
  userId        String
}

model Message {
  id             String   @id @default(uuid())
  content        String
  type           String   @default("TEXT")
  imageUrl       String?
  sender         User     @relation(fields: [senderId], references: [id])
  senderId       String
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  conversationId String
  createdAt      DateTime @default(now())
}
```

## 7. Opções de Deploy

### Vercel
- Build automático ao enviar para a branch `main`.
- Defina variáveis de ambiente no painel do projeto.
- Use `NEXT_PUBLIC_SOCKET_URL` apontando para servidor de socket externo.

### Docker
- Contém exemplos de `Dockerfile` e `docker-compose.yml`.
- Build da imagem: `docker build -t chatweb .`.
- Subir containers: `docker-compose up -d`.

### Windows Server
- Instale Docker via `DockerMsftProvider` ou execute o Node diretamente.
- Use IIS/NGINX como proxy reverso se necessário.

### Electron Desktop
- Adicione processo principal do Electron e scripts de empacotamento.
- Use `npm run electron-dev` para testes locais.

## 8. Variáveis de Ambiente

| Nome                    | Descrição                                      | Requerido em | Observações                      |
|-------------------------|------------------------------------------------|--------------|----------------------------------|
| DATABASE_URL            | String de conexão com o banco de dados         | todos        | Postgres/Mongo etc.              |
| JWT_SECRET              | Chave secreta para assinatura de JWT           | todos        | Mantenha segura                  |
| NEXT_PUBLIC_API_URL     | URL base para requisições da API               | frontend     | ex: `https://api.exemplo.com`    |
| NEXT_PUBLIC_SOCKET_URL  | URL do servidor WebSocket                      | frontend     | `wss://...` ou `http://...`      |
| NODE_ENV                | `development` ou `production`                  | todos        | Afeta o comportamento do Next    |
| PUSH_SERVER_KEY*        | Para notificações push (opcional)              | servidor     | Substituir pelas chaves VAPID    |

Dados podem ser armazenados em `.env` ou injetados pela plataforma de hospedagem.

## 9. Considerações de Segurança

- **JWT** deve ser gerado e validado com segurança; tokens expiram.
- **CORS** configurado para permitir apenas origens confiáveis na API e sockets.
- **Sanitização de conteúdo** em entradas de usuário para evitar XSS.
- **Uploads de arquivo** limitados em tamanho e tipo; validados antes de armazenar.
- **HTTPS/SSL** obrigatório em produção para proteger dados em trânsito.

## 10. Monitoramento e Logs

- Use **PM2** ou logs do Docker para monitorar saída do servidor.
- O Vercel fornece logs de funções para rotas de API.
- Considere integrar Sentry/LogRocket para rastreamento de erros.

## 11. Pontos de Extensão

- **Notificações Push** – integrar FCM ou web push com service worker.
- **Indicadores de presença/teclando** – emitir eventos socket para melhorar UX.
- **Busca em conversas/mensagens** – adicionar index no backend e filtros na UI.
- **Melhorias no compartilhamento de arquivos** – integrar armazenamento em nuvem (S3, Cloudinary).

## 12. Testes

- Escreva testes unitários para funções utilitárias com Jest.
- Utilize Cypress/Playwright para testes end‑to‑end dos fluxos de chat.
- Mock de eventos Socket.io em testes com `socket.io-mock`.

## 13. Problemas Comuns e Soluções

- **Erros de hidratação**: causados por uso de `window` em inicializadores de estado; corrija usando `useEffect`.
- **Problema de z-index na sidebar**: garanta que o overlay mobile use `z-[999]`.
- **Erros de CORS em Socket.io**: configure o servidor com `cors: { origin: '*' }` ou domínio específico.
- **Modal de perfil bloqueada no móvel**: feche o overlay antes de abrir o modal.

## 14. Diretrizes para Contribuição

- Siga o estilo de código existente (Prettier + ESLint).
- Adicione novos ícones importando de `lucide-react`.
- Coloque novas rotas de API em `src/app/api/` e proteja com `auth.ts`.
- Execute `npm run lint` e `npm run tsc` antes de commitar.

---

Esta documentação serve como referência para desenvolvedores, engenheiros de operações e integradores que trabalham com o ChatWeb. Para mais ajuda, confira comentários nos arquivos fontes ou pergunte no canal do projeto.