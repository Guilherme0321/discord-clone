import { create } from "zustand";

// Transversal a chat e voz — por isso é um store próprio em vez de viver
// dentro de useChatStore ou useVoiceStore. Alimenta o indicador de status
// (item 5) e o gatilho de catch-up de mensagens perdidas (useChatStore).
export type ConnectionStatus = "connecting" | "online" | "reconnecting" | "offline";

interface ConnectionState {
  status: ConnectionStatus;
  lastDisconnectedAt: number | null;
  setStatus: (status: ConnectionStatus) => void;
}

export const useConnectionStore = create<ConnectionState>()((set) => ({
  status: "connecting",
  lastDisconnectedAt: null,
  setStatus: (status) =>
    set((state) => ({
      status,
      lastDisconnectedAt:
        status === "reconnecting" || status === "offline"
          ? (state.lastDisconnectedAt ?? Date.now())
          : status === "online"
            ? null
            : state.lastDisconnectedAt,
    })),
}));
