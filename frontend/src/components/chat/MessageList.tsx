import { useEffect, useRef } from "react";
import type { Message } from "../../types";
import { colorFromId } from "../../lib/color";

function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageList({ messages }: { messages: Message[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <div className="flex flex-col gap-3 py-4">
      {messages.map((message, index) => {
        const previous = messages[index - 1];
        const isGrouped = previous && previous.authorId === message.authorId;

        return (
          <div
            key={message.id}
            className={`group flex gap-3 rounded px-2 hover:bg-discord-bg-darkest/40 ${
              isGrouped ? "mt-0" : "mt-2"
            } ${message.pending ? "opacity-50" : ""}`}
          >
            {isGrouped ? (
              <div className="w-10 flex-shrink-0" />
            ) : (
              <div
                className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: colorFromId(message.authorId) }}
              >
                {message.authorUsername.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              {!isGrouped && (
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-white">
                    {message.authorUsername}
                  </span>
                  <span className="text-xs text-discord-text-dim">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
              )}
              <p
                className={`whitespace-pre-wrap break-words text-sm ${
                  message.failed ? "text-discord-red" : "text-discord-text"
                }`}
              >
                {message.content}
              </p>
              {message.failed && (
                <span className="text-xs text-discord-red">Falha ao enviar</span>
              )}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
