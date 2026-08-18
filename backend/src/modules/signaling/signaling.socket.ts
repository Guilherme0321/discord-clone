import { Server as SocketIOServer } from "socket.io";
import { AppSocket } from "../../shared/socket-types";

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

export function registerVoiceSignaling(io: SocketIOServer): void {
  io.on("connection", (rawSocket) => {
    const socket = rawSocket as AppSocket;

    socket.on("join-voice-channel", (channelId: string) => {
      const room = voiceRoom(channelId);
      const participants = listParticipants(io, room);

      socket.join(room);
      socket.data.voiceChannelId = channelId;

      socket.emit("voice-participants", participants);
      socket.to(room).emit("voice-user-joined", {
        socketId: socket.id,
        userId: socket.data.userId,
        username: socket.data.username,
      } satisfies VoiceParticipant);
    });

    socket.on("leave-voice-channel", (channelId: string) => {
      leaveVoiceChannel(socket, channelId);
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
      if (socket.data.voiceChannelId) {
        leaveVoiceChannel(socket, socket.data.voiceChannelId);
      }
    });
  });
}

function voiceRoom(channelId: string): string {
  return `voice:${channelId}`;
}

function listParticipants(io: SocketIOServer, room: string): VoiceParticipant[] {
  const socketIds = io.sockets.adapter.rooms.get(room);
  if (!socketIds) return [];

  const participants: VoiceParticipant[] = [];
  for (const socketId of socketIds) {
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
