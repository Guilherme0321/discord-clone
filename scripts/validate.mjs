// Suite de validação de casos de uso reais contra um backend (e opcionalmente
// um frontend) já no ar — local ou em produção (Render).
//
// Uso:
//   BACKEND_URL=https://discord-clone-backend-deky.onrender.com \
//   FRONTEND_ORIGIN=https://discord-clone-frontend-it20.onrender.com \
//   node validate.mjs
//
// Sem variáveis de ambiente, valida contra localhost (5001 / 5173).

import { io } from "socket.io-client";

const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:5001").replace(/\/+$/, "");
const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || "http://localhost:5173").replace(
  /\/+$/,
  ""
);
const FRONTEND_URL = process.env.FRONTEND_URL || null;

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  const icon = pass ? "✅" : "❌";
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function run(name, fn) {
  try {
    const detail = await fn();
    record(name, true, detail);
  } catch (err) {
    record(name, false, err.message);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function printSummary() {
  const failed = results.filter((r) => !r.pass);
  console.log("\n" + "=".repeat(60));
  console.log(`${results.length - failed.length}/${results.length} casos passaram`);
  if (failed.length > 0) {
    console.log("\nFalharam:");
    failed.forEach((r) => console.log(`  ❌ ${r.name}: ${r.detail}`));
  }
}

async function api(path, options = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Origin: FRONTEND_ORIGIN,
      ...options.headers,
    },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* corpo vazio, ok */
  }
  return { res, body };
}

