import { ComparisonScale } from "@/features/reporting/ComparisonScale";
import type { TeamContext } from "@/features/reporting/buildExecutiveSummary";
import {
  FOUNDER_DIMENSION_META,
  getFounderDimensionPoleLabels,
} from "@/features/reporting/founderDimensionMeta";
import {
  buildFounderMatchingMarkers,
  type FounderMatchingMarker,
} from "@/features/reporting/founderMatchingMarkers";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";
import type { CompareFoundersResult } from "@/features/reporting/founderMatchingEngine";
import type { FounderMatchingSelection } from "@/features/reporting/founderMatchingSelection";
import { buildFounderValuesBlockFromProfiles } from "@/features/reporting/founderValuesTextBuilder";
import {
  buildFounderMatchingAgreements,
  buildFounderMatchingDailyDynamics,
  buildFounderMatchingHero,
} from "@/features/reporting/founderMatchingTextBuilder";
import type { SelfValuesProfile } from "@/features/reporting/types";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";

type Props = {
  participantAName: string;
  participantBName: string;
  compareResult: CompareFoundersResult;
  selection: FounderMatchingSelection;
  valuesProfileA?: SelfValuesProfile | null;
  valuesProfileB?: SelfValuesProfile | null;
  workbookHref: string;
  teamContext?: TeamContext | null;
};

