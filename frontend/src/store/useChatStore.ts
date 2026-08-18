import { create } from "zustand";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import type { Message } from "../types";

interface ChatState {
  messagesByChannel: Record<string, Message[]>;
  loadedChannelIds: Set<string>;

  loadHistory: (channelId: string) => Promise<void>;
  receiveMessage: (message: Message) => void;
  sendMessage: (channelId: string, content: string) => void;
  joinChannel: (channelId: string) => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  messagesByChannel: {},
  loadedChannelIds: new Set(),

  loadHistory: async (channelId: string) => {
    if (get().loadedChannelIds.has(channelId)) return;

    const { data } = await api.get<Message[]>(`/channels/${channelId}/messages`);
    set((state) => ({
      messagesByChannel: { ...state.messagesByChannel, [channelId]: data },
      loadedChannelIds: new Set(state.loadedChannelIds).add(channelId),
    }));
  },

  receiveMessage: (message: Message) => {
    set((state) => {
      const existing = state.messagesByChannel[message.channelId] ?? [];
      return {
        messagesByChannel: {
          ...state.messagesByChannel,
          [message.channelId]: [...existing, message],
        },
        loadedChannelIds: new Set(state.loadedChannelIds).add(message.channelId),
      };
    });
  },

  sendMessage: (channelId: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    getSocket()?.emit("send-message", { channelId, content: trimmed });
  },

  joinChannel: (channelId: string) => {
    getSocket()?.emit("join-channel", channelId);
  },
}));
