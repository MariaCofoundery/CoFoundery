import { ComparisonScale } from "@/features/reporting/ComparisonScale";
import {
  FOUNDER_DIMENSION_ORDER,
  FOUNDER_DIMENSION_META,
  type FounderDimensionKey,
} from "@/features/reporting/founderDimensionMeta";
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
        <h3 className="mt-3 text-lg font-semibold text-slate-900">Mit wem du oft besonders gut arbeiten kannst</h3>
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
      "Für ein belastbares Bild fehlen im Moment noch Antworten aus dem Basisfragebogen.",
      "Sobald dein Profil vollständig ist, zeigt dir dieser Report klarer, wie du entscheidest, mit anderen arbeitest und worauf du als Founder besonderen Wert legst.",
    ];
  }

  const strongest = [...scoredDimensions]
    .sort((left, right) => right.orientationStrength - left.orientationStrength)
    .slice(0, 2);
  const [primary, secondary] = strongest;
  const valuesLine =
    report.valuesModuleStatus === "completed"
      ? "Dein Werteprofil zeigt zusätzlich, was hinter diesen Entscheidungen innerlich den Ausschlag gibt."
      : null;

  if (!primary || primary.orientationStrength < 10) {
    return [
      "Du gehst als Founder nicht mit einer starren Handschrift in jede Situation. Du schaust erst hin, hältst Möglichkeiten offen und legst dich nicht nur deshalb fest, weil gerade Druck entsteht.",
      "Im Alltag macht dich das beweglich und oft angenehm im Umgang, weil du nicht jede Frage sofort in richtig oder falsch aufteilst.",
      "Genau deshalb braucht es aber klare Ansagen von dir, sobald es ernst wird. Wenn du deine Priorität nicht aussprichst, bleibt für andere schnell zu viel Interpretationsspielraum.",
      ...(valuesLine ? [valuesLine] : []),
    ];
  }

  const primaryHero = HERO_COPY[primary.dimension][primary.tendencyKey];
  const secondaryHero = secondary ? HERO_COPY[secondary.dimension][secondary.tendencyKey] : null;

  return [
    primaryHero.lead,
    secondaryHero?.lead ??
      "Du bringst damit eine erkennbare Handschrift in Entscheidungen, Zusammenarbeit und Verantwortung mit.",
    primaryHero.effect,
    secondaryHero?.effect ??
      "Andere merken das nicht in Modellen, sondern daran, wie du Tempo hältst, Zuständigkeit verstehst und mit offenen Punkten umgehst.",
    ...(valuesLine ? [valuesLine] : []),
  ];
}

function buildComplementSummary(strongestDimensions: ScoredDimension[]) {
  const [primary, secondary] = strongestDimensions;

  if (!primary) {
    return "Sobald mehr Antworten vorliegen, lässt sich klarer sagen, mit welcher Art von Co-Founder deine Zusammenarbeit besonders stark wird.";
  }

  const first = COMPLEMENT_COPY[primary.dimension][primary.tendencyKey];
  if (!secondary) return first.summary;

  return `${first.summary} Besonders gut trägt das, wenn dein Gegenüber auch in ${FOUNDER_DIMENSION_META[secondary.dimension].shortLabel.toLowerCase()} etwas mitbringt, was dir nicht ohnehin schon leichtfällt.`;
}

