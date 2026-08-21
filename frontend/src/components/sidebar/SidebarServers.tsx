import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { CompassIcon, DiscordiaLogo, PlusIcon } from "../icons/Icons";

export function SidebarServers() {
  const servers = useAppStore((state) => state.servers);
  const currentServerId = useAppStore((state) => state.currentServerId);
  const selectServer = useAppStore((state) => state.selectServer);
  const createServer = useAppStore((state) => state.createServer);
  const joinServerById = useAppStore((state) => state.joinServerById);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  async function handleCreateServer() {
    const name = window.prompt("Nome do novo servidor:");
    if (!name || !name.trim()) return;
    setIsCreating(true);
    try {
      await createServer(name.trim());
    } finally {
      setIsCreating(false);
    }
  }

  async function handleJoinServer() {
    const serverId = window.prompt(
      "Cole o ID do servidor que você quer entrar (peça para quem já está nele copiar o ID no cabeçalho dos canais):"
    );
    if (!serverId || !serverId.trim()) return;
    setIsJoining(true);
    try {
      await joinServerById(serverId.trim());
    } catch {
      window.alert("Não foi possível entrar nesse servidor. Confira se o ID está correto.");
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <nav className="flex h-full w-[72px] flex-shrink-0 flex-col items-center gap-2 bg-discord-bg-darkest py-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-discord-bg">
        <DiscordiaLogo className="h-6 w-6" />
      </div>
      <div className="h-0.5 w-8 flex-shrink-0 rounded-full bg-discord-bg" />

      {servers.map((server) => {
        const isActive = server.id === currentServerId;
        return (
          <button
            key={server.id}
            onClick={() => selectServer(server.id)}
            title={server.name}
            className={`group relative flex h-12 w-12 items-center justify-center transition-all ${
              isActive ? "rounded-2xl" : "rounded-3xl hover:rounded-2xl"
            }`}
          >
            <span
              className={`absolute -left-3 h-0 w-1 rounded-r-full bg-white transition-all ${
                isActive ? "h-5" : "group-hover:h-2"
              }`}
            />
            <span
              className={`flex h-full w-full items-center justify-center rounded-[inherit] font-medium text-white transition-colors ${
                isActive
                  ? "bg-discord-blurple"
                  : "bg-discord-bg text-discord-green group-hover:bg-discord-blurple group-hover:text-white"
              }`}
            >
              {server.iconLetter}
            </span>
          </button>
        );
      })}

      <button
        onClick={handleCreateServer}
        disabled={isCreating}
        title="Adicionar servidor"
        className="flex h-12 w-12 items-center justify-center rounded-3xl bg-discord-bg text-discord-green transition-all hover:rounded-2xl hover:bg-discord-green hover:text-white disabled:opacity-60"
      >
        <PlusIcon className="h-6 w-6" />
      </button>

      <button
        onClick={handleJoinServer}
        disabled={isJoining}
        title="Entrar em um servidor com ID"
        className="flex h-12 w-12 items-center justify-center rounded-3xl bg-discord-bg text-discord-blurple transition-all hover:rounded-2xl hover:bg-discord-blurple hover:text-white disabled:opacity-60"
      >
        <CompassIcon className="h-6 w-6" />
      </button>
    </nav>
  );
}
