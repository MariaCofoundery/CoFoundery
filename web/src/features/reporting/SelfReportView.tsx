import { ComparisonScale } from "@/features/reporting/ComparisonScale";
import {
  FOUNDER_DIMENSION_ORDER,
  FOUNDER_DIMENSION_META,
  type FounderDimensionKey,
} from "@/features/reporting/founderDimensionMeta";
import { SELF_DEVELOPMENT_COPY, SELF_DIMENSION_COPY } from "@/features/reporting/self_report_texts.de";
import {
  getSelfDimensionTendency,
  getSelfOrientationStrength,
} from "@/features/reporting/selfReportScoring";
import { type SelfAlignmentReport } from "@/features/reporting/selfReportTypes";
import { SelfValuesProfileSection } from "@/features/reporting/SelfValuesProfileSection";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";

type Props = {
  report: SelfAlignmentReport;
};

type TendencyKey = "left" | "center" | "right";

type ScoredDimension = {
  dimension: FounderDimensionKey;
  score: number;
  orientationStrength: number;
  tendencyKey: TendencyKey;
  tendencyLabel: string;
};

export function SelfReportView({ report }: Props) {
  const markerLabel = buildMarkerLabel(report.participantAName);
  const scoredDimensions = buildScoredDimensions(report.scoresA);
  const strongestDimensions = [...scoredDimensions]
    .sort((left, right) => right.orientationStrength - left.orientationStrength)
    .slice(0, 3);
  const challengeDimensions = buildChallengeDimensions(scoredDimensions);
  const profileSummary = buildFounderProfileSummary(report, scoredDimensions);
  const complementSummary = buildComplementSummary(strongestDimensions);
  const complementBullets = buildComplementBullets(strongestDimensions);
  const conversationHints = buildConversationHints(scoredDimensions);
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
              {profileSummary.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-7 text-slate-700">
                  {paragraph}
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
          {(strongestDimensions.length > 0
            ? strongestDimensions
            : buildFallbackPatternDimensions(scoredDimensions)
          ).map((entry) => (
            <article
              key={`pattern-${entry.dimension}`}
              className="rounded-2xl border border-slate-200/80 bg-white p-5"
            >
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                {FOUNDER_DIMENSION_META[entry.dimension].canonicalName}
              </p>
              <h4 className="mt-3 text-base font-semibold text-slate-900">{t(entry.tendencyLabel)}</h4>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {t(compactPatternText(entry.dimension, entry.tendencyKey))}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          3. Was dich im Team schnell herausfordert
        </p>
        <div className="mt-6 grid gap-4">
          {challengeDimensions.map((entry) => (
            <article
              key={`challenge-${entry.dimension}`}
              className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5"
            >
              <h4 className="text-sm font-semibold text-slate-900">
                {FOUNDER_DIMENSION_META[entry.dimension].canonicalName}
              </h4>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {t(compactChallengeText(entry.dimension, entry.tendencyKey))}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">4. Was dich gut ergänzt</p>
        <h3 className="mt-3 text-lg font-semibold text-slate-900">Welche Gegenperspektive dir oft guttut</h3>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">{t(complementSummary)}</p>
        <ul className="mt-5 space-y-3">
          {complementBullets.map((item) => (
            <li
              key={item}
              className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm leading-7 text-slate-700"
            >
              {t(item)}
            </li>
          ))}
        </ul>
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

function buildScoredDimensions(scores: SelfAlignmentReport["scoresA"]) {
  return FOUNDER_DIMENSION_ORDER.map((dimension) => {
    const score = scores[dimension];
    const tendency = getSelfDimensionTendency(dimension, score);
    if (score == null || tendency == null) return null;

    return {
      dimension,
      score,
      orientationStrength: getSelfOrientationStrength(score) ?? 0,
      tendencyKey: tendency.tendency,
      tendencyLabel: tendency.label,
    } satisfies ScoredDimension;
  }).filter((entry): entry is ScoredDimension => entry != null);
}

function buildFallbackPatternDimensions(scoredDimensions: ScoredDimension[]) {
  return [...scoredDimensions]
    .sort((left, right) => right.orientationStrength - left.orientationStrength)
    .slice(0, 3);
}

function buildChallengeDimensions(scoredDimensions: ScoredDimension[]) {
  if (scoredDimensions.length === 0) return [];

  const leastFixed = [...scoredDimensions]
    .sort((left, right) => left.orientationStrength - right.orientationStrength)
    .slice(0, 2);
  const strongest = [...scoredDimensions]
    .sort((left, right) => right.orientationStrength - left.orientationStrength)
    .slice(0, 2);

  const ordered = [...leastFixed, ...strongest];
  const seen = new Set<FounderDimensionKey>();

  return ordered.filter((entry) => {
    if (seen.has(entry.dimension)) return false;
    seen.add(entry.dimension);
    return true;
  }).slice(0, 3);
}

function buildFounderProfileSummary(
  report: SelfAlignmentReport,
  scoredDimensions: ScoredDimension[]
) {
  if (scoredDimensions.length === 0) {
    return [
      "Für dein Profil liegen aktuell noch nicht genug Antworten vor, um eine belastbare Founder-Einordnung zu zeigen.",
      "Sobald dein Basisfragebogen vollständig ist, wird hier ein kompaktes Bild deiner Muster in Entscheidungen, Zusammenarbeit und Commitment sichtbar.",
    ];
  }

  const strongest = [...scoredDimensions]
    .sort((left, right) => right.orientationStrength - left.orientationStrength)
    .slice(0, 2);
  const [primary, secondary] = strongest;
  const valuesLine =
    report.valuesModuleStatus === "completed"
      ? "Dein Werteprofil ergänzt dieses Bild zusätzlich um die inneren Prioritäten hinter deinen Entscheidungen."
      : null;

  if (!primary || primary.orientationStrength < 10) {
    return [
      "Dein Profil wirkt aktuell breit anschlussfähig und nicht vorschnell auf einen einzigen Founder-Pol festgelegt.",
      "Du hältst in mehreren Feldern bewusst Optionen offen und entscheidest eher situativ als schematisch.",
      "Das kann Teams stabilisieren, verlangt aber von dir, in wichtigen Momenten aktiv Position zu beziehen und Prioritäten klar auszusprechen.",
      ...(valuesLine ? [valuesLine] : []),
    ];
  }

  return [
    `Aktuell prägt vor allem ${FOUNDER_DIMENSION_META[primary.dimension].canonicalName} dein Founder-Profil: ${lowercaseFirst(
      stripTrailingPunctuation(compactPatternText(primary.dimension, primary.tendencyKey))
    )}.`,
    secondary
      ? `Dazu kommt ein klares Signal in ${FOUNDER_DIMENSION_META[secondary.dimension].canonicalName}, das deinen Stil im Team zusätzlich erkennbar macht.`
      : "Dein Profil zeigt bereits eine erkennbare Handschrift dafür, wie du Entscheidungen und Zusammenarbeit einordnest.",
    `Im Alltag wirkt das selten abstrakt, sondern vor allem in Tempo, Erwartungsklarheit, Verantwortung und der Art, wie du mit anderen Founder-Perspektiven arbeitest.`,
    ...(valuesLine ? [valuesLine] : []),
  ];
}

function buildComplementSummary(strongestDimensions: ScoredDimension[]) {
  const [primary, secondary] = strongestDimensions;

  if (!primary) {
    return "Sobald mehr Antworten vorliegen, lässt sich klarer einordnen, welche Gegenperspektiven dein Founder-Profil im Team besonders gut ergänzen.";
  }

  const primaryMeta = FOUNDER_DIMENSION_META[primary.dimension];
  const counterpart =
    primary.tendencyKey === "left"
      ? primaryMeta.rightPole
      : primary.tendencyKey === "right"
        ? primaryMeta.leftPole
        : "eine klarere Gegenperspektive";

  if (!secondary) {
    return `Besonders hilfreich ist für dich oft ein Co-Founder, der in ${primaryMeta.shortLabel.toLowerCase()} nicht identisch tickt, sondern bewusst mehr ${counterpart} einbringt. Nicht als Gegenspieler, sondern als zweite Logik, die Entscheidungen vollständiger macht.`;
  }

  const secondaryMeta = FOUNDER_DIMENSION_META[secondary.dimension];
  return `Gut ergänzen kann dich ein Co-Founder, der in ${primaryMeta.shortLabel.toLowerCase()} und ${secondaryMeta.shortLabel.toLowerCase()} an einigen Stellen anders arbeitet als du. Genau dort entsteht oft der größte Mehrwert, wenn Unterschiede früh ausgesprochen und nicht erst unter Druck sichtbar werden.`;
}

function buildComplementBullets(strongestDimensions: ScoredDimension[]) {
  const bullets = strongestDimensions.slice(0, 3).map((entry) => {
    const meta = FOUNDER_DIMENSION_META[entry.dimension];
    const counterpart =
      entry.tendencyKey === "left"
        ? meta.rightPole
        : entry.tendencyKey === "right"
          ? meta.leftPole
          : "eine klarere Gegenperspektive";

    return `Hilfreich ist oft jemand, der in ${meta.shortLabel.toLowerCase()} stärker ${counterpart} einbringt, ohne deine Logik abzuwerten.`;
  });

  return bullets.length > 0
    ? bullets
    : [
        "Hilfreich ist oft eine Person, die deine Offenheit ergänzt und in kritischen Momenten etwas früher Richtung vorgibt.",
        "Gut wirkt eine Gegenperspektive, die Unterschiede früh benennt, statt sie nur mitzuschwingen.",
      ];
}

function buildConversationHints(scoredDimensions: ScoredDimension[]) {
  const strongest = [...scoredDimensions]
    .sort((left, right) => right.orientationStrength - left.orientationStrength)
    .slice(0, 2);
  const leastFixed = [...scoredDimensions]
    .sort((left, right) => left.orientationStrength - right.orientationStrength)
    .slice(0, 2);

  const dimensions = [...strongest, ...leastFixed];
  const seen = new Set<FounderDimensionKey>();

  const hints = dimensions
    .filter((entry) => {
      if (seen.has(entry.dimension)) return false;
      seen.add(entry.dimension);
      return true;
    })
    .map((entry) => t(SELF_DEVELOPMENT_COPY[entry.dimension].nextSteps[0]))
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

function compactPatternText(dimension: FounderDimensionKey, tendency: TendencyKey) {
  return firstSentences(SELF_DIMENSION_COPY[dimension].tendency[tendency], 2);
}

function compactChallengeText(dimension: FounderDimensionKey, tendency: TendencyKey) {
  const sentences = splitSentences(SELF_DIMENSION_COPY[dimension].tendency[tendency]);
  const challenge = sentences[sentences.length - 1] ?? "";

  if (challenge) {
    return challenge;
  }

  return firstSentence(SELF_DEVELOPMENT_COPY[dimension].whyItMatters);
}

function splitSentences(value: string) {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function firstSentence(value: string) {
  return splitSentences(value)[0] ?? value.trim();
}

function firstSentences(value: string, count: number) {
  return splitSentences(value)
    .slice(0, count)
    .join(" ");
}

function stripTrailingPunctuation(value: string) {
  return value.replace(/[.!?…]+$/u, "").trim();
}

function lowercaseFirst(value: string) {
  if (!value) return value;
  return value.charAt(0).toLowerCase() + value.slice(1);
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
