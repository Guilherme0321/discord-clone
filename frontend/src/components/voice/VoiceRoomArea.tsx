import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useVoiceStore } from "../../store/useVoiceStore";
import { colorFromId } from "../../lib/color";
import {
  ExpandIcon,
  FullscreenIcon,
  HeadphoneIcon,
  MicIcon,
  ScreenShareIcon,
  ShrinkIcon,
  SpeakerIcon,
} from "../icons/Icons";

export function VoiceRoomArea() {
  const currentChannel = useAppStore((state) => state.currentChannel());
  const channelId = currentChannel?.id ?? null;
  const user = useAuthStore((state) => state.user);

  const joinedChannelId = useVoiceStore((state) => state.joinedChannelId);
  const isConnecting = useVoiceStore((state) => state.isConnecting);
  const isMuted = useVoiceStore((state) => state.isMuted);
  const isDeafened = useVoiceStore((state) => state.isDeafened);
  const isSharingScreen = useVoiceStore((state) => state.isSharingScreen);
  const localScreenStream = useVoiceStore((state) => state.localScreenStream);
  const participants = useVoiceStore((state) => state.participants);

  const joinVoiceChannel = useVoiceStore((state) => state.joinVoiceChannel);
  const leaveVoiceChannel = useVoiceStore((state) => state.leaveVoiceChannel);
  const toggleMute = useVoiceStore((state) => state.toggleMute);
  const toggleDeafen = useVoiceStore((state) => state.toggleDeafen);
  const startScreenShare = useVoiceStore((state) => state.startScreenShare);
  const stopScreenShare = useVoiceStore((state) => state.stopScreenShare);

  const [error, setError] = useState<string | null>(null);
  const [largeTileKey, setLargeTileKey] = useState<string | null>(null);
  const isJoinedHere = joinedChannelId === channelId;
  const participantList = Object.values(participants);

  function toggleLargeTile(tileKey: string) {
    setLargeTileKey((current) => (current === tileKey ? null : tileKey));
  }

  async function handleJoin() {
    if (!channelId) return;
    setError(null);
    try {
      await joinVoiceChannel(channelId);
    } catch {
      setError("Não foi possível acessar o microfone. Verifique as permissões do navegador.");
    }
  }

  async function handleToggleScreenShare() {
    setError(null);
    try {
      if (isSharingScreen) {
        stopScreenShare();
      } else {
        await startScreenShare();
      }
    } catch {
      setError("Não foi possível compartilhar a tela.");
    }
  }

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-discord-bg">
      <header className="flex h-12 flex-shrink-0 items-center gap-2 border-b border-discord-border px-4 shadow-sm">
        <SpeakerIcon className="h-5 w-5 text-discord-text-dim" />
        <h2 className="font-semibold text-white">{currentChannel?.name ?? "canal de voz"}</h2>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-8">
        {isJoinedHere && user ? (
          <div className="flex flex-wrap items-start justify-center gap-4">
            <ParticipantTile
              username={user.username}
              avatarColor={user.avatarColor}
              isSelf
              isMuted={isMuted}
            />
            {isSharingScreen && localScreenStream && (
              <ScreenTile
                label={`${user.username} (você)`}
                stream={localScreenStream}
                muted
                isLarge={largeTileKey === "self"}
                onToggleLarge={() => toggleLargeTile("self")}
              />
            )}
            {participantList.map((participant) => (
              <ParticipantTile
                key={participant.socketId}
                username={participant.username}
                avatarColor={colorFromId(participant.userId)}
              />
            ))}
            {participantList
              .filter((p) => p.screenStream)
              .map((participant) => (
                <ScreenTile
                  key={`${participant.socketId}-screen`}
                  label={participant.username}
                  stream={participant.screenStream!}
                  isLarge={largeTileKey === participant.socketId}
                  onToggleLarge={() => toggleLargeTile(participant.socketId)}
                />
              ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-discord-bg-light">
              <SpeakerIcon className="h-8 w-8 text-discord-text-dim" />
            </div>
            <p className="max-w-sm text-sm text-discord-text-muted">
              {participantList.length > 0
                ? `${participantList.length} pessoa(s) neste canal de voz.`
                : "Ninguém está conectado a este canal de voz."}
            </p>
          </div>
        )}

        {error && <p className="text-sm text-discord-red">{error}</p>}

        <div className="flex items-center gap-3">
          {!isJoinedHere ? (
            <button
              onClick={handleJoin}
              disabled={isConnecting}
              className="rounded-md bg-discord-green px-5 py-2.5 font-medium text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {isConnecting ? "Conectando..." : "Entrar no canal de voz"}
            </button>
          ) : (
            <>
              <VoiceControlButton
                icon={<MicIcon className="h-5 w-5" off={isMuted} />}
                label={isMuted ? "Ativar microfone" : "Mutar"}
                active={isMuted}
                onClick={toggleMute}
              />
              <VoiceControlButton
                icon={<HeadphoneIcon className="h-5 w-5" off={isDeafened} />}
                label={isDeafened ? "Ativar áudio" : "Ensurdecer"}
                active={isDeafened}
                onClick={toggleDeafen}
              />
              <VoiceControlButton
                icon={<ScreenShareIcon className="h-5 w-5" />}
                label={isSharingScreen ? "Parar compartilhamento" : "Compartilhar tela"}
                active={isSharingScreen}
                onClick={handleToggleScreenShare}
              />
              <button
                onClick={leaveVoiceChannel}
                className="rounded-md bg-discord-red px-5 py-2.5 font-medium text-white transition hover:brightness-110"
              >
                Desconectar
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function ScreenTile({
  label,
  stream,
  muted,
  isLarge,
  onToggleLarge,
}: {
  label: string;
  stream: MediaStream;
  muted?: boolean;
  isLarge: boolean;
  onToggleLarge: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  function handleFullscreen() {
    videoRef.current?.requestFullscreen();
  }

  return (
    <div className={`flex flex-col gap-1 ${isLarge ? "w-full max-w-4xl" : "w-72"}`}>
      <div className="group relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          onDoubleClick={handleFullscreen}
          className={`cursor-pointer rounded-xl bg-black object-contain ${
            isLarge ? "aspect-video w-full" : "aspect-video w-72"
          }`}
        />
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onToggleLarge}
            title={isLarge ? "Reduzir" : "Ver em tela grande"}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-black/60 text-white"
          >
            {isLarge ? <ShrinkIcon className="h-4 w-4" /> : <ExpandIcon className="h-4 w-4" />}
          </button>
          <button
            onClick={handleFullscreen}
            title="Ver em tela cheia"
            className="flex h-8 w-8 items-center justify-center rounded-md bg-black/60 text-white"
          >
            <FullscreenIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      <span className="truncate text-xs text-discord-text-muted">{label}</span>
    </div>
  );
}

function ParticipantTile({
  username,
  avatarColor,
  isSelf,
  isMuted,
}: {
  username: string;
  avatarColor: string;
  isSelf?: boolean;
  isMuted?: boolean;
}) {
  return (
    <div className="flex h-32 w-40 flex-col items-center justify-center gap-2 rounded-xl bg-discord-bg-dark">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold text-white"
        style={{ backgroundColor: avatarColor }}
      >
        {username.slice(0, 2).toUpperCase()}
      </div>
      <span className="text-sm text-discord-text">
        {username}
        {isSelf ? " (você)" : ""}
        {isMuted ? " 🔇" : ""}
      </span>
    </div>
  );
}

function VoiceControlButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
        active
          ? "bg-discord-red text-white"
          : "bg-discord-bg-light text-discord-text hover:bg-discord-bg-lighter"
      }`}
    >
      {icon}
    </button>
  );
}