export function FounderMatchingView({
  participantAName,
  participantBName,
  compareResult,
  selection,
  valuesProfileA,
  valuesProfileB,
  workbookHref,
  teamContext,
}: Props) {
  const effectiveTeamContext = teamContext ?? "pre_founder";
  const hero = buildFounderMatchingHero(selection);
  const dailyDynamics = buildFounderMatchingDailyDynamics(selection);
  const agreements = buildFounderMatchingAgreements(selection);
  const markers = buildFounderMatchingMarkers(compareResult, selection, effectiveTeamContext);
  const valuesBlock = buildFounderValuesBlockFromProfiles(valuesProfileA, valuesProfileB);
  const markerA = buildMarkerLabel(participantAName);
  const markerB = buildMarkerLabel(participantBName);
  const heroHeadline = buildMatchHeadline(selection);
  const heroParagraphs = splitIntoParagraphs(hero).slice(0, 3);
  const dailyDynamicsSections = splitNarrativeSections(dailyDynamics).slice(0, 2);
  const compactInterpretation = buildCompactMatchInterpretation(compareResult, selection);
  const [primaryAgreement, ...secondaryAgreements] = agreements;

  return (
    <>
      <section className="page-section rounded-[28px] border border-slate-200/80 bg-white/96 p-8 shadow-[0_18px_60px_rgba(15,23,42,0.05)] print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Matching-Report</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-5xl">
              {t(heroHeadline)}
            </h1>
            <h2 className="mt-5 text-lg font-medium text-slate-900">Euer Matching-Report</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
              Hier seht ihr, wo ihr anschlussfähig seid, wo Unterschiede produktiv werden können
              und wo ihr klare Regeln braucht.
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
              Im nächsten Schritt übersetzt ihr das im Workbook in konkrete Arbeitsregeln.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <StatusBadge label={participantAName} tone="accentA" />
              <StatusBadge label={participantBName} tone="accentB" />
              <StatusBadge label={teamContextLabel(effectiveTeamContext)} tone="neutral" />
              {compareResult.overallMatchScore != null ? (
                <StatusBadge label={`Match-Score ${compareResult.overallMatchScore}/100`} tone="neutral" />
              ) : null}
              <StatusBadge
                label={
                  selection.meta.highSimilarityBlindSpotRisk
                    ? "Hohe Nähe mit Blind-Spot-Risiko"
                    : selection.meta.balancedButManageable
                      ? "Ausgeglichen, aber abstimmungsbedürftig"
                      : "Klar lesbare Teamdynamik"
                }
                tone="neutral"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-slate-50/70 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">1. Euer Kernmuster</p>
        <div className="mt-6 max-w-4xl space-y-3.5">
          {heroParagraphs.map((paragraph) => (
            <p key={paragraph} className="text-[15px] leading-7 text-slate-700">
              {t(paragraph)}
            </p>
          ))}
        </div>
      </section>

      <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-white/96 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">2. Eure Dynamik auf einen Blick</p>
        <div className="mt-6 space-y-4">
          {compareResult.dimensions.map((dimension) => {
            const meta = FOUNDER_DIMENSION_META[dimension.dimension];
            const reportPoles = getFounderDimensionPoleLabels(dimension.dimension, "report");
            const status = selection.dimensionStatuses.find(
              (entry) => entry.dimension === dimension.dimension
            );

            return (
              <article
                key={`matching-overview-${dimension.dimension}`}
                className="rounded-[22px] border border-slate-200/70 bg-slate-50/60 px-5 py-4 sm:px-6 sm:py-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[15px] font-semibold text-slate-900">{meta.canonicalName}</h4>
                  </div>
                  {status ? <MiniStatusBadge status={status.status} /> : null}
                </div>

                <div className="mt-4 max-w-3xl">
                  <ComparisonScale
                    scoreA={dimension.scoreA}
                    scoreB={dimension.scoreB}
                    markerA={markerA}
                    markerB={markerB}
                    participantAName={participantAName}
                    participantBName={participantBName}
                    lowLabel={t(reportPoles?.left ?? meta.reportLeftPole)}
                    highLabel={t(reportPoles?.right ?? meta.reportRightPole)}
                    valueScale="founder_percent"
                    compact
                  />
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-6 max-w-3xl space-y-3">
          {compactInterpretation.map((paragraph, index) => (
            <p
              key={paragraph}
              className={index === 0 ? "text-sm font-medium leading-7 text-slate-900" : "text-sm leading-7 text-slate-700"}
            >
              {t(paragraph)}
            </p>
          ))}
        </div>
      </section>

      <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-white/96 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">3. So zeigt sich das im Alltag</p>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {dailyDynamicsSections.map((section) => (
            <article
              key={`${section.title}-${section.body}`}
              className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-5"
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{section.title}</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{t(section.body)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section mt-8 rounded-[30px] border border-[color:var(--brand-accent)]/18 bg-[linear-gradient(180deg,rgba(124,58,237,0.07)_0%,rgba(255,255,255,0.99)_100%)] p-8 shadow-[0_18px_50px_rgba(124,58,237,0.08)] print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">4. Was ihr klären müsst</p>

        {markers.primary ? (
          <div className="mt-5 rounded-[20px] border border-[color:var(--brand-accent)]/18 bg-white/88 px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Primärer Marker</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">{t(markers.primary.label)}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-700">{t(markers.primary.explanation)}</p>
            <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-slate-500">Workbook-Haltung</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{t(markers.primary.workbookLabel)}</p>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              {t(buildMarkerWorkbookPrompt(markers.primary, effectiveTeamContext))}
            </p>
          </div>
        ) : null}

        {markers.secondary.length > 0 ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {markers.secondary.map((marker) => (
              <article
                key={`${marker.markerClass}-${marker.dimension ?? "none"}`}
                className="rounded-[20px] border border-slate-200/80 bg-white/84 px-5 py-4"
              >
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{t(marker.label)}</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">{t(marker.explanation)}</p>
              </article>
            ))}
          </div>
        ) : null}

        {primaryAgreement ? (
          <div className="mt-5 rounded-[24px] border border-[color:var(--brand-accent)]/18 bg-white/92 p-6">
            <p className="text-lg font-semibold leading-8 text-slate-900">{t(primaryAgreement)}</p>
          </div>
        ) : null}

        {secondaryAgreements.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {secondaryAgreements.map((agreement) => (
              <article
                key={agreement}
                className="rounded-[20px] border border-slate-200/80 bg-white/80 px-5 py-4 text-sm leading-7 text-slate-700"
              >
                {t(agreement)}
              </article>
            ))}
          </div>
        ) : null}

        <div className="mt-8 border-t border-slate-200/80 pt-8 print:hidden">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Nächster Schritt</p>
          <h3 className="mt-3 text-xl font-semibold text-slate-900">Jetzt Alignment konkret festhalten</h3>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
            {t(buildWorkbookOutro(markers.primary, effectiveTeamContext))}
          </p>
          <div className="mt-6">
            <ReportActionButton href={workbookHref}>Workbook starten</ReportActionButton>
          </div>
        </div>
      </section>

      {valuesBlock ? (
        <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-white/96 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Zusätzlich: Wertefokus im Duo</p>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-700">{t(valuesBlock.intro)}</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {[
              { label: "Gemeinsame Basis", entry: valuesBlock.gemeinsameBasis },
              { label: "Unterschied unter Druck", entry: valuesBlock.unterschiedUnterDruck },
              { label: "Leitplanke", entry: valuesBlock.leitplanke },
            ].map(({ label, entry }) => (
              <article
                key={`${label}-${entry.title}`}
                className="rounded-[22px] border border-slate-200/80 bg-slate-50/60 px-5 py-5"
              >
                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
                <h3 className="mt-2 text-sm font-semibold text-slate-900">{t(entry.title)}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{t(entry.body)}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function splitIntoParagraphs(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitNarrativeSections(text: string) {
  const sentences = splitIntoParagraphs(text);
  const sectionTitles =
    sentences.length >= 5
      ? ["Im Alltag", "Unter Druck", "Was oft zu spät auffällt"]
      : ["Im Alltag", "Unter Druck"];
  const targetSections = Math.min(sectionTitles.length, Math.max(2, Math.ceil(sentences.length / 2)));
  const chunkSize = Math.ceil(sentences.length / targetSections);

  return Array.from({ length: targetSections }, (_, index) => {
    const start = index * chunkSize;
    const body = sentences.slice(start, start + chunkSize).join(" ").trim();
    return {
      title: sectionTitles[index] ?? `Teil ${index + 1}`,
      body,
    };
  }).filter((section) => section.body.length > 0);
}

function buildMatchHeadline(selection: FounderMatchingSelection) {
  switch (selection.heroSelection.mode) {
    case "tension_led":
      return "Euer größtes Problem startet nicht im Detail, sondern im Alltag";
    case "complement_led":
      return "Euer Unterschied hilft nur, wenn Reibung frueh geregelt ist";
    case "coordination_led":
      return "Ihr verliert Tempo nicht im Streit, sondern in stiller Abstimmung";
    case "blind_spot_watch":
      return "Euer Risiko liegt nicht im Streit, sondern in spaeter Drift";
    case "alignment_led":
    default:
      return "Viel gemeinsame Linie, aber ein Randfeld darf nicht still mitlaufen";
  }
}

function teamContextLabel(teamContext: TeamContext) {
  return teamContext === "existing_team" ? "Bestehendes Team" : "Pre-Founder";
}

function buildOverallMatchReading(overallMatchScore: number | null) {
  if (overallMatchScore == null) {
    return "Für dieses Match fehlen belastbare Vergleichsdaten.";
  }

  if (overallMatchScore >= 80) {
    return "Hohe Anschlussfähigkeit. Das Duo wirkt nah, darf Ähnlichkeit aber nicht mit voller Klarheit verwechseln.";
  }

  if (overallMatchScore >= 65) {
    return "Tragfähige Basis mit klaren Reibungspunkten. Nicht offener Streit, sondern wiederkehrende Abstimmung kostet hier am ehesten Zeit.";
  }

  if (overallMatchScore >= 45) {
    return "Gemischtes Bild mit spürbarer Belastung. Dieses Match lebt nicht von Selbstverständlichkeit, sondern von sichtbaren Regeln und sauberer Priorisierung.";
  }

  return "Niedrige Anschlussfähigkeit. Ohne frühe Klärung drohen hier nicht nur Reibung, sondern unterschiedliche Erwartungen daran, wie dieses Duo überhaupt arbeiten soll.";
}

function buildCompactMatchInterpretation(
  compareResult: CompareFoundersResult,
  selection: FounderMatchingSelection
) {
  const strongestBase = compareResult.topAlignments[0] ?? selection.stableBase?.dimension ?? null;
  const mainNeed = compareResult.topTensions[0] ?? selection.biggestTension?.dimension ?? null;
  const paragraphs = [buildOverallMatchReading(compareResult.overallMatchScore)];

  if (selection.meta.highSimilarityBlindSpotRisk) {
    paragraphs.push(
      strongestBase
        ? `Am stabilsten wirkt aktuell ${strongestBase}. Aufmerksamkeit braucht hier aber vor allem stille Drift statt offener Konflikt.`
        : "Auffällig ist hier weniger offener Streit als die Gefahr, dass Annahmen still auseinanderlaufen."
    );
    return paragraphs;
  }

  if (strongestBase && mainNeed) {
    paragraphs.push(`Am stabilsten wirkt aktuell ${strongestBase}. Den meisten Klärungsbedarf zeigt ${mainNeed}.`);
    return paragraphs;
  }

  if (strongestBase) {
    paragraphs.push(`Am stabilsten wirkt aktuell ${strongestBase}.`);
    return paragraphs;
  }

  if (mainNeed) {
    paragraphs.push(`Den meisten Klärungsbedarf zeigt aktuell ${mainNeed}.`);
  }

  return paragraphs;
}

function buildMarkerLabel(name: string | null | undefined) {
  const trimmed = name?.trim();
  if (!trimmed) return "??";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}

function buildMarkerWorkbookLead(marker: FounderMatchingMarker, teamContext: TeamContext) {
  switch (marker.markerClass) {
    case "stable_base":
      return teamContext === "pre_founder"
        ? "Diese Basis solltet ihr vor dem Start bewusst schützen."
        : "Diese Basis solltet ihr im Alltag aktiv stabil halten.";
    case "conditional_complement":
      return teamContext === "pre_founder"
        ? "Die Chance liegt hier nicht im Unterschied selbst, sondern in eurer Vorabklärung."
        : "Die Chance liegt hier nicht im Unterschied selbst, sondern in klarer Führung im Alltag.";
    case "high_rule_need":
      return teamContext === "pre_founder"
        ? "Dieses Feld sollte nicht implizit bleiben, bevor ihr eng zusammenarbeitet."
        : "Dieses Feld sollte nicht weiter nebenher laufen, wenn ihr schon gemeinsam arbeitet.";
    case "critical_clarification_point":
      return teamContext === "pre_founder"
        ? "Das ist kein Randthema vor dem Start, sondern ein Punkt für ausdrückliche Klärung."
        : "Das ist kein Randthema im Betrieb, sondern ein Punkt für gezielte Bearbeitung.";
  }
}

function buildMarkerWorkbookPrompt(marker: FounderMatchingMarker, teamContext: TeamContext) {
  switch (marker.workbookPosture) {
    case "protect":
      return teamContext === "pre_founder"
        ? "Haltet fest, was diese Basis tragfähig macht und woran ihr merkt, dass sie zu kippen beginnt."
        : "Haltet fest, was diese Basis im Alltag stützt und woran ihr früh merkt, dass sie leise erodiert.";
    case "define":
      return "Legt im Workbook ausdrücklich fest, was gelten soll, statt auf stilles gemeinsames Verständnis zu hoffen.";
    case "regulate":
      return "Übersetzt das Feld im Workbook in klare Regeln für Timing, Sichtbarkeit und Nachsteuerung.";
    case "repair":
      return "Behandelt das Feld im Workbook nicht als Feinschliff, sondern als aktive Belastung, die gezielt bearbeitet werden muss.";
    case "escalate_for_discussion":
      return "Nutzt das Workbook hier nicht für Kosmetik, sondern für eine ausdrückliche Klärung vor gemeinsamer Abhängigkeit.";
  }
}

function buildWorkbookOutro(
  marker: FounderMatchingMarker | null,
  teamContext: TeamContext
) {
  if (!marker) {
    return "Ihr habt gesehen, wo ihr steht. Im Workbook legt ihr jetzt fest, wie ihr konkret zusammenarbeitet, was fuer euch gelten soll und wie ihr die naechsten 90 Tage sauber fuehrt.";
  }

  if (marker.markerClass === "critical_clarification_point") {
    return teamContext === "pre_founder"
      ? "Ihr habt gesehen, welches Feld vor dem Start nicht offen bleiben sollte. Im Workbook macht ihr daraus jetzt eine ausdrückliche Klärung statt eine stille Hoffnung auf später."
      : "Ihr habt gesehen, welches Feld im Alltag nicht weiterlaufen sollte. Im Workbook macht ihr daraus jetzt eine gezielte Bearbeitung statt eine weitere Schleife im laufenden Betrieb.";
  }

  if (marker.markerClass === "high_rule_need") {
    return teamContext === "pre_founder"
      ? "Ihr habt gesehen, wo gute Absicht vor dem Start nicht reicht. Im Workbook übersetzt ihr das jetzt in klare Regeln, bevor daraus spätere Reibung wird."
      : "Ihr habt gesehen, wo Unklarheit im Alltag zu viel Zug kostet. Im Workbook übersetzt ihr das jetzt in klare Regeln, damit Reibung nicht weiter nebenher läuft.";
  }

  if (marker.markerClass === "conditional_complement") {
    return teamContext === "pre_founder"
      ? "Ihr habt gesehen, wo euer Unterschied nützlich sein kann. Im Workbook legt ihr jetzt fest, wann er euch breiter macht und wann er Führung braucht."
      : "Ihr habt gesehen, wo euer Unterschied nützlich bleiben kann. Im Workbook legt ihr jetzt fest, wie ihr ihn im Alltag führt, bevor er in Reibung kippt.";
  }

  return teamContext === "pre_founder"
    ? "Ihr habt gesehen, was euch vor dem Start bereits trägt. Im Workbook haltet ihr jetzt fest, wie ihr diese Basis schützt, wenn Druck und Abhängigkeit steigen."
    : "Ihr habt gesehen, was euch im Alltag bereits trägt. Im Workbook haltet ihr jetzt fest, wie ihr diese Basis stabil haltet, wenn Tempo und Druck steigen.";
}

function statusLabel(status: FounderMatchingSelection["dimensionStatuses"][number]["status"]) {
  switch (status) {
    case "nah":
      return "Nah";
    case "ergänzend":
      return "Ergänzend";
    case "abstimmung_nötig":
      return "Abstimmung nötig";
    case "kritisch":
      return "Kritisch";
  }
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "neutral" | "accentA" | "accentB";
}) {
  const className =
    tone === "accentA"
      ? "border-[#00B8D9]/25 bg-[#00B8D9]/10 text-slate-700"
      : tone === "accentB"
        ? "border-[#7C3AED]/25 bg-[#7C3AED]/10 text-slate-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-3 py-1 text-[11px] tracking-[0.08em] ${className}`}
    >
      {t(label)}
    </span>
  );
}

function MiniStatusBadge({
  status,
}: {
  status: FounderMatchingSelection["dimensionStatuses"][number]["status"];
}) {
  const className =
    status === "kritisch"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : status === "abstimmung_nötig"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : status === "ergänzend"
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span
      className={`inline-flex min-h-7 items-center whitespace-nowrap rounded-full border px-3 py-1 text-[11px] tracking-[0.08em] ${className}`}
    >
      {t(statusLabel(status))}
    </span>
  );
}
