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
import { buildFounderMatchingAgreements } from "@/features/reporting/founderMatchingTextBuilder";
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
  const agreements = buildFounderMatchingAgreements(selection);
  const markers = buildFounderMatchingMarkers(compareResult, selection, effectiveTeamContext);
  const valuesBlock = buildFounderValuesBlockFromProfiles(valuesProfileA, valuesProfileB);
  const markerA = buildMarkerLabel(participantAName);
  const markerB = buildMarkerLabel(participantBName);
  const everydaySituations = buildEverydaySituations(selection);
  const steeringPoints = buildSteeringPoints(markers, agreements);
  const opportunityPoints = buildOpportunityPoints(selection);
  const clarificationQuestions = buildClarificationQuestions(selection);

  return (
    <>
      <section className="page-section rounded-[28px] border border-slate-200/80 bg-white/96 p-8 shadow-[0_18px_60px_rgba(15,23,42,0.05)] print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="max-w-4xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Matching-Report</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-5xl">
              {t("Ihr werdet euch nicht erst später reiben, sondern direkt im Alltag.")}
            </h1>
            <div className="mt-5 max-w-3xl space-y-3 text-[15px] leading-8 text-slate-700">
              <p>
                {t(
                  "Eure Unterschiede zeigen sich nicht im Umgang, sondern in der Art, wie ihr Entscheidungen trefft und Arbeit strukturiert."
                )}
              </p>
              <p>
                {t(
                  "Wenn ihr das nicht bewusst klärt, entstehen unterschiedliche Maßstäbe an zentralen Punkten."
                )}
              </p>
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
        <div className="mt-6 max-w-4xl">
          <p className="text-lg font-semibold leading-8 text-slate-950">
            {t("Der Kern liegt in eurer Unternehmenslogik.")}
          </p>
          <p className="mt-4 text-[15px] leading-7 text-slate-700">
            {t("Ihr bewertet Richtung und Prioritäten nicht nach denselben Maßstäben.")}
          </p>
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
                  {t(buildDimensionReading(meta.canonicalName, status?.status ?? "nah"))}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {t(buildDimensionBusinessMeaning(meta.canonicalName, status?.status ?? "nah"))}
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
      return "Ihr werdet euch nicht erst spaeter reiben, sondern direkt im Alltag.";
    case "complement_led":
      return "Euer Unterschied kann euch tragen oder frueh gegeneinander arbeiten.";
    case "coordination_led":
      return "Euer Problem ist nicht Streit, sondern stiller Zugverlust.";
    case "blind_spot_watch":
      return "Bei euch kommt der Konflikt nicht zuerst, sondern die stille Drift.";
    case "alignment_led":
    default:
      return "Ihr habt viel gemeinsame Linie. Gerade deshalb merkt ihr Unterschiede spaet.";
  }
}

function buildIntroSummary(selection: FounderMatchingSelection) {
  switch (selection.heroSelection.mode) {
    case "tension_led":
      return "Euer Konflikt sitzt nicht im Ton, sondern in eurer Arbeitslogik.";
    case "complement_led":
      return "Euer Unterschied ist zugleich Chance und Belastung.";
    case "coordination_led":
      return "Bei euch geht eher Tempo verloren als Vertrauen.";
    case "blind_spot_watch":
      return "Bei euch entsteht das Problem frueher, als ihr es bemerkt.";
    case "alignment_led":
    default:
      return "Vieles wirkt bei euch tragfaehig, bis ein offener Punkt Wirkung bekommt.";
  }
}

