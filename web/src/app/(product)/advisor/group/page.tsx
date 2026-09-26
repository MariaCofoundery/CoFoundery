import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CapabilityTeamReadoutView } from "@/features/capability/CapabilityTeamReadoutView";
import { getAccompaniedPeople, withAccompaniedNames } from "@/features/advisor/orgData";
import { getAdvisorGroupReadout } from "@/features/advisor/groupReadoutData";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Wie stehen diese Menschen zusammen da?
 *
 * GEWUENSCHT: Team-Matching fuer den Accelerator. Ein Programm begleitet
 * einzelne Menschen und moechte sehen, wie sie als Aufstellung dastehen -
 * bevor sie ein Team sind.
 *
 * ---------------------------------------------------------------------------
 * DASSELBE BILD, DAS EIN TEAM VON SICH SELBST SIEHT
 * ---------------------------------------------------------------------------
 *
 * Gezeichnet wird mit `CapabilityTeamReadoutView` - demselben Bauteil wie
 * unter `/teams/<id>/roles`. Ein Accelerator bekommt keine reichhaltigere
 * Sonderansicht: Was er ueber eine Gruppe sieht, ist genau das, was die
 * Gruppe ueber sich selbst sehen wuerde. Die Begruendung steht ausfuehrlich
 * in `groupReadoutData.ts`.
 *
 * ES GIBT KEINE RANGLISTE VON AUFSTELLUNGEN. Man kann nicht "die beste
 * Dreierkombination berechnen lassen" - dafuer braeuchte es eine Zahl je
 * Gruppe, und die gibt dieses Modell nicht her. Wer eine Aufstellung ansehen
 * will, waehlt sie selbst; das Werkzeug zeigt, wie sie dasteht, und
 * entscheidet nicht.
 *
 * ---------------------------------------------------------------------------
 * DIE AUSWAHL STEHT IN DER ADRESSE
 * ---------------------------------------------------------------------------
 *
 * `?p=<id>&p=<id>` - kein gespeicherter Gruppenbegriff, keine neue Tabelle.
 * Eine gespeicherte "Aufstellung" waere eine Aussage ueber Menschen, die
 * diese Menschen nie gesehen haben und nicht loeschen koennen. Ein Link ist
 * ein Gedanke; eine Zeile in der Datenbank ist eine Behauptung.
 */
export default async function AdvisorGroupPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string | string[] }>;
}) {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect("/login?next=/advisor/group");

  const client = await createClient();
  const params = await searchParams;
  const selected = (Array.isArray(params.p) ? params.p : params.p ? [params.p] : []).filter(
    (value) => /^[0-9a-f-]{36}$/i.test(value)
  );

  const [t, people] = await Promise.all([
    getTranslations("advisor.group"),
    getAccompaniedPeople(client).then((rows) => withAccompaniedNames(client, rows)),
  ]);

  const readout = selected.length >= 2 ? await getAdvisorGroupReadout(client, selected) : null;
  const nameOf = (userId: string) =>
    people.find((person) => person.subjectUserId === userId)?.name ?? t("unnamed");

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10">
      <Link
        href="/advisor/dashboard#advisor-org"
        className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline"
      >
        {t("back")}
      </Link>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{t("title")}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{t("intro")}</p>

      {/* ------------------------------------------------------------------
          Die Auswahl. Ein GET-Formular - damit ist jede Aufstellung ein Link,
          den man im Team weitergeben kann, ohne sie zu speichern.
          ------------------------------------------------------------------ */}
      <form method="get" className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
        <fieldset>
          <legend className="text-sm font-semibold text-slate-900">{t("chooseTitle")}</legend>
          <p className="mt-1 text-xs leading-5 text-slate-600">{t("chooseHint")}</p>

          {people.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-slate-600">{t("nobody")}</p>
          ) : (
            <ul className="mt-3 grid gap-1 sm:grid-cols-2">
              {people.map((person) => {
                const ready = person.scopes.includes("base") && person.scopes.includes("capability");
                return (
                  <li key={person.subjectUserId}>
                    <label className="flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm">
                      <input
                        type="checkbox"
                        name="p"
                        value={person.subjectUserId}
                        defaultChecked={selected.includes(person.subjectUserId)}
                        disabled={!ready}
                        className="size-4"
                      />
                      <span className={ready ? "text-slate-900" : "text-slate-400"}>
                        {person.name ?? t("unnamed")}
                        {/* WARUM JEMAND NICHT WAEHLBAR IST, steht dabei. Ein
                            ausgegrautes Kaestchen ohne Grund sieht aus wie
                            ein Fehler des Werkzeugs statt wie eine
                            Entscheidung dieses Menschen. */}
                        {!ready ? (
                          <span className="ml-2 text-xs">{t("notReleased")}</span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          <button
            type="submit"
            className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white"
          >
            {t("show")}
          </button>
        </fieldset>
      </form>

      {/* ------------------------------------------------------------------
          Das Ergebnis.
          ------------------------------------------------------------------ */}
      {selected.length >= 2 && !readout ? (
        <p className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
          {t("tooFewReleased")}
        </p>
      ) : null}

      {readout ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-950">
            {t("resultTitle", { names: readout.included.map((person) => person.name).join(", ") })}
          </h2>

          {/* WER FEHLT, WIRD GENANNT. Eine Auswertung, der stillschweigend
              jemand fehlt, sieht aus wie eine Aussage ueber eine duenn
              besetzte Gruppe - sie ist aber eine darueber, wer zugestimmt
              hat. */}
          {readout.omitted.length > 0 ? (
            <ul className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm leading-6 text-slate-600">
              {readout.omitted.map((person) => (
                <li key={person.subjectUserId}>
                  {t(`omitted.${person.reason}`, { name: nameOf(person.subjectUserId) })}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-4">
            <CapabilityTeamReadoutView data={readout.data} />
          </div>

          {/* WAS DIESE SEITE NICHT TUT. Sie steht unter dem Ergebnis, weil sie
              dort gelesen wird - und sie wird gelesen, weil oben gerade eine
              Lueckenkarte stand. */}
          <p className="mt-6 rounded-2xl border border-slate-300 bg-slate-50/80 p-5 text-sm leading-6 text-slate-700">
            {t("notARanking")}
          </p>
        </section>
      ) : null}
    </main>
  );
}
