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
  const agreements = buildFounderMatchingAgreements(selection);
  const markers = buildFounderMatchingMarkers(compareResult, selection, effectiveTeamContext);
  const valuesBlock = buildFounderValuesBlockFromProfiles(valuesProfileA, valuesProfileB);
  const markerA = buildMarkerLabel(participantAName);
  const markerB = buildMarkerLabel(participantBName);
  const heroHeadline = buildMatchHeadline(selection);
  const heroSentences = splitIntoParagraphs(hero);
  const heroLead = heroSentences[0] ?? "";
  const heroSupport = buildCentralPatternParagraphs(selection, heroSentences);
  const everydaySituations = buildEverydaySituations(selection);
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

function buildMatchHeadline(selection: FounderMatchingSelection) {
  switch (selection.heroSelection.mode) {
    case "tension_led":
      return "Ihr werdet euch nicht erst spaeter reiben. Sondern direkt im Alltag.";
    case "complement_led":
      return "Euer Unterschied kann euch tragen. Oder frueh gegeneinander arbeiten.";
    case "coordination_led":
      return "Euer Problem ist nicht Streit. Euer Problem ist stiller Zugverlust.";
    case "blind_spot_watch":
      return "Bei euch kommt der Konflikt nicht zuerst. Sondern die stille Drift.";
    case "alignment_led":
    default:
      return "Ihr habt viel gemeinsame Linie. Gerade deshalb merkt ihr Unterschiede spaet.";
  }
}

function buildIntroSummary(selection: FounderMatchingSelection) {
  switch (selection.heroSelection.mode) {
    case "tension_led":
      return selection.biggestTension
        ? `Der Hauptpunkt liegt in ${selection.biggestTension.dimension}.`
        : "Bei euch entsteht Reibung frueh.";
    case "complement_led":
      return selection.strongestComplement
        ? `Die staerkste Chance liegt in ${selection.strongestComplement.dimension}.`
        : "Bei euch liegt die Chance in einem echten Unterschied.";
    case "coordination_led":
      return selection.biggestTension
        ? `Der Hauptpunkt liegt in ${selection.biggestTension.dimension}.`
        : "Bei euch wird Reibung eher still als laut.";
    case "blind_spot_watch":
      return selection.heroSelection.biggestRisk
        ? `Das Risiko liegt in ${selection.heroSelection.biggestRisk.dimension}.`
        : "Bei euch wirkt vieles erst einmal nah. Das Risiko liegt in stiller Drift.";
    case "alignment_led":
    default:
      return selection.stableBase
        ? `Eure tragende Basis liegt in ${selection.stableBase.dimension}.`
        : "Bei euch gibt es eine tragende Linie.";
  }
}

