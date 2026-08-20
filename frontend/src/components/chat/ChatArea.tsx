import { useEffect, useState, type FormEvent } from "react";
import { useAppStore } from "../../store/useAppStore";
import { useChatStore } from "../../store/useChatStore";
import { HashIcon, MenuIcon, SendIcon } from "../icons/Icons";
import { MessageList } from "./MessageList";
import type { Message } from "../../types";

const EMPTY_MESSAGES: Message[] = [];

export function ChatArea({ onOpenMenu }: { onOpenMenu: () => void }) {
  const currentChannel = useAppStore((state) => state.currentChannel());
  const channelId = currentChannel?.id ?? null;

  const messages = useChatStore((state) =>
    channelId ? (state.messagesByChannel[channelId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES
  );
  const loadHistory = useChatStore((state) => state.loadHistory);
  const joinChannel = useChatStore((state) => state.joinChannel);
  const sendMessage = useChatStore((state) => state.sendMessage);

  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!channelId) return;
    joinChannel(channelId);
    loadHistory(channelId);
  }, [channelId, joinChannel, loadHistory]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!channelId || !draft.trim()) return;
    sendMessage(channelId, draft);
    setDraft("");
  }

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-discord-bg">
      <header className="flex h-12 flex-shrink-0 items-center gap-2 border-b border-discord-border px-4 shadow-sm">
        <button
          onClick={onOpenMenu}
          title="Abrir menu"
          aria-label="Abrir menu"
          className="-ml-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded text-discord-text-muted hover:bg-discord-bg-light hover:text-discord-text md:hidden"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <HashIcon className="h-5 w-5 text-discord-text-dim" />
        <h2 className="font-semibold text-white">{currentChannel?.name ?? "canal"}</h2>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto px-4">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-discord-bg-light">
              <HashIcon className="h-8 w-8 text-discord-text-dim" />
            </div>
            <h3 className="text-2xl font-bold text-white">
              Bem-vindo(a) a #{currentChannel?.name ?? "canal"}!
            </h3>
            <p className="max-w-sm text-sm text-discord-text-muted">
              Este é o início do canal. Envie a primeira mensagem!
            </p>
          </div>
        ) : (
          <MessageList messages={messages} />
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex-shrink-0 px-4 pb-6">
        <div className="flex items-center gap-3 rounded-lg bg-discord-bg-light px-4 py-2.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Conversar em #${currentChannel?.name ?? "canal"}`}
            className="flex-1 bg-transparent text-sm text-discord-text placeholder-discord-text-dim outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="text-discord-text-dim transition-colors hover:text-discord-text disabled:opacity-40"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </div>
      </form>
    </section>
  );
}
