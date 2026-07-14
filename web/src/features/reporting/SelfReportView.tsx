import { DimensionOverview } from "@/features/reporting/DimensionOverview";
import { DimensionScale } from "@/features/reporting/DimensionScale";
import {
  FOUNDER_DIMENSION_ORDER,
  type FounderDimensionKey,
} from "@/features/reporting/founderDimensionMeta";
import { getReportContent } from "@/features/reporting/content/reportContent";
import { getSelfReportChrome, type SelfReportChrome } from "@/features/reporting/selfReportChrome";
import {
  buildSelfReportSelection,
  buildSelfReportSignals,
  type SelfReportSelection,
  type SelfReportSignal,
} from "@/features/reporting/selfReportSelection";
import {
  getSelfReportEverydayCopy,
  getSelfReportEverydayFallbackBlock,
  type SelfReportEverydayBlock,
} from "@/features/reporting/selfReportEverydayContent";
import {
  getSelfReportTeamBreakCopy,
  type SelfReportTeamBreakBlock,
} from "@/features/reporting/selfReportTeamBreakContent";
import { buildHeroText } from "@/features/reporting/heroTextBuilder";
import { type SelfAlignmentReport } from "@/features/reporting/selfReportTypes";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";

type Props = {
  report: SelfAlignmentReport;
};

type CoreParagraph = {
  text: string;
  highSignal?: boolean;
};

type EverydayBlock = SelfReportEverydayBlock & { highSignal?: boolean };

type TeamBreakBlock = SelfReportTeamBreakBlock & { highSignal?: boolean };

type InterpretationBlock = {
  title: string;
  text: string;
};

type LeverBlock = {
  title: string;
  text: string;
};

