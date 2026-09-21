import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * Der Weg zum Eigenen.
 *
 * Bis zum 19.09.2026 fuehrte aus dem Connect-Bereich kein einziger Link zum
 * eigenen Profil, zu den eigenen Eintraegen oder zu den eigenen Unternehmen.
 * Die drei Seiten gab es, aber man kam nur ueber das zentrale Profil dorthin,
 * also ueber einen anderen Bereich - oder gar nicht. Wer in Connect war, sah
 * ausschliesslich das, was andere gemacht haben.
 *
 * Vier Links statt eines Menues: Es sind wenige Ziele, sie passen
 * nebeneinander, und ein Menue waere ein zusaetzlicher Klick vor jedem davon.
 *
 * Und bewusst neben den Reitern statt nur auf der Uebersicht: Die Reiter sind
 * die Stelle, an der man sich in Connect umsieht - dort gehoert der Rueckweg zu
 * sich selbst hin, auf allen drei Reitern gleich.
 */

const LINKS = [
  { key: "profile", href: "/connect/profile" },
  { key: "listings", href: "/connect/my" },
  { key: "ventures", href: "/connect/ventures/mine" },
  // Dazugekommen am 21.09.2026: Vorschlaege sind an MICH gerichtet und
  // gehoeren damit zu meinen Sachen, nicht zwischen die Reiter, auf denen man
  // sich umsieht.
  { key: "suggestions", href: "/connect/suggestions" },
] as const;

export async function ConnectMineNav() {
  const t = await getTranslations("connect");

  return (
    <nav aria-label={t("mine.label")} className="flex flex-wrap items-center gap-1">
      <span className="mr-1 text-xs font-semibold uppercase tracking-[.14em] text-slate-500">
        {t("mine.label")}
      </span>
      {LINKS.map((link) => (
        <Link
          key={link.key}
          href={link.href}
          className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
        >
          {t(`mine.${link.key}`)}
        </Link>
      ))}
    </nav>
  );
}
