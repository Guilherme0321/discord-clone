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
});

registerSocketAuth(io);
registerChatSocket(io, messageService);
registerVoiceSignaling(io, channelRepository);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
