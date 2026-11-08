/** Strichsymbole der Founder-Leiste (24er Raster, wie im Entwurf). Reine Zierde: der Name steht daneben. */
const PATHS: Record<string, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  align: (
    <>
      <circle cx="9" cy="12" r="5" />
      <circle cx="15" cy="12" r="5" />
    </>
  ),
  find: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.5-4.5" />
    </>
  ),
  connect: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="12" cy="18" r="2.5" />
      <path d="M7.5 8l3.5 7.5M16.5 8 13 15.5M8.5 6h7" />
    </>
  ),
  events: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  messages: <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />,
  customize: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
  discover: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
    </>
  ),
  problems: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4M12 16.5h.01" />
    </>
  ),
  ventures: (
    <>
      <rect x="3.5" y="8" width="17" height="12" rx="2" />
      <path d="M9 8V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V8M3.5 13h17" />
    </>
  ),
  contacts: (
    <>
      <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
      <circle cx="12" cy="10" r="2.5" />
      <path d="M8 16.5a4 4 0 0 1 8 0" />
    </>
  ),
  mine: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  more: <path d="M4 7h16M4 12h16M4 17h16" />,
  bell: (
    <>
      <path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z" />
      <path d="M10 21h4" />
    </>
  ),
  dot: <circle cx="12" cy="12" r="2.5" />,
};

export function FounderIcon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className ?? ""}`}>
      {PATHS[name] ?? PATHS.dot}
    </svg>
  );
}
