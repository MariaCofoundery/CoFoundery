import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ConnectAvatar } from "@/features/connect/ConnectAvatar";
import type { ConnectHighlight as Highlight } from "@/features/connect/connectHighlightData";

/**
 * Das Highlight-Feld.
 *
 * Drei Dinge aus dem Netzwerk, gemischt: ein Gesuch, ein Angebot, ein
 * Unternehmen, ein Mensch. Nicht sortiert, nicht bewertet - wer taeglich
 * hereinschaut, sieht sonst immer nur den oberen Rand der Liste.
 *
 * JEDE KARTE SAGT, WAS SIE IST. Ohne die Marke waere ein Mensch von einem
 * Gesuch nicht zu unterscheiden, und man klickt in etwas anderes, als man
 * erwartet hat.
 *
 * UND SIE SAGT, WARUM SIE HIER STEHT, sobald das nicht Zufall ist. Fuer
 * bezahlte Plaetze ist die Kennzeichnung nicht Geschmackssache, sondern
 * Pflicht (§ 5a UWG): Werbung muss als solche erkennbar sein. Deshalb steht
 * die Zeile hier von Anfang an, obwohl es heute nichts Bezahltes gibt - ein
 * Hinweis, der erst mit dem Geld gebaut wird, wird beim Einbau vergessen.
 * Ein Test haelt fest, dass "sponsored" nie ohne Kennzeichnung erscheint.
 */
export async function ConnectHighlight({ highlights }: { highlights: Highlight[] }) {
  if (highlights.length === 0) return null;

  const t = await getTranslations("connect.highlight");

  return (
    <section
      aria-label={t("title")}
      className="connect-highlight rounded-3xl border border-violet-200/70 bg-gradient-to-br from-violet-50/60 via-white to-cyan-50/50 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-[.14em] text-violet-800">
          {t("title")}
        </h2>
        {/* Dass es Zufall ist, gehoert dazu: Sonst liest es sich als Auswahl
            des Hauses - also als Empfehlung. */}
        <p className="text-xs text-slate-500">{t("randomNote")}</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {highlights.map((highlight) => (
          <Link
            key={`${highlight.kind}:${highlight.id}`}
            href={highlight.href}
            className="connect-highlight-card flex flex-col rounded-2xl border border-slate-200 bg-white/92 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)] hover:border-violet-300"
          >
            <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-violet-700">
              {t(`kinds.${highlight.kind}`)}
              {/* Damit niemand raetselt, warum da der eigene Name steht. */}
              {highlight.isOwn ? (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] text-violet-800">
                  {t("yours")}
                </span>
              ) : null}
            </p>
            <h3 className="mt-2 font-semibold leading-6 text-slate-950">{highlight.title}</h3>
            {highlight.text ? (
              <p className="mt-1 line-clamp-3 text-sm leading-6 text-slate-600">{highlight.text}</p>
            ) : null}

            {/* Bei einem Menschen: was er mitbringt. Eine Karte mit Name und
                einer Zeile sagt nicht, warum man klicken sollte. */}
            {highlight.has ? (
              <span className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
                {highlight.has.ventures > 0 ? (
                  <span>{t("has.ventures", { count: highlight.has.ventures })}</span>
                ) : null}
                {highlight.has.offering > 0 ? (
                  <span>{t("has.offering", { count: highlight.has.offering })}</span>
                ) : null}
                {highlight.has.seeking > 0 ? (
                  <span>{t("has.seeking", { count: highlight.has.seeking })}</span>
                ) : null}
              </span>
            ) : null}

            {/* Der Mensch dahinter. Bei einem Profil ist er der Eintrag
                selbst - dann waere die Zeile eine Wiederholung. */}
            {highlight.person && highlight.kind !== "person" ? (
              <span className="mt-3 flex min-w-0 items-center gap-2 border-t border-slate-100 pt-3">
                <ConnectAvatar
                  profile={highlight.person}
                  displayName={highlight.person.display_name}
                  className="h-7 w-7 shrink-0 rounded-full object-cover"
                />
                <span className="min-w-0 truncate text-xs text-slate-500">
                  {highlight.person.display_name}
                </span>
              </span>
            ) : null}

            {highlight.disclosure !== "none" ? (
              <span className="mt-3 text-xs font-medium text-slate-500">
                {t(`disclosures.${highlight.disclosure}`)}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