async function login(username) {
  const { res, body } = await api("/api/users/login", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
  if (!res.ok) throw new Error(`login falhou (${res.status}): ${JSON.stringify(body)}`);
  return body; // { user, token }
}

function connectSocket(token) {
  return new Promise((resolve, reject) => {
    const socket = io(BACKEND_URL, { auth: { token }, transports: ["websocket", "polling"] });
    const timeout = setTimeout(() => reject(new Error("timeout ao conectar socket")), 8000);
    socket.on("connect", () => {
      clearTimeout(timeout);
      resolve(socket);
    });
    socket.on("connect_error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

function waitFor(socket, event, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`timeout esperando evento '${event}'`)),
      timeoutMs
    );
    socket.once(event, (payload) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });
}

// ---------------------------------------------------------------------------
// Casos de uso
// ---------------------------------------------------------------------------

await run("Backend responde em /health", async () => {
  const res = await fetch(`${BACKEND_URL}/health`);
  const body = await res.json();
  assert(res.ok, `status ${res.status}`);
  assert(body.status === "ok", "corpo inesperado");
  return `${BACKEND_URL}/health`;
});

if (!results[0].pass) {
  console.log(
    `\n⚠️  Backend inacessível em ${BACKEND_URL} — pulando os demais casos (dependem dele).`
  );
  printSummary();
  process.exit(1);
}

await run("CORS: origin permitido bate byte-a-byte com Access-Control-Allow-Origin", async () => {
  const res = await fetch(`${BACKEND_URL}/api/users/login`, {
    method: "OPTIONS",
    headers: {
      Origin: FRONTEND_ORIGIN,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  });
  const allowOrigin = res.headers.get("access-control-allow-origin");
  // Comparação estrita: é exatamente isso que o navegador faz. Uma barra a
  // mais aqui passa despercebido em ferramentas como curl mas quebra no
  // navegador real (foi um bug real neste projeto).
  assert(
    allowOrigin === FRONTEND_ORIGIN,
    `esperado '${FRONTEND_ORIGIN}', recebido '${allowOrigin}'`
  );
  return allowOrigin;
});

await run("CORS: origin não autorizado não é refletido de volta", async () => {
  const forgedOrigin = "https://site-malicioso-qualquer.example.com";
  const res = await fetch(`${BACKEND_URL}/api/users/login`, {
    method: "OPTIONS",
    headers: {
      Origin: forgedOrigin,
      "Access-Control-Request-Method": "POST",
    },
  });
  const allowOrigin = res.headers.get("access-control-allow-origin");
  assert(allowOrigin !== forgedOrigin, "o backend está refletindo qualquer origin (inseguro)");
  return allowOrigin ? `retornou '${allowOrigin}' (ok, não é a origem forjada)` : "sem header (ok)";
});

let alice, bob;

await run("Login cria um novo usuário com token JWT", async () => {
  alice = await login(`alice_${Date.now()}`);
  assert(alice.user?.id, "resposta sem user.id");
  assert(typeof alice.token === "string" && alice.token.length > 20, "token ausente/curto");
  return `user ${alice.user.username} (${alice.user.id})`;
});

if (!alice) {
  console.log("\n⚠️  Login falhou — pulando os demais casos (dependem de um usuário autenticado).");
  printSummary();
  process.exit(1);
}

await run("Login é idempotente por username (mesmo usuário, sem duplicar)", async () => {
  const again = await login(alice.user.username);
  assert(again.user.id === alice.user.id, "gerou um usuário diferente para o mesmo username");
  return "id consistente entre logins";
});

await run("Rota protegida rejeita requisição sem token (401)", async () => {
  const { res } = await api("/api/users/me");
  assert(res.status === 401, `esperado 401, recebido ${res.status}`);
  return "401 conforme esperado";
});

await run("Rota protegida aceita token válido", async () => {
  const { res, body } = await api("/api/users/me", {
    headers: { Authorization: `Bearer ${alice.token}` },
  });
  assert(res.ok, `status ${res.status}`);
  assert(body.username === alice.user.username, "usuário retornado não confere");
  return `me = ${body.username}`;
});

let server;

await run("Criar servidor gera canais padrão (#geral texto + Geral voz)", async () => {
  const { res, body } = await api("/api/servers", {
    method: "POST",
    headers: { Authorization: `Bearer ${alice.token}` },
    body: JSON.stringify({ name: `Servidor Validação ${Date.now()}` }),
  });
  assert(res.ok, `status ${res.status}`);
  server = body;
  const text = server.channels.find((c) => c.type === "text");
  const voice = server.channels.find((c) => c.type === "voice");
  assert(text?.name === "geral", "canal de texto 'geral' não encontrado");
  assert(voice, "canal de voz não encontrado");
  return `server ${server.id}, canais: ${server.channels.map((c) => c.name).join(", ")}`;
});

if (!server) {
  console.log("\n⚠️  Criação de servidor falhou — pulando os demais casos (dependem dele).");
  printSummary();
  process.exit(1);
}

await run("Servidor criado aparece na listagem do dono", async () => {
  const { res, body } = await api("/api/servers", {
    headers: { Authorization: `Bearer ${alice.token}` },
  });
  assert(res.ok, `status ${res.status}`);
  assert(
    body.some((s) => s.id === server.id),
    "servidor recém-criado não apareceu na listagem"
  );
  return `${body.length} servidor(es) para alice`;
});

await run("Segundo usuário entra no servidor por ID", async () => {
  bob = await login(`bob_${Date.now()}`);
  const { res, body } = await api(`/api/servers/${server.id}/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${bob.token}` },
  });
  assert(res.ok, `status ${res.status}`);
  assert(body.memberIds.includes(bob.user.id), "bob não apareceu em memberIds");
  return `bob (${bob.user.id}) entrou`;
});

await run("Entrar em servidor inexistente retorna 404", async () => {
  const { res } = await api(`/api/servers/00000000-0000-0000-0000-000000000000/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${bob.token}` },
  });
  assert(res.status === 404, `esperado 404, recebido ${res.status}`);
  return "404 conforme esperado";
});

await run("Socket.io rejeita conexão sem token", async () => {
  await new Promise((resolve, reject) => {
    const socket = io(BACKEND_URL, { auth: {}, transports: ["websocket", "polling"] });
    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error("timeout — deveria ter rejeitado a conexão"));
    }, 5000);
    socket.on("connect", () => {
      clearTimeout(timeout);
      socket.disconnect();
      reject(new Error("conectou sem token (deveria ter sido rejeitado)"));
    });
    socket.on("connect_error", () => {
      clearTimeout(timeout);
      socket.disconnect();
      resolve();
    });
  });
  return "connect_error recebido, como esperado";
});

