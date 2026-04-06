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
  const heroSentences = splitIntoParagraphs(hero);
  const heroLead = heroSentences[0] ?? "";
  const heroSupport = heroSentences.slice(1, 4);
  const dailyDynamicsSections = splitNarrativeSections(dailyDynamics).slice(0, 3);
  const steeringPoints = buildSteeringPoints(markers, agreements);
  const supportingPoints = buildSupportingPoints(selection);
  const clarificationQuestions = buildClarificationQuestions(selection);
  const introSummary = buildIntroSummary(selection);
  const introContext = buildIntroContext(selection);

  return (
    <>
      <section className="page-section rounded-[28px] border border-slate-200/80 bg-white/96 p-8 shadow-[0_18px_60px_rgba(15,23,42,0.05)] print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <div className="max-w-4xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">1. Einstieg</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-5xl">
            {t(heroHeadline)}
          </h1>
          <p className="mt-4 text-sm font-medium text-slate-900">
            {t(introSummary)}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
            {t(introContext)}
          </p>
          <p className="mt-5 text-[12px] uppercase tracking-[0.16em] text-slate-500">
            {t(`${participantAName} und ${participantBName} · ${teamContextLabel(effectiveTeamContext)}`)}
          </p>
        </div>
      </section>

      <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-slate-50/70 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">2. Euer zentrales Muster</p>
        <div className="mt-6 max-w-4xl">
          <p className="text-lg font-semibold leading-8 text-slate-950">{t(heroLead)}</p>
          <div className="mt-4 space-y-3.5">
            {heroSupport.map((sentence) => (
              <p key={sentence} className="text-[15px] leading-7 text-slate-700">
                {t(sentence)}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-white/96 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">3. Eure Dynamik im Überblick</p>
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
                <h4 className="text-[15px] font-semibold text-slate-900">{meta.canonicalName}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {t(buildDimensionReading(meta.canonicalName, status?.status ?? "nah"))}
                </p>

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
      </section>

      <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-white/96 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">4. So zeigt sich das im Alltag</p>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {dailyDynamicsSections.map((section) => (
            <article
              key={`${section.title}-${section.body}`}
              className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-5"
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{section.title}</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {t(limitSentences(section.body, 2))}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-white/96 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">5. Wo ihr steuern müsst</p>
        <ul className="mt-6 space-y-3">
          {steeringPoints.map((point) => (
            <li
              key={point}
              className="rounded-[18px] border border-slate-200/80 bg-slate-50/60 px-5 py-4 text-sm leading-7 text-slate-700"
            >
              {t(point)}
            </li>
          ))}
        </ul>
      </section>

      <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-slate-50/70 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">6. Was euch trägt</p>
        <div className="mt-6 space-y-3">
          {supportingPoints.map((point) => (
            <p
              key={point}
              className="rounded-[18px] border border-slate-200/80 bg-white/92 px-5 py-4 text-sm leading-7 text-slate-700"
            >
              {t(point)}
            </p>
          ))}
        </div>
      </section>

      <section className="page-section mt-8 rounded-[30px] border border-[color:var(--brand-accent)]/18 bg-[linear-gradient(180deg,rgba(124,58,237,0.07)_0%,rgba(255,255,255,0.99)_100%)] p-8 shadow-[0_18px_50px_rgba(124,58,237,0.08)] print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">7. Das müsst ihr klären</p>
        <ul className="mt-6 space-y-3">
          {clarificationQuestions.map((question) => (
            <li
              key={question}
              className="rounded-[20px] border border-slate-200/80 bg-white/88 px-5 py-4 text-sm leading-7 text-slate-800"
            >
              {t(question)}
            </li>
          ))}
        </ul>

        <div className="mt-8 border-t border-slate-200/80 pt-8 print:hidden">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">8. Übergang zum Workbook</p>
          <h3 className="mt-3 text-xl font-semibold text-slate-900">Diese Punkte klärt ihr nicht nebenbei.</h3>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
            Im Workbook legt ihr fest, wie ihr damit arbeitet.
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

function limitSentences(text: string, maxSentences: number) {
  return splitIntoParagraphs(text).slice(0, maxSentences).join(" ");
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

function buildIntroSummary(selection: FounderMatchingSelection) {
  switch (selection.heroSelection.mode) {
    case "tension_led":
      return selection.biggestTension
        ? `Bei euch entsteht Reibung frueh. Vor allem in ${selection.biggestTension.dimension}.`
        : "Bei euch entsteht Reibung frueh.";
    case "complement_led":
      return selection.strongestComplement
        ? `Bei euch liegt die Chance in einem Unterschied. Vor allem in ${selection.strongestComplement.dimension}.`
        : "Bei euch liegt die Chance in einem echten Unterschied.";
    case "coordination_led":
      return selection.biggestTension
        ? `Bei euch wird Reibung eher still als laut. Vor allem in ${selection.biggestTension.dimension}.`
        : "Bei euch wird Reibung eher still als laut.";
    case "blind_spot_watch":
      return selection.heroSelection.biggestRisk
        ? `Bei euch wirkt vieles erst einmal nah. Das Risiko liegt in stiller Drift, vor allem in ${selection.heroSelection.biggestRisk.dimension}.`
        : "Bei euch wirkt vieles erst einmal nah. Das Risiko liegt in stiller Drift.";
    case "alignment_led":
    default:
      return selection.stableBase
        ? `Bei euch gibt es eine tragende Linie. Klarheit braucht trotzdem ein Feld am Rand.`
        : "Bei euch gibt es eine tragende Linie.";
  }
}

function buildIntroContext(selection: FounderMatchingSelection) {
  switch (selection.heroSelection.mode) {
    case "tension_led":
      return "Das wird im Alltag sichtbar, wenn Prioritaeten, Tempo oder Erwartungen nicht ueber denselben Weg laufen.";
    case "complement_led":
      return "Das kann euch breiter machen. Von selbst traegt es aber nicht.";
    case "coordination_led":
      return "Das kostet selten offen Energie. Es kostet eher Tempo und Klarheit.";
    case "blind_spot_watch":
      return "Der Punkt ist nicht offener Streit. Der Punkt ist, dass ihr Unterschiede zu spaet merkt.";
    case "alignment_led":
    default:
      return "Das gibt euch Ruhe. Es ersetzt aber keine Klarheit dort, wo ihr unterschiedlich priorisiert oder entscheidet.";
  }
}

function teamContextLabel(teamContext: TeamContext) {
  return teamContext === "existing_team" ? "Bestehendes Team" : "Pre-Founder";
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

function buildDimensionReading(
  _dimension: string,
  status: FounderMatchingSelection["dimensionStatuses"][number]["status"]
) {
  switch (status) {
    case "nah":
      return "Hier zieht ihr eher in dieselbe Richtung.";
    case "ergänzend":
      return "Hier arbeitet ihr ueber unterschiedliche Staerken.";
    case "abstimmung_nötig":
      return "Hier braucht ihr klare Abstimmung.";
    case "kritisch":
      return "Hier duerft ihr Unklarheit nicht mitnehmen.";
  }
}

function buildSteeringPoints(markers: ReturnType<typeof buildFounderMatchingMarkers>, agreements: string[]) {
  const points = [
    markers.primary?.explanation,
    ...markers.secondary.map((marker) => marker.explanation),
    ...agreements,
  ]
    .filter((entry): entry is string => Boolean(entry))
    .map((entry) => limitSentences(entry, 1));

  return Array.from(new Set(points)).slice(0, 4);
}

function buildSupportingPoints(selection: FounderMatchingSelection) {
  const points: string[] = [];

  if (selection.stableBase) {
    points.push(`In ${selection.stableBase.dimension} habt ihr eine tragende Basis.`);
  }

  if (selection.strongestComplement) {
    points.push(
      `Euer Unterschied in ${selection.strongestComplement.dimension} kann euch breiter machen, wenn ihr ihn klar fuehrt.`
    );
  }

  if (points.length === 0) {
    points.push("Es gibt bei euch eine gemeinsame Linie, auf die ihr aufbauen koennt.");
  }

  return points.slice(0, 2);
}

function buildClarificationQuestions(selection: FounderMatchingSelection) {
  const questions = selection.agreementFocusDimensions.map((entry) => {
    switch (entry.dimension) {
      case "Commitment":
        return "Welches Einsatzniveau erwartet ihr im Alltag voneinander?";
      case "Arbeitsstruktur & Zusammenarbeit":
        return "Welche Zwischenstaende muessen sichtbar sein, und wo beginnt Eigenraum?";
      case "Konfliktstil":
        return "Was muss sofort auf den Tisch, und was klaert ihr in Ruhe?";
      case "Entscheidungslogik":
        return "Wer bereitet Entscheidungen vor, wann ist genug geklaert, und wer entscheidet am Ende?";
      case "Unternehmenslogik":
        return "Wonach priorisiert ihr, wenn Wachstum, Wirkung und Aufbau nicht dieselbe Richtung zeigen?";
      case "Risikoorientierung":
        return "Wie viel Risiko ist fuer euch okay, und wann geht Absicherung vor?";
    }
  });

  return Array.from(new Set(questions)).slice(0, 5);
}

function buildMarkerWorkbookPrompt(marker: FounderMatchingMarker, teamContext: TeamContext) {
  switch (marker.workbookPosture) {
    case "protect":
      return teamContext === "pre_founder"
        ? "Haltet fest, was diese Basis tragfaehig macht und woran ihr merkt, dass sie zu kippen beginnt."
        : "Haltet fest, was diese Basis im Alltag stuetzt und woran ihr frueh merkt, dass sie leise erodiert.";
    case "define":
      return "Legt im Workbook ausdruecklich fest, was gelten soll, statt auf stilles gemeinsames Verstaendnis zu hoffen.";
    case "regulate":
      return "Uebersetzt das Feld im Workbook in klare Regeln fuer Timing, Sichtbarkeit und Nachsteuerung.";
    case "repair":
      return "Behandelt das Feld im Workbook nicht als Feinschliff, sondern als aktive Belastung, die gezielt bearbeitet werden muss.";
    case "escalate_for_discussion":
      return "Nutzt das Workbook hier nicht fuer Kosmetik, sondern fuer eine ausdrueckliche Klaerung vor gemeinsamer Abhaengigkeit.";
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
