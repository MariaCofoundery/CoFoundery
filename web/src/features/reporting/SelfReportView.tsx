import { ComparisonScale } from "@/features/reporting/ComparisonScale";
import { buildChallengesFromScores } from "@/features/reporting/challengeTextBuilder";
import { buildComplementsFromScores } from "@/features/reporting/complementTextBuilder";
import {
  FOUNDER_DIMENSION_META,
  type FounderDimensionKey,
} from "@/features/reporting/founderDimensionMeta";
import { buildHeroTextFromScores } from "@/features/reporting/heroTextBuilder";
import { buildPatternsFromScores } from "@/features/reporting/patternTextBuilder";
import {
  buildSelfReportSelection,
  buildSelfReportSignals,
  type SelfReportSignal,
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
  const heroParagraphs = splitIntoParagraphs(buildHeroTextFromScores(report.scoresA));
  const patterns = buildPatternsFromScores(report.scoresA);
  const challenges = buildChallengesFromScores(report.scoresA);
  const complements = buildComplementsFromScores(report.scoresA);
  const conversationHints = buildConversationHints(selection.conversationHintDimensions);
  const showValuesSection =
    report.valuesModuleStatus !== "not_started" ||
    Boolean(report.selfValuesProfile) ||
    Boolean(report.valuesModulePreview?.trim());

  return (
    <>
      <section className="page-section rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">1. Dein Founder-Profil</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Dein Founder-Profil</h2>
            <div className="mt-4 space-y-3">
              {heroParagraphs.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-7 text-slate-700">
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

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">2. Deine stärksten Muster</p>
        <h3 className="mt-3 text-lg font-semibold text-slate-900">Was dein Profil aktuell am stärksten prägt</h3>
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
                <p className="mt-3 text-sm leading-7 text-slate-700">{t(entry.description)}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          3. Was dich im Team schnell herausfordert
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
                <p className="mt-3 text-sm leading-7 text-slate-700">{t(entry.description)}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">4. Was dich gut ergänzt</p>
        <h3 className="mt-3 text-lg font-semibold text-slate-900">Mit wem du oft besonders gut arbeiten kannst</h3>
        <div className="mt-6 grid gap-4">
          {complements.map((entry) => (
            <article
              key={`${entry.role}-${entry.title}`}
              className="rounded-2xl border border-slate-200/80 bg-white p-5"
            >
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                {entry.role === "counterweight"
                  ? "Ausgleich"
                  : entry.role === "regulator"
                    ? "Entlastung"
                    : "Arbeitsrhythmus"}
              </p>
              <h4 className="mt-3 text-base font-semibold text-slate-900">{t(entry.title)}</h4>
              <p className="mt-3 text-sm leading-7 text-slate-700">{t(entry.description)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          5. Worauf du in Co-Founder-Gesprächen achten solltest
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
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">6. Werteprofil kompakt</p>
          <div className="mt-5">
            <SelfValuesProfileSection report={report} />
          </div>
        </section>
      ) : null}

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">7. Dein Profil auf einen Blick</p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
          Die sechs Dimensionen bleiben im Modell erhalten, werden hier aber bewusst nur noch als
          schnelle visuelle Orientierung gezeigt.
        </p>

        <div className="mt-6 space-y-4">
          {scoredDimensions.map(({ dimension, score }) => {
            const meta = FOUNDER_DIMENSION_META[dimension];

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
                    lowLabel={t(meta.leftPole)}
                    highLabel={t(meta.rightPole)}
                    valueScale="founder_percent"
                  />
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

function splitIntoParagraphs(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
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
    "Sprich früh aus, welche Art von Tempo, Abstimmung und Verbindlichkeit du wirklich erwartest.",
    "Achte in Founder-Gesprächen weniger auf Sympathie allein und stärker auf konkrete Entscheidungslogiken.",
    "Mach Unterschiede lieber früh sichtbar, statt sie erst in echten Stressphasen zu entdecken.",
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
    left: "Kläre früh, woran du unternehmerische Entscheidungen ausrichtest und wie viel Gewicht Marktchance gegenüber Tragfähigkeit für dich haben darf.",
    center: "Lass in Gesprächen nicht offen, was für dich in Zweifelsfällen Vorrang hat: Wirkung, Skalierbarkeit oder tragfähiger Aufbau.",
    right: "Sprich offen darüber, wie stark du Entscheidungen an Substanz, Aufbau und langfristiger Tragfähigkeit festmachst.",
  },
  Entscheidungslogik: {
    left: "Sag klar, wie viel Grundlage du vor einer Entscheidung brauchst und bei welchen Themen du ohne diese Basis nicht mitgehst.",
    center: "Kläre mit deinem Gegenüber, wann ihr noch prüft und wann ihr euch festlegt. Sonst bleibt zu viel in der Luft.",
    right: "Prüf in Gesprächen, ob dein Gegenüber mit deinem Tempo umgehen kann oder wichtige Entscheidungen deutlich langsamer angehen will.",
  },
  Risikoorientierung: {
    left: "Frag konkret nach, welches Risiko finanziell, emotional und operativ für euch beide noch tragbar ist.",
    center: "Sprecht nicht nur über Chancen, sondern auch darüber, welche rote Linie bei Risiko-Fragen für euch gilt.",
    right: "Mach früh sichtbar, wie mutig du bei Wetten, Tempo und Unsicherheit tatsächlich sein willst.",
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    left: "Kläre früh, an welchen Stellen du mit mehr Eigenraum arbeitest und wo du trotzdem verlässliche Rückkopplung erwartest.",
    center: "Sprecht sauber darüber, wann ihr eng verbunden arbeiten wollt und wann gezielte statt dauernder Abstimmung reicht.",
    right: "Frag offen, wie sichtbar Fortschritt, Entscheidungen und offene Punkte im Alltag für euch gegenseitig sein sollen.",
  },
  Commitment: {
    left: "Sprich früh aus, welchen Stellenwert das Startup in deinem Alltag haben soll und welche Verfügbarkeit du realistisch einplanst.",
    center: "Kläre in Gesprächen konkret, wann mehr Fokus erwartet wird und wann ein begrenzterer Rahmen für euch beide stimmig ist.",
    right: "Frag nicht nur nach Motivation, sondern danach, welches Einsatzniveau und welche Priorisierung dein Gegenüber im Alltag tatsächlich tragen will.",
  },
  Konfliktstil: {
    left: "Sprich an, wie schnell schwierige Themen auf den Tisch kommen sollen und wie viel Zeit du brauchst, bevor du in ein Gespräch gehst.",
    center: "Kläre früh, wie ihr Konflikte ansprecht, bevor sie mitschwingen und aus kleinen Reibungen große Missverständnisse werden.",
    right: "Prüf in Gesprächen, ob dein Gegenüber mit direkter Ansprache umgehen kann oder unter deiner Klarheit schnell dichtmacht.",
  },
};
