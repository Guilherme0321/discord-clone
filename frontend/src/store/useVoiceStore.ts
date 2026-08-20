import { create } from "zustand";
import { getSocket } from "../lib/socket";
import { INSECURE_CONTEXT_MESSAGE, isMediaDevicesAvailable } from "../lib/secureContext";

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export interface VoiceParticipant {
  socketId: string;
  userId: string;
  username: string;
  stream: MediaStream | null;
  screenStream: MediaStream | null;
}

export interface ChannelPresenceEntry {
  socketId: string;
  userId: string;
  username: string;
}

interface PeerEntry {
  connection: RTCPeerConnection;
  micStreamId: string | null;
  pendingCandidates: RTCIceCandidateInit[];
  initialNegotiationDone: boolean;
}

// Conexões reais ficam fora do estado do zustand (não são serializáveis / não devem
// disparar re-render por si só). O store expõe apenas os dados derivados p/ UI.
const peers = new Map<string, PeerEntry>();

interface VoiceState {
  joinedChannelId: string | null;
  localStream: MediaStream | null;
  localScreenStream: MediaStream | null;
  isMuted: boolean;
  isDeafened: boolean;
  isSharingScreen: boolean;
  isConnecting: boolean;
  participants: Record<string, VoiceParticipant>;
  // Presença por canal de voz (quem está conectado), independente de o
  // usuário atual estar ou não naquele canal — alimenta a sidebar.
  presenceByChannel: Record<string, ChannelPresenceEntry[]>;

  joinServer: (serverId: string) => void;
  joinVoiceChannel: (channelId: string) => Promise<void>;
  leaveVoiceChannel: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;

  handleParticipants: (list: RemotePeerInfo[]) => Promise<void>;
  handleUserJoined: (info: RemotePeerInfo) => void;
  handleUserLeft: (info: { socketId: string }) => void;
  handleOffer: (payload: OfferPayload) => Promise<void>;
  handleAnswer: (payload: AnswerPayload) => Promise<void>;
  handleIceCandidate: (payload: IceCandidatePayload) => Promise<void>;
  handleScreenShareState: (payload: { socketId: string; isSharing: boolean }) => void;
  handleChannelUpdate: (payload: {
    channelId: string;
    participants: ChannelPresenceEntry[];
  }) => void;
  handleUserReconnected: (payload: {
    oldSocketId: string;
    newSocketId: string;
    userId: string;
    username: string;
  }) => void;
}

interface RemotePeerInfo {
  socketId: string;
  userId: string;
  username: string;
}

interface OfferPayload {
  fromSocketId: string;
  userId: string;
  username: string;
  offer: RTCSessionDescriptionInit;
}

interface AnswerPayload {
  fromSocketId: string;
  answer: RTCSessionDescriptionInit;
}

interface IceCandidatePayload {
  fromSocketId: string;
  candidate: RTCIceCandidateInit;
}

