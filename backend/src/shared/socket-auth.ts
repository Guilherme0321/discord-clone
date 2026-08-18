import { Server as SocketIOServer } from "socket.io";
import { verifyToken } from "./auth.middleware";
import { AppSocket } from "./socket-types";

export function registerSocketAuth(io: SocketIOServer): void {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error("Missing authentication token"));
    }

    const payload = verifyToken(token);
    if (!payload) {
      return next(new Error("Invalid or expired token"));
    }

    const appSocket = socket as AppSocket;
    appSocket.data.userId = payload.userId;
    appSocket.data.username = payload.username;
    next();
  });
}
