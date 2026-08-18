import { create } from "zustand";
import { api } from "../lib/api";
import type { Channel, Server } from "../types";

interface AppState {
  servers: Server[];
  currentServerId: string | null;
  currentChannelId: string | null;
  isLoadingServers: boolean;

  fetchServers: () => Promise<void>;
  createServer: (name: string) => Promise<void>;
  joinServerById: (serverId: string) => Promise<void>;
  selectServer: (serverId: string) => void;
  selectChannel: (channelId: string) => void;

  currentServer: () => Server | null;
  currentChannel: () => Channel | null;
}

export const useAppStore = create<AppState>()((set, get) => ({
  servers: [],
  currentServerId: null,
  currentChannelId: null,
  isLoadingServers: false,

  fetchServers: async () => {
    set({ isLoadingServers: true });
    try {
      const { data } = await api.get<Server[]>("/servers");
      set((state) => {
        const firstServer = data[0] ?? null;
        const firstTextChannel = firstServer?.channels.find((c) => c.type === "text") ?? null;
        const shouldSelectDefaults = !state.currentServerId && firstServer;
        return {
          servers: data,
          currentServerId: shouldSelectDefaults ? firstServer!.id : state.currentServerId,
          currentChannelId: shouldSelectDefaults
            ? (firstTextChannel?.id ?? null)
            : state.currentChannelId,
        };
      });
    } finally {
      set({ isLoadingServers: false });
    }
  },

  createServer: async (name: string) => {
    const { data } = await api.post<Server>("/servers", { name });
    set((state) => ({ servers: [...state.servers, data] }));
    get().selectServer(data.id);
  },

  joinServerById: async (serverId: string) => {
    const { data } = await api.post<Server>(`/servers/${serverId.trim()}/join`);
    set((state) => {
      const alreadyIn = state.servers.some((s) => s.id === data.id);
      return {
        servers: alreadyIn
          ? state.servers.map((s) => (s.id === data.id ? data : s))
          : [...state.servers, data],
      };
    });
    get().selectServer(data.id);
  },

  selectServer: (serverId: string) => {
    const server = get().servers.find((s) => s.id === serverId);
    const firstTextChannel = server?.channels.find((c) => c.type === "text") ?? null;
    set({ currentServerId: serverId, currentChannelId: firstTextChannel?.id ?? null });
  },

  selectChannel: (channelId: string) => {
    set({ currentChannelId: channelId });
  },

  currentServer: () => {
    const state = get();
    return state.servers.find((s) => s.id === state.currentServerId) ?? null;
  },

  currentChannel: () => {
    const state = get();
    const server = state.servers.find((s) => s.id === state.currentServerId);
    return server?.channels.find((c) => c.id === state.currentChannelId) ?? null;
  },
}));
