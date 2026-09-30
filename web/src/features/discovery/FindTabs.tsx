import Link from "next/link";
import { getTranslations } from "next-intl/server";

type Tab = "explore" | "search" | "saved";

/**
 * Drei Ausschnitte auf dieselben Profile.
 *
 * ---------------------------------------------------------------------------
 * AUSSCHNITTE GEHOEREN AUF DIE SEITE, ZIELE INS MENUE
 * ---------------------------------------------------------------------------
 *
 * „Für dich", „Suchen & filtern" und „Gemerkte" zeigen dieselbe Sorte Sache
 * verschieden gefiltert — nicht drei Orte. Wohin man GEHT, steht im Menü:
 * Deine Suche, Dein FIND-Profil, Gespeicherte Suchen.
 *
 * Dieselbe Aufteilung wie in Connect, wo die Reiter über Menschen,
 * Unternehmen, Angebote und Ungelöstes ebenfalls auf der Seite bleiben.
 *
 * DIE SPEC NENNT SIE ALS DREI GLEICHRANGIGE REITER (Abschnitt 2), und das
 * sind sie hier auch — nur eben auf der Fläche und nicht im Menü.
 */
export async function FindTabs({ active }: { active: Tab }) {
  const t = await getTranslations("discovery");

  const tabs: { key: Tab; href: string }[] = [
    { key: "explore", href: "/discovery" },
    { key: "search", href: "/discovery?mode=search" },
    { key: "saved", href: "/discovery/saved" },
  ];

  return (
    <nav
      aria-label={t("v2.modes.label")}
      className="flex flex-wrap gap-1 rounded-full border border-slate-200/80 bg-white/90 p-1"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm transition ${
            tab.key === active
              ? "brand-here font-semibold"
              : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          {tab.key === "saved" ? t("mine.saved") : t(`v2.modes.${tab.key}`)}
        </Link>
      ))}
    </nav>
  );
}
