# Discord Clone (MVP)

Chat de texto e voz/tela em tempo real, inspirado no Discord.

- **Backend**: Node.js, Express, TypeScript, Socket.io — repositórios em memória atrás de interfaces (`I*Repository`), prontos para trocar por Prisma/PostgreSQL sem tocar em service/controller.
- **Frontend**: React (Vite), TypeScript, Tailwind CSS, Zustand, Socket.io-client, WebRTC nativo (mesh).

## Rodando localmente

**Backend** (`backend/.env`, veja `backend/.env.example`):
```bash
cd backend
npm install
npm run dev   # http://localhost:4000
```

**Frontend** (`frontend/.env`, veja `frontend/.env.example`):
```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

`backend/.env` → `CLIENT_URL` deve apontar para a URL do frontend.
`frontend/.env` → `VITE_API_URL` deve apontar para a URL do backend.
Se mudar a porta de um lado, atualize o outro e reinicie os dois `npm run dev`.

## Deploy no Render

Este repositório tem um [`render.yaml`](render.yaml) (Blueprint) que cria dois serviços:

- `discord-clone-backend` — Web Service Node (Express + Socket.io)
- `discord-clone-frontend` — Static Site (build do Vite)

As variáveis `CLIENT_URL` (backend) e `VITE_API_URL` (frontend) são resolvidas automaticamente entre os dois serviços; `JWT_SECRET` é gerado pelo Render.

**Passos:**
1. Suba este repositório no GitHub.
2. No [Render Dashboard](https://dashboard.render.com), clique em **New > Blueprint** e selecione o repositório.
3. Confirme a criação dos dois serviços (`render.yaml` já define tudo).
4. Aguarde o build/deploy dos dois lados.

⚠️ **Importante**: os dados (usuários, servidores, mensagens) ficam **em memória** — qualquer redeploy ou reinício do serviço (inclusive o "sleep" do plano free do Render por inatividade) apaga tudo. Isso é intencional para este MVP; para persistência real, implemente um repositório (`I*Repository`) com um banco de verdade.

## Estrutura

```
backend/src/modules/   users, servers, channels, chat, signaling
frontend/src/          store (Zustand), components, hooks (useChatSocket, useWebRTC)
render.yaml             Blueprint de deploy (backend + frontend)
```