export function SelfReportView({ report }: Props) {
  const chrome = getSelfReportChrome(report.locale);
  const reportContent = getReportContent(report.locale);
  const selection = buildSelfReportSelection(report.scoresA);
  const signals = buildSelfReportSignals(report.scoresA);
  const coreParagraphs =
    report.locale === "en"
      ? buildLocalizedHeroParagraphs(selection, report.locale)
      : buildCorePatternParagraphs(selection);
  const everydayBlocks = buildEverydayBlocks(selection, signals, report.locale);
  const teamBreakBlocks = buildTeamBreakBlocks(selection, report.locale);
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
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              {chrome.sections.corePattern}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">
              {chrome.sections.profileNow}
            </h2>
            <DimensionOverview scores={report.scoresA} locale={report.locale} />
            <div className="mt-5 space-y-4">
              {coreParagraphs.map((paragraph) => (
                <article key={paragraph.text} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                  {paragraph.highSignal ? <SignalBadge label={chrome.labels.highSignal} tone="high" /> : null}
                  <p className="mt-2 text-sm leading-7 text-slate-800">{paragraph.text}</p>
                </article>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <SignalBadge label={chrome.labels.baseCompleted} tone="neutral" />
              <SignalBadge
                label={
                  report.valuesModuleStatus === "completed"
                    ? chrome.labels.valuesAvailable
                    : report.valuesModuleStatus === "in_progress"
                      ? chrome.labels.valuesInProgress
                      : chrome.labels.valuesOptional
                }
                tone={report.valuesModuleStatus === "completed" ? "accent" : "soft"}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          {chrome.sections.everyday}
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {everydayBlocks.map((block) => (
            <article key={`${block.dimension}-${block.title}`} className="rounded-2xl border border-slate-200/80 bg-white p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  {reportContent.dimensions[block.dimension].canonicalName}
                </p>
                {block.highSignal ? <SignalBadge label={chrome.labels.highSignal} tone="soft" /> : null}
              </div>
              <h3 className="mt-3 text-base font-semibold text-slate-900">{block.title}</h3>
              <DimensionScale
                score={report.scoresA[block.dimension]}
                leftLabel={reportContent.dimensions[block.dimension].reportLeftPole}
                rightLabel={reportContent.dimensions[block.dimension].reportRightPole}
                compact
                className="mt-3"
              />
              <p className="mt-3 text-sm leading-7 text-slate-800">{block.statement}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                <span className="font-medium text-slate-900">{chrome.labels.typicalSituation}</span>{" "}
                {block.situation}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          {chrome.sections.teamBreak}
        </p>
        <div className="mt-6 grid gap-4">
          {teamBreakBlocks.map((block) => (
            <article key={`break-${block.dimension}-${block.title}`} className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-amber-800">
                  {reportContent.dimensions[block.dimension].canonicalName}
                </p>
                {block.highSignal ? <SignalBadge label={chrome.labels.highSignal} tone="warning" /> : null}
              </div>
              <h3 className="mt-3 text-base font-semibold text-slate-900">{block.title}</h3>
              <DimensionScale
                score={report.scoresA[block.dimension]}
                leftLabel={reportContent.dimensions[block.dimension].reportLeftPole}
                rightLabel={reportContent.dimensions[block.dimension].reportRightPole}
                compact
                className="mt-3"
              />
              <p className="mt-3 text-sm leading-7 text-slate-800">{block.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          {chrome.sections.misreadings}
        </p>
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
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          {chrome.sections.levers}
        </p>
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
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
            {chrome.sections.valuesProfile}
          </p>
          <div className="mt-5">{renderCompactValuesSection(report, chrome)}</div>
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

function buildLocalizedHeroParagraphs(selection: SelfReportSelection, locale: string): CoreParagraph[] {
  const sentences = splitHeroSentences(buildHeroText(selection.hero, locale));

  return sentences.map((text, index) => ({
    text,
    highSignal: index === 0 || index === 2,
  }));
}

function splitHeroSentences(text: string) {
  return text
    .split(/(?<=\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function buildEverydayBlocks(
  selection: SelfReportSelection,
  signals: SelfReportSignal[],
  locale?: string | null
): EverydayBlock[] {
  const prioritizedSignals = collectUniqueSignals(
    selection.patternDimensions,
    selection.hero.workModeSignal,
    selection.hero.primarySignal,
    selection.hero.tensionCarrier,
    signals
  );

  const prioritizedSignalMap = new Map(
    prioritizedSignals.map((signal, index) => [signal.dimension, { signal, index }] as const)
  );
  const signalMap = new Map(signals.map((signal) => [signal.dimension, signal] as const));

  return FOUNDER_DIMENSION_ORDER.map((dimension) => {
    const prioritizedEntry = prioritizedSignalMap.get(dimension);
    const signal = prioritizedEntry?.signal ?? signalMap.get(dimension) ?? null;

    if (!signal) {
      return getSelfReportEverydayFallbackBlock(dimension, locale);
    }

    return {
      ...getSelfReportEverydayCopy(signal, locale),
      highSignal: prioritizedEntry?.index === 0 && signal.isClear,
    };
  });
}

function buildTeamBreakBlocks(selection: SelfReportSelection, locale?: string | null): TeamBreakBlock[] {
  return selection.challengeDimensions.slice(0, 3).map((signal) => ({
    ...getSelfReportTeamBreakCopy(signal, locale),
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
    return "Die eigentliche Spannung entsteht fuer dich meist nicht an einem einzelnen Thema, sondern dann, wenn im Alltag mehrere Erwartungen gleichzeitig gelten und niemand frueh markiert, welcher Modus gerade gelten soll.";
  }

  switch (signal.dimension) {
    case "Unternehmenslogik":
      return "Im Team wird es fuer dich vor allem dann anspruchsvoll, wenn eine Chance fuer andere schon tragfaehig wirkt, du aber noch nicht siehst, wie sie zu Aufbau oder Fokus des Unternehmens passt.";
    case "Entscheidungslogik":
      return "Im Team wird es fuer dich dann anspruchsvoll, wenn dieselbe Entscheidung fuer die eine Person schon tragfaehig ist, waehrend du sie noch nicht wirklich freigeben wuerdest.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Im Team wird es fuer dich dann anspruchsvoll, wenn Arbeit zu spaet sichtbar wird oder unklar bleibt, wann Rueckkopplung noetig war und wann Eigenraum gereicht haette.";
    case "Commitment":
      return "Im Team wird es fuer dich dann anspruchsvoll, wenn Einsatz nicht nur unterschiedlich ist, sondern im Alltag auch unterschiedlich gelesen wird: ueber Verfuegbarkeit, Reaktionszeit und spuerbaren Fokus.";
    case "Risikoorientierung":
      return "Im Team wird es fuer dich dann anspruchsvoll, wenn dieselbe Lage fuer eine Person noch vertretbar und fuer die andere schon zu offen oder zu eng gefuehrt ist.";
    case "Konfliktstil":
      return "Im Team wird es fuer dich dann anspruchsvoll, wenn Unterschiede nicht im gleichen Takt bearbeitet werden: eine Person will frueher auf den Tisch, die andere erst spaeter und sortierter.";
    default:
      return "Im Team wird es fuer dich vor allem dort anspruchsvoll, wo Erwartungen im Alltag nicht mehr still zusammenpassen.";
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
              "Mach frueh konkret, was fuer dich tragfaehig genug ist. Dann wirkt dein Nein weniger pauschal und deine Logik wird fuer andere besser lesbar.",
          }
        : {
            title: "Sag früher, warum du eine Chance nicht liegen lassen willst",
            text:
              "Benenne klar, welchen Hebel oder welches Potenzial du siehst. Dann wirkt dein Vorwaertsdrang weniger wie reiner Impuls und mehr wie eine begruendete Prioritaet.",
          };
    case "Entscheidungslogik":
      return signal.tendencyKey === "left"
        ? {
            title: "Sag, was dir noch fehlt",
            text:
              "Formuliere die zwei oder drei Punkte, die fuer dich vor einer Entscheidung noch geklaert sein muessen. So bleibt Pruefung konkret und wird nicht diffus oder endlos.",
          }
        : {
            title: "Sag, was schon entschieden ist und was noch offen bleiben darf",
            text:
              "Wenn du frueh festlegen willst, markiere klar den tragfaehigen Kern der Entscheidung. Das nimmt anderen eher das Gefuehl, ueberrollt zu werden.",
          };
    case "Arbeitsstruktur & Zusammenarbeit":
      return signal.tendencyKey === "left"
        ? {
            title: "Definiere deine Rückkopplungspunkte",
            text:
              "Sag nicht nur, dass du autonom arbeiten willst. Sag auch, wann du bewusst einbindest. Dann wirkt Eigenraum weniger wie Funkstille.",
          }
        : {
            title: "Sag, welche Sichtbarkeit du brauchst",
            text:
              "Mach klar, welche Zwischenstaende du frueh sehen willst und welche nicht. Dann fuehlt sich dein Abstimmungsbedarf weniger diffus an.",
          };
    case "Commitment":
      return signal.tendencyKey === "left"
        ? {
            title: "Sprich deinen Rahmen aus, bevor andere ihn erraten",
            text:
              "Sag frueh, was du realistisch tragen kannst. So wird aus deinem Rahmen eher eine klare Abmachung als ein stiller Unterschied.",
          }
        : {
            title: "Mach Erwartungen an Einsatz explizit",
            text:
              "Wenn dir hoher Fokus wichtig ist, sag konkret, woran man ihn im Alltag sehen soll. Dann bleibt er weniger als stille Messlatte im Raum.",
          };
    case "Risikoorientierung":
      return signal.tendencyKey === "left"
        ? {
            title: "Nenne deine Grenze vor der Entscheidung",
            text:
              "Sag frueh, welches Risiko fuer dich noch okay ist und ab wann du absichern willst. Das macht deine Vorsicht eher berechenbar als bremsend.",
          }
        : {
            title: "Verbinde Mut mit klaren Stopps",
            text:
              "Wenn du eine offene Chance spielen willst, nenne auch die Schwelle, an der ihr wieder aussteigt. So wird Risiko fuehrbar statt diffus.",
          };
    case "Konfliktstil":
      return signal.tendencyKey === "left"
        ? {
            title: "Sag, wann du ein Thema ansprichst",
            text:
              "Wenn du erst sortieren willst, kuendige das an. Dann wirkt dein Abwarten weniger wie Ausweichen und mehr wie ein bewusster Schritt.",
          }
        : {
            title: "Rahme direkte Ansprache kurz ein",
            text:
              "Ein kurzer Satz wie 'ich will das frueh klaeren, nicht groesser machen' hilft oft schon. So wird Direktheit fuer andere besser lesbar.",
          };
    default:
      return {
        title: "Mach deine Logik früh sichtbar",
        text: "Je früher andere verstehen, wie du Entscheidungen und Zusammenarbeit liest, desto seltener kippt es unnötig im Alltag.",
      };
  }
}

function renderCompactValuesSection(report: SelfAlignmentReport, chrome: SelfReportChrome) {
  const profile = report.selfValuesProfile;

  if (!profile) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-6">
        <p className="text-sm leading-7 text-slate-700">
          {report.valuesModulePreview?.trim() ||
            t(chrome.labels.valuesFallback)}
        </p>
        <div className="mt-4">
          <a
            href="/me/values"
            className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            {chrome.labels.startValues}
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
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
            {chrome.labels.everydaySignals}
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
            {insights.map((item) => (
              <li key={`values-insight-${item}`}>• {item}</li>
            ))}
          </ul>
        </div>
        {watchout ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
              {chrome.labels.watchout}
            </p>
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
