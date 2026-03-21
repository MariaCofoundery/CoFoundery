import { ComparisonScale } from "@/features/reporting/ComparisonScale";
import {
  FOUNDER_DIMENSION_META,
} from "@/features/reporting/founderDimensionMeta";
import type { FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import {
  buildSelfReportSelection,
  buildSelfReportSignals,
  type SelfReportSelection,
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
  const profileSummary = buildFounderProfileSummary(report, selection);
  const complementSummary = buildComplementSummary(selection);
  const complementBullets = buildComplementBullets(selection);
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
          {selection.patternDimensions.map((entry) => (
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
          {selection.challengeDimensions.map((entry) => (
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

function buildFounderProfileSummary(
  report: SelfAlignmentReport,
  selection: SelfReportSelection
) {
  if (!selection.hero.primarySignal) {
    return [
      "Für ein belastbares Bild fehlen im Moment noch Antworten aus dem Basisfragebogen.",
      "Sobald dein Profil vollständig ist, zeigt dir dieser Report klarer, wie du entscheidest, mit anderen arbeitest und worauf du als Founder besonderen Wert legst.",
    ];
  }

  const valuesLine =
    report.valuesModuleStatus === "completed"
      ? "Dein Werteprofil zeigt zusätzlich, was hinter diesen Entscheidungen innerlich den Ausschlag gibt."
      : null;

  if (selection.balancedProfile) {
    return [
      "Du gehst als Founder nicht mit einer starren Handschrift in jede Situation. Du schaust erst hin, hältst Möglichkeiten offen und legst dich nicht nur deshalb fest, weil gerade Druck entsteht.",
      "Im Alltag macht dich das beweglich, weil du zwischen unterschiedlichen Arbeitsmodi umschalten kannst, statt alles immer nach nur einer Linie zu behandeln.",
      "Gerade darin steckt aber auch Reibung: Wenn du nicht früh klar machst, was jetzt Priorität hat, bleibt für andere schnell zu viel Interpretationsspielraum.",
      selection.hero.tensionCarrier
        ? HERO_COPY[selection.hero.tensionCarrier.dimension][selection.hero.tensionCarrier.tendencyKey].effect
        : "Besonders wichtig ist deshalb, offene Erwartungen früh sichtbar zu machen, bevor daraus stille Missverständnisse werden.",
      ...(valuesLine ? [valuesLine] : []),
    ];
  }

  const primaryHero = HERO_COPY[selection.hero.primarySignal.dimension][selection.hero.primarySignal.tendencyKey];
  const workModeHero = selection.hero.workModeSignal
    ? HERO_COPY[selection.hero.workModeSignal.dimension][selection.hero.workModeSignal.tendencyKey]
    : null;
  const tensionHero = selection.hero.tensionCarrier
    ? HERO_COPY[selection.hero.tensionCarrier.dimension][selection.hero.tensionCarrier.tendencyKey]
    : null;

  return [
    primaryHero.lead,
    workModeHero?.lead ??
      "Du bringst damit eine erkennbare Handschrift in Entscheidungen, Zusammenarbeit und Verantwortung mit.",
    workModeHero?.effect ??
      "Andere merken das nicht in Modellen, sondern daran, wie du Tempo hältst, Zuständigkeit verstehst und mit offenen Punkten umgehst.",
    tensionHero?.effect ?? primaryHero.effect,
    ...(valuesLine ? [valuesLine] : []),
  ];
}

function buildComplementSummary(selection: SelfReportSelection) {
  const [primary, regulator, rhythm] = selection.complementRoles;

  if (!primary) {
    return "Sobald mehr Antworten vorliegen, lässt sich klarer sagen, mit welcher Art von Co-Founder deine Zusammenarbeit besonders stark wird.";
  }

  const first = COMPLEMENT_COPY[primary.signal.dimension][primary.signal.tendencyKey];
  if (!regulator && !rhythm) return first.summary;

  if (selection.balancedProfile && regulator) {
    return `${first.summary} Wichtig ist dabei vor allem ein Gegenüber, das in offenen Situationen schneller sichtbar macht, was jetzt geklärt, entschieden oder nachgeschärft werden muss.`;
  }

  if (regulator && rhythm) {
    return `${first.summary} Besonders gut trägt das, wenn dein Gegenüber Spannungen in ${FOUNDER_DIMENSION_META[regulator.signal.dimension].shortLabel.toLowerCase()} gut regulieren kann und im Alltag einen Arbeitsrhythmus mitbringt, der zu deinem Modus passt.`;
  }

  const secondary = regulator ?? rhythm;
  return `${first.summary} Besonders gut trägt das, wenn dein Gegenüber auch in ${FOUNDER_DIMENSION_META[secondary.signal.dimension].shortLabel.toLowerCase()} etwas mitbringt, was dir nicht ohnehin schon leichtfällt.`;
}

function buildComplementBullets(selection: SelfReportSelection) {
  const bullets = selection.complementRoles.map(
    (entry) => COMPLEMENT_COPY[entry.signal.dimension][entry.signal.tendencyKey].bullet
  );

  return bullets.length > 0
    ? bullets
    : [
        "Besonders gut funktioniert es oft mit Menschen, die Unklarheit nicht lange stehen lassen, sondern Richtung geben.",
        "Stark wird die Zusammenarbeit dort, wo dein Gegenüber sauber strukturiert und trotzdem nicht starr wird.",
      ];
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
  Unternehmenslogik: {
    left: {
      lead:
        "Du richtest unternehmerische Entscheidungen zuerst an Wirkung, Marktlogik und Skalierbarkeit aus. Bevor du lange aufbaust, willst du wissen, was wirklich Hebel erzeugt.",
      effect:
        "Im Gründeralltag merkt man das daran, dass du bei Wachstum, Hiring oder Geldfragen schnell auf strategische Reichweite und Verwertbarkeit schaust.",
    },
    center: {
      lead:
        "Du legst dich nicht früh auf nur eine Seite fest. Für dich zählt, wann Marktchance mehr Gewicht braucht und wann Aufbau und Tragfähigkeit führen müssen.",
      effect:
        "Dadurch bleibst du beweglich, musst aber klar markieren, woran ihr euch in wichtigen Entscheidungen jetzt tatsächlich orientiert.",
    },
    right: {
      lead:
        "Du denkst ein Unternehmen stark von Substanz, Aufbau und langfristiger Tragfähigkeit her. Bevor etwas groß wird, soll es auch tragen.",
      effect:
        "Das gibt Entscheidungen Tiefe und Stabilität. Es macht aber auch schnell sichtbar, wenn andere stärker auf Hebel und Marktwirkung drängen als du.",
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
        "Du arbeitest am liebsten mit klaren Zuständigkeiten und eigenem Raum. Wenn etwas bei dir liegt, willst du darin nicht dauernd rückgekoppelt arbeiten müssen.",
      effect:
        "Das bringt Fokus und Tempo. Es wird aber schnell anstrengend, wenn andere deutlich mehr Nähe, Sichtbarkeit und laufende Abstimmung brauchen als du.",
    },
    center: {
      lead:
        "Du brauchst weder Funkstille noch Dauerabstimmung. Für dich ist Zusammenarbeit dann gut, wenn Austausch Orientierung gibt und nicht jeden Arbeitsschritt begleitet.",
      effect:
        "Im Alltag macht dich das flexibel. Schwieriger wird es, wenn im Team unklar bleibt, wann etwas eng gemeinsam läuft und wann jeder eigenständig weiterarbeitet.",
    },
    right: {
      lead:
        "Du arbeitest lieber mit engem Austausch als im stillen Nebeneinander. Ein gemeinsames Bild von Fortschritt, Entscheidungen und offenen Punkten gibt dir Orientierung.",
      effect:
        "Das kann Teams eng und wirksam machen. Es kostet dich aber schnell Energie, wenn andere viel autonomer arbeiten und du wichtige Dinge erst spät mitbekommst.",
    },
  },
  Commitment: {
    left: {
      lead:
        "Das Startup hat für dich Gewicht, aber nicht auf Kosten jedes anderen Lebensbereichs. Du willst einen Arbeitsmodus, der auch dann trägt, wenn Alltag und Verpflichtungen nicht ideal sortiert sind.",
      effect:
        "Dadurch entsteht Klarheit darüber, dass Verfügbarkeit und Intensität bewusst begrenzt sein können. Spannungen entstehen dort, wo im Team deutlich mehr Präsenz oder ein anderer Stellenwert des Startups vorausgesetzt wird.",
    },
    center: {
      lead:
        "Du gibst dem Startup spürbar Priorität, aber nicht in jeder Phase auf dieselbe Weise. Für dich zählt, dass Intensität zur Lage passt und nicht bloß aus diffusem Druck entsteht.",
      effect:
        "Das funktioniert gut, wenn im Team offen geklärt ist, wann mehr Fokus gefragt ist und wann ein begrenzterer Modus völlig stimmig ist. Unklarheit darüber kostet hier am meisten Energie.",
    },
    right: {
      lead:
        "Das Startup steht für dich klar im Zentrum. Du planst Zeit, Energie und Aufmerksamkeit stark darum herum und liest Zusammenarbeit auch über dieses hohe Einsatzniveau.",
      effect:
        "Das bringt Tempo und Konzentration in ein Team. Es wird aber schnell reibungsvoll, wenn andere Priorität, Verfügbarkeit und Intensität deutlich anders einordnen als du.",
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
  Unternehmenslogik: {
    left: {
      headline: "Du denkst zuerst in Hebeln",
      body: "Du sortierst Chancen stark danach, ob sie strategische Wirkung haben und das Unternehmen voranbringen. Das schafft Klarheit, kann Aufbaufragen aber zu leicht nach hinten schieben.",
    },
    center: {
      headline: "Du hältst Wirkung und Substanz zusammen",
      body: "Du kannst Marktchance und Aufbau zugleich sehen. Entscheidend ist für dich, an kritischen Stellen klar zu sagen, was jetzt Vorrang hat.",
    },
    right: {
      headline: "Du baust lieber tragfähig als schnell",
      body: "Du prüfst Chancen stark darauf, ob sie das Unternehmen wirklich stabiler machen. Das bringt Substanz, macht aber vorschnelle Beschleunigung für dich schnell fragwürdig.",
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
      headline: "Du brauchst echten Eigenraum",
      body: "Du arbeitest am besten, wenn Zuständigkeiten klar sind und du nicht bei jedem Schritt in Schleifen hängen bleibst. Zu viel laufende Abstimmung kostet dich schneller Energie als zu wenig.",
    },
    center: {
      headline: "Du steuerst Nähe bewusst",
      body: "Für dich funktioniert Zusammenarbeit dann gut, wenn Austausch dort passiert, wo er wirklich etwas klärt. Unschärfe darüber, wann ihr eng arbeitet und wann nicht, kostet dich hier am meisten Energie.",
    },
    right: {
      headline: "Du willst laufend verbunden bleiben",
      body: "Du arbeitest lieber mit engem Austausch als mit großem Abstand. Wenn andere zu viel allein vor sich hin arbeiten, fehlt dir schnell das gemeinsame Bild, das du für gute Zusammenarbeit brauchst.",
    },
  },
  Commitment: {
    left: {
      headline: "Du hältst das Startup in einen größeren Rahmen eingebettet",
      body: "Das Unternehmen ist für dich wichtig, aber nicht der einzige Bezugspunkt. Du brauchst einen Modus, in dem Einsatz und übriger Alltag zusammenpassen.",
    },
    center: {
      headline: "Du steuerst Intensität situativ",
      body: "Du kannst Phasen mit viel Fokus gut tragen, solange klar ist, warum sie gerade nötig sind. Entscheidend ist für dich, dass Intensität bewusst abgestimmt wird.",
    },
    right: {
      headline: "Du priorisierst das Startup klar",
      body: "Für dich ist hohe Verfügbarkeit kein Ausnahmezustand, sondern oft Teil der Zusammenarbeit. Reibung entsteht, wenn dieses Einsatzniveau im Team sehr unterschiedlich gelesen wird.",
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
  Unternehmenslogik: {
    left: "Schwierig wird es, wenn andere viel stärker auf Aufbau und Tragfähigkeit schauen und du mehr Zug auf strategische Wirkung geben willst.",
    center: "Kann dich ausbremsen, wenn im Team lange offenbleibt, ob Marktchance oder Substanz gerade Vorrang haben soll.",
    right: "Wird schnell zäh, wenn andere Hebel und Marktwirkung stark nach vorne stellen und du erst wissen willst, was davon wirklich trägt.",
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
    left: "Wird schwierig, wenn andere dich sehr eng im Loop halten wollen und du eigentlich mit mehr Eigenraum arbeiten möchtest.",
    center: "Kann zäh werden, wenn unklar bleibt, wann ihr eng abstimmt und wann jeder eigenständig weiterarbeitet.",
    right: "Kann dich ausbremsen, wenn andere mit wenig Rückkopplung arbeiten und du zu wenig Sichtbarkeit über Fortschritt oder offene Punkte bekommst.",
  },
  Commitment: {
    left: "Wird schnell angespannt, wenn im Team deutlich mehr Verfügbarkeit oder ein anderer Stellenwert des Startups vorausgesetzt wird als für dich stimmig ist.",
    center: "Kann kippen, wenn niemand ausspricht, wann ein höheres Einsatzniveau erwartet wird und wann ein begrenzterer Rahmen völlig reicht.",
    right: "Wird schwierig, wenn du das Startup klar priorisierst und andere mit einem deutlich breiteren Lebens- oder Arbeitsrahmen planen.",
  },
  Konfliktstil: {
    left: "Kann dich ausbremsen, wenn Spannungen im Raum stehen und andere sofort Härte oder direkte Konfrontation erwarten.",
    center: "Wird schwierig, wenn Themen lange mitschwingen und niemand klar macht, wann ihr sie wirklich besprecht.",
    right: "Kann schnell knirschen, wenn dein direktes Ansprechen auf ein Team trifft, das Konflikte lieber erst einmal liegen lässt.",
  },
};

const COMPLEMENT_COPY: Record<FounderDimensionKey, Record<TendencyKey, { summary: string; bullet: string }>> = {
  Unternehmenslogik: {
    left: {
      summary:
        "Besonders gut funktioniert es oft mit Menschen, die Aufbau und Tragfähigkeit stark mitdenken, ohne dir den Blick auf strategische Wirkung auszureden.",
      bullet:
        "Besonders gut funktioniert es oft mit Menschen, die frueh fragen, was auch morgen noch trägt, während du auf Hebel und Wirkung schaust.",
    },
    center: {
      summary:
        "Ergänzend wirkt hier vor allem ein Profil, das an den richtigen Stellen sauber zuspitzt, ob jetzt strategische Wirkung oder Aufbau führen soll.",
      bullet:
        "Ergänzend wirkt vor allem ein Profil, das bei Grundsatzentscheidungen früher festlegt, woran ihr euch jetzt konzentriert.",
    },
    right: {
      summary:
        "Stark wird die Zusammenarbeit dort, wo dein Gegenüber Marktchancen klar erkennt, ohne deinen Blick auf Substanz und Aufbau kleinzumachen.",
      bullet:
        "Stark wird die Zusammenarbeit dort, wo dein Gegenüber Hebel und Marktwirkung sieht, sie aber in belastbare Schritte uebersetzt.",
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
        "Gut funktioniert es oft mit Menschen, die dir Eigenraum lassen und trotzdem früh sichtbar machen, wenn etwas kippt, hängt oder neu abgestimmt werden muss.",
      bullet:
        "Gut funktioniert es oft mit Menschen, die nicht alles gemeinsam machen wollen, aber relevante Zwischenstände nicht erst sehr spät teilen.",
    },
    center: {
      summary:
        "Ergänzend wirkt hier vor allem ein Gegenüber, das ein gutes Gefühl dafür hat, wann enge Abstimmung hilft und wann sie nur Reibung erzeugt.",
      bullet:
        "Ergänzend wirkt hier vor allem ein Gegenüber, das Arbeitsrhythmen klar macht und nicht voraussetzt, dass beide denselben Abstimmungsbedarf haben.",
    },
    right: {
      summary:
        "Stark wird diese Konstellation oft mit Menschen, die eigenständig arbeiten können und trotzdem früh teilen, was gerade wichtig, offen oder kritisch wird.",
      bullet:
        "Stark wird diese Konstellation oft mit Menschen, die nicht dauernd Rücksprache brauchen, dir aber verlässlich genug Sichtbarkeit geben, damit ihr verbunden bleibt.",
    },
  },
  Commitment: {
    left: {
      summary:
        "Besonders gut passt jemand, der mit begrenzterem Einsatzrahmen umgehen kann und Erwartungen an Verfügbarkeit nicht still nach oben zieht.",
      bullet:
        "Besonders gut passt jemand, der Priorität und Einsatzniveau offen abstimmt, statt sie implizit zu setzen.",
    },
    center: {
      summary:
        "Gut ergänzt dich hier ein Mensch, der Intensität und Verfügbarkeit früh konkret macht, statt sie aus dem Moment heraus zu verhandeln.",
      bullet:
        "Gut ergänzt dich hier ein Mensch, der klare Arbeitsrealitäten benennt, damit aus guter Absicht keine stille Enttäuschung wird.",
    },
    right: {
      summary:
        "Ergänzend wirkt ein Profil, das hohe Priorisierung versteht, aber Unterschiede in Kapazität und Alltagsrahmen früh sichtbar macht.",
      bullet:
        "Ergänzend wirkt ein Profil, das dein hohes Einsatzniveau nicht kleinredet, aber Erwartungen an Intensität sauber übersetzt.",
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
  Unternehmenslogik: {
    left: "Kläre früh, woran du unternehmerische Entscheidungen ausrichtest und wie viel Gewicht Marktchance gegenüber Tragfähigkeit für dich haben darf.",
    center: "Lass in Gesprächen nicht offen, was für dich in Zweifelsfällen Vorrang hat: Wirkung, Skalierbarkeit oder tragfähiger Aufbau.",
    right: "Sprich offen darueber, wie stark du Entscheidungen an Substanz, Aufbau und langfristiger Tragfaehigkeit festmachst.",
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
    center: "Kläre in Gesprächen konkret, wann mehr Fokus erwartet wird und wann ein begrenzterer Modus für euch beide stimmig ist.",
    right: "Frag nicht nur nach Motivation, sondern danach, welches Einsatzniveau und welche Priorisierung dein Gegenüber im Alltag tatsächlich tragen will.",
  },
  Konfliktstil: {
    left: "Sprich an, wie schnell schwierige Themen auf den Tisch kommen sollen und wie viel Zeit du brauchst, bevor du in ein Gespräch gehst.",
    center: "Kläre früh, wie ihr Konflikte ansprecht, bevor sie mitschwingen und aus kleinen Reibungen große Missverständnisse werden.",
    right: "Prüf in Gesprächen, ob dein Gegenüber mit direkter Ansprache umgehen kann oder unter deiner Klarheit schnell dichtmacht.",
  },
};
