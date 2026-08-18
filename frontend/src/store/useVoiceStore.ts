import { create } from "zustand";
import { getSocket } from "../lib/socket";

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export interface VoiceParticipant {
  socketId: string;
  userId: string;
  username: string;
  stream: MediaStream | null;
  screenStream: MediaStream | null;
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

  joinVoiceChannel: async (channelId: string) => {
    if (get().joinedChannelId) {
      get().leaveVoiceChannel();
    }

    set({ isConnecting: true });
    const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStream.getAudioTracks().forEach((track) => (track.enabled = !get().isMuted));

    set({ localStream, joinedChannelId: channelId, isConnecting: false });
    getSocket()?.emit("join-voice-channel", channelId);
  },

  leaveVoiceChannel: () => {
    const channelId = get().joinedChannelId;
    if (!channelId) return;

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

  connection.onconnectionstatechange = () => {
    if (["failed", "closed", "disconnected"].includes(connection.connectionState)) {
      peers.delete(peerInfo.socketId);
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