function buildIntroContext(selection: FounderMatchingSelection) {
  switch (selection.heroSelection.mode) {
    case "tension_led":
      return selection.biggestTension
        ? `${buildDimensionConsequence(selection.biggestTension.dimension, selection.biggestTension.status)}`
        : "Das wird im Alltag schnell sichtbar.";
    case "complement_led":
      return selection.strongestComplement
        ? `${buildDimensionComplementConsequence(selection.strongestComplement.dimension)}`
        : "Das kann euch breiter machen. Von selbst traegt es aber nicht.";
    case "coordination_led":
      return selection.biggestTension
        ? `${buildDimensionConsequence(selection.biggestTension.dimension, selection.biggestTension.status)}`
        : "Das kostet selten offen Energie. Es kostet eher Tempo und Klarheit.";
    case "blind_spot_watch":
      return "Der Punkt ist nicht offener Streit. Der Punkt ist, dass ihr Unterschiede zu spaet merkt.";
    case "alignment_led":
    default:
      return selection.stableBase
        ? `${buildStableBaseContext(selection.stableBase.dimension)}`
        : "Das gibt euch Ruhe. Es ersetzt aber keine Klarheit dort, wo ihr unterschiedlich priorisiert oder entscheidet.";
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
  status: FounderMatchingSelection["dimensionStatuses"][number]["status"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      switch (status) {
        case "nah":
          return "Hier wollt ihr unternehmerisch in eine aehnliche Richtung.";
        case "ergänzend":
          return "Hier schaut ihr auf unterschiedliche Hebel.";
        case "abstimmung_nötig":
          return "Hier priorisiert ihr nicht automatisch dasselbe.";
        case "kritisch":
          return "Hier geht es nicht um Stil. Hier geht es um Richtung.";
      }
    case "Entscheidungslogik":
      switch (status) {
        case "nah":
          return "Hier kommt ihr ueber einen aehnlichen Weg zu Entscheidungen.";
        case "ergänzend":
          return "Hier bringt eine Person mehr Analyse, die andere mehr Urteil.";
        case "abstimmung_nötig":
          return "Hier entscheidet ihr nicht nach denselben Kriterien.";
        case "kritisch":
          return "Hier blockiert euch nicht das Thema, sondern der Weg dorthin.";
      }
    case "Arbeitsstruktur & Zusammenarbeit":
      switch (status) {
        case "nah":
          return "Hier habt ihr ein aehnliches Bild von Zusammenarbeit.";
        case "ergänzend":
          return "Hier bringt eine Person mehr Eigenraum, die andere mehr Sichtbarkeit.";
        case "abstimmung_nötig":
          return "Hier meint ihr nicht dasselbe mit Zusammenarbeit.";
        case "kritisch":
          return "Hier kollidiert euer Arbeitsmodus direkt.";
      }
    case "Commitment":
      switch (status) {
        case "nah":
          return "Hier liegt euer Einsatzniveau nah beieinander.";
        case "ergänzend":
          return "Hier bringt eine Person mehr Zug, die andere mehr Begrenzung.";
        case "abstimmung_nötig":
          return "Hier meint ihr nicht dasselbe mit Einsatz.";
        case "kritisch":
          return "Hier geht es nicht um Motivation, sondern um Grundannahmen.";
      }
    case "Risikoorientierung":
      switch (status) {
        case "nah":
          return "Hier ist eure Risikoschwelle aehnlich.";
        case "ergänzend":
          return "Hier oeffnet eine Person eher Chancen, die andere eher Grenzen.";
        case "abstimmung_nötig":
          return "Hier ist fuer euch nicht dasselbe mutig oder vertretbar.";
        case "kritisch":
          return "Hier bewertet ihr Risiko grundlegend anders.";
      }
    case "Konfliktstil":
      switch (status) {
        case "nah":
          return "Hier habt ihr ein aehnliches Tempo im Umgang mit Spannung.";
        case "ergänzend":
          return "Hier sortiert eine Person eher, waehrend die andere direkt wird.";
        case "abstimmung_nötig":
          return "Hier klaert ihr Spannungen nicht gleich.";
        case "kritisch":
          return "Hier trefft ihr im Konflikt nicht dieselbe Sprache.";
      }
  }
}

function buildSteeringPoints(markers: ReturnType<typeof buildFounderMatchingMarkers>, agreements: string[]) {
  const markerPoints = [
    markers.primary?.dimension
      ? buildSteeringPointForDimension(markers.primary.dimension)
      : null,
    ...markers.secondary.map((marker) =>
      marker.dimension ? buildSteeringPointForDimension(marker.dimension) : null
    ),
  ].filter((entry): entry is string => Boolean(entry));

  const agreementPoints = agreements.map((entry) => sharpenAgreementSentence(entry));

  return Array.from(new Set([...markerPoints, ...agreementPoints])).slice(0, 4);
}

function buildSupportingPoints(selection: FounderMatchingSelection) {
  const points: string[] = [];

  if (selection.stableBase) {
    points.push(buildSupportSentenceForDimension(selection.stableBase.dimension));
  }

  if (selection.strongestComplement) {
    points.push(buildComplementSupportSentence(selection.strongestComplement.dimension));
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
        return "Was heisst fuer euch verbindlicher Einsatz im Alltag konkret?";
      case "Arbeitsstruktur & Zusammenarbeit":
        return "Was muss sichtbar sein, und was darf jede Person eigenstaendig loesen?";
      case "Konfliktstil":
        return "Was sprecht ihr sofort an, und was klaert ihr erst mit Abstand?";
      case "Entscheidungslogik":
        return "Wer bereitet Entscheidungen vor, und wer hat am Ende das letzte Wort?";
      case "Unternehmenslogik":
        return "Wonach priorisiert ihr, wenn Wachstum, Wirkung und Aufbau gegeneinander laufen?";
      case "Risikoorientierung":
        return "Welche Wetten sind fuer euch vertretbar, und wo zieht ihr die Grenze?";
    }
  });

  return Array.from(new Set(questions)).slice(0, 5);
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
      body: "Dann reichen gute Absichten nicht. Dann werden Regeln sichtbar oder ihr merkt, dass sie fehlen.",
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
        body: "Dann wird sichtbar, ob ihr auf dieselben Ziele hinarbeitet. Wenn ihr das nicht geklaert habt, zieht ihr am selben Thema in verschiedene Richtungen.",
      };
    case "Entscheidungslogik":
      return {
        title: "Wenn schnell entschieden werden muss",
        body: "Dann zeigt sich, ob fuer euch dieselben Kriterien zaehlen. Sonst wird aus Tempo schnell eine Schleife.",
      };
    case "Arbeitsstruktur & Zusammenarbeit":
      return {
        title: "Wenn Arbeit parallel laeuft",
        body: "Dann wird sichtbar, was fuer euch Abstimmung heisst. Sonst fuehlt sich die eine Person kontrolliert und die andere allein gelassen.",
      };
    case "Commitment":
      return {
        title: "Wenn Wochen voll werden",
        body: "Dann merkt ihr, ob ihr mit Einsatz dasselbe meint. Sonst wird aus Tempo schnell ein Streit ueber Erwartung und Verantwortung.",
      };
    case "Risikoorientierung":
      return {
        title: "Wenn eine Wette ansteht",
        body: "Dann zeigt sich, was fuer euch vertretbar ist. Sonst zieht die eine Person an, waehrend die andere bremst.",
      };
    case "Konfliktstil":
      return {
        title: "Wenn etwas schieflaeuft",
        body: "Dann merkt ihr, ob ihr Spannungen gleich klaeren wollt. Sonst fuehlt sich die eine Person ueberfahren und die andere ausgebremst.",
      };
  }
}

