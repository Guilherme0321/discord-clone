import { useEffect, useState } from "react";
import { useConnectionStore } from "../../store/useConnectionStore";

const OFFLINE_THRESHOLD_MS = 10000;

export function ConnectionStatusBanner() {
  const status = useConnectionStore((state) => state.status);
  const lastDisconnectedAt = useConnectionStore((state) => state.lastDisconnectedAt);

  // socket.io tenta reconectar indefinidamente (reconnectionAttempts:
  // Infinity, ver lib/socket.ts) — não existe um evento de "desisti" pra
  // virar "offline" sozinho. Em vez disso, deriva daqui: se está tentando
  // reconectar há mais que OFFLINE_THRESHOLD_MS, mostra "Offline" em vez de
  // "Reconectando" (mesmo estado por baixo, rótulo diferente pro usuário).
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status !== "reconnecting") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [status]);

  if (status === "online") return null;

  const isLongOffline =
    status === "reconnecting" && lastDisconnectedAt !== null && now - lastDisconnectedAt > OFFLINE_THRESHOLD_MS;

  const { label, className } = getPresentation(status, isLongOffline);

  return (
    <div
      className={`fixed inset-x-0 top-0 z-50 flex h-7 items-center justify-center gap-2 text-xs font-medium text-white ${className}`}
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
      {label}
    </div>
  );
}

function getPresentation(
  status: "connecting" | "reconnecting" | "offline",
  isLongOffline: boolean
): { label: string; className: string } {
  if (status === "connecting") {
    return { label: "Conectando...", className: "bg-discord-blurple" };
  }
  if (status === "reconnecting" && !isLongOffline) {
    return { label: "Reconectando...", className: "bg-discord-yellow text-discord-bg-darkest" };
  }
  return { label: "Offline — tentando reconectar", className: "bg-discord-red" };
}
