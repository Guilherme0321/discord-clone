// Simulação de carga concorrente: múltiplos usuários fazendo login, criando e
// entrando em servidores, conversando e entrando em canais de voz AO MESMO
// TEMPO (Promise.all, não sequencial) — para expor condições de corrida nos
// repositórios em memória e nas salas do Socket.io.
//
// Uso:
//   BACKEND_URL=https://discord-clone-backend-gef2.onrender.com \
//   FRONTEND_ORIGIN=https://discord-clone-frontend-fngx.onrender.com \
//   NUM_SERVERS=3 USERS_PER_SERVER=4 \
//   node simulate-concurrent.mjs

import { io } from "socket.io-client";

const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:5001").replace(/\/+$/, "");
const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || "http://localhost:5173").replace(
  /\/+$/,
  ""
);
const NUM_SERVERS = Number(process.env.NUM_SERVERS) || 3;
const USERS_PER_SERVER = Number(process.env.USERS_PER_SERVER) || 4;
const RUN_ID = Date.now();

const checks = [];
function check(name, pass, detail) {
  checks.push({ name, pass, detail });
  console.log(`${pass ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function printSummaryAndExit() {
  const failed = checks.filter((c) => !c.pass);
  console.log("\n" + "=".repeat(70));
  console.log(`${checks.length - failed.length}/${checks.length} verificações passaram`);
  if (failed.length > 0) {
    console.log("\nFalharam:");
    failed.forEach((c) => console.log(`  ❌ ${c.name}: ${c.detail}`));
  }
  process.exit(failed.length > 0 ? 1 : 0);
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
    /* sem corpo */
  }
  if (!res.ok) throw new Error(`${options.method || "GET"} ${path} → ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

async function login(username) {
  return api("/api/users/login", { method: "POST", body: JSON.stringify({ username }) });
}

function connectSocket(token) {
  return new Promise((resolve, reject) => {
    const socket = io(BACKEND_URL, { auth: { token }, transports: ["websocket", "polling"] });
    const timeout = setTimeout(() => reject(new Error("timeout ao conectar")), 10000);
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

console.log(
  `Simulando ${NUM_SERVERS} servidor(es) × ${USERS_PER_SERVER} usuário(s) = ${NUM_SERVERS * USERS_PER_SERVER} usuários concorrentes\n` +
    `Alvo: ${BACKEND_URL}\n`
);

// ---------------------------------------------------------------------------
// Fase 1 — login de TODOS os usuários, ao mesmo tempo
// ---------------------------------------------------------------------------

const totalUsers = NUM_SERVERS * USERS_PER_SERVER;
const usernames = Array.from(
  { length: totalUsers },
  (_, i) => `sim_${RUN_ID}_u${i}`
);

const loginResults = await Promise.allSettled(usernames.map((name) => login(name)));
const loginFailures = loginResults.filter((r) => r.status === "rejected");
check(
  `Login concorrente de ${totalUsers} usuários`,
  loginFailures.length === 0,
  loginFailures.length ? `${loginFailures.length} falharam: ${loginFailures[0].reason}` : "todos ok"
);

const allUsers = loginResults.map((r) => (r.status === "fulfilled" ? r.value : null));
const uniqueIds = new Set(allUsers.filter(Boolean).map((u) => u.user.id));
check(
  "Nenhum ID de usuário duplicado (repositório em memória consistente sob concorrência)",
  uniqueIds.size === allUsers.filter(Boolean).length,
  `${uniqueIds.size} ids únicos / ${allUsers.filter(Boolean).length} usuários`
);

if (loginFailures.length > 0) {
  console.log("\n⚠️  Login falhou para algum usuário — abortando (fases seguintes dependem de todos).");
  printSummaryAndExit();
}

// Agrupa os usuários em NUM_SERVERS grupos; o primeiro de cada grupo cria o servidor.
const groups = Array.from({ length: NUM_SERVERS }, (_, i) =>
  allUsers.slice(i * USERS_PER_SERVER, (i + 1) * USERS_PER_SERVER)
);

// ---------------------------------------------------------------------------
// Fase 2 — criação de TODOS os servidores ao mesmo tempo
// ---------------------------------------------------------------------------

const createResults = await Promise.allSettled(
  groups.map((group, i) =>
    api("/api/servers", {
      method: "POST",
      headers: { Authorization: `Bearer ${group[0].token}` },
      body: JSON.stringify({ name: `Concorrência ${RUN_ID}-${i}` }),
    })
  )
);
const createFailures = createResults.filter((r) => r.status === "rejected");
check(
  `Criação concorrente de ${NUM_SERVERS} servidores`,
  createFailures.length === 0,
  createFailures.length ? String(createFailures[0].reason) : "todos ok"
);

const servers = createResults.map((r) => (r.status === "fulfilled" ? r.value : null));
const uniqueServerIds = new Set(servers.filter(Boolean).map((s) => s.id));
check(
  "Nenhum ID de servidor duplicado",
  uniqueServerIds.size === servers.filter(Boolean).length,
  `${uniqueServerIds.size} ids únicos`
);

// ---------------------------------------------------------------------------
// Fase 3 — todo mundo (exceto quem criou) entra no seu servidor, ao mesmo tempo,
// e os grupos entram em paralelo entre si também.
// ---------------------------------------------------------------------------

const joinTasks = [];
groups.forEach((group, i) => {
  const server = servers[i];
  if (!server) return;
  group.slice(1).forEach((user) => {
    joinTasks.push(
      api(`/api/servers/${server.id}/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.token}` },
      })
    );
  });
});
const joinResults = await Promise.allSettled(joinTasks);
const joinFailures = joinResults.filter((r) => r.status === "rejected");
check(
  `Entrada concorrente de ${joinTasks.length} usuários em seus servidores`,
  joinFailures.length === 0,
  joinFailures.length ? String(joinFailures[0].reason) : "todos ok"
);

// Verifica que cada servidor terminou com exatamente os membros esperados,
// sem membros perdidos nem duplicados por causa da concorrência.
const memberCheckResults = await Promise.allSettled(
  groups.map(async (group, i) => {
    const server = servers[i];
    if (!server) throw new Error("servidor não criado");
    const fresh = await api(`/api/servers/${server.id}`, {
      headers: { Authorization: `Bearer ${group[0].token}` },
    });
    const expected = new Set(group.map((u) => u.user.id));
    const actual = new Set(fresh.memberIds);
    if (expected.size !== actual.size) {
      throw new Error(`esperado ${expected.size} membros, veio ${actual.size}`);
    }
    for (const id of expected) {
      if (!actual.has(id)) throw new Error(`membro ${id} sumiu`);
    }
    return fresh.memberIds.length;
  })
);
const memberFailures = memberCheckResults.filter((r) => r.status === "rejected");
check(
  "Todos os servidores têm exatamente os membros esperados (sem perda/duplicação sob concorrência)",
  memberFailures.length === 0,
  memberFailures.length ? String(memberFailures[0].reason) : `${NUM_SERVERS} servidores ok`
);

// ---------------------------------------------------------------------------
// Fase 4 — em TODOS os servidores ao mesmo tempo: todo mundo conecta socket,
// entra no canal de texto, e todos mandam uma mensagem exatamente ao mesmo
// tempo (Promise.all de emits, sem esperar um do outro).
// ---------------------------------------------------------------------------

async function chatStormForServer(group, server, groupIndex) {
  const textChannel = server.channels.find((c) => c.type === "text");
  const sockets = await Promise.all(group.map((u) => connectSocket(u.token)));

  const receivedByUser = sockets.map(() => []);
  sockets.forEach((socket, idx) => {
    socket.on("new-message", (msg) => receivedByUser[idx].push(msg));
  });

  sockets.forEach((socket) => socket.emit("join-channel", textChannel.id));
  await sleep(400);

  const expectedContents = group.map(
    (u, idx) => `msg-${groupIndex}-${idx}-${u.user.username}`
  );

  // Disparo simultâneo: nenhum await entre os emits.
  sockets.forEach((socket, idx) => {
    socket.emit("send-message", { channelId: textChannel.id, content: expectedContents[idx] });
  });

  await sleep(1200);

  const historyBody = await api(`/api/channels/${textChannel.id}/messages`, {
    headers: { Authorization: `Bearer ${group[0].token}` },
  });
  const historyContents = historyBody.map((m) => m.content);

  const missingInHistory = expectedContents.filter((c) => !historyContents.includes(c));
  const duplicatedInHistory = historyContents.filter(
    (c, idx) => historyContents.indexOf(c) !== idx
  );

  const everyoneGotEveryMessage = receivedByUser.every((received) => {
    const contents = received.map((m) => m.content);
    return expectedContents.every((c) => contents.includes(c));
  });

  sockets.forEach((s) => s.disconnect());

  return {
    groupIndex,
    ok:
      missingInHistory.length === 0 &&
      duplicatedInHistory.length === 0 &&
      everyoneGotEveryMessage,
    detail: `histórico: ${historyContents.length}/${expectedContents.length} (faltando: ${missingInHistory.length}, duplicadas: ${duplicatedInHistory.length}); broadcast completo p/ todos: ${everyoneGotEveryMessage}`,
  };
}

const chatStormResults = await Promise.allSettled(
  groups.map((group, i) => (servers[i] ? chatStormForServer(group, servers[i], i) : Promise.reject("sem servidor")))
);
chatStormResults.forEach((r, i) => {
  if (r.status === "fulfilled") {
    check(`[Servidor ${i}] Chat storm: sem mensagem perdida/duplicada, broadcast completo`, r.value.ok, r.value.detail);
  } else {
    check(`[Servidor ${i}] Chat storm`, false, String(r.reason));
  }
});

// ---------------------------------------------------------------------------
// Fase 5 — em TODOS os servidores ao mesmo tempo: todo mundo entra no canal de
// voz simultaneamente e verifica a lista final de participantes de cada um.
// ---------------------------------------------------------------------------

async function voiceStormForServer(group, server, groupIndex) {
  const voiceChannel = server.channels.find((c) => c.type === "voice");
  const sockets = await Promise.all(group.map((u) => connectSocket(u.token)));

  // cada socket acumula quem já viu na sala (snapshot inicial + eventos de entrada)
  const seenByUser = sockets.map(() => new Set());
  sockets.forEach((socket, idx) => {
    socket.on("voice-participants", (list) => {
      list.forEach((p) => seenByUser[idx].add(p.socketId));
    });
    socket.on("voice-user-joined", (p) => {
      seenByUser[idx].add(p.socketId);
    });
  });

  // Todos entram ao mesmo tempo — a ordem de chegada de cada 'connection' no
  // servidor não é garantida, então esperamos um tempo para tudo convergir.
  sockets.forEach((socket) => socket.emit("join-voice-channel", voiceChannel.id));
  await sleep(1500);

  const expectedOthersCount = sockets.length - 1;
  const convergedCorrectly = sockets.every((socket, idx) => {
    const seen = new Set(seenByUser[idx]);
    seen.delete(socket.id); // por segurança, não deveria conter a si mesmo
    return seen.size === expectedOthersCount;
  });

  const counts = seenByUser.map((s) => s.size);

  // Testa saída concorrente também.
  sockets.forEach((socket) => socket.emit("leave-voice-channel", voiceChannel.id));
  await sleep(500);

  sockets.forEach((s) => s.disconnect());

  return {
    groupIndex,
    ok: convergedCorrectly,
    detail: `cada participante deveria ver ${expectedOthersCount} outros; visto por cada um: [${counts.join(", ")}]`,
  };
}

const voiceStormResults = await Promise.allSettled(
  groups.map((group, i) => (servers[i] ? voiceStormForServer(group, servers[i], i) : Promise.reject("sem servidor")))
);
voiceStormResults.forEach((r, i) => {
  if (r.status === "fulfilled") {
    check(
      `[Servidor ${i}] Voice storm: todos convergem para a lista de participantes correta`,
      r.value.ok,
      r.value.detail
    );
  } else {
    check(`[Servidor ${i}] Voice storm`, false, String(r.reason));
  }
});

// ---------------------------------------------------------------------------
// Resumo
// ---------------------------------------------------------------------------

console.log(`\n(${totalUsers} usuários, ${NUM_SERVERS} servidores)`);
printSummaryAndExit();
