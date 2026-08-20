import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { createApp, channelRepository, messageService } from "./app";
import { CLIENT_URL, PORT } from "./config/env";
import { registerSocketAuth } from "./shared/socket-auth";
import { registerChatSocket } from "./modules/chat/chat.socket";
import { registerVoiceSignaling } from "./modules/signaling/signaling.socket";

const app = createApp();
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
  },
  // Heartbeat explícito (em vez de depender do default implícito do
  // engine.io): a cada 20s o servidor manda "ping"; se o cliente não
  // responder "pong" em até 20s, a conexão é considerada morta e um
  // 'disconnect' é disparado — é assim que quedas silenciosas (cabo de rede
  // arrancado, processo travado) são detectadas sem esperar um timeout de
  // TCP, que pode levar minutos.
  pingInterval: 20000,
  pingTimeout: 20000,
});

registerSocketAuth(io);
registerChatSocket(io, messageService);
registerVoiceSignaling(io, channelRepository);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
