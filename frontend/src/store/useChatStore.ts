import { create } from "zustand";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { useAuthStore } from "./useAuthStore";
import type { Message } from "../types";

// Payload que chega no evento 'new-message': é o Message persistido mais um
// `tempId` opcional, ecoado de volta só para quem enviou reconciliar a
// mensagem otimista (ver sendMessage). Nunca é salvo no backend.
type IncomingMessage = Message & { tempId?: string };

function generateTempId(): string {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface ChatState {
  messagesByChannel: Record<string, Message[]>;
  loadedChannelIds: Set<string>;

  loadHistory: (channelId: string) => Promise<void>;
  receiveMessage: (message: IncomingMessage) => void;
  sendMessage: (channelId: string, content: string) => void;
  markMessageFailed: (payload: { tempId?: string; message: string }) => void;
  joinChannel: (channelId: string) => void;
  // "Catch-up": busca via REST as mensagens que chegaram enquanto o socket
  // estava caído, usando a última mensagem já vista como marca d'água. Só
  // faz sentido para canais que o usuário já abriu nesta sessão.
  catchUpAllLoadedChannels: () => Promise<void>;
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

  receiveMessage: (message) => {
    const { tempId, ...confirmed } = message;

    set((state) => {
      const existing = state.messagesByChannel[message.channelId] ?? [];

      // Reconciliação da UI otimista: essa é a confirmação da MINHA própria
      // mensagem pendente — substitui em vez de duplicar.
      const pendingIndex = tempId ? existing.findIndex((m) => m.id === tempId) : -1;
      if (pendingIndex !== -1) {
        const updated = [...existing];
        updated[pendingIndex] = confirmed;
        return {
          messagesByChannel: { ...state.messagesByChannel, [message.channelId]: updated },
        };
      }

      if (existing.some((m) => m.id === confirmed.id)) return {};

      return {
        messagesByChannel: {
          ...state.messagesByChannel,
          [message.channelId]: [...existing, confirmed],
        },
        loadedChannelIds: new Set(state.loadedChannelIds).add(message.channelId),
      };
    });
  },

  sendMessage: (channelId: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const user = useAuthStore.getState().user;
    if (!user) return;

    const tempId = generateTempId();

    // Otimista: aparece na tela na hora, com `pending: true` (a UI mostra
    // translúcida) — é substituída pela versão confirmada quando o
    // 'new-message' com o mesmo tempId voltar do servidor (receiveMessage).
    set((state) => {
      const existing = state.messagesByChannel[channelId] ?? [];
      const optimisticMessage: Message = {
        id: tempId,
        channelId,
        authorId: user.id,
        authorUsername: user.username,
        content: trimmed,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      return {
        messagesByChannel: { ...state.messagesByChannel, [channelId]: [...existing, optimisticMessage] },
      };
    });

    getSocket()?.emit("send-message", { channelId, content: trimmed, tempId });
  },

  markMessageFailed: ({ tempId }) => {
    if (!tempId) return;

    set((state) => {
      for (const [channelId, messages] of Object.entries(state.messagesByChannel)) {
        const index = messages.findIndex((m) => m.id === tempId);
        if (index === -1) continue;

        const updated = [...messages];
        updated[index] = { ...updated[index], pending: false, failed: true };
        return {
          messagesByChannel: { ...state.messagesByChannel, [channelId]: updated },
        };
      }
      return {};
    });
  },

  joinChannel: (channelId: string) => {
    getSocket()?.emit("join-channel", channelId);
  },

  catchUpAllLoadedChannels: async () => {
    const { messagesByChannel } = get();

    await Promise.all(
      Object.entries(messagesByChannel).map(async ([channelId, messages]) => {
        const lastConfirmed = [...messages].reverse().find((m) => !m.pending);
        if (!lastConfirmed) return;

        const { data: missed } = await api.get<Message[]>(`/channels/${channelId}/messages`, {
          params: { since: lastConfirmed.createdAt },
        });
        if (missed.length === 0) return;

        set((state) => {
          const current = state.messagesByChannel[channelId] ?? [];
          const knownIds = new Set(current.map((m) => m.id));
          const toAppend = missed.filter((m) => !knownIds.has(m.id));
          if (toAppend.length === 0) return {};

          return {
            messagesByChannel: {
              ...state.messagesByChannel,
              [channelId]: [...current, ...toAppend],
            },
          };
        });
      })
    );
  },
}));