function buildIntroContext(selection: FounderMatchingSelection) {
  switch (selection.heroSelection.mode) {
    case "tension_led":
      return selection.biggestTension
        ? `Der staerkste Unterschied liegt in ${selection.biggestTension.dimension}. Wenn ihr das nicht klaert, arbeitet ihr an zentralen Punkten nicht nach denselben Massstaeben.`
        : "Der Unterschied wird im Alltag schnell sichtbar.";
    case "complement_led":
      return selection.strongestComplement
        ? `Die staerkste Chance liegt in ${selection.strongestComplement.dimension}. Sie traegt nur dann, wenn ihr den Unterschied bewusst fuehrt.`
        : "Der Unterschied kann euch breiter machen, traegt aber nicht von selbst.";
    case "coordination_led":
      return selection.biggestTension
        ? `Der staerkste Verlustpunkt liegt in ${selection.biggestTension.dimension}. Das bremst euch nicht laut, sondern ueber Schleifen, Nachziehen und Unklarheit.`
        : "Das kostet selten offen Energie, aber oft Tempo und Klarheit.";
    case "blind_spot_watch":
      return selection.heroSelection.biggestRisk
        ? `Die heikelste Stelle liegt in ${selection.heroSelection.biggestRisk.dimension}. Gerade weil ihr euch in vielem aehnlich seid, merkt ihr Unterschiede dort oft zu spaet.`
        : "Gerade weil ihr euch in vielem aehnlich seid, merkt ihr Unterschiede oft zu spaet.";
    case "alignment_led":
    default:
      return selection.stableBase
        ? `${buildStableBaseContext(selection.stableBase.dimension)} Gleichzeitig reicht diese Basis nicht aus, wenn ihr offene Punkte nicht ausdruecklich klaert.`
        : "Die gemeinsame Linie gibt euch Ruhe, ersetzt aber keine Klarheit dort, wo ihr unterschiedlich priorisiert oder entscheidet.";
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
  status: FounderMatchingSelection["dimensionStatuses"][number]["status"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      switch (status) {
        case "nah":
          return "Ihr richtet das Unternehmen in eine aehnliche Richtung aus.";
        case "ergänzend":
          return "Ihr schaut auf unterschiedliche Hebel, nicht auf dasselbe Ziel.";
        case "abstimmung_nötig":
          return "Ihr priorisiert nicht automatisch dasselbe.";
        case "kritisch":
          return "Ihr arbeitet hier nicht auf dieselbe Richtung hin.";
      }
    case "Entscheidungslogik":
      switch (status) {
        case "nah":
          return "Ihr kommt ueber einen aehnlichen Weg zu Entscheidungen.";
        case "ergänzend":
          return "Eine Person bringt mehr Analyse, die andere mehr Urteil.";
        case "abstimmung_nötig":
          return "Ihr entscheidet nicht nach denselben Kriterien.";
        case "kritisch":
          return "Nicht das Thema blockiert euch, sondern der Weg zur Entscheidung.";
      }
    case "Arbeitsstruktur & Zusammenarbeit":
      switch (status) {
        case "nah":
          return "Ihr habt ein aehnliches Bild davon, wie Zusammenarbeit laufen soll.";
        case "ergänzend":
          return "Eine Person bringt mehr Eigenraum, die andere mehr Sichtbarkeit.";
        case "abstimmung_nötig":
          return "Ihr meint nicht dasselbe mit guter Zusammenarbeit.";
        case "kritisch":
          return "Eure Arbeitsweisen kollidieren im Alltag direkt.";
      }
    case "Commitment":
      switch (status) {
        case "nah":
          return "Euer Einsatzniveau liegt nah beieinander.";
        case "ergänzend":
          return "Eine Person bringt mehr Zug, die andere mehr Begrenzung.";
        case "abstimmung_nötig":
          return "Ihr meint nicht dasselbe mit Einsatz.";
        case "kritisch":
          return "Ihr bringt unterschiedliche Grundannahmen zu Einsatz und Verbindlichkeit mit.";
      }
    case "Risikoorientierung":
      switch (status) {
        case "nah":
          return "Eure Risikoschwelle ist aehnlich.";
        case "ergänzend":
          return "Eine Person oeffnet eher Chancen, die andere setzt eher Grenzen.";
        case "abstimmung_nötig":
          return "Fuer euch ist nicht dasselbe mutig oder vertretbar.";
        case "kritisch":
          return "Ihr bewertet Risiko grundlegend anders.";
      }
    case "Konfliktstil":
      switch (status) {
        case "nah":
          return "Ihr habt ein aehnliches Tempo im Umgang mit Spannung.";
        case "ergänzend":
          return "Eine Person sortiert eher, waehrend die andere direkt wird.";
        case "abstimmung_nötig":
          return "Ihr klaert Spannungen nicht auf dieselbe Weise.";
        case "kritisch":
          return "Im Konflikt sprecht ihr nicht dieselbe Sprache.";
      }
  }
}

function buildDimensionExplanation(dimension: string) {
  switch (dimension) {
    case "Unternehmenslogik":
      return "Hier geht es um die Richtung des Unternehmens und darum, woran ihr Wachstum, Stabilitaet und Wirkung messt.";
    case "Entscheidungslogik":
      return "Hier geht es darum, wie Entscheidungen zustande kommen und wann fuer euch etwas als ausreichend geklaert gilt.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Hier geht es um Sichtbarkeit, Eigenraum und darum, wie eng ihr im Alltag zusammenarbeitet.";
    case "Commitment":
      return "Hier geht es um Einsatz, Verfuegbarkeit und darum, was fuer euch verbindlich mitgetragen wird.";
    case "Risikoorientierung":
      return "Hier geht es darum, was fuer euch vertretbar ist und wann Vorsicht oder Wagnis Vorrang haben.";
    case "Konfliktstil":
      return "Hier geht es darum, wie schnell ihr Spannung ansprecht und in welcher Form ihr sie klaert.";
    default:
      return "";
  }
}

function buildDimensionBusinessMeaning(
  dimension: string,
  status: FounderMatchingSelection["dimensionStatuses"][number]["status"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return status === "nah"
        ? "Das macht Kursentscheidungen leichter."
        : "Das beeinflusst, wie ihr Chancen bewertet und wann ihr den Kurs aendert.";
    case "Entscheidungslogik":
      return status === "nah"
        ? "Das spart Zeit bei Entscheidungen unter Druck."
        : "Das entscheidet darueber, ob ihr schnell vorankommt oder euch in Schleifen festfahrt.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return status === "nah"
        ? "Das entlastet eure Zusammenarbeit im Alltag."
        : "Das praegt, wie viel Abstimmung euch traegt und ab wann sie euch bremst.";
    case "Commitment":
      return status === "nah"
        ? "Das schafft Ruhe bei Erwartungen an Einsatz und Tempo."
        : "Das beeinflusst, wie fair Verantwortung, Verfuegbarkeit und Druck erlebt werden.";
    case "Risikoorientierung":
      return status === "nah"
        ? "Das erleichtert Investitionen, Richtungswechsel und Stop-Entscheidungen."
        : "Das praegt, welche Schritte ihr wagt und wo fuer euch die Bremse greifen muss.";
    case "Konfliktstil":
      return status === "nah"
        ? "Das erleichtert Klaerung, wenn es schwierig wird."
        : "Das bestimmt, ob Spannungen frueh bearbeitet oder gegenseitig falsch gelesen werden.";
    default:
      return "";
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
        body: "Ihr muesst Prioritaeten, Ziele und Richtung klaeren, sonst zieht ihr am selben Thema in verschiedene Richtungen.",
      };
    case "Entscheidungslogik":
      return {
        title: "Wenn schnell entschieden werden muss",
        body: "Ihr braucht klare Entscheidungskriterien, sonst wird aus Tempo schnell eine Schleife.",
      };
    case "Arbeitsstruktur & Zusammenarbeit":
      return {
        title: "Wenn Arbeit parallel laeuft",
        body: "Ihr muesst festlegen, was sichtbar sein muss und was eigenstaendig laufen darf, sonst fuehlt sich die eine Person kontrolliert und die andere allein gelassen.",
      };
    case "Commitment":
      return {
        title: "Wenn Wochen voll werden",
        body: "Ihr muesst Zeit, Verantwortung und Erwartung an Einsatz klaeren, sonst wird aus Belastung schnell ein Streit ueber Fairness.",
      };
    case "Risikoorientierung":
      return {
        title: "Wenn eine groessere Entscheidung ansteht",
        body: "Ihr muesst klären, welches Risiko fuer euch tragbar ist, sonst zieht die eine Person an, waehrend die andere bremst.",
      };
    case "Konfliktstil":
      return {
        title: "Wenn etwas schieflaeuft",
        body: "Ihr braucht eine klare Form fuer Klaerung, sonst fuehlt sich die eine Person ueberfahren und die andere ausgebremst.",
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
        : "Wenn ihr das offen lasst, werden Chancen zu frueh gestoppt oder zu weit getrieben.";
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
      return "Das macht Risikoabwaegung und Absicherung deutlich leichter.";
    case "Konfliktstil":
      return "Das macht Klaerung leichter, weil ihr Spannung aehnlich angeht.";
  }
}

function buildSteeringPointForDimension(
  dimension: NonNullable<FounderMatchingSelection["biggestTension"]>["dimension"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return "Legt fest, wonach ihr priorisiert, wenn Richtung, Wachstum und Stabilitaet nicht dasselbe nahelegen.";
    case "Entscheidungslogik":
      return "Legt fest, wer Entscheidungen vorbereitet, wann genug geprueft ist und wann eine Entscheidung faellt.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Legt fest, was sichtbar sein muss, wo Eigenraum beginnt und wann Abstimmung Pflicht ist.";
    case "Commitment":
      return "Legt fest, wie viel Zeit, Verantwortung und Equity jeweils mit welchem Einsatz verbunden sind.";
    case "Risikoorientierung":
      return "Legt fest, welches Risiko fuer euch tragbar ist und wann Absicherung Vorrang hat.";
    case "Konfliktstil":
      return "Legt fest, was sofort angesprochen wird, in welchem Ton ihr das tut und was ihr mit Abstand klaert.";
  }
}

function buildSupportSentenceForDimension(
  dimension: NonNullable<FounderMatchingSelection["stableBase"]>["dimension"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return "In eurer Unternehmenslogik liegt eine tragende gemeinsame Linie. Das gibt euch Halt bei Prioritaeten und Richtung.";
    case "Entscheidungslogik":
      return "In eurer Entscheidungslogik liegt eine tragende gemeinsame Linie. Das spart Reibung unter Zeitdruck.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "In eurer Zusammenarbeit liegt eine tragende gemeinsame Linie. Das entlastet den Alltag.";
    case "Commitment":
      return "Beim Commitment liegt eine tragende gemeinsame Linie. Das schafft Ruhe bei Erwartungen.";
    case "Risikoorientierung":
      return "Bei Risiko liegt eine tragende gemeinsame Linie. Das macht groessere Schritte berechenbarer.";
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
      return "Euer Unterschied beim Risiko kann euch vor Ueberzug und vor zu viel Vorsicht schuetzen.";
    case "Konfliktstil":
      return "Euer Unterschied im Konfliktstil kann Klaerung verbessern, wenn ihr Timing und Form bewusst fuehrt.";
  }
}

function buildComplementOperationSentence(
  dimension: NonNullable<FounderMatchingSelection["strongestComplement"]>["dimension"]
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return "Das kann euch in der Praxis staerker machen: Eine Person schuetzt die Substanz, waehrend die andere Reichweite und Hebel oeffnet. So entstehen weniger blinde Flecken in strategischen Entscheidungen.";
    case "Entscheidungslogik":
      return "Das kann Entscheidungen verbessern: Eine Person prueft gruendlicher, die andere bringt Tempo. Wenn klar ist, wer vorbereitet und wer entscheidet, wird daraus kein Konflikt, sondern Qualitaet.";
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
      return "Diese gemeinsame Linie kann zu einer echten Staerke werden, weil ihr bei Richtung und Prioritaeten schneller auf einen gemeinsamen Kurs kommt.";
    case "Entscheidungslogik":
      return "Diese gemeinsame Linie kann zu einer echten Staerke werden, weil ihr unter Druck nicht erst den Entscheidungsweg aushandeln muesst.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Diese gemeinsame Linie kann zu einer echten Staerke werden, weil ihr im Alltag weniger Energie an Abstimmung verliert.";
    case "Commitment":
      return "Diese gemeinsame Linie kann zu einer echten Staerke werden, weil Einsatz und Verbindlichkeit fuer euch aehnlich lesbar sind.";
    case "Risikoorientierung":
      return "Diese gemeinsame Linie kann zu einer echten Staerke werden, weil ihr grosse Schritte und Grenzen aehnlich bewertet.";
    case "Konfliktstil":
      return "Diese gemeinsame Linie kann zu einer echten Staerke werden, weil ihr Spannungen aehnlich ansprecht und dadurch schneller klaert.";
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
