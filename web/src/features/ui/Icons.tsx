import type { ReactNode } from "react";

/**
 * Schlichte Linien-Symbole fuer die Startseite - direkt im Code, ohne
 * Zusatzpaket und ohne Bilddateien. Sie sind Schmuck (`aria-hidden`): Neben
 * jedem steht ein Text, der dasselbe sagt.
 *
 * DIE FARBE SAGT, WAS ES IST - NIE, WIE GUT ETWAS IST.
 *   violet  die Person           teal  Gespraech
 *   amber   Abwaegen             blue  Vergleich, Netz
 * Gruen und Rot (Bewertung) kommen hier bewusst nicht vor.
 */
export type IconName =
  | "check"
  | "team"
  | "person"
  | "scale"
  | "pencil"
  | "chat"
  | "search"
  | "network"
  | "shield"
  | "lock"
  | "arrow";

const PATHS: Record<IconName, ReactNode> = {
  check: <path d="M5 12l5 5L20 7" />,
  team: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M3.5 19c.6-3 3-4.6 5.5-4.6s4.9 1.6 5.5 4.6M15 15c2.3-.2 4.8.9 5.5 3.6" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c.8-3.8 3.6-5.8 7-5.8s6.2 2 7 5.8" />
    </>
  ),
  scale: <path d="M12 4v16M5 8h14M7 8l-3 6a3 3 0 0 0 6 0L7 8zM17 8l-3 6a3 3 0 0 0 6 0l-3-6z" />,
  pencil: <path d="M4 20l4-1 11-11a2.1 2.1 0 0 0-3-3L5 16l-1 4zM14 6l3 3" />,
  chat: <path d="M5 5h14v10H10l-5 4V5zM9 9h6M9 12h4" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  network: (
    <>
      <circle cx="6" cy="12" r="2.4" />
      <circle cx="18" cy="6" r="2.4" />
      <circle cx="18" cy="18" r="2.4" />
      <path d="M8.2 11l7.6-3.8M8.2 13l7.6 3.8" />
    </>
  ),
  shield: <path d="M12 3l8 3v6c0 4.5-3.2 7.6-8 9-4.8-1.4-8-4.5-8-9V6l8-3zM9 12l2.2 2.2L15.5 10" />,
  lock: (
    <>
      <path d="M12 3l8 3v6c0 4.5-3.2 7.6-8 9-4.8-1.4-8-4.5-8-9V6l8-3z" />
      <rect x="9.2" y="10.5" width="5.6" height="4.5" rx="1" />
      <path d="M10.4 10.5V9a1.6 1.6 0 0 1 3.2 0v1.5" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
};

export function AppIcon({ name, className = "h-6 w-6" }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  );
}

export type IconTone = "violet" | "teal" | "amber" | "blue" | "green" | "pink" | "brand" | "white";

const TONES: Record<IconTone, string> = {
  violet: "bg-[#efeafd] text-[#4a2fb8]",
  teal: "bg-[#dff4f3] text-[#0b6b6e]",
  amber: "bg-[#fdecc8] text-[#7a4300]",
  blue: "bg-[#e1effa] text-[#0b5a8a]",
  green: "bg-[#e3f6ec] text-[#17794a]",
  pink: "bg-[#fde8f1] text-[#a3195b]",
  brand: "bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] text-white",
  white: "bg-white/20 text-white",
};

/** Ein Symbol auf einer farbigen Kachel. */
export function IconTile({
  name,
  tone = "violet",
  size = "md",
}: {
  name: IconName;
  tone?: IconTone;
  size?: "sm" | "md";
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center ${size === "sm" ? "h-9 w-9 rounded-xl" : "h-11 w-11 rounded-[14px]"} ${TONES[tone]}`}
    >
      <AppIcon name={name} className={size === "sm" ? "h-[18px] w-[18px]" : "h-6 w-6"} />
    </span>
  );
}
