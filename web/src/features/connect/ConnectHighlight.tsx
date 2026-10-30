import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { HighlightCarousel } from "@/features/connect/HighlightCarousel";
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
const DISCLOSURE_STYLE: Record<Highlight["disclosure"], string> = {
  none: "bg-emerald-100 text-emerald-900",
  editorial: "bg-violet-100 text-violet-900",
  sponsored: "bg-amber-100 text-amber-950",
};

export async function ConnectHighlight({ highlights }: { highlights: Highlight[] }) {
  if (highlights.length === 0) return null;

  const t = await getTranslations("connect.highlight");

  return (
    <section
      aria-label={t("title")}
      className="connect-highlight rounded-[28px] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">{t("title")}</h2>
          <p className="mt-1 text-sm text-slate-600">{t("subtitle")}</p>
        </div>
        {/* Wie es zustande kommt, steht hier und nicht auf einer eigenen
            Seite: Wer sich wundert, warum etwas oben steht, soll es sofort
            lesen koennen. */}
        <details className="text-sm">
          <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-violet-800 underline underline-offset-4">{t("howTitle")}</summary>
          <div className="mt-2 max-w-md space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-600">
            <p>{t("how")}</p>
            {/* Dass es Zufall ist, gehoert dazu: Sonst liest es sich als Auswahl
                des Hauses - also als Empfehlung. */}
            <p>{t("randomNote")}</p>
          </div>
        </details>
      </div>

      <HighlightCarousel dotLabels={highlights.map((_, index) => t("dot", { number: index + 1, count: highlights.length }))}>
        {highlights.map((highlight) => (
          <Link
            key={`${highlight.kind}:${highlight.id}`}
            href={highlight.href}
            className="connect-highlight-card relative flex min-w-0 flex-col break-words rounded-3xl border border-violet-100 bg-white p-5 shadow-[0_10px_28px_rgba(109,73,224,0.10)] hover:border-violet-300"
          >
            {/* JEDE KARTE SAGT, WARUM SIE HIER STEHT: Zufall, Empfehlung oder
                Anzeige. Auch der Zufall bekommt eine Marke - sonst waere nur
                der Rest gekennzeichnet, und "nichts dran" las sich als
                Empfehlung. */}
            {/* Angepinnt zeigt eine Nadel in der Ecke statt eines Wortes; der Text bleibt fuer Screenreader. */}
            {highlight.pinned ? (
              <span
                role="img"
                aria-label={t("pinned")}
                title={t("pinned")}
                className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-white shadow-[0_6px_14px_rgba(219,39,119,0.28)] ring-1 ring-pink-200"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 rotate-[40deg]" aria-hidden="true">
                  <path d="M12 11.5 13.1 21h-2.2z" fill="#9d174d" />
                  <rect x="5.5" y="9.2" width="13" height="2.8" rx="1.4" fill="#db2777" stroke="#9d174d" strokeWidth="1" strokeLinejoin="round" />
                  <path d="M8 9.2V6a4 3.2 0 0 1 8 0v3.2z" fill="#f472b6" stroke="#9d174d" strokeWidth="1" strokeLinejoin="round" />
                  <path d="M9.7 8V6.2" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" opacity=".7" />
                </svg>
              </span>
            ) : null}
            <div className={`flex flex-wrap items-center justify-between gap-2${highlight.pinned ? " pr-9" : ""}`}>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${DISCLOSURE_STYLE[highlight.disclosure]}`}>
                {t(`disclosures.${highlight.disclosure}`)}
              </span>
              <span className="flex items-center gap-2 text-xs text-slate-500">
                {t(`disclosureMeta.${highlight.disclosure}`)}
              </span>
            </div>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-violet-700">
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

            {/* Der Satz kommt von uns, und das soll man sehen: abgesetzt, mit Absender. */}
            {highlight.note ? (
              <figure className="mt-3 rounded-2xl border-l-4 border-pink-400 bg-pink-50/70 px-4 py-3">
                <figcaption className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[.08em] text-pink-700">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                    <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.7 5 6 5c1.9 0 3.3 1 4.1 2.3L12 9.6l1.9-2.3C14.7 6 16.1 5 18 5c3.3 0 5.1 3.4 3.6 6.8C19.5 16.4 12 21 12 21z" fill="#ec4899" />
                  </svg>
                  {t("noteFrom")}
                </figcaption>
                <blockquote className="mt-1 text-sm font-medium leading-6 text-slate-800">{highlight.note}</blockquote>
              </figure>
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

          </Link>
        ))}
      </HighlightCarousel>
      {highlights.some((highlight) => highlight.disclosure === "sponsored") ? (
        <p className="mt-3 text-xs text-slate-500">{t("adNote")}</p>
      ) : null}
    </section>
  );
}
