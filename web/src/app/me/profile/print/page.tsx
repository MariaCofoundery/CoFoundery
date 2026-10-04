import { IndividualWorkstyle } from "@/features/reporting/workstyle/IndividualWorkstyle";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { RESOURCE_KINDS } from "@/features/ai/resourceExtraction";
import { groupEntriesByFamily } from "@/features/capability/capabilityTypes";
import { DIRECTION_FACETS } from "@/features/direction/directionInterviewGuide";
import { BRAND_NAME } from "@/features/brand";
import { WorkMap } from "@/features/instruments/align/AlignMaps";
import { WorkProfileSynthesisView } from "@/features/instruments/align/WorkProfileSynthesisView";
import { ReportViewV21 } from "@/features/instruments/v21/ReportViewV21";
import { CoverageMap, CoverageRoles } from "@/features/reporting/CoverageMap";
import { FounderProfileBase } from "@/features/reporting/FounderProfileBase";
import { FounderProfileCapability } from "@/features/reporting/FounderProfileCapability";
import { FounderProfileDirection } from "@/features/reporting/FounderProfileDirection";
import { FounderProfileStrengths } from "@/features/reporting/FounderProfileStrengths";
import { InstrumentNote } from "@/features/reporting/InstrumentNote";
import { PrintReportButton } from "@/features/reporting/PrintReportButton";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { getProfileReadModel } from "@/features/reporting/profileReadModel";
import { DIRECTION_PER_FACET, STRENGTHS_IN_SUMMARY } from "@/features/reporting/profileSummary";
import {
  SHORT_LIMITS,
  limited,
  parseIncludeLegacy,
  parsePrintMode,
  printFileName,
  type PrintMode,
} from "@/features/reporting/profilePrint";
import { SelfReportView } from "@/features/reporting/SelfReportView";
import { getRequestLocale } from "@/i18n/getLocale";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * „Das bist du" — die Fassung, die man weitergibt.
 *
 * ---------------------------------------------------------------------------
 * WARUM ES DIESE SEITE GIBT
 * ---------------------------------------------------------------------------
 *
 * Gedruckt wurde bis zum 01.10.2026 die Leseseite selbst. Ein Bauteil klappte
 * dabei alle `details` auf — und damit hing der Inhalt des PDFs daran, was
 * jemand vorher angeklickt hatte, und es enthielt alles: den Altbestand aus
 * dem früheren Fragebogen, die Herkunft jeder einzelnen Aussage, die eigenen
 * Antworten in voller Länge.
 *
 * Das ist zweierlei Falsches auf einmal. Ein Dokument, dessen Inhalt vom
 * Zustand eines Akkordeons abhängt, ist nicht reproduzierbar. Und ein
 * Dokument, das alles enthält, ist keine Auswahl, sondern ein Abzug.
 *
 * Hier entscheidet `?mode=` und sonst nichts.
 *
 * ---------------------------------------------------------------------------
 * ZWEI FASSUNGEN, EINE DATENQUELLE
 * ---------------------------------------------------------------------------
 *
 *     short   was auf „Das bist du" offen steht — für ein erstes Gespräch
 *     full    dazu die Antworten, die ganze Bereichsliste, alle Aussagen
 *
 * Beide lesen `profileReadModel.ts`, dieselbe Funktion wie die Leseseite.
 * Es gibt keine dritte Zusammenstellung und keine Zahl, die nur hier
 * entsteht.
 *
 * ---------------------------------------------------------------------------
 * WAS NIE MITKOMMT
 * ---------------------------------------------------------------------------
 *
 *   Die Belege. `evidence_quote`, die Erzählungen aus dem Gespräch, die
 *   Herkunft einer Aussage. Sie gehören zur Entscheidung, etwas zu
 *   übernehmen — nicht zu der Person, die danach dasteht. Frage 3 des
 *   Katalogs fragt ausdrücklich nach dem Leben ausserhalb der Erwerbsarbeit;
 *   wer sein Profil weitergibt, gibt Fähigkeiten weiter, keine Geschichten.
 *
 *   Der Zustand des Baukastens. „Noch offen", „für jetzt fertig",
 *   „Weitermachen", die Markierungen aus `person_section_marks`. Der Leser
 *   bekommt ein Founderprofil und keinen Formularstatus — und eine Markierung
 *   ist ohnehin eine Notiz an sich selbst.
 *
 *   Offene Vorschläge. Eine Modellbehauptung, über die noch niemand
 *   entschieden hat, darf nirgends wie eine Angabe der Person aussehen.
 *
 *   Antworten zu einem Vorhaben. Die gelten für EIN Vorhaben und einen
 *   Zeitraum; das Profil gilt für die Person.
 *
 * ---------------------------------------------------------------------------
 * UND KEINE LEEREN ABSCHNITTE
 * ---------------------------------------------------------------------------
 *
 * Auf der eigenen Seite ist „hier könnte noch etwas stehen" eine Einladung.
 * In einer weitergegebenen Fassung ist es eine Aussage über einen Menschen,
 * gerichtet an jemanden, der nichts daran ändern kann. Was fehlt, fehlt hier
 * ohne Hinweis.
 */

