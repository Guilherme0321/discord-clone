import { Server as SocketIOServer } from "socket.io";
import { AppSocket } from "../../shared/socket-types";
import { IChannelRepository } from "../channels/channel.repository";

interface VoiceParticipant {
  socketId: string;
  userId: string;
  username: string;
}

interface WebRTCOfferPayload {
  targetSocketId: string;
  offer: RTCSessionDescriptionLike;
}

interface WebRTCAnswerPayload {
  targetSocketId: string;
  answer: RTCSessionDescriptionLike;
}

interface WebRTCIceCandidatePayload {
  targetSocketId: string;
  candidate: unknown;
}

type RTCSessionDescriptionLike = unknown;

// Quanto tempo esperar, depois de uma queda de socket, antes de considerar
// que o usuário realmente saiu do canal de voz. Cobre o caso comum de F5 /
// blip de rede: se ele reconectar e reentrar no mesmo canal dentro dessa
// janela, a saída nunca é anunciada aos outros — só o socketId é trocado por
// baixo dos panos (evento voice-user-reconnected).
const VOICE_GRACE_PERIOD_MS = 5000;

// Mapa em memória: canal de voz -> quem está conectado nele. É a fonte da
// verdade usada tanto para responder "quem já está aqui" a quem entra quanto
// para alimentar a lista de presença exibida na sidebar (voice-channel-update),
// que é enviada para todo mundo no servidor — não só para quem já está na chamada.
const voicePresenceByChannel = new Map<string, Map<string, VoiceParticipant>>();

// Saídas de canal de voz aguardando o grace period, uma por (canal, usuário).
const pendingLeaves = new Map<string, { timer: NodeJS.Timeout; oldSocketId: string }>();

function pendingLeaveKey(channelId: string, userId: string): string {
  return `${channelId}:${userId}`;
}

