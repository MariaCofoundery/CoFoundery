import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getExecutiveSummaryTextByAlignment,
  getReportRunSnapshotForSession,
  getSessionAlignmentReport,
} from "@/features/reporting/actions";
import {
  buildProfileResultFromSession,
  createMockProfileResult,
  generateCompareReport,
} from "@/features/reporting/generateCompareReport";
import { AlignmentRadarChart } from "@/features/reporting/AlignmentRadarChart";
import { ComparisonScale } from "@/features/reporting/ComparisonScale";
import {
  DIMENSION_EXTREMES,
  REPORT_CONTENT,
  VALUES_PLAYBOOK,
  VALUES_REPORT_CONTENT,
} from "@/features/reporting/constants";
import { PrintReportButton } from "@/features/reporting/PrintReportButton";
import { CopyReportJsonButton } from "@/features/reporting/CopyReportJsonButton";
import {
  REPORT_DIMENSIONS,
  type ReportDimension,
  type SessionAlignmentReport,
} from "@/features/reporting/types";

type PageProps = {
  params: Promise<{ sessionId: string }>;
  searchParams?: Promise<{ demo?: string }>;
};

export default async function ReportPage({ params, searchParams }: PageProps) {
  const { sessionId } = await params;
  const query = searchParams ? await searchParams : {};
  const isDemoMode = query?.demo === "1";
  const snapshot = await getReportRunSnapshotForSession(sessionId);
  if (!snapshot && !isDemoMode) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
    }
    const { data: membership } = await supabase
      .from("participants")
      .select("id")
      .eq("session_id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) {
      redirect("/dashboard");
    }
    const { data: sessionRow } = await supabase
      .from("sessions")
      .select("status")
      .eq("id", sessionId)
      .maybeSingle();
    const status = (sessionRow as { status?: string } | null)?.status ?? "waiting";
    const isProcessing = status === "match_ready" || status === "completed";

    return (
      <main className="mx-auto max-w-[800px] px-6 py-12">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-10">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Match-Report</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[0.06em] text-slate-900">
            {isProcessing ? "Report wird erstellt" : "Warten auf Abschlüsse"}
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-700">
            {isProcessing
              ? "Der Snapshot wurde noch nicht finalisiert. Bitte aktualisiere in wenigen Sekunden erneut."
              : "Mindestens ein Profil ist noch nicht vollständig abgeschlossen."}
          </p>
          <div className="mt-8">
            <div className="h-2 w-full rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-[#00B8D9] to-[#7C3AED]"
                style={{ width: isProcessing ? "95%" : "65%" }}
              />
            </div>
            <p className="mt-3 text-xs uppercase tracking-[0.12em] text-slate-500">
              Status: {isProcessing ? "Processing" : "Waiting"}
            </p>
          </div>
          <a
            href="/dashboard"
            className="mt-8 inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
          >
            Zurück zum Dashboard
          </a>
        </section>
      </main>
    );
  }

  const baseReport = snapshot?.report ?? (isDemoMode ? await getSessionAlignmentReport(sessionId) : null);
  const report = isDemoMode && baseReport ? withDemoReport(baseReport) : baseReport;

  if (!report) {
    redirect("/dashboard");
  }

  if (report.personBStatus !== "match_ready" && !isDemoMode) {
    const progress = waitingProgress(report.personBStatus);
    return (
      <main className="mx-auto max-w-[800px] px-6 py-12">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-10">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Match-Report</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[0.06em] text-slate-900">
            Warten auf Person B
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-700">
            Sobald beide Profile komplett sind, wird der vollständige Vergleichsreport freigeschaltet.
          </p>
          <div className="mt-8">
            <div className="h-2 w-full rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-[#00B8D9] to-[#7C3AED]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-xs uppercase tracking-[0.12em] text-slate-500">
              Fortschritt: {progress}%
            </p>
          </div>
          <a
            href="/dashboard"
            className="mt-8 inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
          >
            Zurück zum Dashboard
          </a>
        </section>
      </main>
    );
  }

  const executiveSummary = await getExecutiveSummaryTextByAlignment(report.scoresA, report.scoresB);
  const participantBDisplayName = report.participantBName?.trim() || "Person B";
  const compareJson =
    isDemoMode && report
      ? generateCompareReport(
          buildProfileResultFromSession(report, "A"),
          buildProfileResultFromSession(report, "B")
        )
      : snapshot?.compareJson;
  if (!compareJson) {
    redirect("/dashboard");
  }
  const systemicCoherence = buildSystemicCoherence(compareJson, report.participantAName, participantBDisplayName);
  const decisionSupport = buildExecutiveDecisionSupport(compareJson);
  const criticalClarificationTopics = buildCriticalClarificationTopics(compareJson);
  const dimensionDeepeningQuestions = buildDimensionDeepeningQuestions(compareJson);
  const finalClassification = buildFinalClassification(compareJson);
  const hasValuesAddonBoth =
    report.requestedScope === "basis_plus_values" &&
    report.valuesTotal > 0 &&
    report.valuesAnsweredA >= report.valuesTotal &&
    report.valuesAnsweredB >= report.valuesTotal;
  const valuesAlignmentLabel = valuesAlignmentTier(report.valuesAlignmentPercent);
  const premiumValues = hasValuesAddonBoth
    ? buildPremiumValuesSection(report, report.participantAName, participantBDisplayName)
    : null;
  const valuesIdentitySummary = valuesIdentitySummaryText(report, hasValuesAddonBoth);
  const teamType = teamTypeLabel(report);
  const alignedDimensions = topAlignedDimensions(report).slice(0, 3);
  const recommendation = executiveRecommendation(report);
  const executiveSummaryParagraph = composeExecutiveSummaryParagraph({
    intro: REPORT_CONTENT.executive_summary.intro,
    summary: executiveSummary,
    recommendation,
  });
  const executivePreview = buildExecutivePreview({
    compareJson,
    executiveSummaryParagraph,
    recommendation,
    valuesIdentitySummary,
  });
  const prioritizedGuide = buildPrioritizedConversationGuide(
    criticalClarificationTopics,
    dimensionDeepeningQuestions
  );
  const chartParticipants = [
    {
      id: "participant-a",
      label: report.participantAName,
      color: "#00B8D9",
      scores: report.scoresA,
    },
    ...(report.comparisonEnabled
      ? [
          {
            id: "participant-b",
            label: participantBDisplayName,
            color: "#7C3AED",
            scores: report.scoresB,
          },
        ]
      : []),
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#F0FAFF] via-[#F9FAFB] to-[#F6F1FF] py-10 print:bg-white print:py-0">
      <div className="mx-auto max-w-[800px] px-6 print:max-w-none print:px-0">
        <div className="mb-8 flex items-center justify-between print:hidden">
          <a
            href="/dashboard"
            className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
          >
            Zurück zum Dashboard
          </a>
          <PrintReportButton />
        </div>

        <article className="space-y-16 rounded-2xl border border-slate-200/80 bg-white px-10 py-12 shadow-sm print:space-y-4 print:rounded-none print:border-0 print:px-0 print:py-0 print:shadow-none [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
          <section className="bg-white print:break-inside-auto print:rounded-none print:border-0 print:p-0">
            <div className="flex items-center gap-4">
              <BrandMark />
            </div>
            <h1 className="mt-8 text-3xl font-semibold tracking-[0.03em] text-slate-800">
              {report.participantAName} & {participantBDisplayName}
            </h1>
            <p className="mt-3 text-base font-medium tracking-[0.04em] text-slate-700">
              Decision-Support-Dokument für bewusste Zusammenarbeit
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Matching abgeschlossen am: {formatDate(report.personBCompletedAt ?? report.createdAt)}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.12em] text-slate-500">
              Report-Typ: {hasValuesAddonBoth ? "Basis + Werte-Kern" : "Basis"}
            </p>
            <div className="mt-6 h-[3px] w-full rounded-full bg-gradient-to-r from-[#00B8D9] via-[#7C3AED]/80 to-[#7C3AED]" />
            <div className="mt-10 mx-auto max-w-[420px]">
              <AlignmentRadarChart participants={chartParticipants} compact />
            </div>
          </section>

          <section
            className="rounded-2xl border p-6 print:break-inside-auto print:border-0 print:bg-white print:p-0"
            style={{
              borderColor: "rgba(0,184,217,0.28)",
              background:
                "linear-gradient(145deg, rgba(0,184,217,0.24) 0%, #ffffff 52%, rgba(124,58,237,0.14) 100%)",
              boxShadow: "inset 0 0 0 1px rgba(0,184,217,0.12)",
            }}
          >
            <SectionTitle title="Was Dieser Report Ist" tone="cyan" />
            <p className="mt-4 text-sm leading-8 text-slate-700">
              Dieser Report macht sichtbar, wie ihr denkt, arbeitet und unter Druck reagiert, nicht um zu bewerten,
              sondern um ein gemeinsames Bild zu schaffen. Die Unterschiede, die hier beschrieben werden, sind weder
              gut noch schlecht. Sie sind das Material, aus dem eine bewusste Zusammenarbeit entsteht.
            </p>
            <p className="mt-4 text-sm leading-8 text-slate-700">
              Nehmt euch Zeit für diesen Report. Lest ihn einzeln oder gemeinsam, markiert Stellen, die euch
              auffallen, und sprecht über das, was euch beschäftigt. Die besten Gründungsteams kennen ihre
              Unterschiede und haben gelernt, offen darüber zu reden.
            </p>
            <p className="mt-4 text-sm leading-8 text-slate-700">
              Hinweis: Dieser Report basiert auf euren Selbsteinschätzungen. Er ersetzt kein persönliches Gespräch
              und stellt keine psychologische Diagnose dar.
            </p>
          </section>

          <section
            className="rounded-2xl border p-6 print:break-after-page print:break-inside-auto print:border-0 print:bg-white print:p-0"
            style={{
              borderColor: "rgba(124,58,237,0.28)",
              background:
                "linear-gradient(145deg, rgba(124,58,237,0.24) 0%, #ffffff 52%, rgba(0,184,217,0.14) 100%)",
              boxShadow: "inset 0 0 0 1px rgba(124,58,237,0.12)",
            }}
          >
            <SectionTitle title="Executive Summary" tone="violet" />
            {report.comparisonEnabled && alignedDimensions.length > 0 ? (
              <p className="mt-4 rounded-xl border border-[#00B8D9]/25 bg-[#00B8D9]/10 px-5 py-4 text-sm leading-7 text-slate-700">
                Die größte Übereinstimmung zeigt ihr in den Dimensionen{" "}
                {alignedDimensions.join(", ")}.
              </p>
            ) : null}
            {teamType ? (
              <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-700">
                {teamType}
              </p>
            ) : null}
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <ExecutiveCard title="Kernaussage" text={executivePreview.core} tone="neutral" />
              <ExecutiveCard title="Haupthebel" text={executivePreview.leverage} tone="cyan" />
              <ExecutiveCard title="Hauptrisiko" text={executivePreview.risk} tone="violet" />
              <ExecutiveCard title="Nächster Schritt" text={executivePreview.nextStep} tone="neutral" />
            </div>
          </section>

          <section className="bg-white print:break-before-page">
            <SectionTitle title="Deep Dive: 6 Dimensionen" tone="neutral" />
            <div className="mt-10 space-y-12 print:mt-5 print:space-y-6">
              {compareJson.deepDive.map((block, index) => {
                const dimension = block.dimension;
                const pack = contentPack(dimension);
                const scoreA = block.scoreA;
                const scoreB = block.scoreB;
                const Icon = dimensionIcon(dimension);
                const sectionToneStyle =
                  block.label === "MATCH"
                    ? {
                        borderColor: "rgba(0,184,217,0.45)",
                        background:
                          "linear-gradient(145deg, rgba(0,184,217,0.16) 0%, #ffffff 60%, rgba(0,184,217,0.08) 100%)",
                      }
                    : block.label === "KOMPLEMENTAER"
                    ? {
                        borderColor: "rgba(124,58,237,0.42)",
                        background:
                          "linear-gradient(145deg, rgba(124,58,237,0.15) 0%, #ffffff 60%, rgba(124,58,237,0.08) 100%)",
                      }
                    : {
                        borderColor: "rgba(124,58,237,0.48)",
                        background:
                          "linear-gradient(145deg, rgba(124,58,237,0.22) 0%, #ffffff 58%, rgba(0,184,217,0.12) 100%)",
                      };
                const synthesisToneClass =
                  block.label === "MATCH"
                    ? "border-[#00B8D9]/35 bg-[#00B8D9]/10"
                    : block.label === "KOMPLEMENTAER"
                    ? "border-[#7C3AED]/30 bg-[#7C3AED]/10"
                    : "border-[#7C3AED]/35 bg-[#7C3AED]/14";
                return (
                  <section
                    key={dimension}
                    className={`rounded-2xl border p-8 print:break-inside-auto print:rounded-none print:border-0 print:bg-white print:p-4 ${
                      index === 3 ? "print:break-before-page" : ""
                    }`}
                    style={sectionToneStyle}
                  >
                    <h3 className="flex items-center gap-3 text-base font-semibold uppercase tracking-[0.08em] text-slate-800">
                      <Icon className="h-6 w-6 shrink-0 text-[#2B3E52]" />
                      {pack.title}
                    </h3>
                    <div className="mt-6">
                      <ComparisonScale
                        scoreA={scoreA}
                        scoreB={report.comparisonEnabled ? scoreB : null}
                        markerA={isDemoMode ? "M" : resolveMarker(report.participantAName, "A")}
                        markerB={
                          isDemoMode
                            ? "T"
                            : resolveMarker(participantBDisplayName, "B")
                        }
                        participantAName={report.participantAName}
                        participantBName={participantBDisplayName}
                        lowLabel={DIMENSION_EXTREMES[dimension].low}
                        highLabel={DIMENSION_EXTREMES[dimension].high}
                      />
                    </div>
                    <span
                      className={`mt-4 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                        block.label === "MATCH"
                          ? "border border-[#00B8D9]/55 bg-[#00B8D9]/20 text-[#085C74] ring-1 ring-[#00B8D9]/25"
                          : block.label === "KOMPLEMENTAER"
                          ? "border border-[#7C3AED]/55 bg-[#7C3AED]/18 text-[#4A1EA0] ring-1 ring-[#7C3AED]/25"
                          : "border border-[#7C3AED]/60 bg-[#7C3AED]/24 text-[#3E157D] ring-1 ring-[#7C3AED]/30"
                      }`}
                    >
                      {block.label === "MATCH"
                        ? "Match"
                        : block.label === "KOMPLEMENTAER"
                        ? "Komplementär"
                        : "Fokus-Thema"}
                    </span>
                    <div className="mt-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                        Bedeutung der Dimension
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-700 print:leading-6">{pack.description}</p>
                    </div>
                    {scoreA != null ? (
                      <div className="mt-5 rounded-xl border border-[#00B8D9]/40 bg-[#00B8D9]/10 px-5 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0B6E88]">
                          {report.participantAName || "Person A"}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-700 print:leading-6">{block.summaryA}</p>
                      </div>
                    ) : null}
                    {report.comparisonEnabled && scoreB != null ? (
                      <div className="mt-3 rounded-xl border border-[#7C3AED]/40 bg-[#7C3AED]/12 px-5 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4A1EA0]">
                          {participantBDisplayName}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-700 print:leading-6">{block.summaryB}</p>
                      </div>
                    ) : null}
                    <div className="mt-5 rounded-xl border border-[#00B8D9]/25 bg-white px-5 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0B6E88]">
                        Alltag & Drucksituationen
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-700 print:leading-6">
                        {detailedDailyPressure(block, report.participantAName, participantBDisplayName)}
                      </p>
                    </div>
                    <div className={`mt-5 rounded-xl border px-5 py-4 ${synthesisToneClass}`}>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2B3E52]">
                        {block.label === "MATCH" ? "Gemeinsamer Nenner" : "Potenzielles Spannungsfeld"}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-700 print:leading-6">
                        {dimensionSynthesis(block, report.participantAName, participantBDisplayName)}
                      </p>
                    </div>
                    <p className="mt-4 rounded-lg border border-slate-200/80 bg-white px-4 py-3 text-sm leading-7 text-slate-700 print:leading-6">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                        Takeaway Für Den Alltag
                      </span>
                      <span className="mt-1 block">
                        {dimensionTakeaway(block, report.participantAName, participantBDisplayName)}
                      </span>
                    </p>
                    <p className="mt-5 rounded-xl border border-[#00B8D9]/45 bg-gradient-to-r from-[#00B8D9]/16 to-[#7C3AED]/10 px-5 py-4 text-sm leading-7 text-slate-700 print:leading-6">
                      <span className="inline-flex items-center gap-2">
                        <QuestionBadge />
                        <span>Reflexionsfrage: {block.reflectionQuestion}</span>
                      </span>
                    </p>
                  </section>
                );
              })}
            </div>
          </section>

          {hasValuesAddonBoth && premiumValues ? (
            <section
              className="rounded-2xl border p-6 print:break-before-page print:border-0 print:bg-white print:p-0"
            style={{
              borderColor: "rgba(0,184,217,0.28)",
              background:
                "linear-gradient(145deg, rgba(0,184,217,0.24) 0%, #ffffff 52%, rgba(124,58,237,0.14) 100%)",
              boxShadow: "inset 0 0 0 1px rgba(0,184,217,0.12)",
            }}
          >
              <SectionTitle title="Werte-Kern (Add-on)" tone="cyan" />
              <p className="mt-4 rounded-xl border border-[#00B8D9]/30 bg-[#00B8D9]/10 px-5 py-4 text-sm leading-7 text-slate-700">
                Werte-Alignment:{" "}
                <span className="font-semibold">
                  {report.valuesAlignmentPercent != null ? `${report.valuesAlignmentPercent}%` : "n/a"}
                </span>
                {valuesAlignmentLabel ? (
                  <span className="ml-2 rounded-full border border-[#00B8D9]/35 bg-white px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#0B6E88]">
                    {valuesAlignmentLabel}
                  </span>
                ) : null}
              </p>
              <p className="mt-3 rounded-xl border border-[#7C3AED]/25 bg-white px-5 py-4 text-sm leading-7 text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5B21B6]">
                  Executive Readout
                </span>
                <span className="mt-1 block">{premiumValues.executiveReadout}</span>
              </p>
              <p className="mt-3 rounded-xl border border-[#00B8D9]/30 bg-[#00B8D9]/10 px-5 py-4 text-sm leading-7 text-slate-700">
                {premiumValues.intro}
              </p>
              <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                  Werte & Verantwortung im Vergleich
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Grundannahmen zu Fairness, Regeln und Verantwortung
                </p>
                <p className="mt-3 rounded-lg border border-[#7C3AED]/25 bg-[#7C3AED]/10 px-4 py-3 text-sm leading-7 text-slate-700">
                  {premiumValues.pairNarrative}
                </p>
                <div className="mt-5 h-px w-full bg-gradient-to-r from-[#00B8D9]/25 via-slate-200 to-[#7C3AED]/25" />
                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  <div className="rounded-xl border border-[#00B8D9]/25 bg-[#00B8D9]/10 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0B6E88]">
                      Geteilte Grundannahmen
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Bereiche, in denen eure Wertebasis bereits stabil anschlussfähig ist.
                    </p>
                    <ul className="mt-3 space-y-2">
                      {premiumValues.shared.map((point) => (
                        <li key={point} className="text-sm leading-7 text-slate-700">
                          • {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-[#7C3AED]/25 bg-[#7C3AED]/10 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5B21B6]">
                      Unterschiede mit Gesprächsbedarf
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Themen, die bei Druck explizite Leitlinien und bewusste Klärung brauchen.
                    </p>
                    <ul className="mt-3 space-y-2">
                      {premiumValues.tensions.map((point) => (
                        <li key={point} className="text-sm leading-7 text-slate-700">
                          • {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="mt-5 rounded-lg border border-[#00B8D9]/30 bg-[#00B8D9]/10 px-4 py-3 text-sm leading-7 text-slate-700">
                  <span className="inline-flex items-center gap-2">
                    <QuestionBadge />
                    <span>Leitfrage: {premiumValues.question}</span>
                  </span>
                </p>
              </section>
            </section>
          ) : null}

          <section
            className="rounded-2xl border p-6 print:border-0 print:bg-white print:p-0"
            style={{
              borderColor: "rgba(0,184,217,0.24)",
              background:
                "linear-gradient(145deg, rgba(0,184,217,0.18) 0%, #ffffff 62%, rgba(255,255,255,1) 100%)",
              boxShadow: "inset 0 0 0 1px rgba(0,184,217,0.1)",
            }}
          >
            <SectionTitle title="Systemischer Kohärenzblick" tone="cyan" />
            <p className="mt-2 text-sm text-slate-500">Wie die Dimensionen im Zusammenspiel wirken</p>
            <p className="mt-4 text-sm leading-7 text-slate-700">{systemicCoherence.overview}</p>
            <ul className="mt-4 space-y-2">
              {systemicCoherence.points.map((point) => (
                <li key={point} className="text-sm leading-7 text-slate-700">
                  • {point}
                </li>
              ))}
            </ul>
          </section>

          <section
            className="rounded-2xl border p-6 print:break-inside-avoid print:border-0 print:bg-white print:p-0"
            style={{
              borderColor: "rgba(124,58,237,0.24)",
              background:
                "linear-gradient(145deg, rgba(124,58,237,0.18) 0%, #ffffff 62%, rgba(255,255,255,1) 100%)",
              boxShadow: "inset 0 0 0 1px rgba(124,58,237,0.1)",
            }}
          >
            <SectionTitle title="Executive Decision Support" tone="violet" />
            <p className="mt-2 text-sm text-slate-500">Orientierungslogik für eure nächsten Schritte</p>
            <ol className="mt-4 space-y-2">
              {decisionSupport.map((item, index) => (
                <li key={item} className="text-sm leading-7 text-slate-700">
                  {index + 1}. {item}
                </li>
              ))}
            </ol>
          </section>

          <section
            className="rounded-2xl border p-6 print:break-before-page print:border-0 print:bg-white print:p-0"
            style={{
              borderColor: "rgba(124,58,237,0.24)",
              background:
                "linear-gradient(145deg, rgba(124,58,237,0.18) 0%, #ffffff 58%, rgba(0,184,217,0.14) 100%)",
              boxShadow: "inset 0 0 0 1px rgba(124,58,237,0.1)",
            }}
          >
            <SectionTitle title="Gesprächsleitfaden" tone="violet" />
            <p className="mt-4 text-sm leading-7 text-slate-700">
              Konkrete Fragen für euer nächstes Alignment-Gespräch.
            </p>
            <h3 className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
              Jetzt Klären
            </h3>
            <ul className="mt-3 space-y-4">
              {prioritizedGuide.now.map((question, idx) => (
                <li
                  key={`${idx}-${question}`}
                  className="flex items-start gap-3 rounded-xl bg-slate-50 px-5 py-4 text-sm leading-8 text-slate-700"
                >
                  <QuestionBadge />
                  <span>{question}</span>
                </li>
              ))}
            </ul>
            <h3 className="mt-7 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
              Vor Startphase Klären
            </h3>
            <ul className="mt-3 space-y-4">
              {prioritizedGuide.preStart.map((question, idx) => (
                <li
                  key={`${idx}-${question}`}
                  className="flex items-start gap-3 rounded-xl bg-slate-50 px-5 py-4 text-sm leading-8 text-slate-700"
                >
                  <QuestionBadge />
                  <span>{question}</span>
                </li>
              ))}
            </ul>
            <h3 className="mt-7 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
              Im 30-Tage-Review
            </h3>
            <ul className="mt-3 space-y-4">
              {prioritizedGuide.review30.map((question, idx) => (
                <li
                  key={`${idx}-${question}`}
                  className="flex items-start gap-3 rounded-xl bg-slate-50 px-5 py-4 text-sm leading-8 text-slate-700"
                >
                  <QuestionBadge />
                  <span>{question}</span>
                </li>
              ))}
            </ul>
          </section>

          <section
            className="rounded-2xl border p-6 print:border-0 print:bg-white print:p-0"
            style={{
              borderColor: "rgba(0,184,217,0.24)",
              background:
                "linear-gradient(145deg, rgba(0,184,217,0.16) 0%, #ffffff 60%, rgba(124,58,237,0.14) 100%)",
              boxShadow: "inset 0 0 0 1px rgba(0,184,217,0.1)",
            }}
          >
            <SectionTitle title="Abschluss & Einordnung" tone="neutral" />
            <p className="mt-4 text-sm leading-7 text-slate-700">{finalClassification.summary}</p>
            <p className="mt-4 text-sm leading-7 text-slate-700">{finalClassification.implication}</p>
            <div className="mt-5 rounded-xl border border-[#00B8D9]/25 bg-[#00B8D9]/10 px-5 py-4 text-sm leading-7 text-slate-700">
              <p>
                <span className="font-semibold">Was sofort festlegen:</span>{" "}
                Rollen, Entscheidungsrechte und Eskalationsweg für euer aktuell größtes Fokus-Thema.
              </p>
              <p className="mt-2">
                <span className="font-semibold">Was ihr 30 Tage testet:</span>{" "}
                Einen festen Check-in-Rhythmus und klare Übergaberegeln zwischen den Verantwortungsbereichen.
              </p>
              <p className="mt-2">
                <span className="font-semibold">Woran ihr Erfolg messt:</span>{" "}
                Weniger Reibungsverluste, schnellere Entscheidungen und höhere Verlässlichkeit bei Zusagen.
              </p>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              Dieser Report ist eine strukturierte Gesprächsgrundlage. Entscheidungen und Verantwortung liegen
              vollständig bei euch.
            </p>
          </section>

          {process.env.NODE_ENV === "development" ? (
            <section className="bg-white print:hidden">
              <details className="rounded-2xl border border-amber-200 bg-amber-50/30 p-6">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
                  Debug-Panel (Dev)
                </summary>
                <div className="mt-5 space-y-6">
                  <CopyReportJsonButton report={report} />
                  <DebugParticipantBlock title={report.debugA.participantName} data={report.debugA} />
                  {report.debugB ? <DebugParticipantBlock title={report.debugB.participantName} data={report.debugB} /> : null}
                </div>
              </details>
            </section>
          ) : null}
        </article>
      </div>
    </main>
  );
}

function waitingProgress(status: SessionAlignmentReport["personBStatus"]) {
  switch (status) {
    case "invitation_open":
      return 30;
    case "in_progress":
      return 70;
    case "match_ready":
      return 100;
  }
}

function withDemoReport(report: SessionAlignmentReport): SessionAlignmentReport {
  const demoScoresB = generateDemoScores(report.sessionId);
  const profileA = buildProfileResultFromSession(report, "A");
  const profileB = createMockProfileResult(
    "B",
    "Test-CoFounder",
    demoScoresB,
    demoScoresB.Risiko ?? 3.5,
    "business_pragmatiker"
  );
  const demoCompare = generateCompareReport(profileA, profileB);
  const valuesTotal = report.valuesTotal > 0 ? report.valuesTotal : 10;
  const fallbackIdentityA = report.valuesIdentityCategoryA ?? "Verantwortungs-Stratege";
  const fallbackIdentityB = demoCompare.valuesModule.identityB ?? "Business-Pragmatiker";

  return {
    ...report,
    participantAName: report.participantAName || "Person A",
    participantBName: "Test-CoFounder",
    personBStatus: "match_ready",
    personBCompleted: true,
    requestedScope: "basis_plus_values",
    inviteConsentCaptured: true,
    comparisonEnabled: true,
    scoresB: demoScoresB,
    commonTendencies: demoCompare.executiveSummary.topMatches.map(
      (dimension) =>
        `${report.participantAName || "Teilnehmer A"} und Test-CoFounder zeigen in ${dimension} eine hohe Übereinstimmung.`
    ),
    frictionPoints: demoCompare.executiveSummary.topTensions.map(
      (dimension) =>
        `In ${dimension} treffen unterschiedliche Profile aufeinander und sollten aktiv moderiert werden.`
    ),
    keyInsights: demoCompare.keyInsights.map((item, index) => ({
      dimension: item.dimension,
      title: item.title,
      text: item.text,
      priority: index,
    })),
    conversationGuideQuestions: demoCompare.conversationGuide,
    valuesModuleStatus: "completed",
    valuesTotal,
    valuesAnsweredA: valuesTotal,
    valuesAnsweredB: valuesTotal,
    valuesIdentityCategoryA: fallbackIdentityA,
    valuesIdentityCategoryB: fallbackIdentityB,
    valuesAlignmentPercent: demoCompare.valuesModule.alignmentPercent ?? 68,
    valuesModulePreview:
      `${report.participantAName || "Person A"} (${fallbackIdentityA}) trifft auf Test-CoFounder (${fallbackIdentityB}). ` +
      `Euer simuliertes Werte-Match liegt bei ${demoCompare.valuesModule.alignmentPercent ?? 68}%.`,
  };
}

function generateDemoScores(seedSource: string): SessionAlignmentReport["scoresB"] {
  const rand = seededRandom(seedSource);
  return {
    Vision: seededScore(rand),
    Entscheidung: seededScore(rand),
    Risiko: seededScore(rand),
    Autonomie: seededScore(rand),
    Verbindlichkeit: seededScore(rand),
    Konflikt: seededScore(rand),
  };
}

function seededScore(rand: () => number) {
  const value = 1 + rand() * 5;
  return Number(value.toFixed(1));
}

function seededRandom(seedSource: string) {
  let seed = 2166136261;
  for (let i = 0; i < seedSource.length; i += 1) {
    seed ^= seedSource.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  return () => {
    seed += 0x6d2b79f5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function resolveMarker(name: string, fallback: string) {
  const normalized = name.trim();
  if (!normalized) return fallback;
  const invalid = new Set(["teilnehmer", "teilnehmerin", "partner", "person", "neu", "neuer"]);
  const firstToken = normalized.split(/\s+/)[0]?.toLowerCase() ?? "";
  if (invalid.has(firstToken)) return fallback;
  const first = normalized.charAt(0).toUpperCase();
  return first || fallback;
}

function BrandMark() {
  return (
    <div className="flex h-[50px] max-h-[50px] items-center">
      <object
        data="/cofoundery-align-logo.svg"
        type="image/svg+xml"
        aria-label="CoFoundery Align Logo"
        className="h-[50px] w-auto max-w-[260px]"
      >
        <p className="bg-gradient-to-r from-[#00B8D9] to-[#7C3AED] bg-clip-text text-xl font-bold text-transparent">
          CoFoundery Align
        </p>
      </object>
    </div>
  );
}

function contentPack(dimension: ReportDimension) {
  switch (dimension) {
    case "Vision":
      return REPORT_CONTENT.dimensions.vision;
    case "Entscheidung":
      return REPORT_CONTENT.dimensions.entscheidung;
    case "Risiko":
      return REPORT_CONTENT.dimensions.risiko;
    case "Autonomie":
      return REPORT_CONTENT.dimensions.autonomie;
    case "Verbindlichkeit":
      return REPORT_CONTENT.dimensions.verbindlichkeit;
    case "Konflikt":
      return REPORT_CONTENT.dimensions.konflikt;
  }
}

function topAlignedDimensions(report: SessionAlignmentReport) {
  return REPORT_DIMENSIONS.map((dimension) => {
    const a = report.scoresA[dimension];
    const b = report.scoresB[dimension];
    if (a == null || b == null) return null;
    return { dimension, delta: Math.abs(a - b) };
  })
    .filter((item): item is { dimension: ReportDimension; delta: number } => item != null)
    .sort((x, y) => x.delta - y.delta)
    .map((item) => item.dimension);
}

function formatDate(value: string | null) {
  if (!value) return "unbekannt";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unbekannt";
  return date.toLocaleDateString("de-DE");
}

function valuesAlignmentTier(percent: number | null) {
  if (percent == null) return null;
  if (percent >= 85) return "Werte-Symbiose";
  if (percent >= 65) return "Werte-Schnittmenge";
  return "Werte-Spannungsfeld";
}

function composeExecutiveSummaryParagraph({
  intro,
  summary,
  recommendation,
}: {
  intro: string;
  summary: string;
  recommendation: string | null;
}) {
  const base = `${intro} ${summary}`.trim();
  if (!recommendation) return base;
  return `${base} ${recommendation}`;
}

function valuesIdentitySummaryText(report: SessionAlignmentReport, includeValues: boolean) {
  if (!includeValues) return null;
  const a = report.valuesIdentityCategoryA;
  const b = report.valuesIdentityCategoryB;
  const category = a && b ? (a === b ? a : "komplementäre Wertearchitektur") : a ?? b;
  if (!category) return null;
  return `Besonderes Merkmal: Eure Werte-Identität zeigt eine ${category}. Das ist eine starke Basis für langfristiges Vertrauen.`;
}

function executiveRecommendation(report: SessionAlignmentReport) {
  if (!report.comparisonEnabled) return null;
  const deltas = REPORT_DIMENSIONS.map((dimension) => {
    const a = report.scoresA[dimension];
    const b = report.scoresB[dimension];
    if (a == null || b == null) return null;
    return { dimension, delta: Math.abs(a - b) };
  }).filter((item): item is { dimension: ReportDimension; delta: number } => item != null);

  if (deltas.length === 0) return null;
  const highestAlignment = [...deltas].sort((x, y) => x.delta - y.delta)[0]?.dimension;
  const biggestDifference = [...deltas].sort((x, y) => y.delta - x.delta)[0]?.dimension;
  if (!highestAlignment || !biggestDifference) return null;
  return `Empfehlung: Nutzt eure Stärke im Bereich ${executiveDimensionLabel(
    highestAlignment
  )} als Hebel und definiert für den Bereich ${executiveDimensionLabel(
    biggestDifference
  )} klare gemeinsame Spielregeln.`;
}

function executiveDimensionLabel(dimension: ReportDimension) {
  if (dimension === "Risiko") return "Risikoprofil";
  return dimension;
}

function teamTypeLabel(report: SessionAlignmentReport) {
  if (!report.comparisonEnabled) return null;
  const deltas = REPORT_DIMENSIONS.map((dimension) => {
    const a = report.scoresA[dimension];
    const b = report.scoresB[dimension];
    if (a == null || b == null) return null;
    return Math.abs(a - b);
  }).filter((value): value is number => value != null);

  if (deltas.length === 0) return null;
  const strongComplementary = deltas.filter((delta) => delta > 2.0).length;
  const lowSpread = deltas.every((delta) => delta < 1.0);

  if (lowSpread) return "Typ: Die Harmonischen Stabilisatoren";
  if (strongComplementary >= 3) return "Typ: Das High-Friction Power-Duo";
  return "Typ: Die balancierten Strategen";
}

function buildSystemicCoherence(
  compareJson: ReturnType<typeof generateCompareReport>,
  nameA: string,
  nameB: string
) {
  const sorted = [...compareJson.deepDive].sort((a, b) => (b.diff ?? 0) - (a.diff ?? 0));
  const biggest = sorted[0];
  const second = sorted[1];
  const smallest = [...compareJson.deepDive].sort((a, b) => (a.diff ?? 99) - (b.diff ?? 99))[0];
  const overview =
    compareJson.executiveSummary.summaryType === "Das High-Friction Power-Duo"
      ? `${nameA} und ${nameB} bringen ein komplementäres Setup mit hoher Dynamik. Das Potenzial ist groß, wenn Rollen und Entscheidungslogik sauber geklärt sind.`
      : compareJson.executiveSummary.summaryType === "Die Harmonischen Stabilisatoren"
      ? `${nameA} und ${nameB} zeigen ein kohärentes Arbeitsmuster mit niedriger Reibung. Das schafft Geschwindigkeit in der Umsetzung.`
      : `${nameA} und ${nameB} kombinieren gemeinsame Basis mit klaren Unterschieden. Das ist robust, wenn Spannungen aktiv moderiert werden.`;

  const points = [
    smallest
      ? `Stabilitätsanker: In ${smallest.dimension} ist eure Abstimmung besonders hoch.`
      : "Stabilitätsanker: Eure Grundausrichtung ist über mehrere Dimensionen hinweg tragfähig.",
    biggest
      ? `Hauptspannung: ${biggest.dimension} ist aktuell euer wichtigstes Koordinationsthema.`
      : "Hauptspannung: Definiert ein klares Feld, in dem ihr Spielregeln priorisiert.",
    second
      ? `Sekundärthema: Auch ${second.dimension} sollte früh mit klaren Regeln hinterlegt werden.`
      : "Sekundärthema: Legt ein zweites Prioritätsfeld für gezielte Abstimmung fest.",
  ];

  return { overview, points };
}

function buildExecutiveDecisionSupport(compareJson: ReturnType<typeof generateCompareReport>) {
  const tensions = [...compareJson.deepDive]
    .sort((a, b) => (b.diff ?? 0) - (a.diff ?? 0))
    .slice(0, 2)
    .map((item) => item.dimension);
  const matches = [...compareJson.deepDive]
    .sort((a, b) => (a.diff ?? 99) - (b.diff ?? 99))
    .slice(0, 2)
    .map((item) => item.dimension);

  return [
    matches[0]
      ? `Startet operativ in ${matches[0]}: Dort habt ihr geringe Reibung und schnelle Entscheidungsfähigkeit.`
      : "Startet operativ in einem Feld mit hoher Übereinstimmung, um Momentum aufzubauen.",
    tensions[0]
      ? `Setzt für ${tensions[0]} eine explizite Entscheidungsregel (Wer entscheidet wann, mit welchen Kriterien).`
      : "Setzt früh eine verbindliche Entscheidungsregel für euer kritischstes Thema.",
    tensions[1]
      ? `Definiert für ${tensions[1]} einen festen Check-in-Rhythmus, damit Spannungen nicht im Alltag eskalieren.`
      : "Legt einen fixen Review-Rhythmus fest, um Spannungen früh sichtbar zu machen.",
    "Review nach 4 Wochen: Was funktioniert in der Zusammenarbeit, was braucht strukturelle Nachschärfung?",
  ];
}

function buildPremiumValuesSection(
  report: SessionAlignmentReport,
  nameA: string,
  nameB: string
) {
  const tier = resolveValuesTier(report.valuesAlignmentPercent);
  const tierPack = VALUES_REPORT_CONTENT.tiers[tier];
  const key = pairKey(report.valuesIdentityCategoryA, report.valuesIdentityCategoryB);
  const pairNarrative =
    VALUES_REPORT_CONTENT.pairing[key as keyof typeof VALUES_REPORT_CONTENT.pairing] ??
    `${nameA} und ${nameB} zeigen im Werteprofil eine komplementäre Perspektive. Mit klaren Leitlinien kann diese Differenz zu einer strategischen Stärke werden.`;
  const identityA = report.valuesIdentityCategoryA
    ? VALUES_PLAYBOOK[normalizeValuesPlaybookKey(report.valuesIdentityCategoryA)].identity
    : null;
  const identityB = report.valuesIdentityCategoryB
    ? VALUES_PLAYBOOK[normalizeValuesPlaybookKey(report.valuesIdentityCategoryB)].identity
    : null;

  return {
    executiveReadout:
      tier === "symbiose"
        ? `${nameA} und ${nameB} zeigen ein sehr kohärentes Wertefundament mit hoher Entscheidungskonsistenz.`
        : tier === "schnittmenge"
        ? `${nameA} und ${nameB} teilen eine tragfähige Wertebasis mit punktuellem Abstimmungsbedarf in der Umsetzung.`
        : `${nameA} und ${nameB} bringen komplementäre Werteperspektiven mit, die klare Leitplanken in kritischen Entscheidungen erfordern.`,
    intro: `${tierPack.intro}${
      identityA && identityB ? ` ${nameA}: ${identityA} ${nameB}: ${identityB}` : ""
    }`,
    pairNarrative: `${pairNarrative} Besonders relevant ist, wie ihr Zielkonflikte zwischen Wirkung, Verantwortung und wirtschaftlicher Machbarkeit gemeinsam priorisiert.`,
    shared: [
      ...tierPack.shared,
      "Es gibt eine belastbare Ausgangsbasis, um Wertediskussionen im Alltag strukturiert und ohne Eskalation zu führen.",
    ],
    tensions: [
      ...tierPack.tensions,
      "Definiert vorab, wie ihr in ethisch ambivalenten Situationen entscheidet, damit unter Zeitdruck keine impliziten Wertedifferenzen dominieren.",
    ],
    question: tierPack.question,
  };
}

function resolveValuesTier(percent: number | null): keyof typeof VALUES_REPORT_CONTENT.tiers {
  if (percent == null) return "schnittmenge";
  if (percent >= 85) return "symbiose";
  if (percent >= 65) return "schnittmenge";
  return "spannungsfeld";
}

function pairKey(a: string | null, b: string | null) {
  const left = a ?? "Verantwortungs-Stratege";
  const right = b ?? "Verantwortungs-Stratege";
  return [left, right].sort((x, y) => x.localeCompare(y, "de")).join("|");
}

function normalizeValuesPlaybookKey(
  value: string
): keyof typeof VALUES_PLAYBOOK {
  const normalized = value.toLowerCase();
  if (normalized.includes("impact")) return "impact_idealist";
  if (normalized.includes("business")) return "business_pragmatiker";
  return "verantwortungs_stratege";
}

function buildCriticalClarificationTopics(compareJson: ReturnType<typeof generateCompareReport>) {
  const ranked = [...compareJson.deepDive]
    .sort((a, b) => (b.diff ?? 0) - (a.diff ?? 0))
    .slice(0, 3);
  if (ranked.length === 0) {
    return ["Was ist aus eurer Sicht das kritischste Thema, das ihr vor dem nächsten Quartal klären müsst?"];
  }
  return ranked.map(
    (item) =>
      `${item.dimension}: ${item.reflectionQuestion}`
  );
}

function buildDimensionDeepeningQuestions(compareJson: ReturnType<typeof generateCompareReport>) {
  const generic = [
    "Wie treffen wir Entscheidungen, wenn wir uns nicht einig sind, und wer hat bei welchen Themen das letzte Wort?",
    "Welche Erwartungen haben wir an Erreichbarkeit, Arbeitsrhythmus und Eskalation bei Verzögerungen?",
  ];
  const dimensionQuestions = compareJson.deepDive.map(
    (item) => `${item.dimension}: ${item.reflectionQuestion}`
  );
  return [...generic, ...dimensionQuestions].slice(0, 8);
}

function buildFinalClassification(compareJson: ReturnType<typeof generateCompareReport>) {
  const tensions = compareJson.executiveSummary.topTensions.slice(0, 2);
  const matches = compareJson.executiveSummary.topMatches.slice(0, 2);
  const matchText = matches.length > 0 ? matches.join(" und ") : "mehreren Kernfeldern";
  const tensionText = tensions.length > 0 ? tensions.join(" und ") : "einem priorisierten Spannungsfeld";
  const summary = `Eure Zusammenarbeit zeigt eine belastbare Basis in ${matchText} bei gleichzeitigem Klärungsbedarf in ${tensionText}.`;
  const implication =
    compareJson.executiveSummary.summaryType === "Das High-Friction Power-Duo"
      ? "Mit klaren Rollen, belastbaren Eskalationswegen und festen Check-ins kann aus hoher Reibung gezielte Wirkung entstehen."
      : compareJson.executiveSummary.summaryType === "Die Harmonischen Stabilisatoren"
      ? "Nutzt eure hohe Kohärenz als Beschleuniger, ohne kritische Themen zu lange aufzuschieben."
      : "Eure Mischung aus Nähe und Unterschied wird dann zum Vorteil, wenn Regeln früh explizit vereinbart werden.";
  return { summary, implication };
}

function SectionTitle({
  title,
  tone,
}: {
  title: string;
  tone: "cyan" | "violet" | "neutral";
}) {
  const toneClass =
    tone === "cyan"
      ? "from-[#00B8D9] to-[#00B8D9]/70"
      : tone === "violet"
      ? "from-[#7C3AED] to-[#7C3AED]/70"
      : "from-[#00B8D9] to-[#7C3AED]";
  const labelClass =
    tone === "cyan"
      ? "border-[#00B8D9]/35 bg-[#00B8D9]/14 text-[#0B6E88]"
      : tone === "violet"
      ? "border-[#7C3AED]/35 bg-[#7C3AED]/14 text-[#4A1EA0]"
      : "border-slate-300 bg-slate-100 text-slate-700";
  return (
    <h2 className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
      <span className={`inline-flex h-2.5 w-2.5 rounded-full bg-gradient-to-r ${toneClass}`} />
      <span className={`rounded-md border px-2.5 py-1 ${labelClass}`}>{title}</span>
    </h2>
  );
}

function ExecutiveCard({
  title,
  text,
  tone,
}: {
  title: string;
  text: string;
  tone: "cyan" | "violet" | "neutral";
}) {
  const toneClass =
    tone === "cyan"
      ? "border-[#00B8D9]/30 bg-[#00B8D9]/10"
      : tone === "violet"
      ? "border-[#7C3AED]/30 bg-[#7C3AED]/10"
      : "border-slate-200 bg-slate-50";
  const titleClass =
    tone === "cyan" ? "text-[#0B6E88]" : tone === "violet" ? "text-[#5B21B6]" : "text-slate-700";
  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClass}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${titleClass}`}>{title}</p>
      <p className="mt-1 text-sm leading-7 text-slate-700">{text}</p>
    </div>
  );
}

function QuestionBadge() {
  return (
    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#7C3AED]/35 bg-gradient-to-r from-[#00B8D9]/20 to-[#7C3AED]/20 text-[11px] font-semibold leading-none text-[#4A1EA0]">
      ?
    </span>
  );
}

function buildExecutivePreview({
  compareJson,
  executiveSummaryParagraph,
  recommendation,
  valuesIdentitySummary,
}: {
  compareJson: ReturnType<typeof generateCompareReport>;
  executiveSummaryParagraph: string;
  recommendation: string | null;
  valuesIdentitySummary: string | null;
}) {
  const topMatch = compareJson.executiveSummary.topMatches[0] ?? "zentrale Felder";
  const topTension = compareJson.executiveSummary.topTensions[0] ?? "ein priorisiertes Spannungsfeld";
  return {
    core: executiveSummaryParagraph,
    leverage: `Eure stärkste gemeinsame Basis liegt aktuell in ${topMatch}. Das gibt euch hohe Anschlussfähigkeit in operativen Entscheidungen und reduziert Abstimmungsverluste in kritischen Momenten.`,
    risk: `Das größte Reibungsrisiko liegt derzeit in ${topTension}. Wenn Erwartungen hier nicht explizit geklärt sind, entstehen unter Zeitdruck wiederkehrende Musterkonflikte und unnötige Verzögerungen.`,
    nextStep:
      recommendation ??
      valuesIdentitySummary ??
      "Definiert für das größte Spannungsfeld eine klare Entscheidungs- und Eskalationsregel.",
  };
}

function buildPrioritizedConversationGuide(
  criticalClarificationTopics: string[],
  dimensionDeepeningQuestions: string[]
) {
  const now = [...criticalClarificationTopics].slice(0, 2);
  const preStart = [...criticalClarificationTopics].slice(2, 3).concat(dimensionDeepeningQuestions.slice(0, 1));
  const review30 = [...dimensionDeepeningQuestions].slice(1);
  return { now, preStart, review30 };
}

function dimensionSynthesis(
  block: ReturnType<typeof generateCompareReport>["deepDive"][number],
  nameA: string,
  nameB: string
) {
  if (block.label === "MATCH") {
    return `${nameA} und ${nameB} zeigen in ${block.dimension} eine hohe psychologische und operative Passung. Dadurch sinkt die Wahrscheinlichkeit wiederkehrender Erwartungskonflikte deutlich und Entscheidungen werden schneller anschlussfähig. Nutzt diese Übereinstimmung aktiv als Stabilitätshebel in Phasen mit hoher Dynamik.`;
  }
  if (block.label === "KOMPLEMENTAER") {
    return `${nameA} und ${nameB} bringen in ${block.dimension} unterschiedliche, komplementäre Arbeitslogiken ein. Diese Differenz kann die Entscheidungsqualität erhöhen, sofern Erwartungen, Zuständigkeiten und Eskalationswege explizit geklärt sind. Ohne diesen Rahmen wird aus Ergänzung schnell Reibung.`;
  }
  return `In ${block.dimension} liegt ein zentrales Fokus-Thema mit erhöhter Konfliktwahrscheinlichkeit: ${nameA} und ${nameB} priorisieren unterschiedliche Pole. Unter Zeitdruck entstehen hier ohne gemeinsame Steuerungslogik wiederkehrende Musterkonflikte. Mit klaren Entscheidungsrechten, festen Eskalationswegen und kurzen Feedback-Loops wird dieser Unterschied zu einem strategischen Vorteil gegen blinde Flecken.`;
}

function dimensionTakeaway(
  block: ReturnType<typeof generateCompareReport>["deepDive"][number],
  nameA: string,
  nameB: string
) {
  const mode = block.label;
  switch (block.dimension) {
    case "Vision":
      if (mode === "MATCH") {
        return `${nameA} und ${nameB} können die Wachstumsrichtung schnell synchron halten. Legt ein gemeinsames 12-Monats-Zielbild mit klaren KPI-Leitplanken fest, damit operative Prioritäten konsistent bleiben.`;
      }
      if (mode === "KOMPLEMENTAER") {
        return `Nutzt eure unterschiedlichen Wachstumsimpulse bewusst als Qualitätssicherung: eine Person challengt Tempo, die andere Substanz. Definiert vorab, wann Marktanteil Vorrang hat und wann Profitabilität priorisiert wird.`;
      }
      return `Setzt für Vision sofort eine verbindliche Entscheidungsregel auf (z. B. KPI-basierter Go/No-Go-Frame), sonst entstehen wiederkehrende Grundsatzkonflikte bei Budget, Hiring und Roadmap.`;
    case "Entscheidung":
      if (mode === "MATCH") {
        return `Euer Entscheidungsstil ist kompatibel. Verankert einen klaren Standard für schnelle Entscheidungen (Owner, Deadline, Review), damit ihr Geschwindigkeit ohne Qualitätsverlust skaliert.`;
      }
      if (mode === "KOMPLEMENTAER") {
        return `Kombiniert Analyse und Tempo über einen Zwei-Stufen-Prozess: erst kurzer Faktencheck, dann klare Owner-Entscheidung mit Review-Fenster. So profitiert ihr von beiden Stilen ohne Blockade.`;
      }
      return `Definiert eine verbindliche Entscheidungsmatrix (welche Themen datengetrieben, welche zeitkritisch-intuitiv), damit Konflikte nicht in jedem Sprint neu verhandelt werden.`;
    case "Risiko":
      if (mode === "MATCH") {
        return `Ihr habt ein ähnliches Risikoverständnis. Nutzt das für ein robustes Runway-Management mit klaren Triggern, ab wann ihr offensiver investiert oder konsequent absichert.`;
      }
      if (mode === "KOMPLEMENTAER") {
        return `Eure Differenz kann ein starkes Sicherheitsplus sein, wenn ihr gemeinsame Risikoschwellen definiert. Setzt verbindliche Leitplanken für Cash, Hiring und Experimente, damit Chancen und Stabilität zusammenwirken.`;
      }
      return `Risikoprofil ist euer kritischer Hebel: Ohne klare Limits für Wagnisse vs. Absicherung steigt die Gefahr von Vertrauensverlust bei Krisenentscheidungen. Priorisiert dieses Thema vor dem nächsten Wachstumsschritt.`;
    case "Autonomie":
      if (mode === "MATCH") {
        return `Eure Zusammenarbeit ist strukturell anschlussfähig. Haltet trotzdem minimale Team-Routinen fest (Statusrhythmus, Übergaben, Eskalationskanal), damit mit wachsender Last keine Informationslücken entstehen.`;
      }
      if (mode === "KOMPLEMENTAER") {
        return `Koppelt Autonomie an klare Schnittstellen: wer entscheidet allein, wann ist Abstimmung Pflicht, wie werden Abhängigkeiten sichtbar. So bleibt Freiheit produktiv statt widersprüchlich.`;
      }
      return `Hier braucht ihr sofort ein Betriebsmodell mit festen Kommunikations- und Übergaberegeln. Sonst erlebt eine Person Kontrollverlust und die andere Mikrosteuerung - beides senkt Tempo und Vertrauen.`;
    case "Verbindlichkeit":
      if (mode === "MATCH") {
        return `Ihr habt eine solide Basis für Verlässlichkeit. Macht sie belastbar mit klaren Eskalationsregeln bei Verzögerungen und einem einheitlichen Deadlinestandard über alle Verantwortungsbereiche.`;
      }
      if (mode === "KOMPLEMENTAER") {
        return `Klärt verbindlich, was bei euch ein 'Commitment' ist und wann ein Re-Plan legitim wird. Diese Transparenz verhindert stille Frustration und schützt eure Teamkultur unter Last.`;
      }
      return `Verbindlichkeit ist ein Fokus-Thema mit direkter Wirkung auf Vertrauen. Definiert sofort gemeinsame Qualitäts- und Deadline-Regeln inklusive Eskalationspflicht, bevor operative Reibung eskaliert.`;
    case "Konflikt":
      if (mode === "MATCH") {
        return `Eure Konfliktlogik ist kompatibel und kann schnelle Klärung ermöglichen. Sichert das mit klaren Gesprächsregeln, damit Direktheit konstruktiv bleibt und Spannungen nicht personalisiert werden.`;
      }
      if (mode === "KOMPLEMENTAER") {
        return `Verbindet Klartext mit Beziehungsschutz über ein kurzes Konfliktprotokoll (Anlass, Wirkung, Lösung, Follow-up). So bleibt Reibung produktiv und kippt nicht in Rückzug oder Eskalation.`;
      }
      return `Konfliktkultur ist aktuell euer sensibelstes Feld. Ohne klare Spielregeln für Timing, Ton und Eskalation drohen wiederkehrende Musterkonflikte - priorisiert diese Leitplanken früh und explizit.`;
  }
}

function detailedDailyPressure(
  block: ReturnType<typeof generateCompareReport>["deepDive"][number],
  nameA: string,
  nameB: string
) {
  const diff = block.diff ?? 0;
  const dimension = block.dimension;
  if (diff < 1.0) {
    return `${block.dailyPressure} Unter operativem Druck treffen ${nameA} und ${nameB} in diesem Feld meist kohärente Entscheidungen, weil ähnliche Prioritäten wirken. Das reduziert Abstimmungskosten und erhöht die Verlässlichkeit im Tagesgeschäft. Ein kurzer Regel-Check in Wachstumsphasen hält diese Passung auch bei steigender Komplexität stabil.`;
  }
  if (diff <= 2.0) {
    return `${block.dailyPressure} In Stressphasen kann es in ${dimension} zu punktuellen Irritationen kommen, weil unterschiedliche Referenzrahmen aufeinandertreffen. Typisch sind Verzögerungen durch Nachkalibrierung von Erwartungen, nicht durch fehlende Kompetenz. Mit klaren Rollen, Entscheidungstiefe und Kommunikationsrhythmus wird diese Differenz zu einem produktiven Korrektiv.`;
  }
  return `${block.dailyPressure} In hochdynamischen Phasen ist ${dimension} bei ${nameA} und ${nameB} ein wahrscheinlicher Auslöser wiederkehrender Reibungsmuster. Ohne klare Struktur werden dieselben Konflikte häufig in neuer Form reproduziert und belasten Vertrauen sowie Umsetzungstempo. Verbindliche Entscheidungsrechte, klare Eskalationsfenster und ein kurzer Debrief nach kritischen Situationen machen dieses Spannungsfeld nutzbar.`;
}

function DebugParticipantBlock({
  title,
  data,
}: {
  title: string;
  data?: SessionAlignmentReport["debugA"];
}) {
  if (!data) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">{title}</h3>
      <div className="mt-3 space-y-3">
        {data.dimensions.map((entry) => (
          <div key={entry.dimension} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{entry.dimension}</p>
            <p className="mt-1 text-sm text-slate-700">
              Raw Score: {entry.rawScore != null ? entry.rawScore.toFixed(2) : "n/a"} · Normalized:{" "}
              {entry.normalizedScore != null ? entry.normalizedScore.toFixed(2) : "n/a"} · Kategorie:{" "}
              {entry.category ?? "n/a"}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Fragen:{" "}
              {entry.questions.length > 0
                ? entry.questions
                    .map((q) => `${q.questionId}=${q.value} (max ${q.max}, norm ${q.normalized.toFixed(2)})`)
                    .join(", ")
                : "keine Antworten"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function dimensionIcon(dimension: ReportDimension) {
  switch (dimension) {
    case "Vision":
      return TargetIcon;
    case "Entscheidung":
      return ZapIcon;
    case "Risiko":
      return ShieldIcon;
    case "Autonomie":
      return UsersIcon;
    case "Verbindlichkeit":
      return AwardIcon;
    case "Konflikt":
      return MessageSquareIcon;
  }
}

type IconProps = { className?: string };

function TargetIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

function ZapIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
    </svg>
  );
}

function ShieldIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 3 5 6v6c0 5 3.4 8.6 7 9.9 3.6-1.3 7-4.9 7-9.9V6z" />
    </svg>
  );
}

function UsersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" />
      <path d="M14 19c0-2.1 1.6-3.7 4-4" />
    </svg>
  );
}

function AwardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="m9.5 12.8-1.3 7.2L12 17.8l3.8 2.2-1.3-7.2" />
    </svg>
  );
}

function MessageSquareIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M21 14a4 4 0 0 1-4 4H8l-5 3V6a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </svg>
  );
}
