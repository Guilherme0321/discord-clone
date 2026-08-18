import { Server as SocketIOServer } from "socket.io";
import { AppSocket } from "../../shared/socket-types";
import { MessageService } from "./message.service";

interface SendMessagePayload {
  channelId: string;
  content: string;
}

export function registerChatSocket(io: SocketIOServer, messageService: MessageService): void {
  io.on("connection", (rawSocket) => {
    const socket = rawSocket as AppSocket;

    socket.on("join-channel", (channelId: string) => {
      leaveAllChannelRooms(socket);
      socket.join(channelRoom(channelId));
    });

    socket.on("leave-channel", (channelId: string) => {
      socket.leave(channelRoom(channelId));
    });

    socket.on("send-message", async (payload: SendMessagePayload) => {
      try {
        const message = await messageService.sendMessage(
          payload.channelId,
          socket.data.userId,
          socket.data.username,
          payload.content
        );
        io.to(channelRoom(payload.channelId)).emit("new-message", message);
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "Could not send message";
        socket.emit("chat-error", { message: messageText });
      }
    });
  });
}

function channelRoom(channelId: string): string {
  return `channel:${channelId}`;
}

function leaveAllChannelRooms(socket: AppSocket): void {
  for (const room of socket.rooms) {
    if (room.startsWith("channel:")) {
      socket.leave(room);
    }
  }
}