export function registerVoiceSignaling(io: SocketIOServer, channelRepository: IChannelRepository): void {
  async function broadcastPresence(channelId: string): Promise<void> {
    const channel = await channelRepository.findById(channelId);
    if (!channel) return;

    const participants = Array.from(voicePresenceByChannel.get(channelId)?.values() ?? []);
    io.to(serverRoom(channel.serverId)).emit("voice-channel-update", {
      channelId,
      participants,
    });
  }

  function addPresence(channelId: string, participant: VoiceParticipant): void {
    if (!voicePresenceByChannel.has(channelId)) {
      voicePresenceByChannel.set(channelId, new Map());
    }
    voicePresenceByChannel.get(channelId)!.set(participant.socketId, participant);
  }

  function removePresence(channelId: string, socketId: string): void {
    voicePresenceByChannel.get(channelId)?.delete(socketId);
  }

  io.on("connection", (rawSocket) => {
    const socket = rawSocket as AppSocket;

    // Entrar na "sala" do servidor permite receber atualizações de presença de
    // TODOS os canais de voz daquele servidor, mesmo sem estar conectado a
    // nenhum deles — é o que a sidebar de canais precisa para listar quem está
    // em cada canal de voz em tempo real.
    socket.on("join-server", async (serverId: string) => {
      leaveAllServerRooms(socket);
      socket.join(serverRoom(serverId));
      socket.data.serverId = serverId;

      const channels = await channelRepository.listByServer(serverId);
      for (const channel of channels.filter((c) => c.type === "voice")) {
        socket.emit("voice-channel-update", {
          channelId: channel.id,
          participants: Array.from(voicePresenceByChannel.get(channel.id)?.values() ?? []),
        });
      }
    });

    socket.on("join-voice-channel", (channelId: string) => {
      const room = voiceRoom(channelId);
      const key = pendingLeaveKey(channelId, socket.data.userId);
      const pending = pendingLeaves.get(key);

      socket.join(room);
      socket.data.voiceChannelId = channelId;

      // Reconexão dentro do grace period: mesmo userId, socketId novo. Não é
      // uma entrada nova — é a mesma sessão continuando. Os outros nunca
      // souberam que ele saiu, então não recebem "joined" de novo (isso
      // criaria um segundo participante fantasma); só um aviso pontual para
      // trocarem o RTCPeerConnection antigo (morto) pelo novo socketId.
      if (pending) {
        clearTimeout(pending.timer);
        pendingLeaves.delete(key);
        removePresence(channelId, pending.oldSocketId);

        socket.emit("voice-participants", listParticipants(io, room, socket.id));
        socket.to(room).emit("voice-user-reconnected", {
          oldSocketId: pending.oldSocketId,
          newSocketId: socket.id,
          userId: socket.data.userId,
          username: socket.data.username,
        });
      } else {
        socket.emit("voice-participants", listParticipants(io, room, socket.id));
        socket.to(room).emit("voice-user-joined", {
          socketId: socket.id,
          userId: socket.data.userId,
          username: socket.data.username,
        } satisfies VoiceParticipant);
      }

      addPresence(channelId, {
        socketId: socket.id,
        userId: socket.data.userId,
        username: socket.data.username,
      });
      void broadcastPresence(channelId);
    });

    socket.on("leave-voice-channel", (channelId: string) => {
      // Saída explícita (botão "Desconectar") — sem grace period, é intencional.
      leaveVoiceChannel(socket, channelId);
      removePresence(channelId, socket.id);
      void broadcastPresence(channelId);
    });

    socket.on("webrtc-offer", ({ targetSocketId, offer }: WebRTCOfferPayload) => {
      io.to(targetSocketId).emit("webrtc-offer", {
        fromSocketId: socket.id,
        userId: socket.data.userId,
        username: socket.data.username,
        offer,
      });
    });

    socket.on("webrtc-answer", ({ targetSocketId, answer }: WebRTCAnswerPayload) => {
      io.to(targetSocketId).emit("webrtc-answer", {
        fromSocketId: socket.id,
        answer,
      });
    });

    socket.on(
      "webrtc-ice-candidate",
      ({ targetSocketId, candidate }: WebRTCIceCandidatePayload) => {
        io.to(targetSocketId).emit("webrtc-ice-candidate", {
          fromSocketId: socket.id,
          candidate,
        });
      }
    );

    // Sinalização explícita de início/fim de compartilhamento de tela: o encerramento
    // de uma track via removeTrack não garante um evento confiável no lado remoto
    // (a track fica "muted", não "ended"), então avisamos a sala diretamente.
    socket.on("screen-share-state", ({ isSharing }: { isSharing: boolean }) => {
      const channelId = socket.data.voiceChannelId;
      if (!channelId) return;
      socket.to(voiceRoom(channelId)).emit("screen-share-state", {
        socketId: socket.id,
        isSharing,
      });
    });

    socket.on("disconnect", () => {
      const channelId = socket.data.voiceChannelId;
      if (!channelId) return;

      const key = pendingLeaveKey(channelId, socket.data.userId);
      const oldSocketId = socket.id;

      // Não anuncia a saída na hora — dá um tempo para uma possível
      // reconexão (F5, blip de wifi) chegar e retomar a sessão sem que
      // ninguém tenha visto o "sumiço".
      const timer = setTimeout(() => {
        pendingLeaves.delete(key);
        removePresence(channelId, oldSocketId);
        io.to(voiceRoom(channelId)).emit("voice-user-left", { socketId: oldSocketId });
        void broadcastPresence(channelId);
      }, VOICE_GRACE_PERIOD_MS);

      pendingLeaves.set(key, { timer, oldSocketId });
    });
  });
}

function voiceRoom(channelId: string): string {
  return `voice:${channelId}`;
}

function serverRoom(serverId: string): string {
  return `server:${serverId}`;
}

function listParticipants(io: SocketIOServer, room: string, excludeSocketId: string): VoiceParticipant[] {
  const socketIds = io.sockets.adapter.rooms.get(room);
  if (!socketIds) return [];

  const participants: VoiceParticipant[] = [];
  for (const socketId of socketIds) {
    if (socketId === excludeSocketId) continue;
    const peer = io.sockets.sockets.get(socketId) as AppSocket | undefined;
    if (peer) {
      participants.push({ socketId, userId: peer.data.userId, username: peer.data.username });
    }
  }
  return participants;
}

function leaveVoiceChannel(socket: AppSocket, channelId: string): void {
  const room = voiceRoom(channelId);
  socket.leave(room);
  socket.data.voiceChannelId = undefined;
  socket.to(room).emit("voice-user-left", { socketId: socket.id });
}

function leaveAllServerRooms(socket: AppSocket): void {
  for (const room of socket.rooms) {
    if (room.startsWith("server:")) {
      socket.leave(room);
    }
  }
}
