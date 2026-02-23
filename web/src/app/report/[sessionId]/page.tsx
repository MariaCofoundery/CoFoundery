import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AlignmentRadarChart } from "@/features/reporting/AlignmentRadarChart";
import { ConversationGuide } from "@/features/reporting/ConversationGuide";
import { KeyInsights } from "@/features/reporting/KeyInsights";
import { MatchNarratives } from "@/features/reporting/MatchNarratives";
import { PrintReportButton } from "@/features/reporting/PrintReportButton";
import {
  getReportRunSnapshotForSession,
  type ReportRunSnapshot,
} from "@/features/reporting/actions";
import { type KeyInsight, type RadarSeries } from "@/features/reporting/types";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

function hasAnyScore(series: RadarSeries) {
  return Object.values(series).some((value) => typeof value === "number" && Number.isFinite(value));
}

function mapInsightsFromCompareJson(snapshot: ReportRunSnapshot): KeyInsight[] {
  const compareInsights = snapshot.compareJson?.keyInsights ?? [];
  return compareInsights.slice(0, 3).map((insight, index) => ({
    dimension: insight.dimension,
    title: insight.title,
    text: insight.text,
    priority: index + 1,
  }));
}

function isRenderableMatchReport(snapshot: ReportRunSnapshot) {
  const report = snapshot.report;
  if (!report) return false;

  if (snapshot.compareJson) return true;

  const hasRadar = hasAnyScore(report.scoresA) && hasAnyScore(report.scoresB);
  const hasNarratives =
    report.keyInsights.length > 0 ||
    report.commonTendencies.length > 0 ||
    report.frictionPoints.length > 0 ||
    report.conversationGuideQuestions.length > 0;

  return hasRadar || hasNarratives;
}

