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

`JWT_SECRET` é gerado automaticamente pelo Render. `CLIENT_URL` (backend) e `VITE_API_URL` (frontend) são `sync: false` no Blueprint — ou seja, **você define manualmente** no painel depois do primeiro deploy, porque a URL de cada serviço só existe depois de criado (problema do ovo e da galinha). Sem protocolo `https://` explícito e sem barra no final não tem problema: o código normaliza isso sozinho.

**Passos:**
1. Suba este repositório no GitHub.
2. No [Render Dashboard](https://dashboard.render.com), clique em **New > Blueprint** e selecione o repositório.
3. Confirme a criação dos dois serviços (`render.yaml` já define tudo).
4. Aguarde o primeiro build/deploy dos dois lados (mesmo que a conexão entre eles ainda não funcione — normal nessa etapa).
5. Anote a URL pública de cada serviço (aparece no topo da página de cada um, ex: `https://discord-clone-backend-xxxx.onrender.com`).
6. Em `discord-clone-frontend` → **Environment**, defina `VITE_API_URL` = URL do backend.
7. Em `discord-clone-backend` → **Environment**, defina `CLIENT_URL` = URL do frontend.
8. Em **cada um dos dois serviços**: `Manual Deploy → Clear build cache & deploy` (obrigatório para o frontend, já que o Vite grava a URL dentro do JS no momento do build).

⚠️ **Importante**: os dados (usuários, servidores, mensagens) ficam **em memória** — qualquer redeploy ou reinício do serviço (inclusive o "sleep" do plano free do Render por inatividade) apaga tudo. Isso é intencional para este MVP; para persistência real, implemente um repositório (`I*Repository`) com um banco de verdade.

## Validando as conexões

[`scripts/validate.mjs`](scripts/validate.mjs) roda uma bateria de casos de uso reais contra um backend no ar (local ou produção): saúde do serviço, CORS byte-a-byte (pega o clássico bug de barra final que passa no `curl` mas quebra no navegador), login, autenticação, criação/entrada em servidor, chat em tempo real (Socket.io), histórico persistido, e toda a sinalização de voz (participantes, relay de offer/answer/ICE, compartilhamento de tela, saída de canal).

```bash
cd scripts
npm install

# contra o ambiente local
node validate.mjs

# contra produção
BACKEND_URL=https://discord-clone-backend-xxxx.onrender.com \
FRONTEND_ORIGIN=https://discord-clone-frontend-xxxx.onrender.com \
FRONTEND_URL=https://discord-clone-frontend-xxxx.onrender.com \
node validate.mjs
```

## Estrutura

```
backend/src/modules/   users, servers, channels, chat, signaling
frontend/src/          store (Zustand), components, hooks (useChatSocket, useWebRTC)
scripts/validate.mjs   suíte de validação de casos de uso (local ou produção)
render.yaml             Blueprint de deploy (backend + frontend)
```
