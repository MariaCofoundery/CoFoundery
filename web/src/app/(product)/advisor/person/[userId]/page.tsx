import { getProductWorkstyle } from "@/features/reporting/workstyle/data";
import { IndividualWorkstyle } from "@/features/reporting/workstyle/IndividualWorkstyle";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AdvisorNotebook } from "@/features/advisor/AdvisorNotebook";
import {
  getAdvisorFollowUpFor,
  getAdvisorNoteFor,
} from "@/features/advisor/notebookData";
import {
  getAdvisorPersonAlignment,
  getAdvisorPersonView,
} from "@/features/advisor/personViewData";
import {
  buildAdvisorSelfReport,
  hasUsableAlignment,
} from "@/features/advisor/advisorSelfReport";
import { SelfReportView } from "@/features/reporting/SelfReportView";
import { ReportViewV21 } from "@/features/instruments/v21/ReportViewV21";
import { getAdvisorAlignmentV21 } from "@/features/instruments/v21/advisorAlignmentV21";
import { getAdvisorAlignViews } from "@/features/instruments/align/advisorView";
import { WorkMap } from "@/features/instruments/align/AlignMaps";
import { WorkProfileSynthesisView } from "@/features/instruments/align/WorkProfileSynthesisView";
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
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { userId } = await params;
  const query = await searchParams;
  const {
    data: { user },
  } = await getRequestUser();
  if (!user)
    redirect(`/login?next=${encodeURIComponent(`/advisor/person/${userId}`)}`);

  // Sich selbst begleitet niemand. Ohne diese Zeile kaeme die eigene Person
  // hier durch - die Freigabe-Abfrage unten sieht auch die EIGENEN Zeilen, die
  // Lesefunktionen geben ihr aber nichts heraus. Das Ergebnis waere eine
  // leere Seite ueber einen selbst statt des eigenen Gesamtbilds.
  if (userId === user.id) redirect("/me/profile");

  const client = await createClient();
  const anchor = { kind: "subject", id: userId } as const;
  const [view, alignment, locale, note, followUp] = await Promise.all([
    getAdvisorPersonView(client, userId),
    getAdvisorPersonAlignment(client, userId),
    getRequestLocale(),
    getAdvisorNoteFor(client, anchor),
    getAdvisorFollowUpFor(client, anchor),
  ]);

  // Nichts freigegeben heisst: Diese Seite gibt es für diese Person nicht.
  if (view.grantedScopes.length === 0) notFound();

  const [t, tCapability, tDirection, tNote, tAlign] = await Promise.all([
    getTranslations("advisor.personView"),
    getTranslations("capability"),
    getTranslations("direction.statements.facets"),
    getTranslations("report.instrumentNote"),
    // Dieselben Saetze wie auf dem eigenen Profil, aus derselben Datei. Sie
    // standen hier fest verdrahtet und auf Deutsch - in einer englischen
    // Sitzung las ein Advisor deutsche Absaetze.
    getTranslations("alignment.advisor"),
  ]);

  // DIE NEUE FASSUNG - nur wenn sie freigegeben ist.
  //
  // Kommt nichts zurueck, erscheint der Abschnitt gar nicht. Kein leerer
  // Block, kein Schloss-Symbol: Ein leerer Block wuerde aus einer fehlenden
  // Freigabe eine Aussage ueber den Menschen machen, ein Schloss waere eine
  // Aufforderung, danach zu fragen.
  const alignmentV21 = await getAdvisorAlignmentV21(userId);
  const hasLegacy = hasUsableAlignment(alignment);
  const alignViews = await getAdvisorAlignViews(userId);
  const workstyleV04 = await getProductWorkstyle(client, userId);

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
        <p className="mt-2 text-sm font-medium text-slate-700">
          {view.base.headline}
        </p>
      ) : null}
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
        {t("intro")}
      </p>

      {view.base ? (
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">
            {t("base")}
          </h2>
          {view.base.bio ? (
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">
              {view.base.bio}
            </p>
          ) : null}
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {view.base.locationRegion ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                  {t("region")}
                </dt>
                <dd className="mt-1 text-sm text-slate-800">
                  {view.base.locationRegion}
                </dd>
              </div>
            ) : null}
            {view.base.expertise.length > 0 ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                  {t("expertise")}
                </dt>
                <dd className="mt-1 text-sm text-slate-800">
                  {view.base.expertise.join(" · ")}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      {/* ----------------------------------------------------------------
          DER AKTUELLE STAND ZUERST - SEIT PHASE 6 (01.10.2026)

          Vorher stand hier der v1-Bericht: „So funktioniert dein Profil
          gerade", „Dein aktueller Stand in 6 Dimensionen" - als Hauptinhalt,
          auch wenn es laengst ein Arbeitsprofil gab, und erst recht, wenn
          dafuer keine Freigabe vorlag. Ein Advisor las das als heutigen Stand.

          Jetzt: die freigegebenen ALIGN-Ansichten hier oben, der v1-Bericht
          zugeklappt und datiert ganz unten.
          ---------------------------------------------------------------- */}
      {workstyleV04 && (
        <section className="mt-8">
          <h2 className="mb-5 text-xl font-semibold">Wie du arbeitest</h2>
          <IndividualWorkstyle
            profile={workstyleV04}
            name={view.base?.displayName ?? "Founder"}
            perspective="other"
          />
        </section>
      )}
      {alignViews.map((view) => {
        const content = (
          <section key={view.scope} className="mt-8">
            <h2 className="text-xl font-semibold text-slate-950">
              {view.label}
              {view.ventureName && (
                <span className="ml-2 text-base font-normal text-slate-500">
                  · {view.ventureName}
                </span>
              )}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {tAlign("selfReportNote")}
            </p>
            {/* Die Gueltigkeitsangabe kommt aus der Registratur und ist dort
              nur auf Deutsch hinterlegt. Sie ist Inhalt des Instruments, kein
              Oberflaechentext - sie hier zu uebersetzen hiesse, sie zu
              verdoppeln. */}
            <p className="mt-1 text-sm text-slate-500">{view.validity}</p>
            <p className="mt-1 text-sm text-slate-500">
              {tAlign("visible", {
                count: view.visible.count,
                of: view.visible.of,
              })}
            </p>

            <div className="mt-6">
              <WorkMap sections={view.sections} />
            </div>

            {/* DIESELBE BESCHREIBUNG - UND NUR UEBER DAS FREIGEGEBENE.

              `view.sections` enthaelt genau die Antworten, die diese Person
              freigegeben hat; nicht freigegebene kommen gar nicht erst mit
              (die Policies entscheiden das, nicht diese Seite). Die
              Beschreibung entsteht aus derselben Liste - es gibt also keinen
              Weg, ueber eine Zusammenfassung mehr zu erfahren als ueber die
              Antworten selbst. */}
            <div className="mt-6">
              <WorkProfileSynthesisView sections={view.sections} heading="h3" />
            </div>

            <div className="mt-6">
              <ReportViewV21 sections={view.sections} />
            </div>
          </section>
        );
        return view.scope === "founder_profile" ? (
          <details key={view.scope} className="mt-6">
            <summary>Früheres Arbeitsprofil – historischer Stand</summary>
            {content}
          </details>
        ) : (
          content
        );
      })}
      {/* KEINE FREIGABE - NEUTRAL GESAGT, UND NUR NEBEN DEM ALTBESTAND.

          Die Regel dieser Seite gilt weiter: Was nicht freigegeben ist,
          erscheint gar nicht. Mit EINER Ausnahme: Liegt ein frueherer Bericht
          vor, das aktuelle Arbeitsprofil aber nicht, steht hier ein Satz.
          Sonst waere der fruehere Bericht das Einzige, was nach „wie sie
          arbeitet" aussieht - und genau das hat ihn zum aktuellen Stand
          gemacht. Der Satz sagt nichts ueber den Menschen: nicht, ob das
          Profil ausgefuellt ist, und keine Aufforderung, danach zu fragen. */}
      {hasLegacy &&
      !workstyleV04 &&
      !alignViews.some((entry) => entry.scope === "founder_profile") ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-900">
            {t("workProfileTitle")}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {t("workProfileNotShared")}
          </p>
        </section>
      ) : null}

      {view.capability && view.capability.length > 0 ? (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">
            {t("capability")}
          </h2>
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
                    <span>
                      {tCapability(`levels.${entry.applicationLevel}`)}
                    </span>
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
          <h2 className="text-base font-semibold text-slate-900">
            {t("strengths")}
          </h2>
          <ul className="mt-4 space-y-3">
            {view.strengths.map((strength) => (
              <li key={strength.statement} className="text-sm leading-6">
                <span className="font-medium text-slate-900">
                  {strength.statement}
                </span>
                {strength.selfFrequency ? (
                  <span className="ml-2 text-xs text-slate-500">
                    {t("self")}:{" "}
                    {tCapability(
                      `strengths.frequencies.${strength.selfFrequency}`,
                    )}
                    {strength.reflectedFrequency && strength.reflectedWho
                      ? ` · ${tCapability(`strengths.groups.${strength.reflectedWho}`)}: ${tCapability(
                          `strengths.frequencies.${strength.reflectedFrequency}`,
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
          <h2 className="text-base font-semibold text-slate-900">
            {t("direction")}
          </h2>
          <ul className="mt-4 space-y-2">
            {view.direction.map((entry) => (
              <li
                key={entry.statement}
                className="text-sm leading-6 text-slate-900"
              >
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
        <h2 className="text-sm font-semibold text-slate-900">
          {tNote("title")}
        </h2>
        <ul className="mt-3 space-y-2">
          <li>{tNote("selfReport")}</li>
          <li>{tNote("notATest")}</li>
          <li>{tNote("purpose")}</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">{t("scopeNote")}</p>
      </section>

      {alignmentV21 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-950">
            {tAlign("newVersionTitle")}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {tAlign("selfReportNote")}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {tAlign("visible", {
              count: alignmentV21.visible.count,
              of: alignmentV21.visible.of,
            })}
          </p>

          <div className="mt-6">
            <ReportViewV21 sections={alignmentV21.sections} />
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------------
          DER FRUEHERE BERICHT (v1) - GETRENNT, DATIERT, ZUGEKLAPPT.

          DIE ZAHLEN SIND FREIGEGEBEN, DIE ANTWORTEN NICHT. Was hier steht,
          entsteht aus einem abgelegten Abbild (Migration 20261047120000) -
          die Rohantworten sieht niemand ausser der Person selbst, auch nach
          dieser Freigabe nicht.

          Nie als „aktueller Stand": Die Ueberschrift nennt das Datum, die
          eigenen Ueberschriften des Berichts sagen `legacy`, und er wird mit
          dem Arbeitsprofil weder verrechnet noch verglichen. IN DER KURZEN
          DICHTE, wie im Gesamtbild.
          ---------------------------------------------------------------- */}
      {hasLegacy && alignment ? (
        <details className="group mt-10 rounded-2xl border border-slate-200 bg-white/70">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-medium text-slate-800 [&::-webkit-details-marker]:hidden">
            <span
              aria-hidden
              className="text-slate-400 transition-transform group-open:rotate-90 motion-reduce:transition-none"
            >
              ▸
            </span>
            <span>
              {alignment.updatedAt
                ? t("legacyTitle", {
                    date: new Intl.DateTimeFormat(locale, {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }).format(new Date(alignment.updatedAt)),
                  })
                : t("legacyTitleNoDate")}
            </span>
          </summary>
          <div className="px-4 pb-5">
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              {t("legacyText")}
            </p>
            <div className="mt-4">
              <SelfReportView
                report={buildAdvisorSelfReport({
                  alignment,
                  locale,
                  name: view.base?.displayName ?? t("unnamed"),
                })}
                density="summary"
                legacy
              />
            </div>
          </div>
        </details>
      ) : null}

      {/* DIE HANDAKTE GANZ UNTEN - nach allem, worueber sie handelt. Sie
          gehoert dem Advisor und war nie fuer die begleitete Person
          bestimmt. */}
      <AdvisorNotebook
        anchor={anchor}
        note={note}
        followUp={followUp}
        saved={query.saved}
        error={query.error}
      />
    </main>
  );
}
