import { useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { useChatSocket } from "../../hooks/useChatSocket";
import { useWebRTC } from "../../hooks/useWebRTC";
import { SidebarServers } from "../sidebar/SidebarServers";
import { SidebarChannels } from "../sidebar/SidebarChannels";
import { ChatArea } from "../chat/ChatArea";
import { VoiceRoomArea } from "../voice/VoiceRoomArea";

export function AppLayout() {
  const fetchServers = useAppStore((state) => state.fetchServers);
  const servers = useAppStore((state) => state.servers);
  const isLoadingServers = useAppStore((state) => state.isLoadingServers);
  const currentChannel = useAppStore((state) => state.currentChannel());

  // Ordem importa: o socket precisa existir (useChatSocket) antes de useWebRTC
  // registrar seus listeners de sinalização.
  useChatSocket();
  useWebRTC();

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-discord-bg-dark">
      <SidebarServers />

      {isLoadingServers && servers.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-discord-text-muted">
          Carregando...
        </div>
      ) : servers.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <SidebarChannels />
          {currentChannel?.type === "voice" ? <VoiceRoomArea /> : <ChatArea />}
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-discord-text-muted">
      <p className="text-lg text-white">Você ainda não está em nenhum servidor.</p>
      <p className="text-sm">Clique no botão "+" na barra lateral para criar o seu primeiro.</p>
    </div>
  );
}
