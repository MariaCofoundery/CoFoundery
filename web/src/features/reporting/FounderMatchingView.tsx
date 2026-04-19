import { ComparisonScale } from "@/features/reporting/ComparisonScale";
import { DynamicsTimeline } from "@/components/DynamicsTimeline";
import { DecisionEngineSection } from "@/features/reporting/DecisionEngineSection";
import type { TeamContext } from "@/features/reporting/buildExecutiveSummary";
import {
  FOUNDER_DIMENSION_META,
  getFounderDimensionPoleLabels,
} from "@/features/reporting/founderDimensionMeta";
import {
  buildFounderMatchingMarkers,
  type FounderMatchingMarker,
} from "@/features/reporting/founderMatchingMarkers";
import { buildFounderDynamicsTimelineDetailPhases } from "@/features/reporting/founderDynamicsTimelineDetails";
import { buildFounderDynamicsTimelineNodes, FOUNDER_DYNAMICS_TIMELINE_PHASES } from "@/features/reporting/timelineLogic";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";
import type { CompareFoundersResult } from "@/features/reporting/founderMatchingEngine";
import type { FounderMatchingSelection } from "@/features/reporting/founderMatchingSelection";
import { buildFounderValuesBlockFromProfiles } from "@/features/reporting/founderValuesTextBuilder";
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
  const markers = buildFounderMatchingMarkers(compareResult, selection, effectiveTeamContext);
  const valuesBlock = buildFounderValuesBlockFromProfiles(valuesProfileA, valuesProfileB);
  const markerA = buildMarkerLabel(participantAName);
  const markerB = buildMarkerLabel(participantBName);
  const reportHeadline = buildMatchHeadline(selection);
  const reportIntroLead = buildIntroSummary(selection);
  const reportIntroContext = buildIntroContext(selection);
  const centralPatternSections = buildCentralPatternSections(selection);
  const everydaySituations = buildEverydaySituations(selection);
  const steeringPoints = buildSteeringPoints(selection, markers);
  const opportunityPoints = buildOpportunityPoints(selection);
  const clarificationQuestions = buildClarificationQuestions(selection);
  const timelineNodes = buildFounderDynamicsTimelineNodes(compareResult);
  const timelineDetailPhases = buildFounderDynamicsTimelineDetailPhases(compareResult);

  return (
    <>
      <section className="page-section rounded-[28px] border border-slate-200/80 bg-white/96 p-8 shadow-[0_18px_60px_rgba(15,23,42,0.05)] print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="max-w-4xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Matching-Report</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-5xl">
              {t(reportHeadline)}
            </h1>
            <div className="mt-5 max-w-3xl space-y-3 text-[15px] leading-8 text-slate-700">
              <p>{t(reportIntroLead)}</p>
              <p>{t(reportIntroContext)}</p>
            </div>
            <p className="mt-6 text-[12px] uppercase tracking-[0.16em] text-slate-500">
              {t(`${participantAName} und ${participantBName} · ${teamContextLabel(effectiveTeamContext)}`)}
            </p>
          </div>
          <aside className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-5 text-sm leading-7 text-slate-600">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{t("Einordnung")}</p>
            <div className="mt-3 space-y-2">
              <p>{t("Dieser Report ist eine Momentaufnahme eurer Zusammenarbeit.")}</p>
              <p>{t("Er zeigt Muster – keine festen Urteile.")}</p>
              <p>{t("Entscheidend ist, was ihr daraus macht.")}</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-slate-50/70 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Eure zentralen Muster</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {centralPatternSections.map((section) => (
            <article
              key={section.label}
              className="rounded-[22px] border border-slate-200/80 bg-white/80 px-5 py-5"
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{section.label}</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{t(section.body)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-white/96 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Eure Dynamik im Überblick</p>
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
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  {t(buildDimensionExplanation(meta.canonicalName))}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {t(buildDimensionReading(meta.canonicalName, dimension, status?.status ?? "nah"))}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {t(
                    buildDimensionBusinessMeaning(
                      meta.canonicalName,
                      dimension,
                      status?.status ?? "nah"
                    )
                  )}
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

      <DecisionEngineSection compareResult={compareResult} selection={selection} />

      <div className="page-section mt-8 print:mt-4">
        <DynamicsTimeline
          phases={FOUNDER_DYNAMICS_TIMELINE_PHASES}
          nodes={timelineNodes}
          detailPhases={timelineDetailPhases}
        />
      </div>

      <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-white/96 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">So zeigt sich das im Alltag</p>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {everydaySituations.map((section) => (
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

      <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-white/96 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Wo ihr steuern müsst</p>
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
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Wo eure Chance liegt</p>
        <div className="mt-6 space-y-3.5">
          {opportunityPoints.map((point) => (
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
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Das müsst ihr klären</p>
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
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Nächster Schritt</p>
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

function buildMatchHeadline(selection: FounderMatchingSelection) {
  switch (selection.heroSelection.mode) {
    case "tension_led":
      return "Ein zentrales Spannungsfeld wird bei euch frueh im Alltag sichtbar.";
    case "complement_led":
      return "Euer Unterschied kann euch breiter machen, wenn ihr ihn bewusst fuehrt.";
    case "coordination_led":
      return "Ihr seid nicht weit auseinander, aber auch nicht automatisch im selben Takt.";
    case "blind_spot_watch":
      return "Eure Naehe wirkt tragend und braucht gerade deshalb bewusste Watchpoints.";
    case "alignment_led":
    default:
      return "Ihr habt eine tragfaehige Basis, aber nicht automatisch dieselben Massstaebe.";
  }
}

function buildIntroSummary(selection: FounderMatchingSelection) {
  switch (selection.heroSelection.mode) {
    case "tension_led":
      return "Die zentrale Reibung liegt weniger im Umgangston als in der Frage, woran ihr Richtung, Entscheidungen oder Zusammenarbeit bemesst.";
    case "complement_led":
      return "Euer Unterschied ist weder automatisch Problem noch automatisch Staerke. Er wird wertvoll, wenn klar ist, wann er euch erweitert und wann er Fuehrung braucht.";
    case "coordination_led":
      return "Bei euch geht eher Energie in Nachziehen, Schleifen und stille Koordination als in offenen Grundsatzstreit.";
    case "blind_spot_watch":
      return "Bei euch liegt das Risiko nicht zuerst in offenem Gegensatz, sondern in einer gemeinsamen Tendenz, die zu spaet bewusst wird.";
    case "alignment_led":
    default:
      return "Vieles ist bei euch anschlussfaehig. Gerade deshalb lohnt sich ein genauer Blick darauf, wo gemeinsame Linie endet und klares Fuehren beginnt.";
  }
}

function buildIntroContext(selection: FounderMatchingSelection) {
  switch (selection.heroSelection.mode) {
    case "tension_led":
      return selection.biggestTension
        ? `Das staerkste Spannungsfeld liegt in ${selection.biggestTension.dimension}. Ohne bewusste Klaerung koennt ihr dort dieselbe Lage unterschiedlich lesen und daraus verschiedene Standards ableiten.`
        : "Ein Unterschied wird im Alltag frueh spuerbar, wenn ihr ihn nicht ausdruecklich einordnet.";
    case "complement_led":
      return selection.strongestComplement
        ? `Die staerkste produktive Ergaenzung liegt in ${selection.strongestComplement.dimension}. Sie traegt nicht von selbst, kann euch aber deutlich breiter machen, wenn ihr Timing, Rollen und Grenzen sichtbar fuehrt.`
        : "Ein Unterschied kann euch breiter machen, solange ihr ihn nicht sich selbst ueberlasst.";
    case "coordination_led":
      return selection.biggestTension
        ? `Der staerkste Verlustpunkt liegt in ${selection.biggestTension.dimension}. Das wirkt oft nicht dramatisch, kostet aber ueber Nachziehen, Schleifen und unscharfe Uebergaenge spürbar Zug.`
        : "Das kostet selten offen Vertrauen, aber oft Tempo, Klarheit und Fuehrungsenergie.";
    case "blind_spot_watch":
      return selection.heroSelection.biggestRisk
        ? `Die heikelste Stelle liegt in ${selection.heroSelection.biggestRisk.dimension}. Gerade weil ihr euch in vielem aehnlich seid, kann dort lange wie selbstverstaendlich wirken, was eigentlich eine bewusste Grenze oder Regel braucht.`
        : "Gerade weil ihr euch in vielem aehnlich seid, werden kleine Abweichungen leicht erst spaet sichtbar.";
    case "alignment_led":
    default:
      return selection.stableBase
        ? `${buildStableBaseContext(selection.stableBase.dimension)} Gleichzeitig ist diese Basis kein Freifahrtschein dafuer, andere Felder still laufen zu lassen.`
        : "Die gemeinsame Linie gibt euch eine gute Ausgangslage, ersetzt aber keine klare Abstimmung dort, wo ihr unterschiedlich priorisiert, entscheidet oder Grenzen zieht.";
  }
}

function buildCentralPattern(
  selection: FounderMatchingSelection,
  heroSentences: string[]
) {
  switch (selection.heroSelection.mode) {
    case "tension_led":
      return {
        lead: selection.biggestTension
          ? `Der Kern liegt in ${selection.biggestTension.dimension}.`
          : "Der Kern liegt in eurer Grundlogik der Zusammenarbeit.",
        paragraphs: [
          selection.biggestTension
            ? buildTensionCauseSentence(selection.biggestTension.dimension)
            : "Ihr kommt in einem zentralen Feld nicht mit derselben Grundannahme zusammen.",
          selection.stableBase
            ? `Gleichzeitig habt ihr in ${selection.stableBase.dimension} genug gemeinsame Linie, um das Problem anfangs zu unterschaetzen.`
            : "Das Problem sitzt nicht an der Oberflaeche. Es steckt in einer stillen Grundannahme.",
          "Deshalb braucht ihr hier keine bessere Stimmung, sondern eine klare Arbeitsregel.",
        ],
      };
    case "complement_led":
      return {
        lead: selection.strongestComplement
          ? `Eure Chance liegt in ${selection.strongestComplement.dimension}.`
          : "Eure Chance liegt in einem echten Unterschied.",
        paragraphs: [
          selection.strongestComplement
            ? buildComplementCauseSentence(selection.strongestComplement.dimension)
            : "Ihr bringt nicht dasselbe mit. Genau das kann wertvoll sein.",
          selection.biggestTension
            ? `Der Preis dafuer liegt in ${selection.biggestTension.dimension}. Dort kippt Ergaenzung schnell in Reibung.`
            : "Diese Ergaenzung traegt nur, wenn ihr sie bewusst fuehrt.",
          "Euer Thema ist also nicht Gleichheit. Euer Thema ist gute Fuehrung des Unterschieds.",
        ],
      };
    case "coordination_led":
      return {
        lead: "Der Kern liegt nicht im offenen Konflikt.",
        paragraphs: [
          "Ihr habt genug gemeinsame Basis, um zusammen loszugehen.",
          selection.biggestTension
            ? `Das Problem zeigt sich erst, wenn ${selection.biggestTension.dimension} im Alltag nicht sauber geregelt ist.`
            : "Das Problem zeigt sich erst, wenn Regeln im Alltag fehlen.",
          "Dann verliert ihr nicht ueber Lautstaerke. Ihr verliert ueber Verzoegerung, Unklarheit und stilles Nachziehen.",
        ],
      };
    case "blind_spot_watch":
      return {
        lead: "Der Kern liegt in eurer Naehe.",
        paragraphs: [
          "Ihr seid euch in vielem aehnlich genug, um schnell Vertrauen aufzubauen.",
          selection.heroSelection.biggestRisk
            ? `Gerade deshalb merkt ihr Unterschiede in ${selection.heroSelection.biggestRisk.dimension} erst, wenn sie schon Wirkung haben.`
            : "Gerade deshalb merkt ihr Unterschiede erst, wenn sie schon Wirkung haben.",
          "Das Risiko ist hier nicht Streit. Das Risiko ist zu spaete Klaerung.",
        ],
      };
    case "alignment_led":
    default:
      return {
        lead: selection.stableBase
          ? `Eure Basis liegt in ${selection.stableBase.dimension}.`
          : "Ihr habt eine tragende gemeinsame Linie.",
        paragraphs: [
          selection.stableBase
            ? buildStableBaseContext(selection.stableBase.dimension)
            : "Das gibt euch Ruhe im Alltag.",
          selection.biggestTension
            ? `Der offene Punkt liegt in ${selection.biggestTension.dimension}. Dort reicht eure Naehe nicht mehr aus.`
            : heroSentences[1] ?? "Trotzdem ersetzt Naehe keine Regel dort, wo ihr unterschiedlich tickt.",
          "Euer Thema ist also nicht Grundkompatibilitaet. Euer Thema ist saubere Klaerung an der richtigen Stelle.",
        ],
      };
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
  dimension: string,
  match: CompareFoundersResult["dimensions"][number],
  status: FounderMatchingSelection["dimensionStatuses"][number]["status"]
) {
  if (match.jointState === "BOTH_MID") {
    switch (dimension) {
      case "Unternehmenslogik":
        return "Ihr liegt hier in einer aehnlichen mittleren Lage und lest Richtung weder rein ueber Hebel noch rein ueber Absicherung.";
      case "Entscheidungslogik":
        return "Ihr liegt hier in einer aehnlichen mittleren Lage und braucht weder maximale Prueftiefe noch reines Vorwaertsgehen.";
      case "Arbeitsstruktur & Zusammenarbeit":
        return "Ihr liegt hier in einer aehnlichen mittleren Lage und braucht weder Dauerabstimmung noch maximalen Eigenflug.";
      case "Commitment":
        return "Ihr liegt hier in einer aehnlichen mittleren Lage und verbindet Einsatz mit Realismus statt mit einem gemeinsamen Extrem.";
      case "Risikoorientierung":
        return "Ihr liegt hier in einer aehnlichen mittleren Lage und geht weder reflexhaft auf Sicherheit noch auf offene Wette.";
      case "Konfliktstil":
        return "Ihr liegt hier in einer aehnlichen mittleren Lage und klaert Unterschiede weder spaet noch ueberhart.";
    }
  }

  if (match.jointState === "BOTH_HIGH") {
    switch (dimension) {
      case "Unternehmenslogik":
        return "Bei euch zeigt sich eine klare gemeinsame Tendenz zu Wachstum, Hebel und Bewegung.";
      case "Entscheidungslogik":
        return "Bei Entscheidungen zeigt sich eine klare gemeinsame Tendenz, frueh zu gehen und eher im Laufen nachzuschaerfen.";
      case "Arbeitsstruktur & Zusammenarbeit":
        return "In eurer Zusammenarbeit zeigt sich eine klare gemeinsame Tendenz zu Tempo, Eigenraum und weniger laufender Mitsicht.";
      case "Commitment":
        return "Beim Commitment zeigt sich eine klare gemeinsame Tendenz zu hohem Einsatz und starker Priorisierung.";
      case "Risikoorientierung":
        return "Beim Risiko zeigt sich eine klare gemeinsame Tendenz, Unsicherheit offensiver mitzutragen.";
      case "Konfliktstil":
        return "Im Umgang mit Spannung zeigt sich eine klare gemeinsame Tendenz zu früher und direkter Klärung.";
    }
  }

  if (match.jointState === "BOTH_LOW") {
    switch (dimension) {
      case "Unternehmenslogik":
        return "Bei euch zeigt sich eine klare gemeinsame Tendenz zu Aufbau, Substanz und vorsichtigerem Kurs.";
      case "Entscheidungslogik":
        return "Bei Entscheidungen zeigt sich eine klare gemeinsame Tendenz, sie erst mit mehr Reife wirklich freizugeben.";
      case "Arbeitsstruktur & Zusammenarbeit":
        return "In eurer Zusammenarbeit zeigt sich eine klare gemeinsame Tendenz zu Sichtbarkeit, Rückkopplung und engerer Kopplung.";
      case "Commitment":
        return "Beim Commitment zeigt sich eine klare gemeinsame Tendenz zu einem begrenzteren oder bewusster gerahmten Einsatzniveau.";
      case "Risikoorientierung":
        return "Beim Risiko zeigt sich eine klare gemeinsame Tendenz, zuerst auf Absicherung und Begrenzung zu schauen.";
      case "Konfliktstil":
        return "Im Umgang mit Spannung zeigt sich eine klare gemeinsame Tendenz, sie später oder vorsichtiger zu öffnen.";
    }
  }

  if (match.hasSharedBlindSpotRisk) {
    switch (dimension) {
      case "Unternehmenslogik":
        return "Hier wirkt ihr nah genug beieinander, dass kleine Richtungsverschiebungen leicht zu spaet auffallen koennen.";
      case "Entscheidungslogik":
        return "Hier wirkt ihr nah genug beieinander, dass dieselbe Luecke fuer euch beide zunaechst unkritisch aussieht.";
      case "Arbeitsstruktur & Zusammenarbeit":
        return "Hier wirkt ihr nah genug beieinander, dass fehlende Sichtbarkeit oder zu viel Eigenraum lange nicht als Problem gelesen werden.";
      case "Commitment":
        return "Hier wirkt ihr nah genug beieinander, dass unausgesprochene Erwartungen an Einsatz und Verfuegbarkeit leicht mitlaufen.";
      case "Risikoorientierung":
        return "Hier wirkt ihr nah genug beieinander, dass dieselbe Chance oder Bremse fuer euch beide selbstverstaendlich werden kann.";
      case "Konfliktstil":
        return "Hier wirkt ihr nah genug beieinander, dass Spannungen laenger unmarkiert bleiben, weil beide denselben stillen Modus teilen.";
    }
  }

  switch (dimension) {
    case "Unternehmenslogik":
      switch (status) {
        case "nah":
          return "Ihr habt hier eine aehnliche Grundtendenz in der Frage, worauf ihr Richtung und Prioritaeten stuetzt.";
        case "ergänzend":
          return "Ihr schaut hier auf unterschiedliche Hebel und bringt damit eine potenziell produktive Ergaenzung mit.";
        case "abstimmung_nötig":
          return "Ihr priorisiert hier nicht automatisch nach denselben Massstaeben.";
        case "kritisch":
          return "Hier koennt ihr dieselbe unternehmerische Frage in unterschiedliche Richtungen aufloesen.";
      }
    case "Entscheidungslogik":
      switch (status) {
        case "nah":
          return "Ihr habt hier eine aehnliche Grundtendenz darin, wann etwas fuer euch als entscheidungsreif gilt.";
        case "ergänzend":
          return "Hier bringt eine Person eher mehr Analyse, die andere eher mehr Urteil und Vorwaertsbewegung ein.";
        case "abstimmung_nötig":
          return "Hier entscheidet ihr nicht automatisch nach denselben Kriterien.";
        case "kritisch":
          return "Hier liegt die Reibung weniger im Thema selbst als in der Frage, wann entschieden werden darf.";
      }
    case "Arbeitsstruktur & Zusammenarbeit":
      switch (status) {
        case "nah":
          return "Ihr habt hier eine aehnliche Grundtendenz darin, wie eng Zusammenarbeit gekoppelt sein soll.";
        case "ergänzend":
          return "Hier bringt eine Person eher mehr Eigenraum, die andere eher mehr Sichtbarkeit und Rueckkopplung ein.";
        case "abstimmung_nötig":
          return "Hier meint ihr nicht automatisch dasselbe mit guter Zusammenarbeit.";
        case "kritisch":
          return "Hier koennen eure Arbeitsweisen im Alltag direkt gegeneinander laufen.";
      }
    case "Commitment":
      switch (status) {
        case "nah":
          return "Ihr habt hier eine aehnliche Grundtendenz darin, wie viel Einsatz und Verbindlichkeit fuer euch realistisch sind.";
        case "ergänzend":
          return "Hier bringt eine Person eher mehr Zug, die andere eher mehr Grenze und Realismus ein.";
        case "abstimmung_nötig":
          return "Hier meint ihr nicht automatisch dasselbe mit Einsatz, Verfuegbarkeit oder Prioritaet.";
        case "kritisch":
          return "Hier bringt ihr unterschiedliche Grundannahmen zu Einsatz und Verbindlichkeit mit.";
      }
    case "Risikoorientierung":
      switch (status) {
        case "nah":
          return "Ihr habt hier eine aehnliche Grundtendenz darin, was fuer euch noch vertretbar ist.";
        case "ergänzend":
          return "Hier oeffnet eine Person eher Chancen, waehrend die andere eher Grenzen und Sicherungen sichtbar macht.";
        case "abstimmung_nötig":
          return "Hier ist fuer euch nicht automatisch dasselbe mutig, vertretbar oder zu offen.";
        case "kritisch":
          return "Hier koennt ihr dieselbe Unsicherheit grundlegend unterschiedlich lesen.";
      }
    case "Konfliktstil":
      switch (status) {
        case "nah":
          return "Ihr habt hier eine aehnliche Grundtendenz darin, wann und wie ihr Spannung oeffnet.";
        case "ergänzend":
          return "Hier sortiert eine Person eher vor, waehrend die andere frueher direkt in die Klaerung geht.";
        case "abstimmung_nötig":
          return "Hier klaert ihr Spannungen nicht automatisch auf dieselbe Weise.";
        case "kritisch":
          return "Hier koennt ihr schon ueber Form und Timing der Klaerung aneinander vorbeigehen.";
      }
  }
}

function buildDimensionExplanation(dimension: string) {
  switch (dimension) {
    case "Unternehmenslogik":
      return "Diese Dimension zeigt, woran ihr Richtung, Wachstum und Wirkung im Unternehmen messt.";
    case "Entscheidungslogik":
      return "Sie beschreibt, wie Entscheidungen zustande kommen und wann für euch etwas als ausreichend geklärt gilt.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Sie macht sichtbar, wie viel Eigenraum, Sichtbarkeit und Abstimmung ihr im Alltag braucht.";
    case "Commitment":
      return "Hier wird deutlich, was ihr unter Einsatz, Verfügbarkeit und verbindlichem Mittragen versteht.";
    case "Risikoorientierung":
      return "Sie zeigt, was für euch noch vertretbar ist und wann Vorsicht oder Wagnis Vorrang bekommen.";
    case "Konfliktstil":
      return "Sie beschreibt, wie schnell ihr Spannung ansprecht und in welcher Form ihr sie klärt.";
    default:
      return "";
  }
}

function buildDimensionBusinessMeaning(
  dimension: string,
  match: CompareFoundersResult["dimensions"][number],
  status: FounderMatchingSelection["dimensionStatuses"][number]["status"]
) {
  if (match.jointState === "BOTH_MID") {
    switch (dimension) {
      case "Unternehmenslogik":
        return "Das schafft oft eine belastbare Ausgangslage, weil weder Wachstumszug noch Absicherung reflexhaft dominieren.";
      case "Entscheidungslogik":
        return "Das schafft oft eine belastbare Ausgangslage, weil ihr Entscheidungen weder unnoetig offen haltet noch zu frueh schliesst.";
      case "Arbeitsstruktur & Zusammenarbeit":
        return "Das schafft oft eine belastbare Ausgangslage, weil Abstimmung und Eigenraum bei euch nicht auf einem gemeinsamen Extrem liegen.";
      case "Commitment":
        return "Das schafft oft eine belastbare Ausgangslage, weil Einsatz realistisch lesbar bleibt, ohne sofort still ueberzogen oder unterversorgt zu werden.";
      case "Risikoorientierung":
        return "Das schafft oft eine belastbare Ausgangslage, weil weder Sicherheitsdrang noch Offensivzug automatisch den Ton setzen.";
      case "Konfliktstil":
        return "Das schafft oft eine belastbare Ausgangslage, weil Klaerung bei euch weder zu spaet noch zu hart angelegt ist.";
    }
  }

  if (match.jointState === "BOTH_HIGH") {
    switch (dimension) {
      case "Unternehmenslogik":
        return "Das gibt Zug, kann aber dazu fuehren, dass ihr beide zu wenig Gegenkraft gegen opportunistische Richtungswechsel einbaut.";
      case "Entscheidungslogik":
        return "Das beschleunigt, kann aber gemeinsame Prueftiefe zu frueh abkuerzen.";
      case "Arbeitsstruktur & Zusammenarbeit":
        return "Das schafft Momentum, braucht aber klare Sichtbarkeit, damit Tempo nicht in Blindflug kippt.";
      case "Commitment":
        return "Das wirkt stark, braucht aber Schutz gegen stille Ueberlast und unausgesprochene Opferlogik.";
      case "Risikoorientierung":
        return "Das oeffnet Chancen, braucht aber klare Schwellen dafuer, wann Absicherung Vorrang bekommt.";
      case "Konfliktstil":
        return "Das kann Dinge schnell klaeren, braucht aber Leitplanken gegen Eskalation aus Zug heraus.";
    }
  }

  if (match.jointState === "BOTH_LOW") {
    switch (dimension) {
      case "Unternehmenslogik":
        return "Das schuetzt vor Schnellschuessen, kann aber auch gemeinsame Untersteuerung erzeugen.";
      case "Entscheidungslogik":
        return "Das reduziert vorschnelle Entscheidungen, kann aber leicht in zu spaete Commitments kippen.";
      case "Arbeitsstruktur & Zusammenarbeit":
        return "Das schafft Sicherheit, kann aber Eigenverantwortung und Geschwindigkeit zu stark bremsen.";
      case "Commitment":
        return "Das kann realistisch sein, braucht aber klare Erwartungen, damit das Unternehmen nicht still unterversorgt bleibt.";
      case "Risikoorientierung":
        return "Das schuetzt vor unnoetigen Wetten, kann aber auch Chancen systematisch zu spaet oeffnen.";
      case "Konfliktstil":
        return "Das haelt Gespraeche ruhig, kann aber Spannung zu lange im System lassen.";
    }
  }

  if (match.hasSharedBlindSpotRisk) {
    switch (dimension) {
      case "Unternehmenslogik":
        return "Das wirkt zunaechst anschlussfaehig, kann aber kleine Richtungsverschiebungen lange unsichtbar lassen.";
      case "Entscheidungslogik":
        return "Das wirkt zunaechst anschlussfaehig, kann aber dazu fuehren, dass dieselbe Entscheidungsluecke fuer euch beide zu normal wirkt.";
      case "Arbeitsstruktur & Zusammenarbeit":
        return "Das wirkt zunaechst anschlussfaehig, kann aber stille Drift bei Sichtbarkeit, Eigenraum oder Mitsicht verdecken.";
      case "Commitment":
        return "Das wirkt zunaechst anschlussfaehig, kann aber unausgesprochene Erwartungen an Einsatz lange mitschwingen lassen.";
      case "Risikoorientierung":
        return "Das wirkt zunaechst anschlussfaehig, kann aber gemeinsame Ueber- oder Untersteuerung zu spaet sichtbar machen.";
      case "Konfliktstil":
        return "Das wirkt zunaechst anschlussfaehig, kann aber dazu fuehren, dass beide zu lange im selben stillen Modus bleiben.";
    }
  }

  switch (dimension) {
    case "Unternehmenslogik":
      return status === "nah"
        ? "Das erleichtert Kursentscheidungen, solange ihr offene Abweichungen trotzdem frueh markiert."
        : "Das beeinflusst, wie ihr Chancen bewertet und wann ihr den Kurs aendert.";
    case "Entscheidungslogik":
      return status === "nah"
        ? "Das erleichtert Entscheidungen unter Druck, solange aus Naehe keine stille Selbstverstaendlichkeit wird."
        : "Das entscheidet darueber, ob ihr schnell vorankommt oder euch in Schleifen festfahrt.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return status === "nah"
        ? "Das entlastet Zusammenarbeit oft, solange Sichtbarkeit und Eigenraum nicht still auseinanderlaufen."
        : "Das praegt, wie viel Abstimmung euch traegt und ab wann sie euch bremst.";
    case "Commitment":
      return status === "nah"
        ? "Das schafft oft Ruhe bei Erwartungen an Einsatz und Tempo, solange Grenzen und Zusatzlasten nicht still verschoben werden."
        : "Das beeinflusst, wie fair Verantwortung, Verfuegbarkeit und Druck erlebt werden.";
    case "Risikoorientierung":
      return status === "nah"
        ? "Das erleichtert grosse Schritte, solange gemeinsame Wetten oder gemeinsame Vorsicht nicht ungeprueft mitlaufen."
        : "Das praegt, welche Schritte ihr wagt und wo fuer euch die Bremse greifen muss.";
    case "Konfliktstil":
      return status === "nah"
        ? "Das erleichtert Klaerung oft, solange ihr nicht voraussetzt, dass der gemeinsame Stil immer schon reicht."
        : "Das bestimmt, ob Spannungen frueh bearbeitet oder gegenseitig falsch gelesen werden.";
    default:
      return "";
  }
}

function buildSteeringPoints(
  selection: FounderMatchingSelection,
  markers: ReturnType<typeof buildFounderMatchingMarkers>
) {
  const prioritizedDimensions = Array.from(
    new Set(
      [
        markers.primary?.dimension,
        ...markers.secondary.map((marker) => marker.dimension),
        ...selection.agreementFocusDimensions.map((entry) => entry.dimension),
        selection.biggestTension?.dimension,
        selection.strongestComplement?.dimension,
      ].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    )
  );

  const fallbackDimensions: NonNullable<FounderMatchingSelection["biggestTension"]>["dimension"][] = [
    "Unternehmenslogik",
    "Entscheidungslogik",
    "Arbeitsstruktur & Zusammenarbeit",
    "Commitment",
    "Risikoorientierung",
    "Konfliktstil",
  ];

  return Array.from(
    new Set([...prioritizedDimensions, ...fallbackDimensions].map(buildSteeringQuestionForDimension))
  ).slice(0, 5);
}

function buildOpportunityPoints(selection: FounderMatchingSelection) {
  const points: string[] = [];

  if (selection.stableBase && selection.strongestComplement) {
    points.push(
      `Eure staerkste Chance liegt darin, dass euch ${selection.stableBase.dimension} Halt gibt, waehrend euch ${selection.strongestComplement.dimension} breiter machen kann. Wenn ihr beides sauber fuehrt, entsteht nicht nur Ausgleich, sondern echte Staerke.`
    );
  } else if (selection.stableBase) {
    points.push(buildSupportSentenceForDimension(selection.stableBase.dimension));
  } else if (selection.strongestComplement) {
    points.push(buildComplementSupportSentence(selection.strongestComplement.dimension));
  }

  if (selection.strongestComplement) {
    points.push(buildComplementOperationSentence(selection.strongestComplement.dimension));
  }

  if (selection.stableBase) {
    points.push(buildSharedStrengthSentence(selection.stableBase.dimension));
  }

  if (points.length === 0) {
    points.push("Ihr habt genug gemeinsame Linie, um Unterschiede produktiv zu fuehren, wenn ihr sie nicht dem Zufall ueberlasst.");
    points.push("Eine gute Zusammenarbeit entsteht hier nicht durch Gleichheit, sondern durch Klarheit ueber Rollen, Erwartungen und Entscheidungen.");
  }

  return Array.from(new Set(points)).slice(0, 3);
}

function buildClarificationQuestions(selection: FounderMatchingSelection) {
  const selectedQuestions = selection.agreementFocusDimensions.map((entry) => {
    switch (entry.dimension) {
      case "Commitment":
        return "Was heisst fuer euch verbindlicher Einsatz bei Zeit, Verantwortung und Equity?";
      case "Arbeitsstruktur & Zusammenarbeit":
        return "Was muss sichtbar sein, und was darf jede Person eigenstaendig loesen?";
      case "Konfliktstil":
        return "Was sprecht ihr sofort an, und was klaert ihr erst mit Abstand?";
      case "Entscheidungslogik":
        return "Wer bereitet Entscheidungen vor, und wer hat am Ende das letzte Wort?";
      case "Unternehmenslogik":
        return "Wonach priorisiert ihr, wenn Wachstum, Wirkung und Aufbau gegeneinander laufen?";
      case "Risikoorientierung":
        return "Welche Schritte sind fuer euch vertretbar, und wo zieht ihr die Grenze?";
    }
  });

  const fallbackQuestions = [
    "Wonach priorisiert ihr, wenn Richtung, Wachstum und Stabilitaet nicht dasselbe nahelegen?",
    "Was heisst fuer euch verbindlicher Einsatz bei Zeit, Verantwortung und Equity?",
    "Was muss sichtbar sein, und was darf jede Person eigenstaendig loesen?",
    "Wer bereitet Entscheidungen vor, und wer hat am Ende das letzte Wort?",
    "Was sprecht ihr sofort an, und was klaert ihr erst mit Abstand?",
    "Welche Schritte sind fuer euch vertretbar, und wo zieht ihr die Grenze?",
  ];

  return Array.from(new Set([...selectedQuestions, ...fallbackQuestions])).slice(0, 5);
}

function buildCentralPatternParagraphs(selection: FounderMatchingSelection, heroSentences: string[]) {
  const paragraphs: string[] = [];

  if (selection.stableBase) {
    paragraphs.push(buildSupportSentenceForDimension(selection.stableBase.dimension));
  }

  if (selection.biggestTension) {
    paragraphs.push(buildRiskSentenceForDimension(selection.biggestTension.dimension));
  }

  if (selection.strongestComplement) {
    paragraphs.push(buildComplementSupportSentence(selection.strongestComplement.dimension));
  }

  if (paragraphs.length < 3) {
    paragraphs.push(...heroSentences.slice(1, 4));
  }

  return Array.from(new Set(paragraphs)).slice(0, 3);
}

function buildEverydaySituations(selection: FounderMatchingSelection) {
  const dimensions = Array.from(
    new Set(
      [
        selection.biggestTension?.dimension,
        selection.strongestComplement?.dimension,
        ...selection.dailyDynamicsDimensions.map((entry) => entry.dimension),
      ].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    )
  ).slice(0, 3);

  const fallback = [
    {
      title: "Wenn Tempo steigt",
      body: "Dann zeigt sich schnell, ob ihr wirklich nach denselben Kriterien arbeitet.",
    },
    {
      title: "Wenn Druck steigt",
      body: "Dann tragen gute Absichten nicht mehr. Dann zeigt sich, ob eure Regeln im Alltag wirklich halten.",
    },
  ];

  if (dimensions.length === 0) return fallback;

  return dimensions.map((dimension) => buildEverydaySituationForDimension(dimension));
}

function buildEverydaySituationForDimension(
  dimension: NonNullable<FounderMatchingSelection["biggestTension"]>["dimension"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return {
        title: "Wenn Prioritaeten kollidieren",
        body: "Dann wird schnell sichtbar, ob ihr dieselbe Chance gleich gewichtet oder ob daraus unterschiedliche Kurslesarten entstehen.",
      };
    case "Entscheidungslogik":
      return {
        title: "Wenn schnell entschieden werden muss",
        body: "Dann wird sichtbar, ob fuer euch derselbe Stand schon tragfaehig ist oder ob die Entscheidung noch einmal eine Runde dreht.",
      };
    case "Arbeitsstruktur & Zusammenarbeit":
      return {
        title: "Wenn Arbeit parallel laeuft",
        body: "Dann wird sichtbar, was frueh in den gemeinsamen Blick gehoert und was eigenstaendig weiterlaufen kann, ohne zu spaet wieder aufzuploppen.",
      };
    case "Commitment":
      return {
        title: "Wenn Wochen voll werden",
        body: "Dann wird sichtbar, ob Einsatz fuer euch dieselbe Form hat oder ob aus Mehrbelastung still unterschiedliche Erwartungen werden.",
      };
    case "Risikoorientierung":
      return {
        title: "Wenn eine groessere Entscheidung ansteht",
        body: "Dann wird sichtbar, welche Schwelle fuer euch noch vertretbar ist und ab wann dieselbe Lage fuer eine Person schon zu offen wird.",
      };
    case "Konfliktstil":
      return {
        title: "Wenn etwas schieflaeuft",
        body: "Dann wird sichtbar, ob ihr Unterschiede im selben Takt und in derselben Form klaeren wollt oder ob schon der Rahmen der Klaerung zur Reibung wird.",
      };
  }
}

function buildTensionCauseSentence(
  dimension: NonNullable<FounderMatchingSelection["biggestTension"]>["dimension"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return "Ihr schaut nicht mit derselben Unternehmenslogik auf Richtung und Prioritaeten.";
    case "Entscheidungslogik":
      return "Ihr haltet nicht nach denselben Kriterien etwas fuer entscheidungsreif.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Ihr habt kein deckungsgleiches Bild davon, wie Zusammenarbeit im Alltag aussehen soll.";
    case "Commitment":
      return "Ihr verbindet mit Einsatz und Verbindlichkeit nicht automatisch dasselbe.";
    case "Risikoorientierung":
      return "Ihr bewertet Risiko, Unsicherheit und Absicherung nicht auf dieselbe Weise.";
    case "Konfliktstil":
      return "Ihr klaert Spannung nicht im selben Tempo und nicht auf dieselbe Art.";
  }
}

function buildComplementCauseSentence(
  dimension: NonNullable<FounderMatchingSelection["strongestComplement"]>["dimension"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return "Eine Person bringt mehr Blick fuer Substanz, die andere mehr Blick fuer Hebel.";
    case "Entscheidungslogik":
      return "Eine Person bringt mehr Analyse, die andere mehr Urteil und Tempo.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Eine Person bringt mehr Eigenraum, die andere mehr gemeinsame Orientierung.";
    case "Commitment":
      return "Eine Person bringt mehr Zug, die andere mehr Grenze und Realismus.";
    case "Risikoorientierung":
      return "Eine Person oeffnet eher Chancen, die andere schuetzt eher vor Ueberzug.";
    case "Konfliktstil":
      return "Eine Person bringt mehr Direktheit, die andere mehr Sortierung.";
  }
}

function buildDimensionConsequence(
  dimension: NonNullable<FounderMatchingSelection["biggestTension"]>["dimension"],
  status: FounderMatchingSelection["dimensionStatuses"][number]["status"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return status === "kritisch"
        ? "Wenn ihr das nicht klaert, koennt ihr am selben Unternehmen mit verschiedenen Grundlogiken arbeiten."
        : "Wenn ihr das offen lasst, koennen aus derselben Prioritaet unterschiedliche Zielbilder werden.";
    case "Entscheidungslogik":
      return status === "kritisch"
        ? "Ohne klare Regel koennt ihr aneinander vorbei entscheiden oder Entscheidungen unterschiedlich frueh als erledigt ansehen."
        : "Wenn ihr das offen lasst, entstehen leicht Schleifen, obwohl beide schon weiter wollen.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return status === "kritisch"
        ? "Ohne klare Regeln wird aus Alltag leicht direkte Reibung ueber Sichtbarkeit, Eigenraum und Mitsicht."
        : "Wenn ihr das nicht klaert, kann sich dieselbe Zusammenarbeit fuer die eine Person zu eng und fuer die andere zu lose anfuehlen.";
    case "Commitment":
      return status === "kritisch"
        ? "Ohne klare Abmachung wird Commitment leicht zum Dauerthema ueber Tempo, Verfuegbarkeit und Fairness."
        : "Wenn ihr das nicht klaert, entsteht leicht Frust ueber Tempo, Verfuegbarkeit und Verantwortung.";
    case "Risikoorientierung":
      return status === "kritisch"
        ? "Ohne klare Leitplanke zieht leicht die eine Person an, waehrend die andere frueher bremst."
        : "Wenn ihr das offen lasst, werden Chancen leicht zu frueh gestoppt oder zu weit getrieben.";
    case "Konfliktstil":
      return status === "kritisch"
        ? "Ohne Regel dazu koennen Kleinigkeiten eskalieren oder zu lange unter der Oberflaeche bleiben."
        : "Wenn ihr das offen lasst, fuehlt sich die eine Person leicht ueberfahren und die andere ausgebremst.";
  }
}

function buildDimensionComplementConsequence(
  dimension: NonNullable<FounderMatchingSelection["strongestComplement"]>["dimension"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return "Das macht euch breiter, wenn ihr gemeinsam festlegt, worauf ihr im Zweifel priorisiert.";
    case "Entscheidungslogik":
      return "Das hilft euch, wenn klar ist, wer wann den letzten Schritt macht und was davor noch geprueft werden soll.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Das traegt nur, wenn Zustaendigkeit und Sichtbarkeit sauber geregelt sind.";
    case "Commitment":
      return "Das traegt nur, wenn beide wissen, was wirklich erwartet ist und was bewusst nicht still mitgemeint ist.";
    case "Risikoorientierung":
      return "Das hilft nur, wenn ihr die Grenze gemeinsam setzt und nicht situativ verschiebt.";
    case "Konfliktstil":
      return "Das hilft nur, wenn ihr den Moment und die Form fuer Klaerung gemeinsam findet.";
  }
}

function buildStableBaseContext(
  dimension: NonNullable<FounderMatchingSelection["stableBase"]>["dimension"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return "Das gibt euch Ruhe bei Richtung und Prioritaeten.";
    case "Entscheidungslogik":
      return "Das spart Reibung, vor allem wenn es schnell gehen muss.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Das entlastet den Alltag, weil ihr aehnlich auf Abstimmung schaut.";
    case "Commitment":
      return "Das schafft Ruhe bei Erwartungen an Einsatz und Verfuegbarkeit.";
    case "Risikoorientierung":
      return "Das macht Risikoabwaegung und Absicherung deutlich leichter.";
    case "Konfliktstil":
      return "Das macht Klaerung leichter, weil ihr Spannung aehnlich angeht.";
  }
}

function buildSteeringQuestionForDimension(
  dimension: NonNullable<FounderMatchingSelection["biggestTension"]>["dimension"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return "Was hat fuer euch Vorrang, wenn Richtung, Wachstum und Stabilitaet nicht dasselbe nahelegen?";
    case "Entscheidungslogik":
      return "Was muss vorliegen, damit fuer euch eine Entscheidung wirklich reif ist?";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Was muss sichtbar sein, was darf eigenstaendig laufen und ab wann wird Abstimmung Pflicht?";
    case "Commitment":
      return "Was ist fuer euch realistisch verbindlich, wenn Zeit, Verantwortung und Einsatz auseinanderlaufen?";
    case "Risikoorientierung":
      return "Was gilt fuer euch noch als vertretbar, und ab wann geht Absicherung vor Tempo?";
    case "Konfliktstil":
      return "Was sprecht ihr sofort an, und was klaert ihr bewusst mit etwas Abstand?";
  }
}

function buildSupportSentenceForDimension(
  dimension: NonNullable<FounderMatchingSelection["stableBase"]>["dimension"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return "In eurer Unternehmenslogik liegt eine tragende gemeinsame Linie. Das gibt euch oft Halt bei Prioritaeten und Richtung, ohne schon jede spaetere Richtungsfrage vorwegzunehmen.";
    case "Entscheidungslogik":
      return "In eurer Entscheidungslogik liegt eine tragende gemeinsame Linie. Das spart oft Reibung unter Zeitdruck, solange ihr offene Sonderfaelle trotzdem markiert.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "In eurer Zusammenarbeit liegt eine tragende gemeinsame Linie. Das entlastet den Alltag, solange ihr sie nicht mit stiller Selbstverstaendlichkeit verwechselt.";
    case "Commitment":
      return "Beim Commitment liegt eine tragende gemeinsame Linie. Das schafft oft Ruhe bei Erwartungen, solange Zusatzlasten und Grenzverschiebungen sichtbar bleiben.";
    case "Risikoorientierung":
      return "Bei Risiko liegt eine tragende gemeinsame Linie. Das macht groessere Schritte berechenbarer, solange gemeinsame Ueber- oder Untersteuerung mitgedacht wird.";
    case "Konfliktstil":
      return "Im Umgang mit Spannung liegt eine tragende gemeinsame Linie. Das macht Klaerung oft leichter, ohne jeden schwierigen Moment automatisch einfach zu machen.";
  }
}

function buildComplementSupportSentence(
  dimension: NonNullable<FounderMatchingSelection["strongestComplement"]>["dimension"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return "Euer Unterschied in der Unternehmenslogik kann euch breiter machen, wenn ihr die Richtung trotzdem gemeinsam haltet und den Zielmassstab explizit macht.";
    case "Entscheidungslogik":
      return "Euer Unterschied in der Entscheidungslogik kann euch schneller und gruendlicher machen, wenn klar bleibt, wann Tempo hilft und wann mehr Pruefung noetig ist.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Euer Unterschied in der Zusammenarbeit kann produktiv sein, wenn Eigenraum und Sichtbarkeit bewusst aufeinander abgestimmt werden.";
    case "Commitment":
      return "Euer Unterschied beim Commitment kann tragen, wenn Einsatz nicht still vorausgesetzt, sondern bewusst gerahmt wird.";
    case "Risikoorientierung":
      return "Euer Unterschied beim Risiko kann euch vor Ueberzug und vor zu viel Vorsicht schuetzen, wenn eure Schwellen sichtbar bleiben.";
    case "Konfliktstil":
      return "Euer Unterschied im Konfliktstil kann Klaerung verbessern, wenn ihr Timing und Form bewusst fuehrt statt gegeneinander zu lesen.";
  }
}

function buildComplementOperationSentence(
  dimension: NonNullable<FounderMatchingSelection["strongestComplement"]>["dimension"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return "Das kann euch in der Praxis staerker machen: Eine Person schuetzt die Substanz, waehrend die andere Reichweite und Hebel oeffnet. So entstehen weniger blinde Flecken in strategischen Entscheidungen.";
    case "Entscheidungslogik":
      return "Das kann Entscheidungen verbessern: Eine Person prueft gruendlicher, die andere bringt Tempo. Wenn klar ist, wer vorbereitet und wer entscheidet, wird daraus keine Spannung, sondern Qualitaet.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Das kann eure Zusammenarbeit stabiler machen: Eine Person haelt Eigenverantwortung hoch, die andere sorgt fuer Sichtbarkeit. Wenn ihr das klar regelt, entsteht weder Mikromanagement noch Blindflug.";
    case "Commitment":
      return "Das kann euch im Alltag gut tun: Eine Person haelt den Zug hoch, die andere schuetzt vor Ueberdehnung. So bleibt Einsatz verbindlich, ohne still unfair zu werden.";
    case "Risikoorientierung":
      return "Das kann Entscheidungen robuster machen: Eine Person oeffnet Chancen, die andere prueft Folgen und Grenzen. So koennt ihr mutig bleiben, ohne leichtfertig zu werden.";
    case "Konfliktstil":
      return "Das kann eure Klaerung besser machen: Eine Person bringt Direktheit, die andere Ordnung in die Spannung. So koennt ihr Themen klarer ansprechen, ohne jedes Gespraech zu ueberhitzen.";
  }
}

function buildSharedStrengthSentence(
  dimension: NonNullable<FounderMatchingSelection["stableBase"]>["dimension"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return "Diese gemeinsame Linie kann zu einer echten Staerke werden, weil ihr bei Richtung und Prioritaeten schneller auf einen gemeinsamen Kurs kommt, ohne jedes Mal bei null zu beginnen.";
    case "Entscheidungslogik":
      return "Diese gemeinsame Linie kann zu einer echten Staerke werden, weil ihr unter Druck nicht erst den Entscheidungsweg neu aushandeln muesst.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Diese gemeinsame Linie kann zu einer echten Staerke werden, weil ihr im Alltag weniger Energie an unnötige Abstimmung verliert.";
    case "Commitment":
      return "Diese gemeinsame Linie kann zu einer echten Staerke werden, weil Einsatz und Verbindlichkeit fuer euch aehnlich lesbar bleiben.";
    case "Risikoorientierung":
      return "Diese gemeinsame Linie kann zu einer echten Staerke werden, weil ihr grosse Schritte und Grenzen auf einer aehnlichen Grundlage bewertet.";
    case "Konfliktstil":
      return "Diese gemeinsame Linie kann zu einer echten Staerke werden, weil ihr Spannungen aehnlich ansprecht und dadurch Klarung leichter anschlussfaehig bleibt.";
  }
}

function buildRiskSentenceForDimension(
  dimension: NonNullable<FounderMatchingSelection["biggestTension"]>["dimension"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return "Euer groesster Klaerungsbedarf liegt in der Unternehmenslogik. Wenn ihr das offen lasst, koennt ihr dieselbe Prioritaet an verschiedenen Zielen ausrichten.";
    case "Entscheidungslogik":
      return "Euer groesster Klaerungsbedarf liegt in der Entscheidungslogik. Wenn ihr das offen lasst, koennt ihr aneinander vorbei entscheiden oder dieselbe Entscheidung mehrfach fuehren.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Euer groesster Klaerungsbedarf liegt in der Zusammenarbeit im Alltag. Wenn ihr das offen lasst, entsteht Reibung eher ueber Uebergaenge und Sichtbarkeit als ueber offene Konfrontation.";
    case "Commitment":
      return "Euer groesster Klaerungsbedarf liegt beim Commitment. Wenn ihr das offen lasst, werden Einsatz, Verfuegbarkeit und Fairness leicht zum Dauerthema.";
    case "Risikoorientierung":
      return "Euer groesster Klaerungsbedarf liegt beim Risiko. Wenn ihr das offen lasst, kann dieselbe Chance fuer die eine Person zu eng und fuer die andere zu offen wirken.";
    case "Konfliktstil":
      return "Euer groesster Klaerungsbedarf liegt im Umgang mit Spannung. Wenn ihr das offen lasst, werden Themen entweder zu spaet oder in unpassender Form bearbeitet.";
  }
}

function buildCentralPatternSections(selection: FounderMatchingSelection) {
  const biggestTensionStatus =
    selection.biggestTension &&
    selection.dimensionStatuses.find((entry) => entry.dimension === selection.biggestTension?.dimension);

  const kernspannung = selection.heroSelection.mode === "blind_spot_watch"
    ? selection.heroSelection.biggestRisk
      ? `Der Kern liegt in einer gemeinsamen Tendenz rund um ${selection.heroSelection.biggestRisk.dimension}. Gerade weil sie sich zunaechst stabil anfühlen kann, braucht sie bewusste Aufmerksamkeit.`
      : "Der Kern liegt in einer gemeinsamen Tendenz, die sich zuerst tragend anfühlt und gerade deshalb leicht zu spät geprüft wird."
    : selection.biggestTension
      ? `${selection.biggestTension.dimension} ist der Punkt, an dem ihr nicht automatisch nach denselben Massstaeben schaut.`
      : selection.strongestComplement
        ? `Euer staerkster Unterschied liegt in ${selection.strongestComplement.dimension} und kann euch breiter machen, wenn ihr ihn bewusst fuehrt.`
        : selection.stableBase
          ? `Eure gemeinsame Basis in ${selection.stableBase.dimension} ist tragfaehig, aber kein Ersatz fuer klare Regeln an offenen Punkten.`
          : "Ihr habt genug gemeinsame Linie fuer Zusammenarbeit, aber nicht genug Gleichlauf fuer stilles Verstaendnis.";

  const auswirkungImAlltag = selection.heroSelection.mode === "blind_spot_watch"
    ? selection.heroSelection.biggestRisk
      ? `Im Alltag zeigt sich das oft nicht als offene Reibung, sondern als spaete Irritation rund um ${selection.heroSelection.biggestRisk.dimension}: Beide gehen zunaechst von derselben Selbstverstaendlichkeit aus, bis eine Grenze ploetzlich doch nicht geteilt ist.`
      : "Im Alltag zeigt sich das nicht in grossen Szenen, sondern darin, dass kleine Abweichungen lange unter gemeinsamer Naehe mitlaufen."
    : selection.biggestTension
      ? buildEverydayImpactSentenceForDimension(selection.biggestTension.dimension)
      : selection.strongestComplement
        ? buildComplementEverydayImpactSentence(selection.strongestComplement.dimension)
        : "Im Alltag zeigt sich das nicht in grossen Szenen, sondern in Prioritaeten, Timing und unausgesprochenen Erwartungen.";

  const konsequenzOhneKlaerung = selection.heroSelection.mode === "blind_spot_watch"
    ? selection.heroSelection.biggestRisk
      ? `Ohne bewusste Klaerung kann aus gemeinsamer Naehe rund um ${selection.heroSelection.biggestRisk.dimension} ein Blind Spot werden: Nicht weil ihr offen gegeneinander arbeitet, sondern weil niemand merkt, wann der gemeinsame Modus nicht mehr traegt.`
      : "Ohne bewusste Klaerung entsteht kein lauter Konflikt, sondern spaeter eine Ueberraschung ueber Regeln, von denen beide dachten, sie seien geteilt."
    : selection.biggestTension && biggestTensionStatus
      ? buildDimensionConsequence(selection.biggestTension.dimension, biggestTensionStatus.status)
      : selection.strongestComplement
        ? buildDimensionComplementConsequence(selection.strongestComplement.dimension)
        : "Ohne bewusste Klaerung entstehen unterschiedliche Massstaebe genau dort, wo ihr gemeinsam tragen und entscheiden muesst.";

  return [
    { label: "Kernspannung", body: kernspannung },
    { label: "Auswirkung im Alltag", body: auswirkungImAlltag },
    { label: "Konsequenz ohne Klaerung", body: konsequenzOhneKlaerung },
  ];
}

function buildEverydayImpactSentenceForDimension(
  dimension: NonNullable<FounderMatchingSelection["biggestTension"]>["dimension"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return "Im Alltag zeigt sich das oft dort, wo ihr dieselbe Chance oder Prioritaet unterschiedlich bewertet.";
    case "Entscheidungslogik":
      return "Im Alltag zeigt sich das oft dort, wo Tempo gefragt ist und ihr nicht dieselbe Schwelle fuer Klarheit habt.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Im Alltag zeigt sich das daran, dass Sichtbarkeit, Eigenraum und Abstimmung nicht gleich verstanden werden.";
    case "Commitment":
      return "Im Alltag zeigt sich das oft dort, wo Einsatz, Verfuegbarkeit und Verantwortung unterschiedlich gelesen werden.";
    case "Risikoorientierung":
      return "Im Alltag zeigt sich das oft dort, wo eine Person frueher handeln will und die andere frueher absichert.";
    case "Konfliktstil":
      return "Im Alltag zeigt sich das oft dort, wo Spannung aufkommt und ihr nicht dieselbe Form fuer Klaerung erwartet.";
  }
}

function buildComplementEverydayImpactSentence(
  dimension: NonNullable<FounderMatchingSelection["strongestComplement"]>["dimension"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return "Im Alltag koennt ihr dadurch zugleich Substanz schuetzen und Chancen frueher sehen, wenn ihr dieselbe Richtung sauber haltet.";
    case "Entscheidungslogik":
      return "Im Alltag koennt ihr dadurch gruendlicher und zugleich schneller entscheiden als mit nur einer Logik.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Im Alltag koennt ihr dadurch Eigenverantwortung und gemeinsame Orientierung besser verbinden.";
    case "Commitment":
      return "Im Alltag koennt ihr dadurch Zug halten, ohne Grenzen und Realismus zu verlieren.";
    case "Risikoorientierung":
      return "Im Alltag koennt ihr dadurch Chancen oeffnen, ohne Folgen und Absicherung zu unterschaetzen.";
    case "Konfliktstil":
      return "Im Alltag koennt ihr dadurch Themen klarer ansprechen und zugleich besser sortieren.";
  }
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