type Params = Promise<{ mode?: string; legacy?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: Params }) {
  const { mode } = await searchParams;
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) return { title: "—" };

  const supabase = await createClient();
  const { data } = await supabase
    .from("person_core")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  // DER SEITENTITEL IST DER DATEINAME. Beim „Als PDF sichern" schlägt der
  // Browser `document.title` vor; einen `Content-Disposition` gibt es beim
  // Drucken nicht. Deshalb steht hier kein schöner Titel, sondern genau der
  // Name, unter dem die Datei liegen soll.
  return {
    title: printFileName(parsePrintMode(mode), (data?.display_name as string) ?? null, new Date()),
    robots: { index: false, follow: false },
  };
}

export default async function ProfilePrintPage({ searchParams }: { searchParams: Params }) {
  const locale = await getRequestLocale();
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect("/login?next=/me/profile");

  const params = await searchParams;
  const mode = parsePrintMode(params.mode);
  const includeLegacy = mode === "full" && parseIncludeLegacy(params.legacy);

  const supabase = await createClient();
  const [t, tCapability, tDirection, tNote, format, modell] = await Promise.all([
    getTranslations("profile.founderProfile"),
    getTranslations("capability"),
    getTranslations("direction.statements.facets"),
    getTranslations("report.instrumentNote"),
    getFormatter(),
    getProfileReadModel(supabase, user.id, locale),
  ]);

  const {
    core,
    report,
    workstyleV04,
    workProfile,
    vocabulary,
    orderedEntries,
    directionStatements,
    strengths,
    confirmedResources,
    freshness,
    ventures,
    photo,
    readout,
    coverage,
    ownershipGroups,
    growingInto,
    deepAreas,
    handsOver,
  } = modell;

  const voll = mode === "full";
  const areaLabel = (areaId: string) => tCapability(`areaLabels.${areaId}`);
  const displayName = core?.display_name?.trim() || t("unnamed");
  const datum = (wert: string) => format.dateTime(new Date(wert), { dateStyle: "long" });

  /** „Weitere N stehen im ausführlichen Profil." — nur, wenn welche fehlen. */
  const rest = (anzahl: number) =>
    anzahl > 0 ? (
      <p className="mt-2 text-xs leading-5 text-slate-500">{t("print.more", { count: anzahl })}</p>
    ) : null;

  const chips = (areaIds: readonly string[], limit: number | null) => {
    const { shown, rest: fehlend } = limited(areaIds, limit);
    return (
      <>
        <ul className="mt-2 flex flex-wrap gap-2">
          {shown.map((areaId) => (
            <li key={areaId} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-800">
              {areaLabel(areaId)}
            </li>
          ))}
        </ul>
        {rest(fehlend)}
      </>
    );
  };

  const strengthCopy = {
    title: null,
    intro: null,
    self: t("strengths.self"),
    reflected: (who: string) => t("strengths.reflected", { who }),
    frequency: (value: string) => tCapability(`strengths.frequencies.${value}`),
    group: (value: string) => tCapability(`strengths.groups.${value}`),
    unanswered: t("strengths.unanswered"),
  };

  const faehigkeitenNachFamilie = voll
    ? groupEntriesByFamily(orderedEntries, vocabulary.areas, vocabulary.families)
    : [];

  return (
    <main className="print-document-root profile-print-root mx-auto w-full max-w-3xl px-6 py-10 text-slate-900 print:max-w-none print:px-0 print:py-0">
      <PrintToolbar
        mode={mode}
        includeLegacy={includeLegacy}
        hasLegacy={Boolean(report)}
        copy={{
          back: t("print.back"),
          print: t("print.cta"),
          privacy: t("print.privacy"),
          legacyLabel: t("print.legacyLabel"),
          legacyApply: t("print.legacyApply"),
          switchToShort: t("print.switchToShort"),
          switchToFull: t("print.switchToFull"),
        }}
      />

      {/* ------------------------------------------------------------------
          DER KOPF DER ERSTEN SEITE
          ------------------------------------------------------------------ */}
      <header className="print-keep border-b border-slate-300 pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          {t("eyebrow")} · {voll ? t("print.badgeFull") : t("print.badgeShort")}
        </p>
        {/* IM DRUCK IST DAS BILD SCHMUCK - `alt=""`. Laedt es nicht, steht
            dort nichts; ein Alternativtext stuende sonst mitten im Namen. */}
        <div className="mt-2 flex flex-wrap items-center gap-4">
          {photo.avatarId || photo.avatarUrl ? (
            <ProfileAvatar
              displayName={displayName}
              avatarId={photo.avatarId}
              imageUrl={photo.avatarUrl}
              alt=""
              className="h-20 w-20 shrink-0 rounded-2xl object-cover"
            />
          ) : null}
          <h1 className="text-3xl font-semibold tracking-tight">{displayName}</h1>
        </div>
        {core?.headline?.trim() ? (
          <p className="mt-1 text-sm font-medium text-slate-700">{core.headline}</p>
        ) : null}
        {core?.location_region?.trim() ? (
          <p className="mt-1 text-sm text-slate-600">{core.location_region}</p>
        ) : null}
        {freshness ? (
          <p className="mt-3 text-xs text-slate-500">{t("head.asOf", { date: datum(freshness) })}</p>
        ) : null}
      </header>

      {/* 1 — Über dich. Nur, wenn etwas dasteht. */}
      {core?.bio?.trim() ||
      core?.location_region?.trim() ||
      (core?.expertise ?? []).length > 0 ||
      (core?.industries ?? []).length > 0 ? (
        <Abschnitt title={t("sections.about")}>
          <FounderProfileBase
            core={core}
            copy={{
              title: null,
              region: t("base.region"),
              remoteMode: (m) => tCapability(`remoteModes.${m}`),
              expertise: t("base.expertise"),
              industries: t("base.industries"),
              linkedin: t("base.linkedin"),
              // Steht nie da: Der Abschnitt erscheint nur, wenn etwas da ist.
              empty: "",
              completeHref: "/profile?step=identity",
              completeCta: "",
            }}
          />
        </Abschnitt>
      ) : null}

      {/* 2 — Wie du arbeitest. */}
      {workstyleV04 ? <Abschnitt title={t("sections.work")}><IndividualWorkstyle profile={workstyleV04} full={voll} /></Abschnitt> : null}
      {voll && workProfile ? (
        <Abschnitt title="Früheres Arbeitsprofil – historischer Stand">
          <p className="max-w-3xl text-sm leading-6 text-slate-600">{t("workProfile.note")}</p>
          <p className="mt-1 text-sm text-slate-500">
            {t("workProfile.answered", { answered: workProfile.answered, of: workProfile.of })}
          </p>
          <div className="mt-4">
            <WorkMap sections={workProfile.sections} density="print" />
          </div>

          {/* IN BEIDEN FASSUNGEN. Erst damit ist der Arbeitsprofil-Teil des
              Kurzprofils ueberhaupt zu verstehen: Vorher standen dort
              Punktreihen und sonst nichts. */}
          <div className="mt-5">
            <WorkProfileSynthesisView sections={workProfile.sections} heading="h3" />
          </div>

          {/* NUR IN DER LANGFASSUNG: die Antworten selbst, mit ihren
              Fragetexten, den fehlenden Angaben und den markierten
              Gesprächspunkten. Keine Punktzahl, keine Einordnung - die
              Registratur sagt `overallScore: false`. */}
          {voll ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-900">{t("print.workAnswers")}</h3>
              <div className="mt-3">
                <ReportViewV21
                  sections={workProfile.sections}
                  orphans={workProfile.orphans}
                  marked={workProfile.marked}
                />
              </div>
            </div>
          ) : null}
        </Abschnitt>
      ) : null}

      {/* 3 — Deine Stärken. Ohne Herkunft, in beiden Fassungen. */}
      {strengths.length > 0 ? (
        <Abschnitt title={t("sections.strengths")}>
          <FounderProfileStrengths
            strengths={strengths}
            limit={voll ? undefined : STRENGTHS_IN_SUMMARY}
            copy={strengthCopy}
          />
          {rest(voll ? 0 : Math.max(0, strengths.length - STRENGTHS_IN_SUMMARY))}
        </Abschnitt>
      ) : null}

      {/* 4 — Deine Fähigkeiten. */}
      {orderedEntries.length > 0 ? (
        <Abschnitt title={t("sections.capability")}>
          <CoverageMap
            coverage={coverage}
            copy={{
              title: t("coverage.title"),
              intro: t("coverage.intro"),
              familyLabel: (familyId) => tCapability(`families.${familyId}`),
              stateLabel: (state) => t(`coverage.states.${state}`),
              familyCount: (entered, total) => t("coverage.familyCount", { entered, total }),
              familyUnspoken: t("coverage.familyUnspoken"),
              basis: t("coverage.basis"),
            }}
          />

          {/* NUR IN DER LANGFASSUNG: jeder Bereich mit Stufe und Wunsch, nach
              Familien. OHNE die Zahl der Belege - sie sagt dem Leser nichts,
              was er nachsehen könnte, und die Belege selbst bleiben draussen. */}
          {voll
            ? faehigkeitenNachFamilie.map(({ familyId, entries: familyEntries }) => (
                <div key={familyId} className="mt-5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {tCapability(`families.${familyId}`)}
                  </h3>
                  <FounderProfileCapability
                    entries={familyEntries}
                    copy={{
                      title: null,
                      intro: "",
                      areaLabel,
                      levelLabel: (level) => tCapability(`levels.${level}`),
                      wishLabel: (wish) => tCapability(`ownershipWishes.${wish}`),
                      evidenceCount: null,
                      noLevel: t("capability.noLevel"),
                    }}
                  />
                </div>
              ))
            : null}
        </Abschnitt>
      ) : null}

      {/* 5 — Erfahrung & Tiefe. */}
      {readout.levelledCount > 0 ? (
        <Abschnitt title={t("sections.depth")}>
          <p className="text-sm leading-6 text-slate-700">
            {t("depth.counts", { levelled: readout.levelledCount, areas: readout.areaCount })}
          </p>
          {deepAreas.length > 0 ? (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-900">{t("depth.depthTitle")}</h3>
              {chips(deepAreas, voll ? null : SHORT_LIMITS.deepAreas)}
            </div>
          ) : null}
        </Abschnitt>
      ) : null}

      {/* 6 — Was du verantworten willst. KÖNNEN UND WOLLEN BLEIBEN GETRENNT:
          die Erfahrungsstufe wird hier nicht verrechnet. */}
      {ownershipGroups.length > 0 ? (
        <Abschnitt title={t("sections.ownership")}>
          <p className="max-w-3xl text-sm leading-6 text-slate-700">{t("ownership.intro")}</p>

          {voll ? (
            <div className="mt-4">
              <CoverageRoles
                coverage={coverage}
                copy={{
                  rolesTitle: t("coverage.rolesTitle"),
                  rolesIntro: t("coverage.rolesIntro"),
                  rolesNone: t("coverage.rolesNone"),
                  rolesOpen: (count) => t("coverage.rolesOpen", { count }),
                  rolesCaveat: t("coverage.rolesCaveat"),
                  areaLabel,
                }}
              />
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {ownershipGroups.map((group) => (
              <div key={group.key} className="print-keep">
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {t(`ownership.groups.${group.key}`)}
                </h3>
                {chips(group.areaIds, voll ? null : SHORT_LIMITS.ownershipPerGroup)}
              </div>
            ))}
          </div>

          {handsOver.length > 0 ? (
            <div className="mt-5 print-keep">
              <h3 className="text-sm font-semibold text-slate-900">
                {tCapability("readout.findings.canButHandsOver.title")}
              </h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                {tCapability("readout.findings.canButHandsOver.text")}
              </p>
              {chips(handsOver, null)}
            </div>
          ) : null}
        </Abschnitt>
      ) : null}

      {/* 7 — Wohin du wachsen willst. Entfällt ganz, wenn es nichts gibt. */}
      {growingInto.length > 0 ? (
        <Abschnitt title={t("sections.growing")}>
          <p className="max-w-3xl text-sm leading-6 text-slate-700">{t("growingInto.intro")}</p>
          {chips(growingInto, voll ? null : SHORT_LIMITS.growingInto)}
        </Abschnitt>
      ) : null}

      {/* 8 — Netzwerk, Zugänge & Ressourcen. NUR BESTÄTIGTES, und kein
          Unterschied zwischen selbst eingetragen und übernommen: Beides sind
          Angaben, die die Person verantwortet. */}
      {confirmedResources.length > 0 ? (
        <Abschnitt title={t("sections.resources")}>
          <div className="grid gap-4 sm:grid-cols-3">
            {RESOURCE_KINDS.map((kind) => {
              const darin = confirmedResources.filter((resource) => resource.kind === kind);
              if (darin.length === 0) return null;
              const { shown, rest: fehlend } = limited(
                darin,
                voll ? null : SHORT_LIMITS.resourcesPerKind
              );
              return (
                <div key={kind} className="print-keep">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {t(`resources.kinds.${kind}`)}
                  </h3>
                  <ul className="mt-2 space-y-1">
                    {shown.map((resource) => (
                      <li key={resource.id} className="text-sm leading-6 text-slate-900">
                        {resource.label}
                      </li>
                    ))}
                  </ul>
                  {rest(fehlend)}
                </div>
              );
            })}
          </div>
        </Abschnitt>
      ) : null}

      {/* 9 — Was dich antreibt. Die zehn Facetten bleiben zehn. */}
      {directionStatements.length > 0 ? (
        <Abschnitt title={t("sections.direction")}>
          <FounderProfileDirection
            statements={directionStatements}
            facets={DIRECTION_FACETS}
            limitPerFacet={voll ? undefined : DIRECTION_PER_FACET}
            copy={{
              title: null,
              intro: t("direction.intro"),
              facetLabel: (facet) => tDirection(facet),
            }}
          />
        </Abschnitt>
      ) : null}

      {/* Die Vorhaben — nur Namen. Keine Zusagen, keine Risikogrenzen, keine
          Alignment-Ergebnisse: Die gelten für EIN Vorhaben, das Profil für
          die Person. */}
      {ventures.length > 0 ? (
        <Abschnitt title={t("ventures.title")}>
          <ul className="flex flex-wrap gap-2">
            {ventures.map((venture) => (
              <li
                key={venture.id}
                className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-800"
              >
                {venture.name?.trim() || t("ventures.cta")}
              </li>
            ))}
          </ul>
        </Abschnitt>
      ) : null}

      {/* DER ALTBESTAND — nur in der Langfassung und nur auf Auswahl.
          `density="full"` statt "summary": In der Zusammenfassung stecken die
          Kapitel in Aufklappern, und ein zugeklapptes `details` im PDF wäre
          eine leere Seite. */}
      {includeLegacy && report ? (
        <Abschnitt title={t("legacyReport.title")}>
          <p className="text-sm text-slate-600">
            {t("legacyReport.dated", {
              date: report.createdAt ? datum(report.createdAt) : "—",
            })}
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t("legacyReport.text")}</p>
          <div className="mt-4">
            <SelfReportView report={report} density="full" detailsHint={() => ""} legacy />
          </div>
        </Abschnitt>
      ) : null}

      {/* WAS DIESE FASSUNG IST — UND WAS NICHT. Unten, und mitgedruckt: In
          der Fassung, die weitergegeben wird, ist dieser Satz am wichtigsten. */}
      <section className="mt-10 border-t border-slate-300 pt-6">
        <h2 className="text-sm font-semibold text-slate-900">{t("whatThisIs.title")}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t("whatThisIs.text")}</p>
        <InstrumentNote
          copy={{
            title: tNote("title"),
            selfReport: tNote("selfReport"),
            notATest: tNote("notATest"),
            snapshot: tNote("snapshot"),
            purpose: tNote("purpose"),
            dated: freshness ? tNote("dated", { date: datum(freshness) }) : null,
          }}
        />
      </section>

      <footer className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
        {t("print.footer", { brand: BRAND_NAME, date: format.dateTime(new Date(), { dateStyle: "short" }) })}
      </footer>
    </main>
  );
}