function buildDimensionConsequence(
  dimension: NonNullable<FounderMatchingSelection["biggestTension"]>["dimension"],
  status: FounderMatchingSelection["dimensionStatuses"][number]["status"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return status === "kritisch"
        ? "Wenn ihr das nicht klaert, baut ihr am selben Unternehmen mit verschiedenen Logiken."
        : "Wenn ihr das offen lasst, arbeitet ihr an verschiedenen Zielen.";
    case "Entscheidungslogik":
      return status === "kritisch"
        ? "Ohne klare Regel entscheidet ihr aneinander vorbei."
        : "Wenn ihr das offen lasst, dreht ihr Schleifen statt zu entscheiden.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return status === "kritisch"
        ? "Ohne klare Regeln wird aus Alltag direkt Reibung."
        : "Wenn ihr das nicht klaert, fuehlt sich die eine Person allein gelassen und die andere kontrolliert.";
    case "Commitment":
      return status === "kritisch"
        ? "Ohne klare Abmachung wird Commitment zum Dauerthema."
        : "Wenn ihr das nicht klaert, entsteht Frust ueber Tempo, Verfuegbarkeit und Verantwortung.";
    case "Risikoorientierung":
      return status === "kritisch"
        ? "Ohne klare Leitplanke zieht die eine Person an und die andere bremst."
        : "Wenn ihr das offen lasst, kippen Wetten oder werden zu frueh abgebrochen.";
    case "Konfliktstil":
      return status === "kritisch"
        ? "Ohne Regel dazu eskalieren Kleinigkeiten oder bleiben zu lange liegen."
        : "Wenn ihr das offen lasst, fuehlt sich die eine Person ueberfahren und die andere ausgebremst.";
  }
}

function buildDimensionComplementConsequence(
  dimension: NonNullable<FounderMatchingSelection["strongestComplement"]>["dimension"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return "Das macht euch breiter, wenn ihr gemeinsam festlegt, worauf ihr am Ende priorisiert.";
    case "Entscheidungslogik":
      return "Das hilft euch nur, wenn klar ist, wer wann den letzten Schritt macht.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Das traegt nur, wenn Zuständigkeit und Sichtbarkeit sauber geregelt sind.";
    case "Commitment":
      return "Das traegt nur, wenn beide wissen, was wirklich erwartet ist und was nicht.";
    case "Risikoorientierung":
      return "Das hilft nur, wenn ihr die Grenze gemeinsam setzt und nicht situativ verschiebt.";
    case "Konfliktstil":
      return "Das hilft nur, wenn ihr den richtigen Moment fuer Klaerung gemeinsam findet.";
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
      return "Das macht Wetten und Absicherung deutlich leichter.";
    case "Konfliktstil":
      return "Das macht Klaerung leichter, weil ihr Spannung aehnlich angeht.";
  }
}

