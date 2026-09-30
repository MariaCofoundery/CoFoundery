import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * Der Weg zum Eigenen - dasselbe wie in Connect.
 *
 * In Find standen die drei Ziele bisher als Reihe gleichgewichtiger Knoepfe
 * UNTER dem Titel, auf genau einer Seite. Zwei Folgen:
 *
 *   Auf den Unterseiten - Gemerkte, Suchen, Anfragen - gab es sie gar nicht.
 *   "Meine Suchen" war ueberhaupt nur aus dem Speichern-Formular heraus
 *   erreichbar, also praktisch eine Sackgasse.
 *
 *   Und als Reihe zwischen anderen Knoepfen las sich "Profil bearbeiten" nicht
 *   als "hier ist mein Suchprofil". Man sucht etwas, das dasteht.
 *
 * Jetzt oben rechts, benannt, und auf jeder Find-Seite gleich - wie in Connect,
 * damit man es nicht zweimal lernen muss.
 *
 * "Anfragen" gehoert bewusst NICHT hierher: Das ist ein Eingang, kein eigener
 * Besitz. Es bleibt ein Link fuer sich, so wie in Connect die Kontakte.
 */

// DIE REIHENFOLGE IST EIN WEG UND KEINE ABLAGE: erst was ich suche, dann wie
// ich mich zeige, dann was ich mir gemerkt habe, dann das Aufgehobene.
//
// "Deine Suche" stand seit dem 30.09.2026 als einziger Eintrag im globalen
// Menue, die anderen drei hier - zwei Muster fuer denselben Bereich. Jetzt
// stehen alle vier an derselben Stelle, so wie in Connect auch.
const LINKS = [
  { key: "yourSearch", href: "/discovery/suche" },
  { key: "profile", href: "/discovery/profile" },
  { key: "saved", href: "/discovery/saved" },
  { key: "searches", href: "/discovery/searches" },
] as const;

export async function DiscoveryMineNav() {
  const t = await getTranslations("discovery");

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
