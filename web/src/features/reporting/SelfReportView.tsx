import {
  FOUNDER_DIMENSION_META,
  type FounderDimensionKey,
} from "@/features/reporting/founderDimensionMeta";
import {
  buildSelfReportSelection,
  buildSelfReportSignals,
  type SelfReportSelection,
  type SelfReportSignal,
} from "@/features/reporting/selfReportSelection";
import { type SelfAlignmentReport } from "@/features/reporting/selfReportTypes";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";

type Props = {
  report: SelfAlignmentReport;
};

type CoreParagraph = {
  text: string;
  highSignal?: boolean;
};

type EverydayBlock = {
  dimension: FounderDimensionKey;
  title: string;
  statement: string;
  situation: string;
  highSignal?: boolean;
};

type TeamBreakBlock = {
  dimension: FounderDimensionKey;
  title: string;
  text: string;
  highSignal?: boolean;
};

type InterpretationBlock = {
  title: string;
  text: string;
};

type LeverBlock = {
  title: string;
  text: string;
};

export function SelfReportView({ report }: Props) {
  const selection = buildSelfReportSelection(report.scoresA);
  const signals = buildSelfReportSignals(report.scoresA);
  const coreParagraphs = buildCorePatternParagraphs(selection);
  const everydayBlocks = buildEverydayBlocks(selection, signals);
  const teamBreakBlocks = buildTeamBreakBlocks(selection);
  const misreadings = buildMisreadingBlocks(selection, signals);
  const levers = buildLeverBlocks(selection, signals);
  const showValuesSection =
    report.valuesModuleStatus !== "not_started" ||
    Boolean(report.selfValuesProfile) ||
    Boolean(report.valuesModulePreview?.trim());

  return (
    <>
      <section className="page-section rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">1. Kernmuster</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">So funktioniert dein Profil gerade</h2>
            <div className="mt-5 space-y-4">
              {coreParagraphs.map((paragraph) => (
                <article key={paragraph.text} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                  {paragraph.highSignal ? <SignalBadge label="High-Signal" tone="high" /> : null}
                  <p className="mt-2 text-sm leading-7 text-slate-800">{paragraph.text}</p>
                </article>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <SignalBadge label="Basisprofil abgeschlossen" tone="neutral" />
              <SignalBadge
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
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">2. So wirkst du im Alltag</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {everydayBlocks.map((block) => (
            <article key={`${block.dimension}-${block.title}`} className="rounded-2xl border border-slate-200/80 bg-white p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  {FOUNDER_DIMENSION_META[block.dimension].canonicalName}
                </p>
                {block.highSignal ? <SignalBadge label="High-Signal" tone="soft" /> : null}
              </div>
              <h3 className="mt-3 text-base font-semibold text-slate-900">{block.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-800">{block.statement}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                <span className="font-medium text-slate-900">Typische Situation:</span> {block.situation}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">3. Wo es im Team kippt</p>
        <div className="mt-6 grid gap-4">
          {teamBreakBlocks.map((block) => (
            <article key={`break-${block.dimension}-${block.title}`} className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-amber-800">
                  {FOUNDER_DIMENSION_META[block.dimension].canonicalName}
                </p>
                {block.highSignal ? <SignalBadge label="High-Signal" tone="warning" /> : null}
              </div>
              <h3 className="mt-3 text-base font-semibold text-slate-900">{block.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-800">{block.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">4. Wie andere dich lesen könnten</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {misreadings.map((entry) => (
            <article key={`misreading-${entry.title}`} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5">
              <h3 className="text-sm font-semibold text-slate-900">{entry.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">{entry.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">5. Deine Hebel im Alltag</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {levers.map((entry) => (
            <article key={`lever-${entry.title}`} className="rounded-2xl border border-slate-200/80 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-900">{entry.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">{entry.text}</p>
            </article>
          ))}
        </div>
      </section>

      {showValuesSection ? (
        <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">6. Werteprofil</p>
          <div className="mt-5">{renderCompactValuesSection(report)}</div>
        </section>
      ) : null}
    </>
  );
}

function buildCorePatternParagraphs(selection: SelfReportSelection): CoreParagraph[] {
  const orderedSignals = collectUniqueSignals(
    selection.hero.primarySignal,
    selection.hero.workModeSignal,
    selection.patternDimensions,
    selection.hero.tensionCarrier
  );

  const paragraphs: CoreParagraph[] = [];

  if (orderedSignals[0]) {
    paragraphs.push({
      text: buildCoreIdentityParagraph(orderedSignals[0], selection.balancedProfile),
      highSignal: true,
    });
  }

  if (orderedSignals[1]) {
    paragraphs.push({
      text: buildCoreSupportParagraph(orderedSignals[1]),
    });
  }

  if (orderedSignals[2]) {
    paragraphs.push({
      text: buildCoreSupportParagraph(orderedSignals[2]),
    });
  }

  paragraphs.push({
    text: buildCoreTensionParagraph(selection.hero.tensionCarrier),
    highSignal: true,
  });

  return paragraphs.slice(0, 4);
}

function buildEverydayBlocks(
  selection: SelfReportSelection,
  signals: SelfReportSignal[]
): EverydayBlock[] {
  return collectUniqueSignals(
    selection.patternDimensions,
    selection.hero.workModeSignal,
    selection.hero.primarySignal,
    selection.hero.tensionCarrier,
    signals
  )
    .slice(0, 5)
    .map((signal, index) => ({
      ...buildEverydayCopy(signal),
      highSignal: index === 0 && signal.isClear,
    }));
}

function buildTeamBreakBlocks(selection: SelfReportSelection): TeamBreakBlock[] {
  return selection.challengeDimensions.slice(0, 3).map((signal) => ({
    ...buildTeamBreakCopy(signal),
    highSignal: true,
  }));
}

function buildMisreadingBlocks(
  selection: SelfReportSelection,
  signals: SelfReportSignal[]
): InterpretationBlock[] {
  return collectUniqueSignals(
    selection.hero.primarySignal,
    selection.hero.workModeSignal,
    selection.hero.tensionCarrier,
    signals
  )
    .slice(0, 3)
    .map(buildMisreadingCopy);
}

function buildLeverBlocks(
  selection: SelfReportSelection,
  signals: SelfReportSignal[]
): LeverBlock[] {
  return collectUniqueSignals(selection.conversationHintDimensions, selection.patternDimensions, signals)
    .slice(0, 4)
    .map(buildLeverCopy);
}

function collectUniqueSignals(
  ...groups: Array<SelfReportSignal | SelfReportSignal[] | null | undefined>
) {
  const ordered: SelfReportSignal[] = [];
  const seen = new Set<FounderDimensionKey>();

  for (const group of groups) {
    const entries = Array.isArray(group) ? group : group ? [group] : [];
    for (const entry of entries) {
      if (seen.has(entry.dimension)) {
        continue;
      }
      seen.add(entry.dimension);
      ordered.push(entry);
    }
  }

  return ordered;
}

function buildCoreIdentityParagraph(signal: SelfReportSignal, balancedProfile: boolean) {
  switch (signal.dimension) {
    case "Unternehmenslogik":
      return signal.tendencyKey === "left"
        ? "Du gibst neuen Möglichkeiten erst dann Gewicht, wenn sie das Unternehmen klarer, solider und langfristig tragfähig machen."
        : signal.tendencyKey === "center"
          ? balancedProfile
            ? "Du reagierst auf neue Möglichkeiten nicht reflexhaft. Je nach Lage schützt du mal den Aufbau und öffnest mal Raum für die größere Chance."
            : "Du kippst bei neuen Möglichkeiten nicht blind in eine Richtung. Mal schützt du den Aufbau, mal gehst du auf eine größere Chance."
          : "Du springst bei neuen Möglichkeiten früh an, wenn sie spürbar mehr Reichweite, Wachstum oder Hebel öffnen.";
    case "Entscheidungslogik":
      return signal.tendencyKey === "left"
        ? "Du willst vor wichtigen Entscheidungen die entscheidenden Punkte geklärt haben, statt zu früh festzulegen."
        : signal.tendencyKey === "center"
          ? "Du brauchst nicht überall dieselbe Tiefe. Manche Fragen prüfst du lange, andere legst du früh fest."
          : "Du entscheidest, sobald eine Richtung für dich trägt, auch wenn noch nicht alles geklärt ist.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return signal.tendencyKey === "left"
        ? "Du arbeitest lieber mit eigenem Raum und klaren Übergaben als mit laufender Mitsicht."
        : signal.tendencyKey === "center"
          ? "Du willst weder Dauerabstimmung noch kompletten Funkkontakt. Für dich muss klar sein, wann Eigenraum trägt und wann enger Austausch nötig ist."
          : "Du willst Fortschritt, offene Punkte und Richtungswechsel früh im gemeinsamen Blick haben.";
    case "Commitment":
      return signal.tendencyKey === "left"
        ? "Du gibst dem Startup Gewicht, aber nicht um den Preis dauerhaft offener Grenzen."
        : signal.tendencyKey === "center"
          ? "Dein Einsatz ist nicht starr. Du kannst sichtbar hochfahren, willst aber nicht, dass dieser Modus still zum Dauerzustand wird."
          : "Du richtest Zeit, Energie und Aufmerksamkeit klar auf das Startup aus und liest daran auch, wie ernst ein Vorhaben gerade gemeint ist.";
    case "Risikoorientierung":
      return signal.tendencyKey === "left"
        ? "Du gehst Chancen lieber mit klaren Leitplanken an, als dich auf eine offene Wette zu verlassen."
        : signal.tendencyKey === "center"
          ? "Du bist nicht grundsätzlich vorsichtig oder draufgängerisch. Für dich kommt es darauf an, wie gut eine Unsicherheit begrenzbar ist."
          : "Du bist bereit, spürbare Unsicherheit zu tragen, wenn darin eine echte Chance liegt.";
    case "Konfliktstil":
      return signal.tendencyKey === "left"
        ? "Du sortierst Unterschiede meist erst für dich, bevor du sie offen ansprichst."
        : signal.tendencyKey === "center"
          ? "Du gehst nicht immer gleich mit Reibung um. Manche Dinge sprichst du sofort an, andere erst, wenn deine Sicht klarer ist."
          : "Du sprichst Unterschiede früh an, solange sie noch frisch und bearbeitbar sind.";
    default:
      return "Dein Profil ist im Alltag klar lesbar und wirkt sich direkt auf Zusammenarbeit und Entscheidungen aus.";
  }
}

function buildCoreSupportParagraph(signal: SelfReportSignal) {
  switch (signal.dimension) {
    case "Unternehmenslogik":
      return signal.tendencyKey === "left"
        ? "Deshalb bremst du eher bei Ideen, die kurzfristig attraktiv aussehen, aber Fokus oder Aufbau aufweichen."
        : signal.tendencyKey === "center"
          ? "Im Alltag heißt das: Du wechselst nicht chaotisch, sondern je nach Lage zwischen Schutz des Bestehenden und Offenheit für einen größeren Schritt."
          : "Deshalb willst du eine Chance eher testen, statt sie lange neben dem bestehenden Kurs liegen zu lassen.";
    case "Entscheidungslogik":
      return signal.tendencyKey === "left"
        ? "Du willst wissen, worauf eine Entscheidung steht, bevor du sie innerlich wirklich trägst."
        : signal.tendencyKey === "center"
          ? "Für andere kann das flexibel wirken. Für dich ist es eher eine saubere Unterscheidung zwischen Fragen, die Tiefe brauchen, und Fragen, die Bewegung brauchen."
          : "Wenn für dich genug Kontur da ist, kippt dieselbe Frage schnell von offener Prüfung in klare Entscheidung.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return signal.tendencyKey === "left"
        ? "Du findest Zusammenarbeit dann gut, wenn Zuständigkeiten tragen und nicht jeder Zwischenschritt gemeinsam gedreht werden muss."
        : signal.tendencyKey === "center"
          ? "Du brauchst kein permanentes Mitlaufen, aber du willst auch nicht erst am Ende sehen, wo etwas gelandet ist."
          : "Du arbeitest ruhiger, wenn du früh siehst, wo etwas steht und was noch offen ist.";
    case "Commitment":
      return signal.tendencyKey === "left"
        ? "Du willst Verbindlichkeit, aber in einem Rahmen, der im echten Alltag haltbar bleibt."
        : signal.tendencyKey === "center"
          ? "Du kannst in wichtigen Phasen stark verdichten, willst aber nicht, dass aus Ausnahmen still eine Grundannahme wird."
          : "Hoher Einsatz ist für dich nicht nur Absicht, sondern etwas, das im Alltag sichtbar werden soll.";
    case "Risikoorientierung":
      return signal.tendencyKey === "left"
        ? "Du brauchst nicht Nullrisiko, aber du willst wissen, wo die Grenze liegt und was im Fall der Fälle auffängt."
        : signal.tendencyKey === "center"
          ? "Du gehst mit, wenn Unsicherheit einen guten Grund hat und nicht nur aus Hoffnung getragen wird."
          : "Wenn der mögliche Gewinn groß genug wirkt, hält dich offene Unsicherheit nicht automatisch zurück.";
    case "Konfliktstil":
      return signal.tendencyKey === "left"
        ? "Du sprichst Unterschiede meist dann an, wenn du schon sortiert hast, worum es dir eigentlich geht."
        : signal.tendencyKey === "center"
          ? "Für dich kommt es darauf an, ob ein Unterschied gerade schnelle Klärung oder erst einen besseren Moment braucht."
          : "Du gehst eher davon aus, dass frühe Klärung besser ist als langes Mitlaufen im Hintergrund.";
    default:
      return "Im Alltag zeigt sich das in klaren Erwartungen an Entscheidungen, Zusammenarbeit und Verbindlichkeit.";
  }
}

function buildCoreTensionParagraph(signal: SelfReportSignal | null) {
  if (!signal) {
    return "Die eigentliche Spannung entsteht für dich meist nicht an einem einzelnen Thema, sondern dann, wenn im Alltag mehrere Erwartungen gleichzeitig gelten sollen und niemand früh sagt, welcher Modus gerade zählt.";
  }

  switch (signal.dimension) {
    case "Unternehmenslogik":
      return "Im Team kippt es für dich vor allem dann, wenn eine Chance für andere schon gut genug aussieht, du aber noch nicht siehst, wie sie zum Aufbau oder Fokus des Unternehmens passt.";
    case "Entscheidungslogik":
      return "Im Team kippt es für dich dann, wenn dieselbe Entscheidung für die eine Person schon tragfähig ist, während du sie noch nicht wirklich freigeben würdest.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Im Team kippt es für dich dann, wenn Arbeit zu spät sichtbar wird oder unklar bleibt, wann Rückkopplung nötig war und wann Eigenraum gereicht hätte.";
    case "Commitment":
      return "Im Team kippt es für dich dann, wenn Einsatz nicht nur unterschiedlich ist, sondern im Alltag auch unterschiedlich gelesen wird: über Verfügbarkeit, Reaktionszeit und spürbaren Fokus.";
    case "Risikoorientierung":
      return "Im Team kippt es für dich dann, wenn dieselbe Lage für eine Person noch vertretbar und für die andere schon zu offen oder zu eng geführt ist.";
    case "Konfliktstil":
      return "Im Team kippt es für dich dann, wenn Unterschiede nicht im gleichen Takt bearbeitet werden: eine Person will früher auf den Tisch, die andere erst später und sortierter.";
    default:
      return "Im Team kippt es für dich vor allem dort, wo Erwartungen im Alltag nicht mehr still zusammenpassen.";
  }
}

function buildEverydayCopy(signal: SelfReportSignal): EverydayBlock {
  switch (signal.dimension) {
    case "Unternehmenslogik":
      return signal.tendencyKey === "left"
        ? {
            dimension: signal.dimension,
            title: "Du prüfst Chancen gegen den Aufbau",
            statement:
              "Neue Möglichkeiten müssen für dich erst zeigen, dass sie das Unternehmen tragfähiger machen und nicht nur kurzfristig attraktiv sind.",
            situation:
              "Wenn ein neuer Markt, Kunde oder Kanal auftaucht, fragst du früh, was das mit Fokus, Positionierung und Aufbau macht.",
          }
        : signal.tendencyKey === "center"
          ? {
              dimension: signal.dimension,
              title: "Du wägest Fokus und Chance gegeneinander ab",
              statement:
                "Du hast keine starre Lieblingsrichtung. Für dich hängt es von der Lage ab, ob Aufbau oder Chance zuerst zählt.",
              situation:
                "In einer neuen Option prüfst du meist beides zugleich: Was öffnet sie und was kostet sie an Klarheit oder Stabilität?",
            }
          : {
              dimension: signal.dimension,
              title: "Du willst Chancen nicht liegen lassen",
              statement:
                "Wenn etwas spürbar mehr Reichweite oder Wachstum öffnen kann, willst du es eher prüfen und bewegen als nur theoretisch einordnen.",
              situation:
                "Taucht eine größere Marktchance auf, denkst du schnell in nächsten Schritten statt nur in Bedenken.",
            };
    case "Entscheidungslogik":
      return signal.tendencyKey === "left"
        ? {
            dimension: signal.dimension,
            title: "Du entscheidest auf geklärter Basis",
            statement:
              "Wichtige Entscheidungen tragen für dich erst, wenn die entscheidenden Punkte und Einwände sichtbar sind.",
            situation:
              "Vor einem größeren Schritt willst du meist noch einmal sauber verstehen, worauf die Entscheidung steht.",
          }
        : signal.tendencyKey === "center"
          ? {
              dimension: signal.dimension,
              title: "Du passt die Tiefe an die Frage an",
              statement:
                "Du behandelst nicht jede Entscheidung gleich. Manche Fragen brauchen für dich Klärung, andere nur eine tragfähige Richtung.",
              situation:
                "Im Alltag wechselst du zwischen gründlichem Prüfen und frühem Festlegen, je nachdem, wie groß die Folge ist.",
            }
          : {
              dimension: signal.dimension,
              title: "Du gehst früh in eine Richtung",
              statement:
                "Wenn eine Richtung für dich trägt, willst du entscheiden und nicht länger auf Vollständigkeit warten.",
            situation:
              "Du gehst eher mit einem tragfähigen nächsten Schritt als mit einem komplett ausgeleuchteten Entscheidungsbild.",
            };
    case "Arbeitsstruktur & Zusammenarbeit":
      return signal.tendencyKey === "left"
        ? {
            dimension: signal.dimension,
            title: "Du brauchst Eigenraum, damit Arbeit trägt",
            statement:
              "Zusammenarbeit funktioniert für dich gut, wenn Zuständigkeiten klar sind und nicht jeder Zwischenschritt gemeinsam laufen muss.",
            situation:
              "Du meldest dich lieber an klaren Punkten zurück, statt laufend kleine Zwischenstände zu teilen.",
          }
        : signal.tendencyKey === "center"
          ? {
              dimension: signal.dimension,
              title: "Du willst abgestimmt sein, aber nicht dauernd",
              statement:
                "Du suchst eine Arbeitsweise, in der Eigenraum möglich bleibt und wichtige Punkte trotzdem nicht zu spät sichtbar werden.",
              situation:
                "Dir reicht kein Dauer-Loop, aber auch kein Arbeiten, das erst am Ende wieder auftaucht.",
            }
          : {
              dimension: signal.dimension,
              title: "Du willst früh sehen, wo Dinge stehen",
              statement:
                "Du arbeitest ruhiger, wenn Fortschritt, offene Punkte und Richtungswechsel nicht erst spät sichtbar werden.",
              situation:
                "Wenn ein Thema läuft, willst du eher Zwischenstände sehen als nur das Endergebnis.",
            };
    case "Commitment":
      return signal.tendencyKey === "left"
        ? {
            dimension: signal.dimension,
            title: "Du hältst deinen Rahmen bewusst",
            statement:
              "Du willst, dass das Startup wichtig ist, aber in einem Rahmen, den du im Alltag wirklich tragen kannst.",
            situation:
              "Wenn andere mehr Intensität erwarten, wirst du erst mitgehen, wenn klar ist, wie lange und wofür das gelten soll.",
          }
        : signal.tendencyKey === "center"
          ? {
              dimension: signal.dimension,
              title: "Du kannst verdichten, aber nicht endlos",
              statement:
                "Du bist bereit, phasenweise mehr zu geben, willst aber nicht, dass Ausnahmezustand still zur Norm wird.",
              situation:
                "In intensiven Phasen ziehst du mit. Danach brauchst du aber wieder einen erkennbaren Normalmodus.",
            }
          : {
              dimension: signal.dimension,
              title: "Du liest Priorität an sichtbarem Einsatz",
              statement:
                "Für dich zeigt sich Ernsthaftigkeit nicht nur in Worten, sondern in Zeit, Energie und Verfügbarkeit.",
              situation:
                "Wenn ein Vorhaben wichtig ist, erwartest du eher, dass das im Alltag auch konkret sichtbar wird.",
            };
    case "Risikoorientierung":
      return signal.tendencyKey === "left"
        ? {
            dimension: signal.dimension,
            title: "Du willst Risiko begrenzen, bevor du mitgehst",
            statement:
              "Du brauchst bei unsicheren Schritten erkennbare Leitplanken und eine überschaubare Downside.",
            situation:
              "Wenn eine Wette offen ist, fragst du früh nach Grenzen, Sicherungen und dem Punkt, an dem ihr wieder stoppt.",
          }
        : signal.tendencyKey === "center"
          ? {
              dimension: signal.dimension,
              title: "Du gehst mit, wenn Unsicherheit einen guten Grund hat",
              statement:
                "Du bist weder reflexhaft vorsichtig noch dauerhaft auf Risiko. Für dich muss Unsicherheit begründbar sein.",
              situation:
                "Du trägst offene Lage eher dann mit, wenn klar ist, was genau die Chance ist und wo die Grenze liegt.",
            }
          : {
              dimension: signal.dimension,
              title: "Du hältst offene Lage eher aus",
              statement:
                "Hohe Unsicherheit schreckt dich nicht automatisch, wenn die Chance groß genug wirkt.",
              situation:
                "Du bist eher bereit, mit offenen Fragen zu starten, solange die Richtung für dich genug Potenzial hat.",
            };
    case "Konfliktstil":
      return signal.tendencyKey === "left"
        ? {
            dimension: signal.dimension,
            title: "Du sortierst erst, bevor du ansprichst",
            statement:
              "Du gehst Unterschiede lieber mit geklärter eigener Sicht an als im ersten Impuls.",
            situation:
              "Wenn dich etwas stört, beobachtest du oft noch kurz, bevor du es aufmachst.",
          }
        : signal.tendencyKey === "center"
          ? {
              dimension: signal.dimension,
              title: "Du wählst den Moment für Klärung bewusst",
              statement:
                "Du sprichst nicht alles sofort an, aber du lässt es auch nicht beliebig laufen.",
              situation:
                "Im Alltag entscheidest du eher situativ, ob ein Unterschied sofort auf den Tisch muss oder erst in einem besseren Moment.",
            }
          : {
              dimension: signal.dimension,
              title: "Du klärst Unterschiede lieber früh",
              statement:
                "Du arbeitest mit Reibung lieber offen als im Hintergrund weiter.",
              situation:
                "Wenn etwas nicht passt, willst du den Unterschied eher direkt benennen als ihn länger mitzuschleppen.",
            };
    default:
      return {
        dimension: signal.dimension,
        title: "Dein Alltag ist klar lesbar",
        statement: "Deine Präferenzen zeigen sich nicht nur im Test, sondern in echten Arbeitssituationen.",
        situation: "Vor allem unter Druck werden sie für andere klar sichtbar.",
      };
  }
}

function buildTeamBreakCopy(signal: SelfReportSignal): TeamBreakBlock {
  switch (signal.dimension) {
    case "Unternehmenslogik":
      return {
        dimension: signal.dimension,
        title: "Wenn eine Chance gut aussieht, aber den Fokus verschiebt",
        text:
          "Hier kippt es, wenn eine Möglichkeit für andere schon attraktiv genug ist, du aber zuerst wissen willst, was sie mit Klarheit, Aufbau oder Richtung des Unternehmens macht.",
      };
    case "Entscheidungslogik":
      return {
        dimension: signal.dimension,
        title: "Wenn dieselbe Entscheidung zweimal geführt wird",
        text:
          "Hier kippt es, wenn eine Person innerlich schon entschieden hat und die andere noch prüfen will. Dann wird nicht nur über die Sache gestritten, sondern darüber, ob die Entscheidung überhaupt schon reif ist.",
      };
    case "Arbeitsstruktur & Zusammenarbeit":
      return {
        dimension: signal.dimension,
        title: "Wenn Sichtbarkeit und Eigenraum unterschiedlich gelesen werden",
        text:
          "Hier kippt es, wenn die eine Person laufend Einblick erwartet und die andere denkt, ein klarer Zwischenstand reiche völlig aus. Das fühlt sich dann schnell nach Kontrolle oder nach zu spätem Einbinden an.",
      };
    case "Commitment":
      return {
        dimension: signal.dimension,
        title: "Wenn Einsatz unterschiedlich ernst genommen wird",
        text:
          "Hier kippt es, wenn ihr nicht nur unterschiedlich viel gebt, sondern dieses Niveau auch unterschiedlich lest. Dann werden Reaktionszeit, Verfügbarkeit und Fokus still zum Streitpunkt.",
      };
    case "Risikoorientierung":
      return {
        dimension: signal.dimension,
        title: "Wenn dieselbe Lage für euch nicht gleich riskant ist",
        text:
          "Hier kippt es, wenn eine Person in einer offenen Lage noch eine vertretbare Chance sieht und die andere schon zu viel Unsicherheit spürt. Dann redet ihr scheinbar über denselben Schritt, aber nicht über dieselbe Schwelle.",
      };
    case "Konfliktstil":
      return {
        dimension: signal.dimension,
        title: "Wenn Unterschiede nicht im gleichen Takt geklärt werden",
        text:
          "Hier kippt es, wenn eine Person etwas direkt ansprechen will und die andere erst sortieren oder den richtigen Moment abwarten möchte. Dann wird schon der Zeitpunkt der Klärung selbst zum Konflikt.",
      };
    default:
      return {
        dimension: signal.dimension,
        title: "Wenn Alltagserwartungen auseinanderlaufen",
        text: "Hier kippt es, wenn im Alltag unterschiedliche Regeln gelten, ohne dass sie ausgesprochen werden.",
      };
  }
}

function buildMisreadingCopy(signal: SelfReportSignal): InterpretationBlock {
  switch (signal.dimension) {
    case "Unternehmenslogik":
      return signal.tendencyKey === "left"
        ? {
            title: "Das kann nach Bremsen aussehen",
            text:
              "Andere können deinen Blick auf Aufbau und Tragfähigkeit als Vorsicht lesen. Für dich geht es meist nicht um Blockade, sondern darum, dass eine Chance den Kern nicht aufweicht.",
          }
        : {
            title: "Das kann nach Sprung wirken",
            text:
              "Andere können deine Offenheit für eine größere Chance als zu schnellen Kurswechsel lesen. Für dich ist es eher der Versuch, echtes Potenzial nicht zu spät zu sehen.",
          };
    case "Entscheidungslogik":
      return signal.tendencyKey === "left"
        ? {
            title: "Das kann nach Zögern wirken",
            text:
              "Wenn du noch prüfst, können andere das als Unentschlossenheit lesen. Für dich ist es eher der Punkt, an dem eine Entscheidung erst belastbar wird.",
          }
        : {
            title: "Das kann nach zu viel Tempo wirken",
            text:
              "Wenn du früh festlegst, kann das für andere nach Sprung oder Bauchgefühl aussehen. Für dich ist der nächste Schritt dann meist schon klar genug.",
          };
    case "Arbeitsstruktur & Zusammenarbeit":
      return signal.tendencyKey === "left"
        ? {
            title: "Das kann nach Abstand wirken",
            text:
              "Dein Wunsch nach Eigenraum kann wie Rückzug wirken. Für dich ist es oft einfach die Arbeitsweise, in der Verantwortung wirklich trägt.",
          }
        : {
            title: "Das kann nach Kontrollbedarf wirken",
            text:
              "Dein Wunsch nach frühen Zwischenständen kann wie Einmischung wirken. Für dich geht es meist darum, dass Arbeit nicht erst sichtbar wird, wenn sie schon festgelaufen ist.",
          };
    case "Commitment":
      return signal.tendencyKey === "left"
        ? {
            title: "Das kann nach Distanz wirken",
            text:
              "Wenn du deinen Rahmen hältst, können andere das als geringere Priorität lesen. Für dich heißt es meist nur, dass Verbindlichkeit realistisch bleiben muss.",
          }
        : {
            title: "Das kann nach stiller Erwartung wirken",
            text:
              "Dein hoher Einsatz kann bei anderen den Eindruck erzeugen, dass alle denselben Modus mitgehen sollen. Auch wenn du das nicht aussprichst, wird es oft so gelesen.",
          };
    case "Risikoorientierung":
      return signal.tendencyKey === "left"
        ? {
            title: "Das kann nach Sicherheitsdenken wirken",
            text:
              "Andere können deine Leitplanken als Angst vor Risiko lesen. Für dich geht es meist darum, Unsicherheit nicht blind zu romantisieren.",
          }
        : {
            title: "Das kann nach Wette wirken",
            text:
              "Andere können deine Offenheit für Unsicherheit als zu mutig lesen. Für dich ist das oft kein Leichtsinn, sondern die Bereitschaft, für eine echte Chance nicht zu früh auszusteigen.",
          };
    case "Konfliktstil":
      return signal.tendencyKey === "left"
        ? {
            title: "Das kann nach Ausweichen wirken",
            text:
              "Wenn du erst sortierst, können andere das als Wegducken lesen. Für dich ist es oft der Versuch, das Thema später klarer und fairer aufzumachen.",
          }
        : {
            title: "Das kann nach Härte wirken",
            text:
              "Wenn du Unterschiede direkt ansprichst, kann das auf andere schneller oder schärfer wirken, als du es meinst. Für dich ist es meist der kürzere Weg zu echter Klärung.",
          };
    default:
      return {
        title: "Das kann missverstanden werden",
        text: "Andere sehen oft zuerst das Verhalten und erst später die Logik dahinter.",
      };
  }
}

function buildLeverCopy(signal: SelfReportSignal): LeverBlock {
  switch (signal.dimension) {
    case "Unternehmenslogik":
      return signal.tendencyKey === "left"
        ? {
            title: "Sag früher, woran du eine Chance misst",
            text:
              "Mach früh konkret, was für dich tragfähig genug ist. Dann wirkt dein Nein nicht pauschal, sondern nachvollziehbar.",
          }
        : {
            title: "Sag früher, warum du eine Chance nicht liegen lassen willst",
            text:
              "Benenne klar, welchen Hebel oder welches Potenzial du siehst. Dann wirkt dein Vorwärtsdrang weniger wie reiner Impuls.",
          };
    case "Entscheidungslogik":
      return signal.tendencyKey === "left"
        ? {
            title: "Sag, was dir noch fehlt",
            text:
              "Formuliere die zwei oder drei Punkte, die für dich vor einer Entscheidung noch geklärt sein müssen. So bleibt Prüfung konkret und wird nicht endlos.",
          }
        : {
            title: "Sag, was schon entschieden ist und was noch offen bleiben darf",
            text:
              "Wenn du früh festlegen willst, markiere klar den tragfähigen Kern der Entscheidung. Das nimmt anderen das Gefühl, überrollt zu werden.",
          };
    case "Arbeitsstruktur & Zusammenarbeit":
      return signal.tendencyKey === "left"
        ? {
            title: "Definiere deine Rückkopplungspunkte",
            text:
              "Sag nicht nur, dass du autonom arbeiten willst. Sag auch, wann du bewusst einbindest. Dann wirkt Eigenraum nicht wie Funkstille.",
          }
        : {
            title: "Sag, welche Sichtbarkeit du brauchst",
            text:
              "Mach klar, welche Zwischenstände du früh sehen willst und welche nicht. Dann fühlt sich dein Abstimmungsbedarf weniger diffus an.",
          };
    case "Commitment":
      return signal.tendencyKey === "left"
        ? {
            title: "Sprich deinen Rahmen aus, bevor andere ihn erraten",
            text:
              "Sag früh, was du realistisch tragen kannst. So wird aus deinem Rahmen eine klare Abmachung statt ein stiller Unterschied.",
          }
        : {
            title: "Mach Erwartungen an Einsatz explizit",
            text:
              "Wenn dir hoher Fokus wichtig ist, sag konkret, woran man ihn im Alltag sehen soll. Dann bleibt er nicht nur als stille Messlatte im Raum.",
          };
    case "Risikoorientierung":
      return signal.tendencyKey === "left"
        ? {
            title: "Nenne deine Grenze vor der Entscheidung",
            text:
              "Sag früh, welches Risiko für dich noch okay ist und ab wann du absichern willst. Das macht deine Vorsicht berechenbar statt bremsend.",
          }
        : {
            title: "Verbinde Mut mit klaren Stopps",
            text:
              "Wenn du eine offene Chance spielen willst, nenne auch die Schwelle, an der ihr wieder aussteigt. So wird Risiko führbar.",
          };
    case "Konfliktstil":
      return signal.tendencyKey === "left"
        ? {
            title: "Sag, wann du ein Thema ansprichst",
            text:
              "Wenn du erst sortieren willst, kündige das an. Dann wirkt dein Abwarten nicht wie Ausweichen, sondern wie ein bewusster Schritt.",
          }
        : {
            title: "Rahme direkte Ansprache kurz ein",
            text:
              "Ein kurzer Satz wie 'ich will das früh klären, nicht größer machen' hilft oft schon. So wird Direktheit besser lesbar.",
          };
    default:
      return {
        title: "Mach deine Logik früh sichtbar",
        text: "Je früher andere verstehen, wie du Entscheidungen und Zusammenarbeit liest, desto seltener kippt es unnötig im Alltag.",
      };
  }
}

function renderCompactValuesSection(report: SelfAlignmentReport) {
  const profile = report.selfValuesProfile;

  if (!profile) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-6">
        <p className="text-sm leading-7 text-slate-700">
          {report.valuesModulePreview?.trim() ||
            t("Schließe das Werte-Add-on ab, um eine verdichtete Werte-Einordnung zu erhalten.")}
        </p>
        <div className="mt-4">
          <a
            href="/me/values"
            className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            Werte Add-on starten
          </a>
        </div>
      </div>
    );
  }

  const insights = profile.insights.slice(0, 2).map((item) => normalizeSentence(t(item)));
  const watchout = profile.watchouts[0] ? normalizeSentence(t(profile.watchouts[0])) : null;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-6">
      <p className="text-sm leading-7 text-slate-800">{normalizeSentence(t(profile.summary))}</p>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Zeigt sich im Alltag</p>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
            {insights.map((item) => (
              <li key={`values-insight-${item}`}>• {item}</li>
            ))}
          </ul>
        </div>
        {watchout ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">Achte besonders auf</p>
            <p className="mt-3 text-sm leading-7 text-amber-900">{watchout}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function normalizeSentence(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?…]$/.test(normalized) ? normalized : `${normalized}.`;
}

function SignalBadge({
  label,
  tone,
}: {
  label: string;
  tone: "neutral" | "accent" | "soft" | "high" | "warning";
}) {
  const className =
    tone === "accent"
      ? "border-[color:var(--brand-primary)]/25 bg-[color:var(--brand-primary)]/10 text-slate-700"
      : tone === "high"
        ? "border-slate-900 bg-slate-900 text-white"
        : tone === "warning"
          ? "border-amber-300 bg-amber-100 text-amber-900"
          : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] tracking-[0.08em] ${className}`}>
      {label}
    </span>
  );
}
