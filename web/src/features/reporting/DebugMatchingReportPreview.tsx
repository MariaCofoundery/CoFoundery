import { AlignmentRadarChart } from "@/features/reporting/AlignmentRadarChart";
import { ConversationGuide } from "@/features/reporting/ConversationGuide";
import { KeyInsights } from "@/features/reporting/KeyInsights";
import { MatchNarratives } from "@/features/reporting/MatchNarratives";
import { type CompareReportJson, type KeyInsight, type SessionAlignmentReport } from "@/features/reporting/types";

type Props = {
  report: SessionAlignmentReport;
  compareJson: CompareReportJson;
  createdAt: string;
  modules: string[];
  embedded?: boolean;
};

export function DebugMatchingReportPreview({
  report,
  compareJson,
  createdAt,
  modules,
  embedded = false,
}: Props) {
  const participants = [
    {
      id: "person-a",
      label: report.participantAName || "Person A",
      color: "#00BFA5",
      scores: report.scoresA,
    },
    {
      id: "person-b",
      label: report.participantBName || "Person B",
      color: "#7C3AED",
      scores: report.scoresB,
    },
  ];

  const sectionMap = parsePremiumSections(compareJson.sections as unknown[] | undefined);
  const sectionHowToRead = sectionMap.get("how_to_read");
  const sectionExecutive = sectionMap.get("executive_summary");
  const sectionOverview = sectionMap.get("collaboration_overview");
  const sectionValues = sectionMap.get("values_alignment");
  const sectionClosing = sectionMap.get("closing");
  const parsedValues = parseValuesSection(sectionValues);
  const keyInsights: KeyInsight[] = compareJson.keyInsights.map((entry, index) => ({
    dimension: entry.dimension,
    title: entry.title,
    text: entry.text,
    priority: index + 1,
  }));

  const wrapperClassName = embedded
    ? "w-full"
    : "mx-auto min-h-screen w-full max-w-6xl px-6 py-12";

  return (
    <div className={wrapperClassName}>
      <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Matching Report Preview</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 md:text-3xl">
          {report.participantAName} &amp; {report.participantBName}
        </h1>
        <p className="mt-2 text-sm text-slate-600">Erstellt: {formatDate(createdAt)}</p>
        <p className="mt-1 text-xs tracking-[0.08em] text-slate-500">
          Module: {modules.join(", ")}
        </p>
      </section>

      <section className="mb-6 rounded-2xl border border-[color:var(--brand-primary)]/25 bg-[color:var(--brand-primary)]/5 p-8">
        <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
          <SectionIcon type="intro" />
          {sectionHowToRead?.title ?? "So nutzt ihr diesen Report"}
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          {sectionHowToRead?.body ??
            "Dieser Preview zeigt, wie der Matching-Report als Arbeitsgrundlage fuer ein Founder-Team wirkt."}
        </p>
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8">
        <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
          <SectionIcon type="summary" />
          {sectionExecutive?.title ?? "Executive Summary"}
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          {sectionExecutive?.body ?? "Die Executive Summary verdichtet gemeinsame Staerken und Spannungsfelder."}
        </p>
        <ul className="mt-4 space-y-2">
          {(sectionExecutive?.bullets ?? compareJson.executiveSummary.bullets).slice(0, 3).map((bullet, index) => (
            <li key={`summary-${index}`} className="text-sm leading-7 text-slate-700">
              • {bullet}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold tracking-[0.08em] text-slate-900">
            <SectionIcon type="overview" />
            {sectionOverview?.title ?? "Zusammenarbeit im Überblick"}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {sectionOverview?.body ??
              "Diese Darstellung verdichtet eure Zusammenarbeit entlang der sechs Legacy-Matching-Dimensionen."}
          </p>
          <div className="mt-5">
            <AlignmentRadarChart participants={participants} />
          </div>
        </article>

        <KeyInsights insights={keyInsights} mode="match" />
      </section>

      <div className="mt-6">
        <MatchNarratives
          commonTendencies={compareJson.executiveSummary.topMatches}
          frictionPoints={compareJson.executiveSummary.topTensions}
          personBReady
          mode="match"
          sections={compareJson.sections as unknown[]}
          dimensionComparisons={compareJson.deepDive}
          participantAName={report.participantAName}
          participantBName={report.participantBName ?? "Person B"}
        />
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold tracking-[0.08em] text-slate-900">
          <SectionIcon type="values" />
          {sectionValues?.title ?? "Werte-Alignment"}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          {sectionValues?.body ?? report.valuesModulePreview}
        </p>

        <div className="mt-6 space-y-5">
          <article className="rounded-xl border border-[color:var(--brand-primary)]/20 bg-[color:var(--brand-primary)]/6 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              Gemeinsame Wertebasis
            </p>
            <ul className="mt-3 space-y-3">
              {parsedValues.shared.slice(0, 3).map((entry, index) => (
                <li key={`shared-${index}`} className="rounded-lg border border-slate-200/80 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">{entry.headline}</p>
                  <p className="mt-1 text-sm leading-7 text-slate-700">{entry.text}</p>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-xl border border-[color:var(--brand-accent)]/20 bg-[color:var(--brand-accent)]/6 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              Unterschiedliche Prioritäten
            </p>
            <ul className="mt-3 space-y-3">
              {parsedValues.priorities.slice(0, 2).map((entry, index) => (
                <li key={`priority-${index}`} className="rounded-lg border border-[color:var(--brand-accent)]/20 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">{entry.headline}</p>
                  <p className="mt-1 text-sm leading-7 text-slate-700">{entry.text}</p>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              Typische Druckpunkte im Alltag
            </p>
            <ul className="mt-3 space-y-3">
              {parsedValues.pressures.slice(0, 2).map((entry, index) => (
                <li key={`pressure-${index}`} className="rounded-lg border border-slate-200/80 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">{entry.headline}</p>
                  <p className="mt-1 text-sm leading-7 text-slate-700">{entry.text}</p>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              Leitplanken für eure Zusammenarbeit
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              {parsedValues.rules.slice(0, 3).map((rule, index) => (
                <li key={`rule-${index}`} className="text-sm leading-7 text-slate-700">
                  {rule}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <div className="mt-6">
        <ConversationGuide
          questions={compareJson.conversationGuide}
          enabled
          mode="match"
          sections={compareJson.sections as unknown[]}
        />
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold tracking-[0.08em] text-slate-900">
          <SectionIcon type="closing" />
          {sectionClosing?.title ?? "Abschluss"}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          {sectionClosing?.body ??
            "Dieser Preview zeigt den Matching-Report als Arbeitsdokument fuer ein bestehendes Founder-Team."}
        </p>
      </section>
    </div>
  );
}

type PremiumSection = {
  id: string;
  title: string;
  body?: string;
  bullets?: string[];
};

type ParsedValuesSection = {
  shared: Array<{ headline: string; text: string }>;
  priorities: Array<{ headline: string; text: string }>;
  pressures: Array<{ headline: string; text: string }>;
  rules: string[];
};

function parsePremiumSections(sections: unknown[] | undefined) {
  const map = new Map<string, PremiumSection>();
  if (!sections) return map;
  for (const raw of sections) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const entry = raw as Record<string, unknown>;
    const id = typeof entry.id === "string" ? entry.id : null;
    const title = typeof entry.title === "string" ? entry.title : null;
    if (!id || !title) continue;
    map.set(id, {
      id,
      title,
      body: typeof entry.body === "string" ? entry.body : undefined,
      bullets: Array.isArray(entry.bullets)
        ? entry.bullets.filter((item): item is string => typeof item === "string")
        : undefined,
    });
  }
  return map;
}

function parseValuesSection(section: PremiumSection | undefined): ParsedValuesSection {
  const parsed: ParsedValuesSection = {
    shared: [],
    priorities: [],
    pressures: [],
    rules: [],
  };

  for (const bullet of section?.bullets ?? []) {
    const [tagRaw, partA, partB] = bullet.split("|").map((value) => value.trim());
    const tag = tagRaw?.toUpperCase();
    if (!tag) continue;
    if (tag === "SHARED" && partA && partB) parsed.shared.push({ headline: partA, text: partB });
    if (tag === "PRIORITY" && partA && partB) parsed.priorities.push({ headline: partA, text: partB });
    if (tag === "PRESSURE" && partA && partB) parsed.pressures.push({ headline: partA, text: partB });
    if (tag === "RULE" && partA) parsed.rules.push(partA);
  }

  return parsed;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unbekannt";
  return date.toLocaleDateString("de-DE");
}

function SectionIcon({
  type,
}: {
  type: "intro" | "summary" | "overview" | "values" | "closing";
}) {
  if (type === "intro") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-[color:var(--brand-primary)]" aria-hidden="true">
        <path d="M4 4h12v12H4zM7 8h6M7 11h6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (type === "summary") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-[color:var(--brand-primary)]" aria-hidden="true">
        <path d="M4 5h12M4 10h9M4 15h7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (type === "overview") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-[color:var(--brand-primary)]" aria-hidden="true">
        <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 10l4-2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (type === "values") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-[color:var(--brand-accent)]" aria-hidden="true">
        <path d="M10 3l2.3 4.6L17 8.3l-3.5 3.4.8 4.8L10 14.1 5.7 16.5l.8-4.8L3 8.3l4.7-.7L10 3z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-[color:var(--brand-accent)]" aria-hidden="true">
      <path d="M4 10h12M10 4v12" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
