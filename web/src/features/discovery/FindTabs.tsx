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
      className="flex flex-wrap gap-2"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition ${
            tab.key === active
              ? "border-[#0b1f3a] bg-[#0b1f3a] text-white"
              : "border-[#d8d5ea] bg-white text-[#33325e] hover:bg-[#f5f2fe]"
          }`}
        >
          {tab.key === "saved" ? t("mine.saved") : t(`v2.modes.${tab.key}`)}
        </Link>
      ))}
    </nav>
  );
}
