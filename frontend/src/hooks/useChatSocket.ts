import { useEffect } from "react";
import { connectSocket, disconnectSocket } from "../lib/socket";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import type { Message } from "../types";

export function useChatSocket() {
  const token = useAuthStore((state) => state.token);
  const receiveMessage = useChatStore((state) => state.receiveMessage);

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);
    socket.on("new-message", (message: Message) => receiveMessage(message));

    return () => {
      disconnectSocket();
    };
  }, [token, receiveMessage]);
}
