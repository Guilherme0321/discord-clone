import { useEffect } from "react";
import { connectSocket, disconnectSocket } from "../lib/socket";
import { useAppStore } from "../store/useAppStore";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import type { Message } from "../types";

export function useChatSocket() {
  const token = useAuthStore((state) => state.token);
  const receiveMessage = useChatStore((state) => state.receiveMessage);
  const markMessageFailed = useChatStore((state) => state.markMessageFailed);

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);
    socket.on("new-message", (message: Message & { tempId?: string }) => receiveMessage(message));
    socket.on("chat-error", (payload: { tempId?: string; message: string }) =>
      markMessageFailed(payload)
    );

    // Uma reconexão do socket.io ganha um socketId novo no servidor — as
    // rooms (join-channel) do socket anterior são perdidas. Sem reentrar,
    // o app ficaria "conectado" mas surdo para mensagens novas no canal
    // atual. O catch-up cobre o que se perdeu enquanto esteve caído.
    socket.io.on("reconnect", () => {
      const currentChannelId = useAppStore.getState().currentChannelId;
      if (currentChannelId) {
        socket.emit("join-channel", currentChannelId);
      }
      void useChatStore.getState().catchUpAllLoadedChannels();
    });

    return () => {
      disconnectSocket();
    };
  }, [token, receiveMessage, markMessageFailed]);
}