export default async function ReportPage({ params }: PageProps) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/report/${sessionId}`);
  }

  const snapshot = await getReportRunSnapshotForSession(sessionId);

  if (!snapshot) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-8">
          <h1 className="text-2xl font-semibold text-slate-900">Report noch nicht verfügbar</h1>
          <p className="mt-3 text-sm text-slate-700">
            Für diese Einladung gibt es noch keinen immutable `report_run`.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
          >
            Zurück zum Dashboard
          </Link>
        </section>
      </main>
    );
  }

  if (!isRenderableMatchReport(snapshot) || !snapshot.report) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-8">
          <h1 className="text-2xl font-semibold text-slate-900">Report wird gerade erstellt</h1>
          <p className="mt-3 text-sm text-slate-700">
            Der Matching-Report ist noch nicht vollständig verfügbar. Bitte prüft den Report in wenigen
            Momenten erneut.
          </p>
          <p className="mt-1 text-xs text-slate-500">Invitation: {snapshot.invitationId}</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
          >
            Zurück zum Dashboard
          </Link>
        </section>
      </main>
    );
  }

  const report = snapshot.report;
  const showParticipantB = hasAnyScore(report.scoresB);
  const personBReady = showParticipantB || report.personBCompleted;

  const participants = [
    {
      id: "person-a",
      label: report.participantAName || "Person A",
      color: "#00BFA5",
      scores: report.scoresA,
    },
    ...(showParticipantB
      ? [
          {
            id: "person-b",
            label: report.participantBName || "Person B",
            color: "#7C3AED",
            scores: report.scoresB,
          },
        ]
      : []),
  ];

  const keyInsights = report.keyInsights.length > 0 ? report.keyInsights : mapInsightsFromCompareJson(snapshot);
  const commonTendencies =
    report.commonTendencies.length > 0
      ? report.commonTendencies
      : (snapshot.compareJson?.executiveSummary.topMatches ?? []);
  const frictionPoints =
    report.frictionPoints.length > 0
      ? report.frictionPoints
      : (snapshot.compareJson?.executiveSummary.topTensions ?? []);
  const conversationGuideQuestions =
    report.conversationGuideQuestions.length > 0
      ? report.conversationGuideQuestions
      : (snapshot.compareJson?.conversationGuide ?? []);
  const valuesModulePreview =
    report.valuesModulePreview ||
    snapshot.compareJson?.valuesModule.text ||
    "Werte-Modul aktuell noch nicht verfügbar.";
  const templateVersion = resolveTemplateVersion(snapshot.compareJson);
  const premiumSections = parsePremiumSections(snapshot.compareJson?.sections ?? []);
  const sectionHowToRead = premiumSections.get("how_to_read");
  const sectionExecutive = premiumSections.get("executive_summary");
  const sectionOverview = premiumSections.get("collaboration_overview");
  const sectionValues = premiumSections.get("values_alignment");
  const sectionClosing = premiumSections.get("closing");
  const hasPremiumOutline = templateVersion >= 2;
  const parsedValues = parseValuesSection(sectionValues);
  const hasCompleteValuesForBoth =
    report.valuesTotal > 0 &&
    report.valuesAnsweredA >= report.valuesTotal &&
    report.valuesAnsweredB >= report.valuesTotal &&
    report.valuesAlignmentPercent != null &&
    report.valuesScoreA != null &&
    report.valuesScoreB != null;
  const shouldRenderValuesSection = hasCompleteValuesForBoth && Boolean(sectionValues);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between print:hidden">
        <Link
          href="/dashboard"
          className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
        >
          Zurück zum Dashboard
        </Link>
        <PrintReportButton />
      </div>

      <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Matching Report</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 md:text-3xl">
          {report.participantAName || "Person A"} &amp; {report.participantBName || "Person B"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">Erstellt: {formatDate(snapshot.createdAt)}</p>
        <p className="mt-1 text-xs tracking-[0.08em] text-slate-500">
          Module: {snapshot.modules.join(", ") || "base"}
        </p>
      </section>

      {hasPremiumOutline ? (
        <section className="mb-6 rounded-2xl border border-[color:var(--brand-primary)]/25 bg-[color:var(--brand-primary)]/5 p-8">
          <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
            <SectionIcon type="intro" />
            {sectionHowToRead?.title ?? "So nutzt ihr diesen Report"}
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            {sectionHowToRead?.body ??
              "Dieser Report strukturiert euer Alignment-Gespräch und macht arbeitsrelevante Muster sichtbar."}
          </p>
        </section>
      ) : null}

      <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8">
        <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
          <SectionIcon type="summary" />
          {sectionExecutive?.title ?? "Executive Summary"}
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          {sectionExecutive?.body ??
            "Die Executive Summary verdichtet eure Zusammenarbeit auf Entscheidungsebene."}
        </p>
        <ul className="mt-4 space-y-2">
          {(sectionExecutive?.bullets && sectionExecutive.bullets.length > 0
            ? sectionExecutive.bullets
            : snapshot.compareJson?.executiveSummary.bullets ?? []
          )
            .slice(0, 3)
            .map((bullet, index) => (
              <li key={`summary-bullet-${index}`} className="text-sm leading-7 text-slate-700">
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
              "Diese Darstellung verdichtet eure Zusammenarbeit entlang der sechs Kerndimensionen."}
          </p>
          <div className="mt-5">
            <AlignmentRadarChart participants={participants} />
          </div>
        </article>

        <KeyInsights insights={keyInsights} mode="match" />
      </section>

      <div className="mt-6">
        <MatchNarratives
          commonTendencies={commonTendencies}
          frictionPoints={frictionPoints}
          personBReady={personBReady}
          mode="match"
          sections={snapshot.compareJson?.sections as unknown[] | undefined}
          dimensionComparisons={snapshot.compareJson?.deepDive}
          participantAName={report.participantAName || "Person A"}
          participantBName={report.participantBName || "Person B"}
        />
      </div>

      {shouldRenderValuesSection ? (
        <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold tracking-[0.08em] text-slate-900">
            <SectionIcon type="values" />
            {sectionValues?.title ?? "Werte-Alignment"}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">{sectionValues?.body ?? valuesModulePreview}</p>
          {parsedValues.shared.length > 0 ? (
            <div className="mt-6 space-y-5">
              <article className="rounded-xl border border-[color:var(--brand-primary)]/20 bg-[color:var(--brand-primary)]/6 p-5">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                  <ValuesIcon type="shared" />
                  Gemeinsame Werte
                </p>
                <ul className="mt-3 space-y-3">
                  {parsedValues.shared.slice(0, 3).map((entry, index) => (
                    <li key={`values-shared-${index}`} className="rounded-lg border border-slate-200/80 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-900">{entry.headline}</p>
                      <p className="mt-1 text-sm leading-7 text-slate-700">{entry.text}</p>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="rounded-xl border border-[color:var(--brand-accent)]/20 bg-[color:var(--brand-accent)]/6 p-5">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                  <ValuesIcon type="gap" />
                  Stolpersteine
                </p>
                <ul className="mt-3 space-y-3">
                  {parsedValues.gaps.slice(0, 2).map((entry, index) => (
                    <li key={`values-gap-${index}`} className="rounded-lg border border-[color:var(--brand-accent)]/20 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-900">{entry.headline}</p>
                      <p className="mt-1 text-sm leading-7 text-slate-700">{entry.riskText}</p>
                      <p className="mt-1 text-sm leading-7 text-slate-700">
                        <span className="font-semibold text-slate-900">Vorbeugung:</span> {entry.mitigationText}
                      </p>
                    </li>
                  ))}
                </ul>
              </article>

              <div className="grid gap-4 lg:grid-cols-2">
                <article className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-5">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                    <ValuesIcon type="rules" />
                    Arbeitsabsprachen
                  </p>
                  <ul className="mt-3 list-disc space-y-2 pl-5">
                    {parsedValues.rules.slice(0, 3).map((rule, index) => (
                      <li key={`values-rule-${index}`} className="text-sm leading-7 text-slate-700">
                        {rule}
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-5">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                    <ValuesIcon type="questions" />
                    Gesprächsfragen
                  </p>
                  <ul className="mt-3 space-y-2">
                    {parsedValues.questions.slice(0, 2).map((question, index) => (
                      <li key={`values-question-${index}`} className="text-sm leading-7 text-slate-700">
                        {`[ ] ${question}`}
                      </li>
                    ))}
                  </ul>
                </article>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="mt-6">
        <ConversationGuide
          questions={conversationGuideQuestions}
          enabled={personBReady}
          mode="match"
          sections={snapshot.compareJson?.sections as unknown[] | undefined}
        />
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold tracking-[0.08em] text-slate-900">
          <SectionIcon type="closing" />
          {sectionClosing?.title ?? "Abschluss"}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          {sectionClosing?.body ??
            "Dieser Report ist ein Arbeitsdokument. Die Qualität entsteht aus eurem Umgang mit den darin sichtbaren Spannungen."}
        </p>
        {sectionClosing?.bullets?.length ? (
          <ul className="mt-4 space-y-2">
            {sectionClosing.bullets.map((bullet, index) => (
              <li key={`closing-bullet-${index}`} className="text-sm leading-7 text-slate-700">
                • {bullet}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "unbekannt";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unbekannt";
  return date.toLocaleDateString("de-DE");
}

type PremiumSection = {
  id: string;
  title: string;
  body?: string;
  bullets?: string[];
  checklist?: string[];
};

type ParsedValuesSection = {
  shared: Array<{ headline: string; text: string }>;
  gaps: Array<{ headline: string; riskText: string; mitigationText: string }>;
  rules: string[];
  questions: string[];
};

function parsePremiumSections(sections: unknown[] | null | undefined) {
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
      bullets: Array.isArray(entry.bullets) ? entry.bullets.filter((item): item is string => typeof item === "string") : undefined,
      checklist: Array.isArray(entry.checklist) ? entry.checklist.filter((item): item is string => typeof item === "string") : undefined,
    });
  }
  return map;
}

function parseValuesSection(section: PremiumSection | undefined): ParsedValuesSection {
  const parsed: ParsedValuesSection = {
    shared: [],
    gaps: [],
    rules: [],
    questions: [],
  };
  const bullets = section?.bullets ?? [];
  for (const bullet of bullets) {
    const [tagRaw, partA, partB, partC] = bullet.split("|").map((value) => value.trim());
    const tag = tagRaw?.toUpperCase();
    if (!tag) continue;
    if (tag === "SHARED" && partA && partB) {
      parsed.shared.push({ headline: partA, text: partB });
      continue;
    }
    if (tag === "GAP" && partA && partB && partC) {
      parsed.gaps.push({ headline: partA, riskText: partB, mitigationText: partC });
      continue;
    }
    if (tag === "RULE" && partA) {
      parsed.rules.push(partA);
      continue;
    }
    if (tag === "QUESTION" && partA) {
      parsed.questions.push(partA);
    }
  }
  return parsed;
}

function resolveTemplateVersion(compareJson: ReportRunSnapshot["compareJson"]) {
  if (!compareJson || typeof compareJson !== "object") return 1;
  const value = (compareJson as unknown as Record<string, unknown>).templateVersion;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 1;
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

function ValuesIcon({ type }: { type: "shared" | "gap" | "rules" | "questions" }) {
  if (type === "shared") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-[color:var(--brand-primary)]" aria-hidden="true">
        <path d="M4 10l4 4 8-8" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (type === "gap") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-[color:var(--brand-accent)]" aria-hidden="true">
        <path d="M10 3l7 14H3l7-14zM10 8v3m0 3h.01" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (type === "rules") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-[color:var(--brand-primary)]" aria-hidden="true">
        <path d="M5 3h10v14H5zM8 7h4M8 10h4M8 13h3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-[color:var(--brand-accent)]" aria-hidden="true">
      <path d="M4 5h12v8H7l-3 3V5z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
