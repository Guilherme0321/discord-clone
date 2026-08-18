import { useEffect } from "react";
import { getSocket } from "../lib/socket";
import { useAppStore } from "../store/useAppStore";
import { useAuthStore } from "../store/useAuthStore";
import { useVoiceStore } from "../store/useVoiceStore";

/**
 * Liga os eventos de sinalização do Socket.io às ações do useVoiceStore.
 * Deve ser chamado uma única vez, em um componente que fica montado durante
 * toda a sessão (ex: AppLayout), para que a chamada de voz sobreviva à troca
 * de canais de texto.
 */
export function useWebRTC() {
  const token = useAuthStore((state) => state.token);
  const currentServerId = useAppStore((state) => state.currentServerId);

  useEffect(() => {
    if (!token) return;

    const socket = getSocket();
    if (!socket) return;

    const store = useVoiceStore.getState();

    socket.on("voice-participants", store.handleParticipants);
    socket.on("voice-user-joined", store.handleUserJoined);
    socket.on("voice-user-left", store.handleUserLeft);
    socket.on("webrtc-offer", store.handleOffer);
    socket.on("webrtc-answer", store.handleAnswer);
    socket.on("webrtc-ice-candidate", store.handleIceCandidate);
    socket.on("screen-share-state", store.handleScreenShareState);
    socket.on("voice-channel-update", store.handleChannelUpdate);

    return () => {
      socket.off("voice-participants", store.handleParticipants);
      socket.off("voice-user-joined", store.handleUserJoined);
      socket.off("voice-user-left", store.handleUserLeft);
      socket.off("webrtc-offer", store.handleOffer);
      socket.off("webrtc-answer", store.handleAnswer);
      socket.off("webrtc-ice-candidate", store.handleIceCandidate);
      socket.off("screen-share-state", store.handleScreenShareState);
      socket.off("voice-channel-update", store.handleChannelUpdate);
    };
  }, [token]);

  // Entra na "sala" do servidor selecionado para receber a presença de voz de
  // todos os seus canais, mesmo sem estar conectado a nenhum deles.
  useEffect(() => {
    if (!token || !currentServerId) return;
    useVoiceStore.getState().joinServer(currentServerId);
  }, [token, currentServerId]);
}
