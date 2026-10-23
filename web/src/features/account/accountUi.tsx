import type { ReactNode } from "react";

import { AppIcon, IconTile, type IconName, type IconTone } from "@/features/ui/Icons";

/**
 * Gemeinsame Bausteine fuer „Account & Einstellungen" (Konzeptboard 35): Karten, Knoepfe, Kopfzeile mit Symbol.
 * Eine Stelle fuer das Aussehen - die einzelnen Abschnitte behalten ihre Inhalte und Aktionen.
 */
export const ACCOUNT_CARD = "scroll-mt-24 rounded-[24px] border border-[#e4e2f0] bg-white p-5 sm:p-[26px]";
export const ACCOUNT_PRIMARY =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-[18px] text-[15px] font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2";
export const ACCOUNT_SECONDARY =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-[#f1f0f7] px-[18px] text-[15px] font-semibold text-[#0b1f3a] transition hover:bg-[#e9e7f4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2";
export const ACCOUNT_PILL =
  "inline-flex min-h-11 cursor-pointer items-center rounded-full border border-[#d8d5ea] bg-white px-5 text-sm font-semibold text-[#33325e] transition has-[:checked]:border-[#0b1f3a] has-[:checked]:bg-[#0b1f3a] has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#6d49e0]";

export function AccountHead({ icon, tone, title, text }: { icon: IconName; tone: IconTone; title: string; text?: string | null }) {
  return (
    <div className="flex items-start gap-3.5">
      <IconTile name={icon} tone={tone} />
      <div className="min-w-0">
        <h2 className="text-xl font-semibold leading-tight text-[#0b1f3a]">{title}</h2>
        {text ? <p className="mt-1 text-sm leading-[1.55] text-[#5f5e7a]">{text}</p> : null}
      </div>
    </div>
  );
}

/** Ein Schalter, der ein Ankreuzfeld bleibt: funktioniert ohne Script, liest sich als Schalter. */
export function SwitchTrack() {
  return (
    <span aria-hidden="true" className="relative inline-block h-[22px] w-[38px] flex-none rounded-full bg-[#d8d5ea] transition-colors peer-checked:bg-[#6d49e0] peer-focus-visible:ring-2 peer-focus-visible:ring-[#6d49e0] peer-focus-visible:ring-offset-2 after:absolute after:left-[3px] after:top-[3px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:left-[19px]" />
  );
}

export function SettingsIcon({ name, className }: { name: IconName; className?: string }) {
  return <AppIcon name={name} className={className} />;
}
export type { ReactNode };
