type IconProps = {
  className?: string;
};

export function DiscordiaLogo({ className }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <defs>
        <linearGradient id="discordia-face" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b79bff" />
          <stop offset="100%" stopColor="#6d3cff" />
        </linearGradient>
      </defs>
      <path
        fill="url(#discordia-face)"
        d="M50 6 L56.5 17.5 L72 12 Q84 12 84 24 L84 62 Q84 78 70 84 L58 90 Q50 95 42 90 L30 84 Q16 78 16 62 L16 24 Q16 12 28 12 L43.5 17.5 Z"
      />
      <circle cx="38.5" cy="50" r="7.5" fill="#1a1030" />
      <circle cx="61.5" cy="50" r="7.5" fill="#1a1030" />
      <path
        stroke="#1a1030"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        d="M39 68 Q50 78 61 68"
      />
    </svg>
  );
}

export function HashIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M10 3.5a.75.75 0 0 0-1.48-.24L7.6 8H4a.75.75 0 0 0 0 1.5h3.35l-.87 5H3a.75.75 0 0 0 0 1.5h3.22l-.71 4.24a.75.75 0 1 0 1.48.24l.76-4.48h4.7l-.71 4.24a.75.75 0 1 0 1.48.24l.76-4.48H18a.75.75 0 0 0 0-1.5h-3.35l.87-5H19a.75.75 0 0 0 0-1.5h-3.22l.71-4.24a.75.75 0 1 0-1.48-.24L14.3 8H9.6l.71-4.24a.75.75 0 0 0-.31-1.26ZM9.35 9.5h4.7l-.87 5h-4.7l.87-5Z" />
    </svg>
  );
}

export function SpeakerIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 3a1 1 0 0 0-1.7-.71L6.59 6H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h2.59l3.7 3.71A1 1 0 0 0 12 21V3Z" />
      <path d="M16.5 8.5a4.95 4.95 0 0 1 0 7M19 6a8.9 8.9 0 0 1 0 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function MicIcon({ className, off }: IconProps & { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" stroke="none" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
      {off && <path d="M3 3l18 18" stroke="#f23f42" strokeWidth="2" />}
    </svg>
  );
}

export function HeadphoneIcon({ className, off }: IconProps & { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <rect x="3" y="13" width="4" height="6" rx="1.5" fill="currentColor" stroke="none" />
      <rect x="17" y="13" width="4" height="6" rx="1.5" fill="currentColor" stroke="none" />
      {off && <path d="M3 3l18 18" stroke="#f23f42" strokeWidth="2" />}
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.32 4.32a1.9 1.9 0 0 1 3.36 0l.2.38a1.9 1.9 0 0 0 2.06 1l.42-.1a1.9 1.9 0 0 1 2.24 2.24l-.1.42a1.9 1.9 0 0 0 1 2.06l.38.2a1.9 1.9 0 0 1 0 3.36l-.38.2a1.9 1.9 0 0 0-1 2.06l.1.42a1.9 1.9 0 0 1-2.24 2.24l-.42-.1a1.9 1.9 0 0 0-2.06 1l-.2.38a1.9 1.9 0 0 1-3.36 0l-.2-.38a1.9 1.9 0 0 0-2.06-1l-.42.1a1.9 1.9 0 0 1-2.24-2.24l.1-.42a1.9 1.9 0 0 0-1-2.06l-.38-.2a1.9 1.9 0 0 1 0-3.36l.38-.2a1.9 1.9 0 0 0 1-2.06l-.1-.42a1.9 1.9 0 0 1 2.24-2.24l.42.1a1.9 1.9 0 0 0 2.06-1l.2-.38Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ScreenShareIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <path d="M9 12l3-3 3 3M12 9v5" />
    </svg>
  );
}

export function CompassIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m14.5 9.5-1.8 4.7a1 1 0 0 1-.6.6L7.5 16.5l1.8-4.7a1 1 0 0 1 .6-.6l4.6-1.7Z" />
    </svg>
  );
}

export function CopyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

export function ExpandIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H3v6M15 3h6v6M21 15v6h-6M3 15v6h6" />
    </svg>
  );
}

export function ShrinkIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3v6H3M15 3v6h6M21 15h-6v6M3 15h6v6" />
    </svg>
  );
}

export function FullscreenIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" />
    </svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

// Indicador de presença sobreposto no canto do avatar. `status` reaproveita
// dados que já existem (useConnectionStore para o próprio usuário, presença
// de canal de voz para os demais) — não introduz um sistema novo de "quem
// está online" no servidor inteiro.
export function StatusDot({
  status,
  className,
}: {
  status: "online" | "connecting" | "offline";
  className?: string;
}) {
  const colorClass =
    status === "online"
      ? "bg-discord-green"
      : status === "connecting"
        ? "bg-discord-yellow"
        : "bg-discord-text-dim";

  return <span className={`block rounded-full ${colorClass} ${className ?? ""}`} />;
}

export function SendIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M3.4 20.6 21 12 3.4 3.4 3 10l12 2-12 2 .4 6.6Z" />
    </svg>
  );
}
