import Link from "next/link";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAccompaniedPeople, withAccompaniedNames } from "@/features/advisor/orgData";
import { requestTeamReviewAction } from "@/features/advisor/teamReviewActions";
import { getAdvisorTeamReviews } from "@/features/advisor/teamReviewData";
import { getMyAdvisorOrgs } from "@/features/advisor/orgData";
import { SubmitButton } from "@/features/ui/SubmitButton";
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
  searchParams: Promise<{ p?: string | string[]; status?: string; error?: string }>;
}) {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(buildLoginRedirectPath("/advisor/group", { p: (await searchParams).p }));

  const client = await createClient();
  const params = await searchParams;
  const selected = (Array.isArray(params.p) ? params.p : params.p ? [params.p] : []).filter(
    (value) => /^[0-9a-f-]{36}$/i.test(value)
  );

  const [t, people, reviews, orgs] = await Promise.all([
    getTranslations("advisor.group"),
    getAccompaniedPeople(client).then((rows) => withAccompaniedNames(client, rows)),
    getAdvisorTeamReviews(client),
    getMyAdvisorOrgs(client),
  ]);
  // Im Namen der Organisation, wenn es eine gibt - sonst im eigenen. Dieselbe
  // Unterscheidung wie bei den Einzelzugaengen, und aus demselben Grund: Sie
  // entscheidet, wer den Zugang behaelt, wenn die fragende Person geht.
  const orgId = orgs[0]?.id ?? null;

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
            <div className="mt-3 text-sm leading-6 text-slate-600">
              <p>{t("nobody")}</p>
              {/* Phase 12C.1C: der Weg zur Personen-Einladung statt Sackgasse. */}
              <Link
                href="/advisor/dashboard#person-invites"
                className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                {t("nobodyCta")}
              </Link>
            </div>
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
          KEINE AUSWERTUNG AUF DIESER SEITE - KORRIGIERT AM 26.09.2026.

          Hier stand bis eben die Rollenlage der gewaehlten Personen,
          gerechnet aus ihren EINZELNEN Freigaben. Das war ein Kurzschluss:
          Saetze wie "Anna und Bert wollen beide den Vertrieb verantworten"
          sind bereits eine Aussage ueber das Verhaeltnis zwischen zwei
          Menschen - genau die Art Aussage, fuer die es einen Tag spaeter die
          gemeinsame Zustimmung gab. Zwei Wege zum selben Befund, mit zwei
          verschiedenen Einwilligungen, waeren keine Strenge, sondern eine
          Umgehung.

          Diese Seite waehlt jetzt nur noch aus und fragt an. Die Auswertung
          steht unter /advisor/review/<id>, sobald alle zugestimmt haben.
          ------------------------------------------------------------------ */}

      {/* ------------------------------------------------------------------
          Eine gemeinsame Auswertung anfragen.

          SCHON DAS FRAGEN GIBT DIE GRUPPE PREIS: Jede angefragte Person
          erfaehrt, wer sonst dabei ist - anders kann niemand einem Vergleich
          zustimmen. Das steht ueber dem Knopf und nicht in einer Fussnote.
          ------------------------------------------------------------------ */}
      {selected.length >= 2 ? (
        <form
          action={requestTeamReviewAction}
          className="mt-6 rounded-3xl border border-slate-200 bg-white p-5"
        >
          {selected.map((id) => (
            <input key={id} type="hidden" name="p" value={id} />
          ))}
          {orgId ? <input type="hidden" name="orgId" value={orgId} /> : null}

          <h2 className="text-base font-semibold text-slate-900">{t("requestTitle")}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("requestText")}</p>
          <p className="mt-2 max-w-2xl rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
            {t("requestDisclosure")}
          </p>

          <label className="mt-3 block">
            <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
              {t("requestNoteLabel")}
            </span>
            <textarea
              name="note"
              rows={2}
              maxLength={400}
              placeholder={t("requestNotePlaceholder")}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <SubmitButton
            label={t("requestSubmit")}
            pendingLabel={t("requestPending")}
            className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white"
          />

          {params.status === "team_review_requested" ? (
            <p className="mt-3 text-sm leading-6 text-emerald-800">{t("requestDone")}</p>
          ) : null}
          {params.error === "team_review" ? (
            <p className="mt-3 text-sm leading-6 text-rose-800">{t("requestFailed")}</p>
          ) : null}
        </form>
      ) : null}

      {/* Was schon laeuft oder noch auf Antworten wartet. */}
      {reviews.length > 0 ? (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-900">{t("reviewsTitle")}</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6">
            {reviews.map((review) => (
              <li key={review.reviewId} className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-slate-900">
                  {review.subjectUserIds.map((id) => nameOf(id)).join(", ")}
                </span>
                {review.status === "active" ? (
                  <Link
                    href={`/advisor/review/${review.reviewId}`}
                    className="text-xs font-medium text-slate-700 underline underline-offset-4"
                  >
                    {t("reviewOpen")}
                  </Link>
                ) : (
                  <span className="text-xs text-slate-500">
                    {t("reviewWaiting", { count: review.pendingCount })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
