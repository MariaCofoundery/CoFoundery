"use client";

import { useSyncExternalStore } from "react";
import { type InvitationReadinessDebug } from "@/features/reporting/actions";

type ReportRunSummary = {
  id: string;
  invitationId: string;
  modules: string[];
  createdAt: string;
};

type Props = {
  enabled: boolean;
  selfReportDebug: {
    baseAssessmentId: string | null;
    valuesAssessmentId: string | null;
    valuesAnsweredA: number;
    valuesTotal: number;
    scoresA: Record<string, number | null>;
  } | null;
  invitationDebugEntries: Array<{
    id: string;
    debug: InvitationReadinessDebug | null;
  }>;
  reportRuns: ReportRunSummary[];
};

export function DashboardDevSection({
  enabled,
  selfReportDebug,
  invitationDebugEntries,
  reportRuns,
}: Props) {
  const mounted = useSyncExternalStore(
    subscribeToMountedState,
    getMountedClientSnapshot,
    getMountedServerSnapshot
  );

  if (!enabled || !mounted) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6">
      <h2 className="text-sm font-semibold tracking-[0.08em] text-slate-900">Dev-Bereich</h2>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        Interne Debug- und Systeminformationen bleiben verfügbar, sind aber bewusst aus der
        produktischen Hauptoberfläche herausgezogen.
      </p>

      {selfReportDebug ? (
        <details className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">Self-Report Debug</summary>
          <pre className="mt-3 overflow-auto text-xs text-slate-700">
            {JSON.stringify(selfReportDebug, null, 2)}
          </pre>
        </details>
      ) : null}

      <details className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">Invitation Debug</summary>
        <div className="mt-3 space-y-3">
          {invitationDebugEntries.length > 0 ? (
            invitationDebugEntries.map((entry) => (
              <pre
                key={entry.id}
                className="overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"
              >
                {JSON.stringify(entry.debug, null, 2)}
              </pre>
            ))
          ) : (
            <p className="text-sm text-slate-500">Keine Invitation-Debugdaten vorhanden.</p>
          )}
        </div>
      </details>

      <details className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">System-Report-Runs</summary>
        <ul className="mt-3 space-y-3">
          {reportRuns.map((run) => (
            <li
              key={run.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
            >
              <p className="font-medium text-slate-900">{run.invitationId}</p>
              <p className="mt-1">Module: {formatInvitationModules(run.modules ?? [])}</p>
              <p className="text-xs text-slate-500">Erstellt: {formatDate(run.createdAt)}</p>
            </li>
          ))}
          {reportRuns.length === 0 ? (
            <li className="text-sm text-slate-500">Noch keine Report-Runs verfügbar.</li>
          ) : null}
        </ul>
      </details>
    </section>
  );
}

function subscribeToMountedState() {
  return () => {};
}

function getMountedClientSnapshot() {
  return true;
}

function getMountedServerSnapshot() {
  return false;
}

function formatInvitationModules(modules: string[]) {
  const moduleKeys = (modules ?? []).filter((value): value is string => Boolean(value));
  if (moduleKeys.length === 0) return "Basis";

  const labels = moduleKeys.map((key) => {
    if (key === "base") return "Basis";
    if (key === "values") return "Werte";
    return key;
  });
  return [...new Set(labels)].join(", ");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "unbekannt";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unbekannt";
  return date.toLocaleDateString("de-DE");
}