export const useVoiceStore = create<VoiceState>()((set, get) => ({
  joinedChannelId: null,
  localStream: null,
  localScreenStream: null,
  isMuted: false,
  isDeafened: false,
  isSharingScreen: false,
  isConnecting: false,
  participants: {},
  presenceByChannel: {},

  joinServer: (serverId: string) => {
    getSocket()?.emit("join-server", serverId);
  },

  joinVoiceChannel: async (channelId: string) => {
    if (!isMediaDevicesAvailable()) {
      throw new Error(INSECURE_CONTEXT_MESSAGE);
    }

    if (get().joinedChannelId) {
      get().leaveVoiceChannel();
    }

    set({ isConnecting: true });
    const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStream.getAudioTracks().forEach((track) => (track.enabled = !get().isMuted));

    set({ localStream, joinedChannelId: channelId, isConnecting: false });
    getSocket()?.emit("join-voice-channel", channelId);

    registerDeviceChangeListener(set, get);
  },

  leaveVoiceChannel: () => {
    const channelId = get().joinedChannelId;
    if (!channelId) return;

    unregisterDeviceChangeListener();

    getSocket()?.emit("leave-voice-channel", channelId);

    for (const [, entry] of peers) {
      entry.connection.close();
    }
    peers.clear();

    get().localStream?.getTracks().forEach((track) => track.stop());
    get().localScreenStream?.getTracks().forEach((track) => track.stop());

    set({
      joinedChannelId: null,
      localStream: null,
      localScreenStream: null,
      isSharingScreen: false,
      participants: {},
    });
  },

  toggleMute: () => {
    const nextMuted = !get().isMuted;
    get().localStream?.getAudioTracks().forEach((track) => (track.enabled = !nextMuted));
    set({ isMuted: nextMuted });
  },

  toggleDeafen: () => {
    set({ isDeafened: !get().isDeafened });
  },

  startScreenShare: async () => {
    if (!isMediaDevicesAvailable()) {
      throw new Error(INSECURE_CONTEXT_MESSAGE);
    }

    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });

    for (const [, entry] of peers) {
      screenStream.getTracks().forEach((track) => {
        entry.connection.addTrack(track, screenStream);
      });
    }

    screenStream.getVideoTracks()[0]?.addEventListener("ended", () => {
      get().stopScreenShare();
    });

    set({ localScreenStream: screenStream, isSharingScreen: true });
    getSocket()?.emit("screen-share-state", { isSharing: true });
  },

  stopScreenShare: () => {
    const screenStream = get().localScreenStream;
    if (!screenStream) return;

    for (const [, entry] of peers) {
      entry.connection.getSenders().forEach((sender) => {
        if (sender.track && screenStream.getTracks().includes(sender.track)) {
          entry.connection.removeTrack(sender);
        }
      });
    }

    screenStream.getTracks().forEach((track) => track.stop());
    set({ localScreenStream: null, isSharingScreen: false });
    getSocket()?.emit("screen-share-state", { isSharing: false });
  },

  handleParticipants: async (list) => {
    for (const peerInfo of list) {
      const entry = getOrCreatePeerConnection(peerInfo, set, get);
      const offer = await entry.connection.createOffer();
      await entry.connection.setLocalDescription(offer);
      entry.initialNegotiationDone = true;
      getSocket()?.emit("webrtc-offer", { targetSocketId: peerInfo.socketId, offer });
    }
  },

  handleUserJoined: (info) => {
    upsertParticipant(set, info, {});
  },

  handleUserLeft: ({ socketId }) => {
    const entry = peers.get(socketId);
    entry?.connection.close();
    peers.delete(socketId);
    set((state) => {
      const participants = { ...state.participants };
      delete participants[socketId];
      return { participants };
    });
  },

  handleOffer: async ({ fromSocketId, userId, username, offer }) => {
    const entry = getOrCreatePeerConnection({ socketId: fromSocketId, userId, username }, set, get);
    await entry.connection.setRemoteDescription(offer);
    await flushPendingCandidates(entry);

    const answer = await entry.connection.createAnswer();
    await entry.connection.setLocalDescription(answer);
    entry.initialNegotiationDone = true;

    getSocket()?.emit("webrtc-answer", { targetSocketId: fromSocketId, answer });
  },

  handleAnswer: async ({ fromSocketId, answer }) => {
    const entry = peers.get(fromSocketId);
    if (!entry) return;
    await entry.connection.setRemoteDescription(answer);
    await flushPendingCandidates(entry);
  },

  handleIceCandidate: async ({ fromSocketId, candidate }) => {
    const entry = peers.get(fromSocketId);
    if (!entry) return;

    if (entry.connection.remoteDescription) {
      await entry.connection.addIceCandidate(candidate);
    } else {
      entry.pendingCandidates.push(candidate);
    }
  },

  handleScreenShareState: ({ socketId, isSharing }) => {
    if (isSharing) return;
    set((state) => {
      const participant = state.participants[socketId];
      if (!participant) return {};
      return {
        participants: {
          ...state.participants,
          [socketId]: { ...participant, screenStream: null },
        },
      };
    });
  },

  handleChannelUpdate: ({ channelId, participants }) => {
    set((state) => ({
      presenceByChannel: { ...state.presenceByChannel, [channelId]: participants },
    }));
  },

  // O outro lado de uma reconexão dentro do grace period do backend: o
  // socketId do peer mudou, mas é a mesma pessoa. Fecha a conexão antiga
  // (já morta — o outro lado recarregou/reconectou) e migra a entrada em
  // `participants` para a nova chave SEM removê-la, para o tile dele não
  // sumir e reaparecer na tela. A troca efetiva de áudio acontece quando o
  // novo offer chegar (o peer reconectado reoferece para todo mundo ao
  // reentrar), reaproveitando esse mesmo registro via upsertParticipant.
  handleUserReconnected: ({ oldSocketId, newSocketId, userId, username }) => {
    peers.get(oldSocketId)?.connection.close();
    peers.delete(oldSocketId);

    set((state) => {
      const existing = state.participants[oldSocketId];
      if (!existing) return {};

      const participants = { ...state.participants };
      delete participants[oldSocketId];
      participants[newSocketId] = {
        ...existing,
        socketId: newSocketId,
        userId,
        username,
      };
      return { participants };
    });
  },
}));