/**
 * Ein Abschnitt der Druckfassung.
 *
 * `print-keep` auf der Überschrift zusammen mit `break-after: avoid` in den
 * Druckregeln: Eine Überschrift allein am Seitenende ist das häufigste
 * Missgeschick beim Drucken von Webseiten.
 */
function Abschnitt({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 print:mt-6">
      <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * Die Leiste über dem Dokument — und sie wird nicht mitgedruckt.
 *
 * Der Hinweis zur Langfassung steht hier und nicht im Dokument: Er richtet
 * sich an die Person, die das PDF erzeugt, nicht an die, die es bekommt.
 */
function PrintToolbar({
  mode,
  includeLegacy,
  hasLegacy,
  copy,
}: {
  mode: PrintMode;
  includeLegacy: boolean;
  hasLegacy: boolean;
  copy: {
    back: string;
    print: string;
    privacy: string;
    legacyLabel: string;
    legacyApply: string;
    switchToShort: string;
    switchToFull: string;
  };
}) {
  return (
    <div className="no-print mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/me/profile"
          className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-700"
        >
          {copy.back}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/me/profile/print?mode=${mode === "full" ? "short" : "full"}`}
            className="inline-flex min-h-11 items-center text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-4"
          >
            {mode === "full" ? copy.switchToShort : copy.switchToFull}
          </Link>
          <PrintReportButton label={copy.print} eventName="founder_profile_print_clicked" module="base" />
        </div>
      </div>

      {mode === "full" ? (
        <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          {copy.privacy}
        </p>
      ) : null}

      {/* Der Altbestand ist abgewählt, bis jemand ihn dazunimmt. Ein echtes
          Formular mit echtem Haken: Es funktioniert ohne JavaScript, und der
          Zustand steht danach in der Adresse. */}
      {mode === "full" && hasLegacy ? (
        <form method="get" className="mt-3 flex flex-wrap items-center gap-3">
          <input type="hidden" name="mode" value="full" />
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              name="legacy"
              value="1"
              defaultChecked={includeLegacy}
              className="h-4 w-4 rounded border-slate-300"
            />
            {copy.legacyLabel}
          </label>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700"
          >
            {copy.legacyApply}
          </button>
        </form>
      ) : null}
    </div>
  );
}
