"use client";

import {
  deleteSessionAction,
  getMySessionResponsesAction,
  restoreResponsesToSessionAction,
} from "@/app/(product)/dashboard/actions";
import { StartSessionButton } from "@/features/dashboard/StartSessionButton";
import { AlignmentRadarChart } from "@/features/reporting/AlignmentRadarChart";
import { KeyInsights } from "@/features/reporting/KeyInsights";
import { TeamMatchingPanel } from "@/features/reporting/TeamMatchingPanel";
import {
  buildProfileResultFromSession,
  createMockProfileResult,
  generateCompareReport,
} from "@/features/reporting/generateCompareReport";
import {
  type RadarSeries,
  type SessionAlignmentReport,
} from "@/features/reporting/types";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type FeaturedItem = {
  sessionId: string;
  status: "not_started" | "in_progress" | "waiting" | "ready" | "match_ready" | "completed";
  createdAt: string;
  analysisAt: string;
  myRole: "A" | "B" | "partner" | null;
  canInvite: boolean;
  participantAUser: boolean;
  participantBUser: boolean;
  outboundInvites: Array<{
    sessionId: string;
    invitedEmail: string;
    invitedAt: string | null;
    status: "offen" | "in_bearbeitung" | "abgeschlossen";
  }>;
  report: SessionAlignmentReport | null;
};

type SessionResponseRow = {
  questionId: string;
  prompt: string;
  dimension: string | null;
  category: string | null;
  type: string | null;
  choiceValue: string;
  choiceLabel: string | null;
  sortOrder: number | null;
  answeredAt: string | null;
};

type Props = {
  activeItem: (FeaturedItem & { progressBasis: number }) | null;
  currentItem: FeaturedItem | null;
  pastItems: FeaturedItem[];
  staleInvite: {
    fromSessionId: string;
    invitedEmail: string;
    invitedAt: string | null;
  } | null;
  error?: string;
};