const textChannelId = server.channels.find((c) => c.type === "text").id;
const voiceChannelId = server.channels.find((c) => c.type === "voice").id;

let socketAlice, socketBob;

await run("Chat em tempo real: mensagem enviada por A chega em B via socket", async () => {
  socketAlice = await connectSocket(alice.token);
  socketBob = await connectSocket(bob.token);

  socketAlice.emit("join-channel", textChannelId);
  socketBob.emit("join-channel", textChannelId);
  await new Promise((r) => setTimeout(r, 300));

  const received = waitFor(socketBob, "new-message");
  socketAlice.emit("send-message", { channelId: textChannelId, content: "olá, validação!" });
  const message = await received;

  assert(message.content === "olá, validação!", "conteúdo da mensagem não confere");
  assert(message.authorUsername === alice.user.username, "autor não confere");
  return `bob recebeu: "${message.content}"`;
});

await run("Histórico da mensagem foi persistido (GET REST)", async () => {
  const { res, body } = await api(`/api/channels/${textChannelId}/messages`, {
    headers: { Authorization: `Bearer ${alice.token}` },
  });
  assert(res.ok, `status ${res.status}`);
  assert(
    body.some((m) => m.content === "olá, validação!"),
    "mensagem não encontrada no histórico"
  );
  return `${body.length} mensagem(ns) no histórico`;
});

await run("Sinalização de voz: B vê A na lista de participantes ao entrar", async () => {
  socketAlice.emit("join-voice-channel", voiceChannelId);
  await new Promise((r) => setTimeout(r, 300));

  const participantsForBob = waitFor(socketBob, "voice-participants");
  socketBob.emit("join-voice-channel", voiceChannelId);
  const participants = await participantsForBob;

  assert(participants.length === 1, `esperado 1 participante, veio ${participants.length}`);
  assert(participants[0].socketId === socketAlice.id, "participante não é a alice");
  return "lista de participantes correta";
});

await run("Sinalização de voz: relay de offer/answer/ICE chega só no destino certo", async () => {
  const offerReceived = waitFor(socketBob, "webrtc-offer");
  socketAlice.emit("webrtc-offer", {
    targetSocketId: socketBob.id,
    offer: { type: "offer", sdp: "fake-sdp" },
  });
  const offer = await offerReceived;
  assert(offer.fromSocketId === socketAlice.id, "offer não veio de alice");

  const answerReceived = waitFor(socketAlice, "webrtc-answer");
  socketBob.emit("webrtc-answer", {
    targetSocketId: socketAlice.id,
    answer: { type: "answer", sdp: "fake-sdp-b" },
  });
  const answer = await answerReceived;
  assert(answer.fromSocketId === socketBob.id, "answer não veio do bob");

  return "offer/answer relayed corretamente";
});

await run("Compartilhamento de tela: fim é sinalizado explicitamente para a sala", async () => {
  const stateReceived = waitFor(socketBob, "screen-share-state");
  socketAlice.emit("screen-share-state", { isSharing: false });
  const state = await stateReceived;
  assert(state.socketId === socketAlice.id, "socketId não confere");
  assert(state.isSharing === false, "isSharing não confere");
  return "evento screen-share-state recebido";
});

await run("Saída do canal de voz notifica o outro participante", async () => {
  const leftReceived = waitFor(socketBob, "voice-user-left");
  socketAlice.emit("leave-voice-channel", voiceChannelId);
  const left = await leftReceived;
  assert(left.socketId === socketAlice.id, "socketId não confere");
  return "voice-user-left recebido";
});

socketAlice?.disconnect();
socketBob?.disconnect();

if (FRONTEND_URL) {
  await run("Frontend está acessível", async () => {
    const res = await fetch(FRONTEND_URL);
    assert(res.ok, `status ${res.status}`);
    return `${FRONTEND_URL} → ${res.status}`;
  });
}

printSummary();
if (results.some((r) => !r.pass)) process.exit(1);
