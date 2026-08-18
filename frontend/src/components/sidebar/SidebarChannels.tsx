import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { useVoiceStore } from "../../store/useVoiceStore";
import { colorFromId } from "../../lib/color";
import { CopyIcon, HashIcon, SpeakerIcon } from "../icons/Icons";
import { ControlPanel } from "../controls/ControlPanel";

export function SidebarChannels() {
  const currentServer = useAppStore((state) => state.currentServer());
  const currentChannelId = useAppStore((state) => state.currentChannelId);
  const selectChannel = useAppStore((state) => state.selectChannel);
  const [copied, setCopied] = useState(false);

  const textChannels = currentServer?.channels.filter((c) => c.type === "text") ?? [];
  const voiceChannels = currentServer?.channels.filter((c) => c.type === "voice") ?? [];

  async function handleCopyServerId() {
    if (!currentServer) return;
    await navigator.clipboard.writeText(currentServer.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <aside className="flex h-full w-60 flex-shrink-0 flex-col bg-discord-bg-dark">
      <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-discord-border px-4 shadow-sm">
        <h1 className="truncate font-semibold text-white">
          {currentServer?.name ?? "Selecione um servidor"}
        </h1>
        {currentServer && (
          <button
            onClick={handleCopyServerId}
            title="Copiar ID do servidor (para convidar alguém)"
            className="flex-shrink-0 text-discord-text-dim transition-colors hover:text-discord-text"
          >
            {copied ? (
              <span className="text-xs text-discord-green">Copiado!</span>
            ) : (
              <CopyIcon className="h-4 w-4" />
            )}
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {textChannels.length > 0 && (
          <ChannelGroup title="Canais de texto">
            {textChannels.map((channel) => (
              <ChannelItem
                key={channel.id}
                icon={<HashIcon className="h-5 w-5" />}
                name={channel.name}
                isActive={channel.id === currentChannelId}
                onClick={() => selectChannel(channel.id)}
              />
            ))}
          </ChannelGroup>
        )}

        {voiceChannels.length > 0 && (
          <ChannelGroup title="Canais de voz">
            {voiceChannels.map((channel) => (
              <VoiceChannelItem
                key={channel.id}
                channelId={channel.id}
                name={channel.name}
                isActive={channel.id === currentChannelId}
                onClick={() => selectChannel(channel.id)}
              />
            ))}
          </ChannelGroup>
        )}
      </div>

      <ControlPanel />
    </aside>
  );
}

function ChannelGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-discord-text-dim">
        {title}
      </h2>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ChannelItem({
  icon,
  name,
  isActive,
  onClick,
}: {
  icon: React.ReactNode;
  name: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium transition-colors ${
        isActive
          ? "bg-discord-bg-lighter text-white"
          : "text-discord-text-muted hover:bg-discord-bg-light hover:text-discord-text"
      }`}
    >
      <span className="text-discord-text-dim">{icon}</span>
      <span className="truncate">{name}</span>
    </button>
  );
}

function VoiceChannelItem({
  channelId,
  name,
  isActive,
  onClick,
}: {
  channelId: string;
  name: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const presence = useVoiceStore((state) => state.presenceByChannel[channelId]);
  const connected = presence ?? [];

  return (
    <div>
      <button
        onClick={onClick}
        className={`flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium transition-colors ${
          isActive
            ? "bg-discord-bg-lighter text-white"
            : "text-discord-text-muted hover:bg-discord-bg-light hover:text-discord-text"
        }`}
      >
        <span className="text-discord-text-dim">
          <SpeakerIcon className="h-5 w-5" />
        </span>
        <span className="truncate">{name}</span>
      </button>

      {connected.length > 0 && (
        <div className="ml-6 mt-0.5 space-y-0.5">
          {connected.map((person) => (
            <div key={person.socketId} className="flex items-center gap-1.5 px-2 py-1">
              <span
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white"
                style={{ backgroundColor: colorFromId(person.userId) }}
              >
                {person.username.slice(0, 2).toUpperCase()}
              </span>
              <span className="truncate text-xs text-discord-text-muted">{person.username}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