export function DashboardComparisonWorkspace({
  activeItem,
  currentItem,
  pastItems,
  staleInvite,
  error,
}: Props) {
  const [isDemoMode, setIsDemoMode] = useState(false);

  const liveItem = useMemo(
    () =>
      currentItem
        ? {
            ...currentItem,
            report: currentItem.report ? buildEffectiveReport(currentItem.report, isDemoMode) : null,
          }
        : null,
    [currentItem, isDemoMode]
  );

  const archivedItems = useMemo(
    () =>
      pastItems.map((item) => ({
        ...item,
        report: item.report ? buildEffectiveReport(item.report, isDemoMode) : null,
      })),
    [pastItems, isDemoMode]
  );

  return (
    <>
      <section className="mb-14 rounded-2xl border border-slate-200/80 bg-white/95 p-10">
        <h2 className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Neue Analyse starten</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Starte eine neue Basis-Analyse und lade danach gezielt Person B für den Vergleich ein.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <StartSessionButton />
          <button
            type="button"
            onClick={() => setIsDemoMode((prev) => !prev)}
            className={`rounded-lg border px-4 py-3 text-sm ${
              isDemoMode
                ? "border-violet-300 bg-violet-50 text-violet-700"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            Demo-Vergleich {isDemoMode ? "aus" : "an"}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-red-700">Aktion fehlgeschlagen: {error}</p> : null}
      </section>

      {activeItem && activeItem.progressBasis < 36 ? <ActiveInProgressCard item={activeItem} /> : null}

      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Analyseübersicht</h2>
          <span className="text-xs tracking-[0.08em] text-slate-500">
            Aktive und abgeschlossene Reports im direkten Zugriff
          </span>
        </div>

        {!liveItem ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-8 text-sm leading-7 text-slate-600">
            Noch keine auswertbare Analyse vorhanden. Starte oben eine neue Session.
          </div>
        ) : (
          <div className="space-y-10">
            <ReportCard
              item={liveItem}
              isDemoMode={isDemoMode}
              isArchived={false}
              staleInvite={staleInvite}
            />
            {archivedItems.length > 0 ? (
              <details className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
                <summary className="cursor-pointer text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Vergangene Analysen
                </summary>
                <div className="mt-6 divide-y divide-slate-200/80">
                  {archivedItems.map((item) => (
                    <ArchiveRow
                      key={item.sessionId}
                      item={item}
                      isDemoMode={isDemoMode}
                      restoreTargetSessionId={currentItem?.sessionId ?? null}
                    />
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        )}
      </section>
    </>
  );
}

function ActiveInProgressCard({ item }: { item: FeaturedItem & { progressBasis: number } }) {
  const progress = Math.max(0, Math.min(36, item.progressBasis));
  const percentage = Math.round((progress / 36) * 100);
  const continueHref = item.myRole === "B" || item.myRole === "partner"
    ? `/session/${item.sessionId}/b`
    : `/session/${item.sessionId}/a`;

  return (
    <section className="mb-12 rounded-2xl border border-violet-200 bg-violet-50/40 p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold tracking-[0.12em] text-slate-900">Aktuelle Analyse in Bearbeitung</h3>
          <p className="mt-2 text-xs tracking-[0.08em] text-slate-600">
            Stand: {progress}/36 Fragen · Start: {formatDate(item.analysisAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={continueHref}
            className="inline-flex rounded-lg border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-medium tracking-[0.08em] text-white"
          >
            Weiterarbeiten
          </a>
          <ArchiveDeleteButton sessionId={item.sessionId} />
        </div>
      </div>
        <div className="mt-4 h-2 w-full rounded-full bg-slate-200">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-[#00B8D9] to-[#7C3AED]"
            style={{ width: `${percentage}%` }}
          />
        </div>
    </section>
  );
}

function ReportCard({
  item,
  isDemoMode,
  isArchived,
  staleInvite,
}: {
  item: FeaturedItem;
  isDemoMode: boolean;
  isArchived: boolean;
  staleInvite: {
    fromSessionId: string;
    invitedEmail: string;
    invitedAt: string | null;
  } | null;
}) {
  const [isResponsesOpen, setIsResponsesOpen] = useState(false);
  const [isResponsesLoading, setIsResponsesLoading] = useState(false);
  const [responsesError, setResponsesError] = useState<string | null>(null);
  const [responsesRole, setResponsesRole] = useState<string | null>(null);
  const [responsesRows, setResponsesRows] = useState<SessionResponseRow[] | null>(null);

  if (!item.report) {
    return (
      <article className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs tracking-[0.06em] text-slate-500">Erstellt am: {formatDate(item.createdAt)}</p>
          {isArchived ? <ArchiveDeleteButton sessionId={item.sessionId} /> : null}
        </div>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Report-Daten konnten für diese Analyse nicht geladen werden.
        </p>
      </article>
    );
  }

  const report = item.report;
  const valuesTotal = report.valuesTotal > 0 ? report.valuesTotal : 10;
  const valuesCompletedA = valuesTotal > 0 && report.valuesAnsweredA >= valuesTotal;
  const valuesCompletedB = valuesTotal > 0 && report.valuesAnsweredB >= valuesTotal;
  const valuesCompletedBoth = valuesCompletedA && valuesCompletedB;
  const addOnRequested = report.requestedScope === "basis_plus_values";
  const chartParticipants = [
    {
      id: "a",
      label: report.participantAName,
      color: "#00B8D9",
      scores: report.scoresA,
    },
    ...(report.comparisonEnabled
      ? [
          {
            id: "b",
            label: report.participantBName ?? "Teilnehmer B",
            color: "#7C3AED",
            scores: report.scoresB,
          },
        ]
      : []),
  ];

  const statusDateLabel =
    report.personBStatus === "match_ready"
      ? `Matching abgeschlossen am: ${formatDate(report.personBCompletedAt ?? item.createdAt)}`
      : report.personBInvitedAt
      ? `Einladung versendet am: ${formatDate(report.personBInvitedAt)}`
      : "Einladung noch nicht versendet";
  const isTeamMatchingActive = report.personBStatus !== "match_ready";
  const isPremium = valuesTotal === 10 && valuesCompletedA;
  const reportTypeLabel = isPremium ? "Basis + Werte-Kern" : "Basis";
  const snapshot = buildDashboardSnapshot(report);
  const showComparisonSnapshot = report.personBStatus === "match_ready";
  const showComparisonSection = Boolean(report.personBInvitedAt) || showComparisonSnapshot || isDemoMode;

  const openResponses = async () => {
    setIsResponsesOpen((prev) => !prev);
    if (responsesRows !== null) {
      return;
    }
    setResponsesError(null);
    setIsResponsesLoading(true);
    const result = await getMySessionResponsesAction(item.sessionId);
    setIsResponsesLoading(false);

    if (!result.ok) {
      setResponsesError(result.error);
      setResponsesRows([]);
      return;
    }

    setResponsesRows(result.rows);
    setResponsesRole(result.role);
  };

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white/95 p-10">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-[0.12em] text-slate-900">
          Analyse · {sessionStatusLabel(item.status)}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs tracking-[0.06em] text-slate-500">
            Ausgefüllt am: {formatDate(report.personACompletedAt ?? item.analysisAt)}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">
            Report: {reportTypeLabel}
          </span>
          {isPremium ? (
            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-cyan-700">
              Premium: Inkl. Werte-Kern
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-4">
          <AlignmentRadarChart participants={chartParticipants} />
          {item.participantAUser && report.personACompleted ? (
            <section className="rounded-2xl border border-cyan-200/70 bg-gradient-to-r from-cyan-50/70 to-violet-50/40 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                Einzelreport
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                Kompakter Erst-Einblick in dein Profil mit den zentralen Musterfeldern deiner aktuellen Analyse.
              </p>
              <a
                href={`/report/${item.sessionId}/individual`}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-cyan-300 bg-white px-3 py-2 text-xs font-semibold tracking-[0.08em] text-cyan-800 hover:bg-cyan-50"
              >
                <span aria-hidden>📄</span>
                Eigenen Report öffnen
              </a>
              {!isArchived ? (
                <button
                  type="button"
                  onClick={openResponses}
                  className="mt-3 ml-2 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium tracking-[0.08em] text-slate-800 hover:bg-slate-50"
                >
                  <span aria-hidden>🧾</span>
                  {isResponsesOpen ? "Meine Antworten ausblenden" : "Meine Antworten ansehen"}
                </button>
              ) : null}
            </section>
          ) : null}
        </div>
        <div className="space-y-4">
          <KeyInsights insights={report.keyInsights} />
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_auto]">
        <div
          className={
            isTeamMatchingActive
              ? "rounded-2xl border border-violet-200 bg-violet-50/20 p-1"
              : ""
          }
        >
          <TeamMatchingPanel
            sessionId={item.sessionId}
            canInvite={item.canInvite}
            status={report.personBStatus}
            statusDateLabel={statusDateLabel}
            analysisDateLabel={`Analyse vom: ${formatDate(report.personACompletedAt ?? item.analysisAt)}`}
            partnerName={report.personBStatus === "match_ready" ? report.participantBName : null}
            reportHref={`/report/${item.sessionId}${isDemoMode ? "?demo=1" : ""}`}
            demoReportHref={`/report/${item.sessionId}?demo=1`}
            requestedScope={report.requestedScope}
            inviteConsentCaptured={report.inviteConsentCaptured}
            valuesAnsweredA={report.valuesAnsweredA}
            valuesAnsweredB={report.valuesAnsweredB}
            valuesTotal={valuesTotal}
            outboundInvites={item.outboundInvites}
            staleInvite={
              !isArchived &&
              report.personBStatus !== "match_ready" &&
              !report.personBInvitedAt &&
              staleInvite
                ? {
                    invitedEmail: staleInvite.invitedEmail,
                    invitedAt: staleInvite.invitedAt,
                  }
                : null
            }
          />
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Report-Links</p>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-700">
            <span>
              {valuesCompletedA
                ? "Werte-Profil A: Vollständig"
                : `Werte-Profil A: ${report.valuesAnsweredA}/${valuesTotal} abgeschlossen`}
            </span>
            {valuesCompletedA ? (
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700"
                aria-label="Werte-Profil vollständig"
                title="Werte-Profil vollständig"
              >
                ✓
              </span>
            ) : null}
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {item.participantBUser ? (
              <a
                href={`/session/${item.sessionId}/b`}
                className="block text-slate-700 underline decoration-slate-300 underline-offset-4"
              >
                Profil B öffnen
              </a>
            ) : null}
            <a
              href={`/session/${item.sessionId}/values`}
              className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium tracking-[0.08em] text-slate-700"
            >
              Werte-Vertiefung starten
            </a>
            {isArchived ? <ArchiveDeleteButton sessionId={item.sessionId} /> : null}
          </div>
        </div>
      </div>

      {showComparisonSection ? (
        <section className="mt-10 rounded-2xl border border-violet-200/70 bg-violet-50/20 p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700">
              Vergleich mit Person B
            </h4>
            <p className="text-xs tracking-[0.08em] text-slate-600">{statusDateLabel}</p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            {showComparisonSnapshot ? (
              <a
                href={`/report/${item.sessionId}${isDemoMode ? "?demo=1" : ""}`}
                className="inline-flex items-center gap-2 rounded-lg border border-violet-300 bg-violet-600 px-3 py-2 text-xs font-semibold tracking-[0.08em] text-white hover:bg-violet-700"
              >
                <span aria-hidden>📘</span>
                Match-Report öffnen (Basis)
              </a>
            ) : null}
            {showComparisonSnapshot && addOnRequested && valuesCompletedBoth ? (
              <a
                href={`/report/${item.sessionId}${isDemoMode ? "?demo=1" : ""}`}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-300 bg-cyan-600 px-3 py-2 text-xs font-semibold tracking-[0.08em] text-white hover:bg-cyan-700"
              >
                <span aria-hidden>⭐</span>
                Match-Report öffnen (Basis + Werte-Kern)
              </a>
            ) : null}
            {showComparisonSnapshot && addOnRequested && !valuesCompletedBoth ? (
              <span className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs tracking-[0.06em] text-cyan-800">
                Werte-Add-on angefordert: Vollreport wird aktiviert, sobald A und B jeweils 10/10 abgeschlossen haben.
              </span>
            ) : null}
            {!showComparisonSnapshot ? (
              <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs tracking-[0.06em] text-slate-600">
                Vergleich wird freigeschaltet, sobald Person B den Fragebogen abgeschlossen hat.
              </span>
            ) : null}
          </div>

          {showComparisonSnapshot ? (
            <details className="mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8" open>
              <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                Aufklappbares Ergebnis
              </summary>
              <div className="mt-4 space-y-3">
                <ExecutiveMiniCard title="Kernaussage" text={snapshot.core} tone="neutral" />
                <ExecutiveMiniCard title="Haupthebel" text={snapshot.leverage} tone="cyan" />
                <ExecutiveMiniCard title="Hauptrisiko" text={snapshot.risk} tone="violet" />
                <ExecutiveMiniCard title="Nächster Schritt" text={snapshot.nextStep} tone="neutral" />
              </div>
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  Priorisierte Gesprächspunkte
                </p>
                <ul className="mt-2 space-y-1.5 text-sm leading-7 text-slate-700">
                  {snapshot.guideNow.slice(0, 3).map((line) => (
                    <li key={line}>• {line}</li>
                  ))}
                </ul>
              </div>
            </details>
          ) : null}
        </section>
      ) : null}

      {!isArchived && isResponsesOpen ? (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
              Meine Antworten ({responsesRows?.length ?? 0})
            </h4>
            {responsesRole ? (
              <span className="text-[11px] uppercase tracking-[0.1em] text-slate-500">Rolle: {responsesRole}</span>
            ) : null}
          </div>
          {isResponsesLoading ? (
            <p className="text-sm text-slate-600">Antworten werden geladen...</p>
          ) : null}
          {!isResponsesLoading && responsesError ? (
            <p className="text-sm text-red-700">Antworten konnten nicht geladen werden: {responsesError}</p>
          ) : null}
          {!isResponsesLoading && !responsesError && (responsesRows?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-600">Für diese Session liegen noch keine Antworten vor.</p>
          ) : null}
          {!isResponsesLoading && !responsesError && (responsesRows?.length ?? 0) > 0 ? (
            <ul className="space-y-3">
              {responsesRows?.map((row) => (
                <li key={row.questionId} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.1em] text-slate-500">
                    {row.questionId}
                    {row.category ? ` · ${row.category}` : ""}
                    {row.dimension ? ` · ${row.dimension}` : ""}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-900">{row.prompt}</p>
                  <p className="mt-2 text-sm text-slate-700">
                    Antwort: <span className="font-medium">{row.choiceLabel ?? row.choiceValue}</span>
                    {row.choiceLabel ? (
                      <span className="text-slate-500"> (Wert {row.choiceValue})</span>
                    ) : null}
                  </p>
                  {row.answeredAt ? (
                    <p className="mt-1 text-xs text-slate-500">Gespeichert: {formatDateTime(row.answeredAt)}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}

function ArchiveRow({
  item,
  isDemoMode,
  restoreTargetSessionId,
}: {
  item: FeaturedItem;
  isDemoMode: boolean;
  restoreTargetSessionId: string | null;
}) {
  const typeLabel = item.status === "match_ready" ? "Team-Matching" : "Individual";
  const icon = item.status === "match_ready" ? "🤝" : "📄";
  const detailsHref =
    item.status === "completed" || item.status === "match_ready"
      ? `/report/${item.sessionId}${isDemoMode ? "?demo=1" : ""}`
      : `/session/${item.sessionId}/a`;

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden>{icon}</span>
        <span className="text-sm text-slate-700">{typeLabel}</span>
        <span className="text-sm text-slate-500">{formatDate(item.analysisAt)}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {restoreTargetSessionId && restoreTargetSessionId !== item.sessionId ? (
          <RestoreAnswersButton sourceSessionId={item.sessionId} targetSessionId={restoreTargetSessionId} />
        ) : null}
        <a
          href={detailsHref}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
        >
          <span aria-hidden>👁</span>
          Details
        </a>
        <ArchiveDeleteButton sessionId={item.sessionId} />
      </div>
    </div>
  );
}

function RestoreAnswersButton({
  sourceSessionId,
  targetSessionId,
}: {
  sourceSessionId: string;
  targetSessionId: string;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const onRestore = async () => {
    const confirmed = confirm(
      "Archiv-Antworten in die aktuelle Analyse übernehmen? Vorhandene Antworten in der Ziel-Analyse werden überschrieben."
    );
    if (!confirmed) return;

    setIsPending(true);
    const result = await restoreResponsesToSessionAction(sourceSessionId, targetSessionId);
    setIsPending(false);
    if (!result.ok) {
      alert(result.error ?? "Übernahme fehlgeschlagen.");
      return;
    }
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={onRestore}
      disabled={isPending}
      className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs text-cyan-800 hover:bg-cyan-100 disabled:opacity-60"
      title="Antworten in aktuelle Analyse übernehmen"
    >
      <span aria-hidden>↺</span>
      Antworten übernehmen
    </button>
  );
}

function buildEffectiveReport(report: SessionAlignmentReport, isDemoMode: boolean): SessionAlignmentReport {
  if (!isDemoMode) return report;

  const participantAName = report.participantAName || "Teilnehmer A";
  const participantBName = "Test-CoFounder";
  const scoresB = generateDemoScores(report.sessionId);
  const compareJson = generateCompareReport(
    buildProfileResultFromSession(report, "A"),
    createMockProfileResult("B", participantBName, scoresB, scoresB.Risiko ?? 3.5, "business_pragmatiker")
  );

  return {
    ...report,
    participantAName,
    participantBName,
    personBStatus: "match_ready",
    personBCompleted: true,
    requestedScope: "basis_plus_values",
    inviteConsentCaptured: true,
    comparisonEnabled: true,
    scoresB,
    keyInsights: compareJson.keyInsights.map((item, index) => ({
      dimension: item.dimension,
      title: item.title,
      text: item.text,
      priority: index,
    })),
    commonTendencies: compareJson.executiveSummary.topMatches.map(
      (dimension) =>
        `${participantAName} und ${participantBName} sind in ${dimension} gut aufeinander abgestimmt.`
    ),
    frictionPoints: compareJson.executiveSummary.topTensions.map(
      (dimension) => `In ${dimension} ist ein Fokus-Thema sichtbar.`
    ),
    conversationGuideQuestions: compareJson.conversationGuide,
  };
}

function generateDemoScores(seedSource: string): RadarSeries {
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

function formatDate(value: string | null) {
  if (!value) return "unbekannt";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unbekannt";
  return date.toLocaleDateString("de-DE");
}

function formatDateTime(value: string | null) {
  if (!value) return "unbekannt";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unbekannt";
  return `${date.toLocaleDateString("de-DE")} ${date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function sessionStatusLabel(status: FeaturedItem["status"]) {
  if (status === "completed" || status === "match_ready") return "Abgeschlossen";
  if (status === "waiting" || status === "ready") return "Einladung offen";
  return "In Bearbeitung";
}

function ExecutiveMiniCard({
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

function buildDashboardSnapshot(report: SessionAlignmentReport) {
  const pairs = (Object.keys(report.scoresA) as Array<keyof typeof report.scoresA>)
    .map((dimension) => {
      const a = report.scoresA[dimension];
      const b = report.scoresB[dimension];
      if (a == null || b == null) return null;
      return { dimension, delta: Math.abs(a - b) };
    })
    .filter((row): row is { dimension: keyof typeof report.scoresA; delta: number } => row != null)
    .sort((x, y) => y.delta - x.delta);

  const bestAligned = [...pairs].sort((x, y) => x.delta - y.delta)[0]?.dimension ?? "Vision";
  const largestDelta = pairs[0]?.dimension ?? "Vision";
  const nextStep = report.conversationGuideQuestions[0]
    ? `Klären: ${report.conversationGuideQuestions[0]}`
    : "Klären: Definiert Rollen, Entscheidungsrechte und Eskalationswege für das größte Fokus-Thema.";

  return {
    core: report.comparisonEnabled
      ? `Euer Match ist insgesamt ${
          report.personBStatus === "match_ready" ? "vollständig vergleichbar" : "in der Auswertung"
        } und zeigt eine belastbare Basis mit klaren Schwerpunktfeldern.`
      : "Dein Profil liefert eine belastbare Grundlage für den nächsten Matching-Schritt.",
    leverage: `Stärkster Hebel: Hohe Übereinstimmung im Bereich ${prettyDimension(bestAligned)}.`,
    risk: `Größtes Reibungsrisiko: Unterschiedliche Ausprägung in ${prettyDimension(largestDelta)}.`,
    nextStep,
    guideNow: report.conversationGuideQuestions,
  };
}

function prettyDimension(value: string) {
  return value === "Risiko" ? "Risikoprofil" : value;
}

function ArchiveDeleteButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const onDelete = async () => {
    if (!confirm("Möchtest du diese Analyse wirklich löschen?")) {
      return;
    }
    setIsPending(true);
    const result = await deleteSessionAction(sessionId);
    setIsPending(false);
    if (!result.ok) {
      alert(result.error ?? "Löschen fehlgeschlagen.");
      return;
    }
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={isPending}
      className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-500 transition-colors hover:border-red-300 hover:text-red-700 disabled:opacity-60"
      title="Analyse löschen"
      aria-label="Analyse löschen"
    >
      <span aria-hidden>🗑</span>
    </button>
  );
}
