import { io, type Socket } from "socket.io-client";
import { API_URL } from "./api";
import { useConnectionStore } from "../store/useConnectionStore";

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket) {
    socket.disconnect();
  }

  useConnectionStore.getState().setStatus("connecting");

  socket = io(API_URL, {
    auth: { token },
    autoConnect: true,
    // O heartbeat (ping/pong) é feito pelo engine.io internamente — o
    // servidor manda "ping" e espera "pong" nesse intervalo (ver
    // pingInterval/pingTimeout em server.ts); o cliente só precisa saber que
    // uma queda silenciosa vira 'disconnect' depois desse prazo, sem esforço
    // extra aqui.
    //
    // Backoff exponencial com jitter: cada tentativa espera o dobro da
    // anterior (limitado a reconnectionDelayMax), com até ±50% de variação
    // aleatória (randomizationFactor) para várias abas/usuários não tentarem
    // reconectar todos no mesmo instante ("thundering herd").
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
    randomizationFactor: 0.5,
    reconnectionAttempts: Infinity,
  });

  socket.on("connect", () => useConnectionStore.getState().setStatus("online"));
  socket.on("disconnect", () => useConnectionStore.getState().setStatus("reconnecting"));
  socket.on("reconnect_attempt", () => useConnectionStore.getState().setStatus("reconnecting"));

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  useConnectionStore.getState().setStatus("offline");
}

export function getSocket(): Socket | null {
  return socket;
}
