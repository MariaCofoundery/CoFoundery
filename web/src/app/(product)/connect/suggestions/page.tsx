import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ConnectMineNav } from "@/features/connect/ConnectMineNav";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { dismissConnectSuggestionAction } from "@/features/connect/connectSuggestionActions";
import {
  generateConnectSuggestions,
  getOwnConnectSuggestions,
} from "@/features/connect/connectSuggestionData";

/**
 * Was dich interessieren koennte.
 *
 * GEBAUT AM 21.09.2026, als erste Haelfte des Matchings. Vorschlaege auf
 * SACHEN - Angebote, Unternehmen, Ungeloestes. Menschen einander vorzuschlagen
 * ist eine Aussage darueber, wer wem als passend gilt; das kommt als eigener
 * Schritt mit einem Schalter im Profil.
 *
 * SIE ENTSTEHEN BEIM HINSEHEN. Kein Zeitplan, kein Hintergrundlauf: Der Aufruf
 * unten erzeugt hoechstens drei je Woche. Das ist die technische Fassung von
 * "nur in der Plattform" - wer nicht hinsieht, bekommt nichts, und per Mail
 * geht ohnehin nichts hinaus.
 *
 * OHNE SPRACHMODELL. Die Treffer kommen aus Feldern, die Menschen selbst
 * eingetragen haben, und jeder Vorschlag zeigt das Wort, das ihn ausgeloest
 * hat. Ein Modell koennte spaeter den Satz formulieren, warum etwas passt -
 * finden muss es nichts.
 */
export default async function ConnectSuggestionsPage() {
  const { client } = await requireConnectMember("/connect/suggestions");
  const t = await getTranslations("connect");

  // Erst erzeugen, dann lesen. Beides still, wenn nichts dabei herauskommt:
  // Eine leere Liste ist ein gueltiges Ergebnis, kein Fehler.
  await generateConnectSuggestions(client);
  const suggestions = await getOwnConnectSuggestions(client);

  const card = "rounded-3xl border border-slate-200 bg-white p-5 sm:p-6";

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link
        href="/connect"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600 hover:text-slate-950"
      >
        ← {t("navigation.overview")}
      </Link>

      <p className="mt-3 text-xs uppercase tracking-[.18em] text-slate-500">{t("eyebrow")}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        {t("suggestions.title")}
      </h1>
      <p className="mt-2 max-w-2xl leading-7 text-slate-600">{t("suggestions.text")}</p>

      <div className="mt-5">
        <ConnectMineNav />
      </div>

      {suggestions.length === 0 ? (
        <section className={`${card} mt-6`}>
          <h2 className="text-lg font-semibold text-slate-900">{t("suggestions.emptyTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("suggestions.emptyText")}</p>
          <Link
            href="/connect/profile"
            className="mt-4 inline-flex min-h-11 items-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t("suggestions.emptyCta")}
          </Link>
        </section>
      ) : (
        <div className="mt-6 grid gap-4">
          {suggestions.map((suggestion) => (
            <article key={suggestion.id} className={card}>
              <p className="text-xs font-semibold uppercase tracking-[.12em] text-violet-700">
                {t(`suggestions.kinds.${suggestion.kind}`)}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                <Link href={suggestion.href} className="hover:underline">
                  {suggestion.title}
                </Link>
              </h2>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-700">{suggestion.text}</p>

              {/* DER GRUND, und zwar als das, was er ist: die Woerter aus dem
                  eigenen Profil, die getroffen haben. Ohne diese Zeile muesste
                  man einer Maschine glauben. */}
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {t("suggestions.because", { terms: suggestion.matchedTerms.join(", ") })}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <Link
                  href={suggestion.href}
                  className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  {t("actions.details")}
                </Link>
                {/* Wegklicken braucht keinen Grund. Nach einem zu fragen macht
                    aus einem Achselzucken eine Begruendungspflicht. */}
                <form action={dismissConnectSuggestionAction.bind(null, suggestion.id)}>
                  <button
                    type="submit"
                    className="text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-900"
                  >
                    {t("suggestions.dismiss")}
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs leading-5 text-slate-500">{t("suggestions.note")}</p>
    </main>
  );
}
