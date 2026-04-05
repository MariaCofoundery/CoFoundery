import { ComparisonScale } from "@/features/reporting/ComparisonScale";
import { buildChallengesFromScores } from "@/features/reporting/challengeTextBuilder";
import {
  FOUNDER_DIMENSION_META,
  getFounderDimensionPoleLabels,
  type FounderDimensionKey,
} from "@/features/reporting/founderDimensionMeta";
import { buildHeroTextFromScores } from "@/features/reporting/heroTextBuilder";
import { buildPatternsFromScores } from "@/features/reporting/patternTextBuilder";
import {
  buildSelfReportSelection,
  buildSelfReportSignals,
  type SelfReportSignal,
  type SelfReportSelection,
  type SelfReportTendencyKey,
} from "@/features/reporting/selfReportSelection";
import { type SelfAlignmentReport } from "@/features/reporting/selfReportTypes";
import { SelfValuesProfileSection } from "@/features/reporting/SelfValuesProfileSection";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";

type Props = {
  report: SelfAlignmentReport;
};

type TendencyKey = SelfReportTendencyKey;

export function SelfReportView({ report }: Props) {
  const markerLabel = buildMarkerLabel(report.participantAName);
  const scoredDimensions = buildSelfReportSignals(report.scoresA);
  const selection = buildSelfReportSelection(report.scoresA);
  const heroParagraphs = splitIntoParagraphs(buildHeroTextFromScores(report.scoresA)).slice(0, 3);
  const patterns = buildPatternsFromScores(report.scoresA);
  const challenges = buildChallengesFromScores(report.scoresA);
  const conversationHints = buildConversationHints(selection.conversationHintDimensions);
  const overviewParagraphs = buildOverviewInterpretation(selection).slice(0, 2);
  const showValuesSection =
    report.valuesModuleStatus !== "not_started" ||
    Boolean(report.selfValuesProfile) ||
    Boolean(report.valuesModulePreview?.trim());

  return (
    <>
      <section className="page-section rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">1. Dein Kernmuster</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Dein Kernmuster</h2>
            <div className="mt-4 space-y-3">
              {heroParagraphs.map((paragraph, index) => (
                <p
                  key={paragraph}
                  className={index === 0 ? "text-sm font-medium leading-7 text-slate-900" : "text-sm leading-7 text-slate-700"}
                >
                  {t(paragraph)}
                </p>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <StatusBadge label="Basisprofil abgeschlossen" tone="neutral" />
              <StatusBadge
                label={
                  report.valuesModuleStatus === "completed"
                    ? "Werteprofil verfügbar"
                    : report.valuesModuleStatus === "in_progress"
                      ? "Werteprofil in Bearbeitung"
                      : "Werteprofil optional"
                }
                tone={report.valuesModuleStatus === "completed" ? "accent" : "soft"}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">2. Dein Profil auf einen Blick</p>
        <div className="mt-6 space-y-4">
          {scoredDimensions.map(({ dimension, score }) => {
            const meta = FOUNDER_DIMENSION_META[dimension];
            const reportPoles = getFounderDimensionPoleLabels(dimension, "report");

            return (
              <article
                key={`overview-${dimension}`}
                className="rounded-2xl border border-slate-200/80 bg-white px-5 py-5"
              >
                <h4 className="text-base font-semibold text-slate-900">{meta.canonicalName}</h4>
                <div className="mt-4">
                  <ComparisonScale
                    scoreA={score}
                    scoreB={null}
                    markerA={markerLabel}
                    markerB=""
                    participantAName={report.participantAName || "Du"}
                    participantBName=""
                    lowLabel={t(reportPoles?.left ?? meta.reportLeftPole)}
                    highLabel={t(reportPoles?.right ?? meta.reportRightPole)}
                    valueScale="founder_percent"
                  />
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-6 max-w-3xl space-y-3">
          {overviewParagraphs.map((paragraph, index) => (
            <p
              key={paragraph}
              className={index === 0 ? "text-sm font-medium leading-7 text-slate-900" : "text-sm leading-7 text-slate-700"}
            >
              {t(paragraph)}
            </p>
          ))}
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">3. Was dich im Alltag prägt</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {patterns.map((entry, index) => {
            const signal = selection.patternDimensions[index];
            return (
              <article
                key={`pattern-${signal?.dimension ?? index}`}
                className="rounded-2xl border border-slate-200/80 bg-white p-5"
              >
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  {signal ? FOUNDER_DIMENSION_META[signal.dimension].canonicalName : "Muster"}
                </p>
                <h4 className="mt-3 text-base font-semibold text-slate-900">{t(entry.title)}</h4>
                <div className="mt-3 space-y-3">
                  {splitIntoParagraphs(entry.description).map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-7 text-slate-700">
                      {t(paragraph)}
                    </p>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          4. Wo es im Team schwierig wird
        </p>
        <div className="mt-6 grid gap-4">
          {challenges.map((entry, index) => {
            const signal = selection.challengeDimensions[index];
            return (
              <article
                key={`challenge-${signal?.dimension ?? index}`}
                className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5"
              >
                <h4 className="text-sm font-semibold text-slate-900">{t(entry.title)}</h4>
                <div className="mt-3 space-y-3">
                  {splitIntoParagraphs(entry.description).map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-7 text-slate-700">
                      {t(paragraph)}
                    </p>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          5. Worauf du achten solltest
        </p>
        <div className="mt-6 grid gap-4">
          {conversationHints.map((hint) => (
            <article
              key={hint}
              className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 text-sm leading-7 text-slate-700"
            >
              {t(hint)}
            </article>
          ))}
        </div>
      </section>

      {showValuesSection ? (
        <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Zusätzlich: Werteprofil kompakt</p>
          <div className="mt-5">
            <SelfValuesProfileSection report={report} />
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

function buildOverviewInterpretation(selection: SelfReportSelection) {
  const keySignals = selection.patternDimensions.slice(0, 3);
  const combination = buildOverviewCombination(keySignals);
  const implication = buildOverviewImplication(selection.hero.tensionCarrier);

  return [combination, implication];
}

function buildOverviewCombination(signals: SelfReportSignal[]) {
  const phrases = signals.map((signal) => describeOverviewSignal(signal));
  return `Du ${joinClauses(phrases)}.`;
}

function describeOverviewSignal(signal: SelfReportSignal) {
  switch (signal.dimension) {
    case "Unternehmenslogik":
      return signal.tendencyKey === "left"
        ? "pruefst Chancen zuerst auf Tragfaehigkeit und Fundament"
        : signal.tendencyKey === "center"
          ? "sprichst bei neuen Chancen mal zuerst ueber Aufbau und mal zuerst ueber Hebel"
          : "sortierst Chancen frueh nach Hebel und Reichweite";
    case "Entscheidungslogik":
      return signal.tendencyKey === "left"
        ? "pruefst vor Entscheidungen eher noch einmal Grundlage und Gegenargumente"
        : signal.tendencyKey === "center"
          ? "pruefst manche Fragen erst gruendlich und legst andere frueh fest"
          : "setzt einen naechsten Schritt, sobald fuer dich genug Kontur da ist";
    case "Risikoorientierung":
      return signal.tendencyKey === "left"
        ? "gehst Risiken lieber mit Leitplanken ein"
        : signal.tendencyKey === "center"
          ? "gehst bei manchen Schritten frueh los und willst bei anderen erst klare Sicherungen"
          : "gehst bei echten Chancen frueher in Bewegung";
    case "Arbeitsstruktur & Zusammenarbeit":
      return signal.tendencyKey === "left"
        ? "arbeitest lieber mit Eigenraum und gezielter Abstimmung"
        : signal.tendencyKey === "center"
          ? "willst mal Eigenraum und forderst mal fruehe Rueckkopplung ein"
          : "willst Fortschritt und offene Punkte frueh im gemeinsamen Blick haben";
    case "Commitment":
      return signal.tendencyKey === "left"
        ? "gibst dem Startup Gewicht, ohne alles andere darum herum zu ordnen"
        : signal.tendencyKey === "center"
          ? "faehrst dein Einsatzniveau sichtbar hoch und wieder herunter"
          : "richtest Zeit, Energie und Aufmerksamkeit deutlich auf das Startup aus";
    case "Konfliktstil":
      return signal.tendencyKey === "left"
        ? "sortierst Unterschiede erst, bevor du sie ansprichst"
        : signal.tendencyKey === "center"
          ? "sprichst manche Unterschiede sofort und andere erst mit Abstand an"
          : "sprichst Unterschiede frueh und direkt an";
    default:
      return "arbeitest im Alltag mit klarer Linie";
  }
}

function buildOverviewImplication(signal: SelfReportSignal | null) {
  if (!signal) {
    return "Dann brechen Unterschiede erst im Alltag auf, wenn mehrere Erwartungen gleichzeitig im Raum stehen und niemand frueh klaert, welcher Modus gerade gelten soll.";
  }

  switch (signal.family) {
    case "direction":
      return "Dann will eine Person bei einer Option schon weitergehen, waehrend die andere noch klaeren will, ob sie zum Aufbau, zum Fokus oder zum Risiko passt.";
    case "decision_under_uncertainty":
      return "Dann landet dieselbe Entscheidung schnell in einer zweiten oder dritten Runde: eine Person will den naechsten Schritt festhalten, die andere dieselbe Frage noch weiter pruefen.";
    case "collaboration_under_pressure":
      return "Dann reibt ihr euch nicht zuerst an Zielen, sondern daran, wann Arbeit sichtbar wird, wann Rueckkopplung faellig ist und wann ein Widerspruch offen auf den Tisch kommt.";
    default:
      return "Dann werden Unterschiede erst unter Druck spuerbar, weil sie vorher nicht klar genug lesbar waren.";
  }
}

function joinClauses(clauses: string[]) {
  if (clauses.length === 0) return "dein Profil in mehreren Bereichen zugleich klar lesbar wird";
  if (clauses.length === 1) return clauses[0];
  if (clauses.length === 2) return `${clauses[0]} und ${clauses[1]}`;
  return `${clauses[0]}, ${clauses[1]} und ${clauses[2]}`;
}

function buildConversationHints(dimensions: SelfReportSignal[]) {
  const seen = new Set<FounderDimensionKey>();

  const hints = dimensions
    .filter((entry) => {
      if (seen.has(entry.dimension)) return false;
      seen.add(entry.dimension);
      return true;
    })
    .map((entry) => CONVERSATION_HINT_COPY[entry.dimension][entry.tendencyKey])
    .slice(0, 4);

  if (hints.length >= 3) {
    return hints;
  }

  return [
    ...hints,
    "Woran soll fuer euch frueh sichtbar werden, welches Tempo und welche Verbindlichkeit gerade erwartet werden?",
    "Bei welcher Art von Entscheidung wollt ihr festhalten, wann noch geprueft und wann schon entschieden wird?",
    "Welche Unterschiede sollten zwischen euch frueh angesprochen werden, bevor sie erst in einer Stressphase sichtbar werden?",
  ].slice(0, 4);
}

function buildMarkerLabel(name: string | null | undefined) {
  const trimmed = name?.trim();
  if (!trimmed) return "DU";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}

function StatusBadge({ label, tone }: { label: string; tone: "neutral" | "accent" | "soft" }) {
  const className =
    tone === "accent"
      ? "border-[color:var(--brand-primary)]/25 bg-[color:var(--brand-primary)]/10 text-slate-700"
      : tone === "soft"
        ? "border-slate-200 bg-slate-50 text-slate-600"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] tracking-[0.08em] ${className}`}>
      {t(label)}
    </span>
  );
}

const CONVERSATION_HINT_COPY: Record<FounderDimensionKey, Record<TendencyKey, string>> = {
  Unternehmenslogik: {
    left: "Woran sollt ihr erkennen, dass eine Chance fuer euch tragfaehig genug ist, um Prioritaet zu bekommen?",
    center: "Woran wollt ihr in Zweifelsfaellen festmachen, ob gerade Aufbau oder Hebel Vorrang bekommt?",
    right: "Woran sollt ihr erkennen, dass eine Chance fuer euch genug Hebel hat und nicht nur kurzfristig gut aussieht?",
  },
  Entscheidungslogik: {
    left: "Bei welcher Art von Entscheidung willst du erst weitergehen, wenn Annahmen und Gegenargumente sichtbar auf dem Tisch liegen?",
    center: "Woran wollt ihr gemeinsam erkennen, dass ihr von Pruefung in Entscheidung wechselt?",
    right: "Woran soll dein Gegenueber merken, dass fuer dich ein naechster Schritt schon klar genug ist, auch wenn noch nicht alles geklaert ist?",
  },
  Risikoorientierung: {
    left: "Welche finanziellen, operativen oder persoenlichen Risiken muessen fuer dich begrenzt sein, bevor du mitgehst?",
    center: "Welche Schwelle bei Risiko wollt ihr explizit benennen, statt sie erst im Streitfall zu merken?",
    right: "Woran soll fuer euch frueh sichtbar werden, wann du in einer Chance schon einen gangbaren Schritt siehst?",
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    left: "An welchen Stellen willst du autonom arbeiten, und an welchen Punkten braucht es trotzdem fruehe Rueckkopplung?",
    center: "Woran wollt ihr im Alltag erkennen, wann enger Austausch hilft und wann gezielte Abstimmung reicht?",
    right: "Wie frueh sollen Fortschritt, Entscheidungen und offene Punkte fuer euch gegenseitig sichtbar werden?",
  },
  Commitment: {
    left: "Welchen Platz soll das Startup in deinem Alltag realistisch haben, und welche Verfuegbarkeit willst du wirklich zusagen?",
    center: "Wann erwartet ihr mehr Fokus, und wann ist ein begrenzterer Modus fuer euch beide voellig in Ordnung?",
    right: "Welches Einsatzniveau soll fuer euch im Alltag konkret sichtbar sein, statt nur allgemein gewollt zu wirken?",
  },
  Konfliktstil: {
    left: "Wie viel Zeit brauchst du meist, bevor du einen spuerbaren Unterschied offen ansprechen willst?",
    center: "Woran wollt ihr merken, dass ein Thema jetzt auf den Tisch muss und nicht noch laenger mitlaufen sollte?",
    right: "Woran soll dein Gegenueber frueh merken, dass du einen Unterschied direkt ansprechen wirst und nicht erst spaeter?",
  },
};
