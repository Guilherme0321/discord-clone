import { useAuthStore } from "../../store/useAuthStore";
import { useVoiceStore } from "../../store/useVoiceStore";
import { HeadphoneIcon, MicIcon, SettingsIcon } from "../icons/Icons";

export function ControlPanel() {
  const user = useAuthStore((state) => state.user);
  const joinedChannelId = useVoiceStore((state) => state.joinedChannelId);
  const isMuted = useVoiceStore((state) => state.isMuted);
  const isDeafened = useVoiceStore((state) => state.isDeafened);
  const toggleMute = useVoiceStore((state) => state.toggleMute);
  const toggleDeafen = useVoiceStore((state) => state.toggleDeafen);

  if (!user) return null;

  const inCall = joinedChannelId !== null;

  return (
    <footer className="flex h-[52px] flex-shrink-0 items-center gap-2 bg-discord-bg-darkest px-2">
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ backgroundColor: user.avatarColor }}
      >
        {user.username.slice(0, 2).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{user.username}</p>
        <p className="truncate text-xs text-discord-text-dim">
          {inCall ? "Em chamada de voz" : "Online"}
        </p>
      </div>

      <button
        onClick={toggleMute}
        disabled={!inCall}
        title={isMuted ? "Ativar microfone" : "Silenciar microfone"}
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
        className={`flex h-8 w-8 items-center justify-center rounded hover:bg-discord-bg-light disabled:opacity-40 ${
          isDeafened ? "text-discord-red" : "text-discord-text-muted"
        }`}
      >
        <HeadphoneIcon className="h-[18px] w-[18px]" off={isDeafened} />
      </button>

      <button
        title="Configurações"
        className="flex h-8 w-8 items-center justify-center rounded text-discord-text-muted hover:bg-discord-bg-light"
      >
        <SettingsIcon className="h-[18px] w-[18px]" />
      </button>
    </footer>
  );
}
