import { useEffect, useRef } from "react";
import { useVoiceStore, type VoiceParticipant } from "../../store/useVoiceStore";

/**
 * Reprodução de áudio dos participantes remotos da chamada de voz.
 *
 * REGRA: precisa ficar montado no nível raiz da aplicação (ver App.tsx), nunca
 * dentro de VoiceRoomArea ou qualquer outra tela que desmonta ao trocar de
 * canal/servidor — senão o áudio para mesmo com a chamada (RTCPeerConnection)
 * continuando ativa no useVoiceStore. A conexão só deve cair quando o usuário
 * clicar em "Desconectar" (useVoiceStore.leaveVoiceChannel) ou fechar a aba.
 */
export function VoiceAudioSinks() {
  const participants = useVoiceStore((state) => state.participants);
  const isDeafened = useVoiceStore((state) => state.isDeafened);
  const participantList = Object.values(participants);

  return (
    <>
      {participantList.map((participant) => (
        <RemoteAudio key={participant.socketId} participant={participant} isDeafened={isDeafened} />
      ))}
    </>
  );
}

function RemoteAudio({
  participant,
  isDeafened,
}: {
  participant: VoiceParticipant;
  isDeafened: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current && participant.stream) {
      audioRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  if (!participant.stream) return null;

  return <audio ref={audioRef} autoPlay muted={isDeafened} className="hidden" />;
}
