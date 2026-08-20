import { useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { useChatSocket } from "../../hooks/useChatSocket";
import { useWebRTC } from "../../hooks/useWebRTC";
import { SidebarServers } from "../sidebar/SidebarServers";
import { SidebarChannels } from "../sidebar/SidebarChannels";
import { ChatArea } from "../chat/ChatArea";
import { VoiceRoomArea } from "../voice/VoiceRoomArea";
import { MenuIcon } from "../icons/Icons";

export function AppLayout() {
  const fetchServers = useAppStore((state) => state.fetchServers);
  const servers = useAppStore((state) => state.servers);
  const isLoadingServers = useAppStore((state) => state.isLoadingServers);
  const currentChannel = useAppStore((state) => state.currentChannel());
  const isMobileNavOpen = useAppStore((state) => state.isMobileNavOpen);
  const closeMobileNav = useAppStore((state) => state.closeMobileNav);
  const toggleMobileNav = useAppStore((state) => state.toggleMobileNav);

  // Ordem importa: o socket precisa existir (useChatSocket) antes de useWebRTC
  // registrar seus listeners de sinalização.
  useChatSocket();
  useWebRTC();

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-discord-bg-dark">
      {/* Backdrop do drawer — só existe (e captura clique) abaixo do breakpoint md */}
      {isMobileNavOpen && (
        <div
          onClick={closeMobileNav}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          aria-hidden="true"
        />
      )}

      {/* Em telas largas (md+) isto é só um flex item normal; abaixo de md
          vira um drawer off-canvas que desliza sobre o conteúdo. */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex h-full transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0 ${
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarServers />
        {servers.length > 0 && <SidebarChannels />}
      </div>

      {isLoadingServers && servers.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-discord-text-muted">
          Carregando...
        </div>
      ) : servers.length === 0 ? (
        <EmptyState onOpenMenu={toggleMobileNav} />
      ) : currentChannel?.type === "voice" ? (
        <VoiceRoomArea onOpenMenu={toggleMobileNav} />
      ) : (
        <ChatArea onOpenMenu={toggleMobileNav} />
      )}
    </div>
  );
}

function EmptyState({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-2 text-center text-discord-text-muted">
      <button
        onClick={onOpenMenu}
        title="Abrir menu"
        aria-label="Abrir menu"
        className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded text-discord-text-muted hover:bg-discord-bg-light hover:text-discord-text md:hidden"
      >
        <MenuIcon className="h-5 w-5" />
      </button>
      <p className="text-lg text-white">Você ainda não está em nenhum servidor.</p>
      <p className="text-sm">Clique no botão "+" na barra lateral para criar o seu primeiro.</p>
    </div>
  );
}