function getOrCreatePeerConnection(
  peerInfo: RemotePeerInfo,
  set: (partial: Partial<VoiceState> | ((state: VoiceState) => Partial<VoiceState>)) => void,
  get: () => VoiceState
): PeerEntry {
  const existing = peers.get(peerInfo.socketId);
  if (existing) return existing;

  const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const entry: PeerEntry = {
    connection,
    micStreamId: null,
    pendingCandidates: [],
    initialNegotiationDone: false,
  };
  peers.set(peerInfo.socketId, entry);

  const localStream = get().localStream;
  localStream?.getTracks().forEach((track) => connection.addTrack(track, localStream));

  const localScreenStream = get().localScreenStream;
  localScreenStream?.getTracks().forEach((track) => connection.addTrack(track, localScreenStream));

  connection.onicecandidate = (event) => {
    if (event.candidate) {
      getSocket()?.emit("webrtc-ice-candidate", {
        targetSocketId: peerInfo.socketId,
        candidate: event.candidate.toJSON(),
      });
    }
  };

  connection.ontrack = (event) => {
    const [remoteStream] = event.streams;
    if (!remoteStream) return;

    if (entry.micStreamId === null) {
      entry.micStreamId = remoteStream.id;
      upsertParticipant(set, peerInfo, { stream: remoteStream });
    } else if (remoteStream.id !== entry.micStreamId) {
      upsertParticipant(set, peerInfo, { screenStream: remoteStream });
    }
  };

  connection.onnegotiationneeded = async () => {
    if (!entry.initialNegotiationDone) return;
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    getSocket()?.emit("webrtc-offer", { targetSocketId: peerInfo.socketId, offer });
  };

  // Só remove a conexão do mapa quando ela é encerrada DE VERDADE (close()
  // explícito, chamado por nós). 'failed'/'disconnected' não significam
  // "acabou" — são exatamente os estados que o ICE restart abaixo tenta
  // recuperar; apagar a entrada aqui derrubaria a chamada à toa numa simples
  // troca de rede (Wi-Fi -> 4G), que o ICE restart resolveria sozinho.
  connection.onconnectionstatechange = () => {
    if (connection.connectionState === "closed") {
      peers.delete(peerInfo.socketId);
    }
  };

  // Reage a mudanças de rede (troca de Wi-Fi para 4G, VPN ligando/desligando,
  // etc.) sem derrubar a chamada. 'disconnected' costuma ser transitório —
  // dá um tempo pra recuperar sozinho antes de forçar; 'failed' é definitivo
  // e reinicia o ICE na hora. restartIce() dispara 'negotiationneeded'
  // automaticamente, reaproveitando o handler acima.
  let iceRecoveryTimer: ReturnType<typeof setTimeout> | null = null;
  connection.oniceconnectionstatechange = () => {
    const state = connection.iceConnectionState;

    if (state === "connected" || state === "completed") {
      if (iceRecoveryTimer) {
        clearTimeout(iceRecoveryTimer);
        iceRecoveryTimer = null;
      }
      return;
    }

    if (state === "failed") {
      if (iceRecoveryTimer) {
        clearTimeout(iceRecoveryTimer);
        iceRecoveryTimer = null;
      }
      connection.restartIce();
    } else if (state === "disconnected" && !iceRecoveryTimer) {
      iceRecoveryTimer = setTimeout(() => {
        iceRecoveryTimer = null;
        if (["disconnected", "failed"].includes(connection.iceConnectionState)) {
          connection.restartIce();
        }
      }, 3000);
    }
  };

  upsertParticipant(set, peerInfo, {});
  return entry;
}

