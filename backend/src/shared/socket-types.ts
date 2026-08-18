import { Socket } from "socket.io";

export interface SocketData {
  userId: string;
  username: string;
  voiceChannelId?: string;
  serverId?: string;
}

export type AppSocket = Socket<any, any, any, SocketData>;