function buildComplementBullets(strongestDimensions: ScoredDimension[]) {
  const bullets = strongestDimensions
    .slice(0, 3)
    .map((entry) => COMPLEMENT_COPY[entry.dimension][entry.tendencyKey].bullet);

  return bullets.length > 0
    ? bullets
    : [
        "Besonders gut funktioniert es oft mit Menschen, die Unklarheit nicht lange stehen lassen, sondern Richtung geben.",
        "Stark wird die Zusammenarbeit dort, wo dein Gegenüber sauber strukturiert und trotzdem nicht starr wird.",
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

function compactPatternText(dimension: FounderDimensionKey, tendency: TendencyKey) {
  return PATTERN_COPY[dimension][tendency].body;
}

function compactChallengeText(dimension: FounderDimensionKey, tendency: TendencyKey) {
  return CHALLENGE_COPY[dimension][tendency];
}

function patternHeadline(dimension: FounderDimensionKey, tendency: TendencyKey) {
  return PATTERN_COPY[dimension][tendency].headline;
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

const HERO_COPY: Record<FounderDimensionKey, Record<TendencyKey, { lead: string; effect: string }>> = {
  "Vision & Unternehmenshorizont": {
    left: {
      lead:
        "Du denkst ein Unternehmen zuerst von seiner Tragfähigkeit her. Bevor du groß wirst, willst du verstehen, worauf das Ganze wirklich stehen soll.",
      effect:
        "Im Gründeralltag merkt man das daran, dass du bei Wachstum, Hiring oder Geldfragen nicht nur auf die Chance schaust, sondern auf die Substanz darunter.",
    },
    center: {
      lead:
        "Du willst nicht aus Prinzip klein oder groß denken. Für dich zählt, was zum Moment passt und was sich wirtschaftlich tragen lässt.",
      effect:
        "Dadurch bleibst du beweglich, aber du musst aufpassen, Richtung nicht zu lange offen zu halten, wenn das Team eigentlich eine klare Ansage braucht.",
    },
    right: {
      lead:
        "Du arbeitest mit einem klaren Bild davon, wohin das Unternehmen einmal wachsen soll. Größe und Richtung sind für dich keine Deko, sondern Teil der Entscheidung.",
      effect:
        "Das bringt Zug in ein Team, macht aber auch spürbar, wenn andere viel vorsichtiger oder kleinteiliger denken als du.",
    },
  },
  Entscheidungslogik: {
    left: {
      lead:
        "Du triffst Entscheidungen nicht aus dem Bauch heraus. Du willst wissen, worauf ihr euch stützt, bevor ihr euch festlegt.",
      effect:
        "Andere erleben dich dadurch oft als sorgfältig und verlässlich. Unter Zeitdruck kann es aber schnell anstrengend werden, wenn vom Team schon Tempo erwartet wird und du noch offene Punkte siehst.",
    },
    center: {
      lead:
        "Du kannst sauber abwägen und trotzdem ins Handeln kommen. Für dich muss nicht alles perfekt geklärt sein, aber auch nicht bloß gefühlt stimmen.",
      effect:
        "Das ist im Team oft stark, weil du weder in Analyse steckenbleibst noch blind nach vorn gehst. Schwierig wird es erst dann, wenn niemand klar macht, wann ihr wirklich entscheidet.",
    },
    right: {
      lead:
        "Du brauchst kein endloses Sicherheitsnetz, um loszugehen. Wenn für dich ein Bild stimmig ist, willst du lieber entscheiden als weiter kreisen.",
      effect:
        "Das bringt Energie und Tempo in eine Gründung. Es zeigt aber auch sofort, wenn andere noch lange prüfen wollen und du längst einen nächsten Schritt siehst.",
    },
  },
  Risikoorientierung: {
    left: {
      lead:
        "Du gehst nicht leichtfertig ins Risiko. Bevor du springst, willst du wissen, was ein Schritt kosten kann und wo die Grenze liegt.",
      effect:
        "Das schützt Teams vor teuren Schnellschüssen. Es wird aber mühsam, wenn andere Unsicherheit fast automatisch als Chance lesen und du erst noch Absicherung brauchst.",
    },
    center: {
      lead:
        "Du bist weder der geborene Bremser noch der ständige Alles-oder-nichts-Typ. Du schaust, wann Mut sinnvoll ist und wann Zurückhaltung klüger ist.",
      effect:
        "Damit kannst du in Teams viel Stabilität bringen. Gleichzeitig braucht es klare Worte von dir, damit unter Druck sichtbar bleibt, welches Risiko für dich noch okay ist.",
    },
    right: {
      lead:
        "Du hältst Unsicherheit gut aus, wenn darin eine echte unternehmerische Chance steckt. Lieber testen und lernen als zu lange absichern.",
      effect:
        "Das kann ein Team stark nach vorn ziehen. Es führt aber auch schnell zu Reibung, wenn andere zuerst Schutz, Puffer und Planbarkeit brauchen.",
    },
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    left: {
      lead:
        "Du arbeitest am liebsten mit klaren Zuständigkeiten. Wenn etwas dein Bereich ist, willst du darin auch spürbar frei handeln können.",
      effect:
        "Das bringt Ownership und Tempo. Es kippt aber schnell, wenn andere viel engere Abstimmung erwarten und du dieses Mitschwingen eher als Störung erlebst.",
    },
    center: {
      lead:
        "Du brauchst weder völlige Freiheit noch ständige Nähe. Für dich ist Zusammenarbeit dann gut, wenn Rollen klar sind und Austausch dort stattfindet, wo er wirklich hilft.",
      effect:
        "Im Alltag macht dich das flexibel. Es wird schwierig, wenn unklar bleibt, wer entscheidet, wer mitreden will und wo Verantwortung tatsächlich liegt.",
    },
    right: {
      lead:
        "Du arbeitest lieber mit engem Austausch als im stillen Nebeneinander. Transparenz, kurze Schleifen und ein gemeinsames Bild geben dir Sicherheit.",
      effect:
        "Das kann Teams eng und wirksam machen. Es kostet dich aber schnell Energie, wenn andere viel autonomer arbeiten und du zu wenig Einblick bekommst.",
    },
  },
  Commitment: {
    left: {
      lead:
        "Du setzt Verbindlichkeit nicht mit Dauer-Hochmodus gleich. Einsatz soll für dich realistisch sein und auch dann tragen, wenn der Alltag nicht ideal läuft.",
      effect:
        "Das schützt vor Überforderung und leerem Heldentum. Gleichzeitig wird es schnell heikel, wenn andere stillschweigend erwarten, dass wahres Commitment immer maximal sichtbar sein muss.",
    },
    center: {
      lead:
        "Du willst liefern, aber nicht um den Preis eines permanenten Übermodus. Für dich zählt, dass Zusagen halten und Energie nicht planlos verbrannt wird.",
      effect:
        "Das wirkt im Team oft gesund und erwachsen. Schwierig wird es, wenn über Einsatz viel gesprochen, aber wenig konkret vereinbart wird.",
    },
    right: {
      lead:
        "Du gibst dem Startup viel Raum und erwartest sichtbaren Einsatz. Lose Zusagen oder halbherzige Priorität nerven dich schnell.",
      effect:
        "Damit erzeugst du Zug und Ernsthaftigkeit. Du gerätst aber leicht unter Spannung, wenn andere Commitment deutlich flexibler verstehen als du.",
    },
  },
  Konfliktstil: {
    left: {
      lead:
        "Du gehst Spannungen nicht über Lautstärke an. Erst sortieren, dann sprechen, ist dir meist lieber als sofort in die Konfrontation zu gehen.",
      effect:
        "Das kann Gespräche klüger und fairer machen. Es kostet aber Kraft, wenn Themen im Raum stehen und andere von dir sofortige Härte oder Direktheit erwarten.",
    },
    center: {
      lead:
        "Du kannst klar werden, ohne jedes Thema sofort frontal aufzumachen. Für dich zählt der richtige Moment genauso wie die Sache selbst.",
      effect:
        "Das ist im Team oft sehr brauchbar. Es wird aber zäh, wenn Konflikte zu lange mitschwingen und niemand markiert, wann jetzt wirklich geklärt wird.",
    },
    right: {
      lead:
        "Du sprichst Spannungen lieber an, als sie im Raum stehen zu lassen. Wenn etwas schiefläuft, willst du es auf den Tisch bringen und nicht umkreisen.",
      effect:
        "Das schafft oft schnelle Klarheit. Gleichzeitig knirscht es schnell, wenn dein Gegenüber sehr viel mehr Schonraum, Abstand oder indirekte Annäherung braucht.",
    },
  },
};

const PATTERN_COPY: Record<FounderDimensionKey, Record<TendencyKey, { headline: string; body: string }>> = {
  "Vision & Unternehmenshorizont": {
    left: {
      headline: "Substanz zuerst",
      body: "Du willst nicht bloß eine große Idee, sondern ein Unternehmen, das wirklich tragen kann. Im Alltag heißt das: erst Fundament, dann Beschleunigung.",
    },
    center: {
      headline: "Richtung mit Augenmaß",
      body: "Du hältst Vision und wirtschaftliche Realität zusammen. Dadurch bleibst du beweglich, musst aber an entscheidenden Stellen klar sagen, worauf ihr jetzt setzt.",
    },
    right: {
      headline: "Groß denken fällt dir leicht",
      body: "Du arbeitest mit einem klaren Bild von Wachstum und Richtung. Das zieht nach vorn, macht fehlenden Mut oder zu viel Kleinteiligkeit im Team aber schnell sichtbar.",
    },
  },
  Entscheidungslogik: {
    left: {
      headline: "Du willst eine saubere Grundlage",
      body: "Bevor du Ja sagst, willst du wissen, worauf sich die Entscheidung stützt. Das macht dich verlässlich, bremst aber Teams, die schon handeln wollen, obwohl für dich noch etwas fehlt.",
    },
    center: {
      headline: "Du kannst prüfen und trotzdem losgehen",
      body: "Du brauchst weder endlose Analyse noch blinden Aktionismus. Stark bist du dort, wo ihr klärt, wie viel Sicherheit ihr wirklich braucht und ab wann ihr entscheidet.",
    },
    right: {
      headline: "Du setzt lieber einen Punkt",
      body: "Wenn das Bild für dich stimmig ist, willst du weitergehen statt weiterdrehen. Das bringt Tempo, macht aber langsame oder übervorsichtige Runden für dich schnell schwer erträglich.",
    },
  },
  Risikoorientierung: {
    left: {
      headline: "Du sicherst lieber ab",
      body: "Unsicherheit macht dich nicht klein, aber du willst Grenzen kennen. Gerade bei Geld, Tempo und Reichweite schützt du das Team eher vor teuren Schnellschüssen.",
    },
    center: {
      headline: "Mut, aber nicht blind",
      body: "Du kannst Chancen sehen, ohne Risiken schönzureden. Im Alltag wirkt das oft stabilisierend, solange für alle sichtbar bleibt, wo du deine Grenze ziehst.",
    },
    right: {
      headline: "Du gehst Chancen aktiv an",
      body: "Wenn in einer Situation echtes Potenzial steckt, willst du nicht lange am Rand stehen. Das bringt Bewegung, kann vorsichtigere Mitgründer aber schnell unter Druck setzen.",
    },
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    left: {
      headline: "Klare Zuständigkeit ist dir wichtig",
      body: "Du arbeitest am besten, wenn Verantwortung spürbar zugeordnet ist. Zu viel Mitsprache in deinem Bereich kann dich eher bremsen als tragen.",
    },
    center: {
      headline: "Du brauchst weder Klammer noch Funkstille",
      body: "Für dich funktioniert Zusammenarbeit dann gut, wenn Austausch etwas bringt und Verantwortung trotzdem klar bleibt. Unschärfe kostet dich hier am meisten Energie.",
    },
    right: {
      headline: "Du willst ein gemeinsames Bild",
      body: "Du arbeitest lieber mit engem Austausch als mit großem Abstand. Wenn andere zu autark unterwegs sind, fehlt dir schnell die Transparenz, die du für gute Zusammenarbeit brauchst.",
    },
  },
  Commitment: {
    left: {
      headline: "Einsatz ja, aber nicht um jeden Preis",
      body: "Für dich ist Verbindlichkeit etwas anderes als Selbstausbeutung. Du willst, dass Zusagen halten und Belastung trotzdem tragbar bleibt.",
    },
    center: {
      headline: "Du suchst einen tragfähigen Modus",
      body: "Du willst ernsthaft arbeiten, aber nicht im Dauer-Alarm leben. Gut wird es für dich dort, wo Einsatz klar ist und trotzdem niemand nur über Härte definiert wird.",
    },
    right: {
      headline: "Halber Einsatz frustriert dich schnell",
      body: "Wenn es um das Startup geht, erwartest du Fokus und sichtbare Verbindlichkeit. Lose Prioritäten oder unklare Zusagen kosten dich schnell Vertrauen.",
    },
  },
  Konfliktstil: {
    left: {
      headline: "Du gehst nicht sofort in die Schärfe",
      body: "Wenn es knirscht, sortierst du erst, bevor du das Thema aufmachst. Das schützt Gespräche vor Eskalation, kann wichtige Klärung aber auch nach hinten schieben.",
    },
    center: {
      headline: "Du suchst den richtigen Moment",
      body: "Du kannst Dinge klar ansprechen, ohne jedes Problem sofort hart aufzumachen. Das funktioniert gut, solange Konflikte nicht zu lange in der Schwebe bleiben.",
    },
    right: {
      headline: "Du gehst lieber direkt rein",
      body: "Wenn etwas schiefläuft, willst du es benennen und nicht mitlaufen lassen. Das schafft Tempo in der Klärung, fordert aber ein Gegenüber, das mit dieser Direktheit umgehen kann.",
    },
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

const COMPLEMENT_COPY: Record<FounderDimensionKey, Record<TendencyKey, { summary: string; bullet: string }>> = {
  "Vision & Unternehmenshorizont": {
    left: {
      summary:
        "Besonders gut funktioniert es oft mit Menschen, die aus einer Idee schneller einen größeren Horizont machen, ohne dabei die Bodenhaftung zu verlieren.",
      bullet:
        "Besonders gut funktioniert es oft mit Menschen, die schneller zuspitzen, wohin das Unternehmen wachsen soll, während du auf Tragfähigkeit achtest.",
    },
    center: {
      summary:
        "Ergänzend wirkt hier vor allem ein Profil, das an den richtigen Stellen mutiger oder klarer wird, wenn du mehrere Wege noch offenhältst.",
      bullet:
        "Ergänzend wirkt vor allem ein Profil, das bei Richtungsfragen früher festlegt, worauf ihr euch jetzt konzentriert.",
    },
    right: {
      summary:
        "Stark wird die Zusammenarbeit dort, wo dein Gegenüber das große Bild mitträgt, aber früh fragt, was davon heute schon wirklich tragfähig ist.",
      bullet:
        "Stark wird die Zusammenarbeit dort, wo dein Gegenüber Vision nicht kleinmacht, aber sie in belastbare Schritte übersetzt.",
    },
  },
  Entscheidungslogik: {
    left: {
      summary:
        "Besonders gut passt oft jemand, der auch mit weniger vollständiger Sicherheit handlungsfähig bleibt, ohne deine Sorgfalt als Bremse abzutun.",
      bullet:
        "Besonders gut passt oft jemand, der Entscheidungen früher zuspitzt, wenn für dich noch Detailfragen offen sind.",
    },
    center: {
      summary:
        "Gut ergänzt dich hier jemand, der unter Druck nicht unklar wird, sondern markieren kann, wann Schluss mit Prüfen und Zeit für eine Entscheidung ist.",
      bullet:
        "Gut ergänzt dich hier jemand, der im entscheidenden Moment den Punkt setzt, ohne deine Abwägung zu übergehen.",
    },
    right: {
      summary:
        "Ergänzend wirkt ein Profil, das Tempo nicht ausbremst, aber dir bei größeren Weichenstellungen verlässlich Substanz und Gegenprüfung gibt.",
      bullet:
        "Ergänzend wirkt ein Profil, das deine Schnelligkeit stützt, aber bei folgenreichen Entscheidungen spürbar Struktur reinbringt.",
    },
  },
  Risikoorientierung: {
    left: {
      summary:
        "Stark wird die Zusammenarbeit oft mit Menschen, die Chancen klar benennen und dich eher nach vorne ziehen, ohne leichtsinnig zu werden.",
      bullet:
        "Stark wird die Zusammenarbeit oft mit Menschen, die eher etwas wagen und dadurch Bewegung ins Team bringen, während du die Grenzen im Blick behältst.",
    },
    center: {
      summary:
        "Gut passt hier ein Co-Founder, der unter Unsicherheit klar markiert, wann ihr mutiger sein solltet und wann ihr lieber beim Plan bleibt.",
      bullet:
        "Gut passt hier ein Co-Founder, der bei Risiko-Fragen früh Klartext spricht, statt euch in diffusem Vielleicht hängen zu lassen.",
    },
    right: {
      summary:
        "Besonders wertvoll ist hier jemand, der Chancen nicht kleinredet, aber dir früh spürbare Leitplanken für Geld, Timing und Tragbarkeit gibt.",
      bullet:
        "Besonders wertvoll ist hier jemand, der deine Risikofreude nicht bremst, aber Grenzen und Folgen nüchtern mitdenkt.",
    },
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    left: {
      summary:
        "Gut funktioniert es oft mit Menschen, die nicht in jeden Bereich hineinregieren, aber verlässlich Transparenz und Rückkopplung halten.",
      bullet:
        "Gut funktioniert es oft mit Menschen, die dir Freiheit lassen und trotzdem nicht erst spät sichtbar machen, wo etwas schiefläuft.",
    },
    center: {
      summary:
        "Ergänzend wirkt hier vor allem ein Gegenüber, das sauber zwischen Mitsprache und Zuständigkeit unterscheiden kann.",
      bullet:
        "Ergänzend wirkt hier vor allem ein Gegenüber, das Rollen klar hält und dadurch unnötige Reibung aus der Zusammenarbeit nimmt.",
    },
    right: {
      summary:
        "Stark wird diese Konstellation oft mit Menschen, die eigenständig liefern, dir aber trotzdem genug Einblick geben, damit du nicht im Dunkeln arbeitest.",
      bullet:
        "Stark wird diese Konstellation oft mit Menschen, die Verantwortung selbst tragen und dir trotzdem früh sagen, was gerade wichtig wird.",
    },
  },
  Commitment: {
    left: {
      summary:
        "Besonders gut passt jemand, der Verbindlichkeit klar lebt, ohne daraus einen ständigen Überforderungsmodus zu machen.",
      bullet:
        "Besonders gut passt jemand, der ernsthaft liefert und dabei versteht, dass Einsatz nur dann stark ist, wenn er langfristig tragbar bleibt.",
    },
    center: {
      summary:
        "Gut ergänzt dich hier ein Mensch, der Erwartungen an Fokus und Einsatz nicht erraten lässt, sondern sauber ausspricht.",
      bullet:
        "Gut ergänzt dich hier ein Mensch, der Verbindlichkeit konkret macht, damit aus guter Absicht keine stille Enttäuschung wird.",
    },
    right: {
      summary:
        "Ergänzend wirkt ein Profil, das deinen hohen Anspruch mitträgt, dabei aber spürbar auf Nachhaltigkeit, Belastung und Grenzen achtet.",
      bullet:
        "Ergänzend wirkt ein Profil, das deinen Einsatz ernst nimmt, aber früh merkt, wann der Modus kippt und nachjustiert werden muss.",
    },
  },
  Konfliktstil: {
    left: {
      summary:
        "Besonders gut funktioniert es oft mit Menschen, die Spannungen nicht eskalieren, aber sie auch nicht einfach liegen lassen.",
      bullet:
        "Besonders gut funktioniert es oft mit Menschen, die ein Thema ruhig, aber früher aufmachen, wenn du noch sortierst.",
    },
    center: {
      summary:
        "Gut ergänzt dich hier jemand, der Klarheit nicht scheut und trotzdem ein Gefühl dafür hat, wann ein Gespräch wirklich getragen ist.",
      bullet:
        "Gut ergänzt dich hier jemand, der Dinge offen benennt, ohne jede Reibung sofort unnötig scharf zu machen.",
    },
    right: {
      summary:
        "Stark wird die Zusammenarbeit dort, wo dein Gegenüber deine Direktheit aushält, ohne selbst in Verteidigung oder Rückzug zu kippen.",
      bullet:
        "Stark wird die Zusammenarbeit dort, wo dein Gegenüber Spannungen ebenso ernst nimmt wie du, sie aber in einen guten Rahmen bringt.",
    },
  },
};

const CONVERSATION_HINT_COPY: Record<FounderDimensionKey, Record<TendencyKey, string>> = {
  "Vision & Unternehmenshorizont": {
    left: "Kläre früh, wie groß ihr das Unternehmen wirklich bauen wollt und woran ihr merkt, dass Wachstum für euch noch sinnvoll ist.",
    center: "Lass in Gesprächen nicht offen, welche Richtung für dich im Zweifel Vorrang hat: Aufbau, Tempo oder wirtschaftliche Ruhe.",
    right: "Sprich offen darüber, wie viel Größe du willst und wie viel Unsicherheit du dafür in Kauf zu nehmen bereit bist.",
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
    left: "Kläre, wo du echte Zuständigkeit brauchst und ab wann Mitsprache für dich eher stört als hilft.",
    center: "Sprecht sauber darüber, wie viel Abstimmung ihr wirklich braucht und wo jeder eigenständig entscheidet.",
    right: "Frag offen, wie viel Transparenz und Austausch dein Gegenüber im Alltag geben will, bevor ihr euch auf Zusammenarbeit einlasst.",
  },
  Commitment: {
    left: "Sprich früh aus, was für dich verlässlich ist und was du ausdrücklich nicht als Dauerzustand zusagen willst.",
    center: "Kläre in Gesprächen konkret, was Fokus, Priorität und Verbindlichkeit im Alltag tatsächlich bedeuten sollen.",
    right: "Frag nicht nur nach Motivation, sondern nach sichtbarem Einsatz: Zeit, Priorität, Energie und Verlässlichkeit.",
  },
  Konfliktstil: {
    left: "Sprich an, wie schnell schwierige Themen auf den Tisch kommen sollen und wie viel Zeit du brauchst, bevor du in ein Gespräch gehst.",
    center: "Kläre früh, wie ihr Konflikte ansprecht, bevor sie mitschwingen und aus kleinen Reibungen große Missverständnisse werden.",
    right: "Prüf in Gesprächen, ob dein Gegenüber mit direkter Ansprache umgehen kann oder unter deiner Klarheit schnell dichtmacht.",
  },
};
