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
              <h4 className="mt-3 text-base font-semibold text-slate-900">
                {t(patternHeadline(entry.dimension, entry.tendencyKey))}
              </h4>
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
      "Du wirkst als Founder derzeit breit anschlussfähig und legst dich nicht vorschnell auf nur eine Arbeitslogik fest.",
      "Du hältst Optionen offen, wägt Situationen sauber ab und reagierst eher bewusst als reflexhaft.",
      "Das macht dich im Team oft ausgleichend, kann aber verschwimmen, wenn du in wichtigen Momenten nicht klar sagst, was für dich jetzt wirklich Priorität hat.",
      ...(valuesLine ? [valuesLine] : []),
    ];
  }

  const primarySentence = stripTrailingPunctuation(firstSentence(compactPatternText(primary.dimension, primary.tendencyKey)));
  const secondarySentence = secondary
    ? stripTrailingPunctuation(firstSentence(compactPatternText(secondary.dimension, secondary.tendencyKey)))
    : null;

  return [
    primarySentence,
    secondarySentence
      ? `${uppercaseFirst(secondarySentence)}.`
      : "Du bringst damit bereits eine klare Handschrift in Entscheidungen und Zusammenarbeit mit.",
    "Im Team zeigt sich das vor allem darin, wie du Richtung gibst, Verantwortung einordnest und auf andere Founder-Perspektiven reagierst.",
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
  const starters = [
    "Besonders produktiv wird es mit jemandem, der",
    "Gut ergänzt dich eine Person, die",
    "Stark wird die Kombination oft, wenn dein Gegenüber",
  ] as const;

  const bullets = strongestDimensions.slice(0, 3).map((entry, index) => {
    const meta = FOUNDER_DIMENSION_META[entry.dimension];
    const counterpart =
      entry.tendencyKey === "left"
        ? meta.rightPole
        : entry.tendencyKey === "right"
          ? meta.leftPole
          : "eine klarere Gegenperspektive";

    return `${starters[index] ?? "Hilfreich ist oft jemand, der"} in ${meta.shortLabel.toLowerCase()} stärker ${counterpart} einbringt und damit einen echten Gegenpol aufmacht.`;
  });

  return bullets.length > 0
    ? bullets
    : [
        "Besonders produktiv wird es mit einer Person, die in kritischen Momenten etwas früher Richtung vorgibt.",
        "Gut ergänzt dich jemand, der Unterschiede nicht nur wahrnimmt, sondern sauber auf den Tisch bringt.",
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
  return CHALLENGE_COPY[dimension][tendency];
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

function uppercaseFirst(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function patternHeadline(dimension: FounderDimensionKey, tendency: TendencyKey) {
  return PATTERN_HEADLINES[dimension][tendency];
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

const PATTERN_HEADLINES: Record<FounderDimensionKey, Record<TendencyKey, string>> = {
  "Vision & Unternehmenshorizont": {
    left: "Substanz vor Vision",
    center: "Mehrere Wege offenhalten",
    right: "Klarer Blick nach vorn",
  },
  Entscheidungslogik: {
    left: "Erst prüfen, dann entscheiden",
    center: "Zwischen Analyse und Tempo",
    right: "Schnell zur Richtung",
  },
  Risikoorientierung: {
    left: "Kontrolliert ins Risiko",
    center: "Mut mit Augenmaß",
    right: "Chancen aktiv nutzen",
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    left: "Freiheit mit Verantwortung",
    center: "Eigenständig und anschlussfähig",
    right: "Nähe in der Zusammenarbeit",
  },
  Commitment: {
    left: "Verbindlich, aber realistisch",
    center: "Hoher Einsatz mit Maß",
    right: "Starker Fokus auf das Startup",
  },
  Konfliktstil: {
    left: "Ruhe vor Reibung",
    center: "Klarheit mit Timing",
    right: "Direkt in die Klärung",
  },
};

const CHALLENGE_COPY: Record<FounderDimensionKey, Record<TendencyKey, string>> = {
  "Vision & Unternehmenshorizont": {
    left: "Schwierig wird es, wenn andere sehr groß denken wollen und du zuerst auf Tragfähigkeit und Machbarkeit schaust.",
    center: "Kann dich ausbremsen, wenn im Team lange offenbleibt, welche Richtung jetzt wirklich Vorrang hat.",
    right: "Wird schnell zäh, wenn andere deutlich vorsichtiger sind und du das Gefühl hast, dass der gemeinsame Kurs zu klein gedacht wird.",
  },
  Entscheidungslogik: {
    left: "Wird schwierig, wenn im Team ständig Tempo gefordert wird, bevor für dich die Entscheidung sauber genug begründet ist.",
    center: "Kann dich zermürben, wenn unklar bleibt, wann ihr noch prüft und wann ihr euch endlich festlegt.",
    right: "Kann dich ausbremsen, wenn Diskussionen zu lange offenbleiben und du das Gefühl hast, dass niemand den Punkt setzt.",
  },
  Risikoorientierung: {
    left: "Wird heikel, wenn andere mutig nach vorn wollen und dir dabei die Leitplanken oder Stop-Kriterien fehlen.",
    center: "Kann anstrengend werden, wenn ihr über Chancen sprecht, aber nie sauber klärt, welches Risiko ihr gemeinsam wirklich tragen wollt.",
    right: "Wird schwierig, wenn das Team Sicherheit über alles stellt und du in jeder Chance zuerst die Bremse spürst.",
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    left: "Wird schwierig, wenn andere sehr viel Einblick und Mitsprache brauchen und du eigentlich klare Verantwortungsräume erwartest.",
    center: "Kann zäh werden, wenn unklar bleibt, wo Abstimmung aufhört und wo Eigenverantwortung beginnt.",
    right: "Kann dich ausbremsen, wenn andere sehr autonom arbeiten wollen und du zu wenig Transparenz darüber bekommst, was wirklich läuft.",
  },
  Commitment: {
    left: "Wird schnell angespannt, wenn im Team still vorausgesetzt wird, dass alle jederzeit denselben Einsatz bringen müssen.",
    center: "Kann kippen, wenn Verbindlichkeit groß klingt, aber niemand ausspricht, was im Alltag tatsächlich erwartet wird.",
    right: "Wird schwierig, wenn du sehr viel Fokus gibst und andere lockerer mit Verfügbarkeit oder Priorität umgehen.",
  },
  Konfliktstil: {
    left: "Kann dich ausbremsen, wenn Spannungen im Raum stehen und andere sofort Härte oder direkte Konfrontation erwarten.",
    center: "Wird schwierig, wenn Themen lange mitschwingen und niemand klar macht, wann ihr sie wirklich besprecht.",
    right: "Kann schnell knirschen, wenn dein direktes Ansprechen auf ein Team trifft, das Konflikte lieber erst einmal liegen lässt.",
  },
};
