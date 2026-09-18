import Link from "next/link";
import { getTranslations } from "next-intl/server";

type Tab = "people" | "listings" | "problems";

/**
 * Drei Reiter, drei Adressen - eine Flaeche.
 *
 * Bewusst kein gemischter Feed: Ein Mischfeed braucht eine Rangfolge, und
 * Rangfolgen sind genau das, was dieses Produkt ueberall vermeidet. Reiter
 * erlauben ehrliche Sortierung nach Aktualitaet und geben jeder Sorte ihre
 * eigenen Filter.
 *
 * Und bewusst Links auf bestehende Seiten statt einer Seite, die alles selbst
 * rendert: Das Problembrett traegt seine eigene Erklaerung und seinen eigenen
 * Einstellweg. Beides in einen Reiter zu kopieren haette es verdoppelt.
 */
export async function ConnectTabs({
  active,
  counts,
}: {
  active: Tab;
  counts: { people: number; listings: number; problems: number };
}) {
  const t = await getTranslations("connect");

  const tabs: { key: Tab; href: string; count: number }[] = [
    { key: "people", href: "/connect/people", count: counts.people },
    { key: "listings", href: "/connect", count: counts.listings },
    { key: "problems", href: "/connect/problems", count: counts.problems },
  ];

  return (
    <nav
      aria-label={t("tabs.label")}
      className="flex flex-wrap gap-1 rounded-full border border-slate-200/80 bg-white/90 p-1"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm transition ${
              isActive
                ? "brand-here font-semibold"
                : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {t(`tabs.${tab.key}`)}
            {/* Die Zahl steht dabei, damit niemand einen Reiter anklickt,
                hinter dem nichts steht. */}
            <span className={isActive ? "text-violet-900/70" : "text-slate-400"}>{tab.count}</span>
          </Link>
        );
      })}
    </nav>
  );
}
