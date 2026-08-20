import { useAuthStore } from "../../store/useAuthStore";
import { useVoiceStore } from "../../store/useVoiceStore";
import { useConnectionStore } from "../../store/useConnectionStore";
import { HeadphoneIcon, MicIcon, SettingsIcon, StatusDot } from "../icons/Icons";

export function ControlPanel() {
  const user = useAuthStore((state) => state.user);
  const joinedChannelId = useVoiceStore((state) => state.joinedChannelId);
  const isMuted = useVoiceStore((state) => state.isMuted);
  const isDeafened = useVoiceStore((state) => state.isDeafened);
  const toggleMute = useVoiceStore((state) => state.toggleMute);
  const toggleDeafen = useVoiceStore((state) => state.toggleDeafen);
  const connectionStatus = useConnectionStore((state) => state.status);

  if (!user) return null;

  const inCall = joinedChannelId !== null;
  const dotStatus =
    connectionStatus === "online" ? "online" : connectionStatus === "connecting" ? "connecting" : "offline";
  const statusLabel =
    connectionStatus === "online"
      ? inCall
        ? "Em chamada de voz"
        : "Online"
      : connectionStatus === "connecting"
        ? "Conectando..."
        : "Reconectando...";

  return (
    <footer className="flex h-[52px] flex-shrink-0 items-center gap-2 bg-discord-bg-darkest px-2">
      <div className="relative h-8 w-8 flex-shrink-0">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: user.avatarColor }}
        >
          {user.username.slice(0, 2).toUpperCase()}
        </div>
        <StatusDot
          status={dotStatus}
          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 border-2 border-discord-bg-darkest"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{user.username}</p>
        <p className="truncate text-xs text-discord-text-dim">{statusLabel}</p>
      </div>

      <button
        onClick={toggleMute}
        disabled={!inCall}
        title={isMuted ? "Ativar microfone" : "Silenciar microfone"}
        aria-label={isMuted ? "Ativar microfone" : "Silenciar microfone"}
        aria-pressed={isMuted}
        className={`flex h-8 w-8 items-center justify-center rounded hover:bg-discord-bg-light disabled:opacity-40 ${
          isMuted ? "text-discord-red" : "text-discord-text-muted"
        }`}
      >
        <MicIcon className="h-[18px] w-[18px]" off={isMuted} />
      </button>

      <button
        onClick={toggleDeafen}
        disabled={!inCall}
        title={isDeafened ? "Ativar áudio" : "Silenciar áudio"}
        aria-label={isDeafened ? "Ativar áudio" : "Silenciar áudio"}
        aria-pressed={isDeafened}
        className={`flex h-8 w-8 items-center justify-center rounded hover:bg-discord-bg-light disabled:opacity-40 ${
          isDeafened ? "text-discord-red" : "text-discord-text-muted"
        }`}
      >
        <HeadphoneIcon className="h-[18px] w-[18px]" off={isDeafened} />
      </button>

      <button
        title="Configurações"
        aria-label="Configurações"
        className="flex h-8 w-8 items-center justify-center rounded text-discord-text-muted hover:bg-discord-bg-light"
      >
        <SettingsIcon className="h-[18px] w-[18px]" />
      </button>
    </footer>
  );
}