async function flushPendingCandidates(entry: PeerEntry): Promise<void> {
  for (const candidate of entry.pendingCandidates) {
    await entry.connection.addIceCandidate(candidate);
  }
  entry.pendingCandidates = [];
}

function upsertParticipant(
  set: (partial: Partial<VoiceState> | ((state: VoiceState) => Partial<VoiceState>)) => void,
  peerInfo: RemotePeerInfo,
  patch: Partial<Omit<VoiceParticipant, "socketId" | "userId" | "username">>
): void {
  set((state) => {
    const current = state.participants[peerInfo.socketId];
    return {
      participants: {
        ...state.participants,
        [peerInfo.socketId]: {
          socketId: peerInfo.socketId,
          userId: peerInfo.userId,
          username: peerInfo.username,
          stream: current?.stream ?? null,
          screenStream: current?.screenStream ?? null,
          ...patch,
        },
      },
    };
  });
}

// --- Troca de dispositivo em tempo real (ex: plugar um fone Bluetooth) -----
//
// Só faz sentido escutar isso enquanto há uma chamada ativa, então o
// listener é registrado/removido junto de joinVoiceChannel/leaveVoiceChannel
// em vez de ficar sempre ligado.
let deviceChangeHandler: (() => void) | null = null;

function registerDeviceChangeListener(
  set: (partial: Partial<VoiceState> | ((state: VoiceState) => Partial<VoiceState>)) => void,
  get: () => VoiceState
): void {
  if (deviceChangeHandler) return;
  deviceChangeHandler = () => {
    void handleDeviceChange(set, get);
  };
  navigator.mediaDevices.addEventListener("devicechange", deviceChangeHandler);
}

function unregisterDeviceChangeListener(): void {
  if (!deviceChangeHandler) return;
  navigator.mediaDevices.removeEventListener("devicechange", deviceChangeHandler);
  deviceChangeHandler = null;
}

async function handleDeviceChange(
  set: (partial: Partial<VoiceState> | ((state: VoiceState) => Partial<VoiceState>)) => void,
  get: () => VoiceState
): Promise<void> {
  const currentLocalStream = get().localStream;
  if (!currentLocalStream) return;

  let freshStream: MediaStream;
  try {
    // Sem especificar deviceId, o navegador dá o dispositivo padrão atual —
    // se o usuário plugou um fone Bluetooth e o SO já trocou o padrão, é
    // isso que volta aqui.
    freshStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    // Nenhum dispositivo disponível/permissão perdida — mantém o áudio atual
    // em vez de derrubar a chamada.
    return;
  }

  const newTrack = freshStream.getAudioTracks()[0];
  if (!newTrack) return;

  newTrack.enabled = !get().isMuted;

  // Troca a track em cada RTCPeerConnection ativa via replaceTrack — isso NÃO
  // dispara renegociação nem corta o áudio dos outros participantes, ao
  // contrário de remover e adicionar uma track nova.
  for (const [, entry] of peers) {
    const sender = entry.connection.getSenders().find((s) => s.track?.kind === "audio");
    if (sender) {
      await sender.replaceTrack(newTrack);
    }
  }

  currentLocalStream.getAudioTracks().forEach((track) => track.stop());
  set({ localStream: new MediaStream([newTrack]) });
}
