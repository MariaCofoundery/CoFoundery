import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAdvisorPersonAlignment, getAdvisorPersonView } from "@/features/advisor/personViewData";
import { buildAdvisorSelfReport, hasUsableAlignment } from "@/features/advisor/advisorSelfReport";
import { SelfReportView } from "@/features/reporting/SelfReportView";
import { getRequestLocale } from "@/i18n/getLocale";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Ein begleitetes Profil - im freigegebenen Umfang.
 *
 * DIE SEITE ENTSCHEIDET NICHTS. Jeder Abschnitt ist da oder nicht, weil die
 * Datenbank ihn herausgegeben hat oder nicht (Migration 20261045120000). Eine
 * Seite, die erst alles lädt und dann entscheidet, was sie anzeigt, hätte die
 * Daten bereits geholt - ein Fehler in der Anzeige wäre dann eine Offenlegung.
 *
 * WAS NICHT FREIGEGEBEN IST, ERSCHEINT GAR NICHT - kein leerer Block, kein
 * "gesperrt"-Hinweis. Ein leerer Block würde aus einer fehlenden Freigabe eine
 * Aussage über den Menschen machen ("hat nichts vorzuweisen"), und ein
 * Schloss-Symbol wäre eine Aufforderung, danach zu fragen.
 *
 * UND ES STEHT DABEI, WAS DAS HIER IST: Selbstauskunft, kein Testergebnis.
 * Derselbe Satz wie auf dem eigenen Gesamtbild - hier ist er wichtiger, weil
 * ihn jemand liest, der über Menschen entscheidet.
 */
export default async function AdvisorPersonPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/advisor/person/${userId}`)}`);

  // Sich selbst begleitet niemand. Ohne diese Zeile kaeme die eigene Person
  // hier durch - die Freigabe-Abfrage unten sieht auch die EIGENEN Zeilen, die
  // Lesefunktionen geben ihr aber nichts heraus. Das Ergebnis waere eine
  // leere Seite ueber einen selbst statt des eigenen Gesamtbilds.
  if (userId === user.id) redirect("/me/profile");

  const client = await createClient();
  const [view, alignment, locale] = await Promise.all([
    getAdvisorPersonView(client, userId),
    getAdvisorPersonAlignment(client, userId),
    getRequestLocale(),
  ]);

  // Nichts freigegeben heisst: Diese Seite gibt es für diese Person nicht.
  if (view.grantedScopes.length === 0) notFound();

  const [t, tCapability, tDirection, tNote] = await Promise.all([
    getTranslations("advisor.personView"),
    getTranslations("capability"),
    getTranslations("direction.statements.facets"),
    getTranslations("report.instrumentNote"),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10">
      <Link
        href="/advisor/dashboard#advisor-org"
        className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline"
      >
        {t("back")}
      </Link>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
        {view.base?.displayName ?? t("unnamed")}
      </h1>
      {view.base?.headline ? (
        <p className="mt-2 text-sm font-medium text-slate-700">{view.base.headline}</p>
      ) : null}
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{t("intro")}</p>

      {view.base ? (
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">{t("base")}</h2>
          {view.base.bio ? (
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">{view.base.bio}</p>
          ) : null}
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {view.base.locationRegion ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                  {t("region")}
                </dt>
                <dd className="mt-1 text-sm text-slate-800">{view.base.locationRegion}</dd>
              </div>
            ) : null}
            {view.base.expertise.length > 0 ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                  {t("expertise")}
                </dt>
                <dd className="mt-1 text-sm text-slate-800">{view.base.expertise.join(" · ")}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      {/* ----------------------------------------------------------------
          Das Selbstbild aus dem Fragebogen.

          DIE ZAHLEN SIND FREIGEGEBEN, DIE ANTWORTEN NICHT. Was hier steht,
          entsteht aus einem abgelegten Abbild (Migration 20261047120000) -
          die Rohantworten sieht niemand ausser der Person selbst, auch nach
          dieser Freigabe nicht.

          IN DER KURZEN DICHTE, wie im Gesamtbild: Das Kernmuster offen, die
          Ausfuehrungen eingeklappt. Wer hier liest, entscheidet ueber
          Menschen - eine Wand aus Text ist dabei kein Vorteil.
          ---------------------------------------------------------------- */}
      {hasUsableAlignment(alignment) && alignment ? (
        <section className="mt-6">
          <h2 className="text-base font-semibold text-slate-900">{t("alignment")}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {alignment.updatedAt
              ? t("alignmentAsOf", {
                  date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                    new Date(alignment.updatedAt)
                  ),
                })
              : t("alignmentNoDate")}
          </p>
          <div className="mt-3">
            <SelfReportView
              report={buildAdvisorSelfReport({
                alignment,
                locale,
                name: view.base?.displayName ?? t("unnamed"),
              })}
              density="summary"
            />
          </div>
        </section>
      ) : null}

      {view.capability && view.capability.length > 0 ? (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">{t("capability")}</h2>
          <ul className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
            {view.capability.map((entry) => (
              <li
                key={entry.areaId}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 text-sm"
              >
                <span className="font-medium text-slate-900">
                  {tCapability(`areaLabels.${entry.areaId}`)}
                </span>
                {/* Stufe und Verantwortungswunsch nur, wenn auch die Tiefe
                    freigegeben ist - die Datenbank gibt sie sonst als null
                    heraus, und hier steht dann eben nichts. */}
                <span className="flex flex-wrap gap-x-3 text-slate-600">
                  {entry.applicationLevel !== null ? (
                    <span>{tCapability(`levels.${entry.applicationLevel}`)}</span>
                  ) : null}
                  {entry.ownershipWish ? (
                    <span className="text-slate-800">
                      {tCapability(`ownershipWishes.${entry.ownershipWish}`)}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {view.strengths && view.strengths.length > 0 ? (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">{t("strengths")}</h2>
          <ul className="mt-4 space-y-3">
            {view.strengths.map((strength) => (
              <li key={strength.statement} className="text-sm leading-6">
                <span className="font-medium text-slate-900">{strength.statement}</span>
                {strength.selfFrequency ? (
                  <span className="ml-2 text-xs text-slate-500">
                    {t("self")}: {tCapability(`strengths.frequencies.${strength.selfFrequency}`)}
                    {strength.reflectedFrequency && strength.reflectedWho
                      ? ` · ${tCapability(`strengths.groups.${strength.reflectedWho}`)}: ${tCapability(
                          `strengths.frequencies.${strength.reflectedFrequency}`
                        )}`
                      : ""}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {view.direction && view.direction.length > 0 ? (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">{t("direction")}</h2>
          <ul className="mt-4 space-y-2">
            {view.direction.map((entry) => (
              <li key={entry.statement} className="text-sm leading-6 text-slate-900">
                <span className="text-xs uppercase tracking-[.12em] text-slate-500">
                  {tDirection(entry.facet)}
                </span>
                <span className="mt-0.5 block">{entry.statement}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* WAS DAS HIER IST - UND WAS NICHT. Auf dem eigenen Gesamtbild steht
          derselbe Satz; hier ist er wichtiger, weil ihn jemand liest, der
          ueber Menschen entscheidet. */}
      <section className="mt-8 rounded-2xl border border-slate-300 bg-slate-50/80 p-5 text-sm leading-6 text-slate-700">
        <h2 className="text-sm font-semibold text-slate-900">{tNote("title")}</h2>
        <ul className="mt-3 space-y-2">
          <li>{tNote("selfReport")}</li>
          <li>{tNote("notATest")}</li>
          <li>{tNote("purpose")}</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">{t("scopeNote")}</p>
      </section>
    </main>
  );
}