function buildSteeringPointForDimension(
  dimension: NonNullable<FounderMatchingSelection["biggestTension"]>["dimension"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return "Legt fest, wonach ihr priorisiert, wenn Richtung und Wachstum nicht dasselbe nahelegen.";
    case "Entscheidungslogik":
      return "Legt fest, wer Entscheidungen vorbereitet und wann genug geprueft ist.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Legt fest, was sichtbar sein muss und wo Eigenraum beginnt.";
    case "Commitment":
      return "Legt fest, welches Einsatzniveau ihr wirklich voneinander erwartet.";
    case "Risikoorientierung":
      return "Legt fest, welche Wetten fuer euch vertretbar sind und wo Absicherung vorgeht.";
    case "Konfliktstil":
      return "Legt fest, was sofort angesprochen wird und was ihr mit Abstand klaert.";
  }
}

function buildSupportSentenceForDimension(
  dimension: NonNullable<FounderMatchingSelection["stableBase"]>["dimension"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return "In eurer Unternehmenslogik liegt eine tragende gemeinsame Linie. Das gibt euch Halt bei Prioritaeten.";
    case "Entscheidungslogik":
      return "In eurer Entscheidungslogik liegt eine tragende gemeinsame Linie. Das spart Reibung unter Zeitdruck.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "In eurer Zusammenarbeit liegt eine tragende gemeinsame Linie. Das entlastet den Alltag.";
    case "Commitment":
      return "Beim Commitment liegt eine tragende gemeinsame Linie. Das schafft Ruhe bei Erwartungen.";
    case "Risikoorientierung":
      return "Bei Risiko liegt eine tragende gemeinsame Linie. Das macht Wetten berechenbarer.";
    case "Konfliktstil":
      return "Im Umgang mit Spannung liegt eine tragende gemeinsame Linie. Das macht Klaerung leichter.";
  }
}

function buildComplementSupportSentence(
  dimension: NonNullable<FounderMatchingSelection["strongestComplement"]>["dimension"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return "Euer Unterschied in der Unternehmenslogik kann euch breiter machen, wenn ihr die Richtung trotzdem gemeinsam haltet.";
    case "Entscheidungslogik":
      return "Euer Unterschied in der Entscheidungslogik kann euch schneller und gruendlicher machen, wenn die Rollen klar sind.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Euer Unterschied in der Zusammenarbeit kann gut sein, wenn Eigenraum und Sichtbarkeit zusammenpassen.";
    case "Commitment":
      return "Euer Unterschied beim Commitment kann tragen, wenn Einsatz nicht still vorausgesetzt wird.";
    case "Risikoorientierung":
      return "Euer Unterschied beim Risiko kann euch vor blinden Wetten und vor zu viel Vorsicht schuetzen.";
    case "Konfliktstil":
      return "Euer Unterschied im Konfliktstil kann Klaerung verbessern, wenn ihr Timing und Form bewusst fuehrt.";
  }
}

function buildRiskSentenceForDimension(
  dimension: NonNullable<FounderMatchingSelection["biggestTension"]>["dimension"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return "Euer groesster Reibungspunkt ist die Unternehmenslogik. Wenn ihr das nicht klaert, arbeitet ihr an verschiedenen Zielen.";
    case "Entscheidungslogik":
      return "Euer groesster Reibungspunkt ist die Entscheidungslogik. Wenn ihr das nicht klaert, entscheidet ihr aneinander vorbei.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Euer groesster Reibungspunkt ist die Zusammenarbeit im Alltag. Wenn ihr das nicht klaert, kippt Alltag schnell in Reibung.";
    case "Commitment":
      return "Euer groesster Reibungspunkt ist Commitment. Wenn ihr das nicht klaert, wird Einsatz zum Dauerthema.";
    case "Risikoorientierung":
      return "Euer groesster Reibungspunkt ist Risiko. Wenn ihr das nicht klaert, zieht eine Person an und die andere bremst.";
    case "Konfliktstil":
      return "Euer groesster Reibungspunkt ist der Umgang mit Spannung. Wenn ihr das nicht klaert, eskalieren Kleinigkeiten oder bleiben liegen.";
  }
}

function sharpenAgreementSentence(sentence: string) {
  if (sentence.startsWith("Ihr braucht eine klare Regel dafür, ")) {
    return sentence.replace("Ihr braucht eine klare Regel dafür, ", "");
  }
  if (sentence.startsWith("Es sollte eindeutig sein, ")) {
    return sentence.replace("Es sollte eindeutig sein, ", "");
  }
  return sentence;
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
