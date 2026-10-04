import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { createClient } from "@/lib/supabase/server";
import type { FounderSetupReadModel } from "@/features/teams/founderSetupModel";
import { CURRENT_WORKSTYLE_INSTRUMENT } from "@/features/instruments/workstyle/current";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Vier getrennte Zustaende. Jeder Bereich behaelt seinen eigenen Abschluss-
 * und Freigabevertrag - es gibt bewusst KEINEN gemeinsamen Fortschritt, keinen
 * Prozentwert und keine "3 von 4". Seit Phase 9.4B nur kompakter dargestellt;
 * die Ableitung ist unveraendert.
 */
export type AssessmentState = "unavailable" | "present" | "inProgress" | "open";
export type TeamJourneyState = {
  work: AssessmentState;
  venture: AssessmentState;
  report: "unavailable" | "available" | "shareMissing" | "notAvailable";
  setup: "unavailable" | "confirmed" | "clarifying" | "open";
};

export async function loadTeamJourneyStatus(params: {
  teamId: string;
  userId: string;
  client: SupabaseServerClient;
  /** Das Setup-Readmodel der Seite; `null` heisst "nicht lesbar". */
  setup: FounderSetupReadModel | null;
}): Promise<TeamJourneyState> {
  const { client, teamId, userId, setup } = params;
  const [work, venture, report] = await Promise.all([
    client.from("assessments").select("submitted_at").eq("user_id", userId).eq("instrument_id", CURRENT_WORKSTYLE_INSTRUMENT).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    client.from("assessments").select("submitted_at").eq("user_id", userId).eq("instrument_id", "venture-alignment-v1").eq("venture_id", teamId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    client.rpc("get_workstyle_product_team_status", { p_team_id: teamId }),
  ]);
  const status = (result: typeof work): AssessmentState =>
    result.error ? "unavailable" : result.data?.submitted_at ? "present" : result.data ? "inProgress" : "open";
  return {
    work: status(work),
    venture: status(venture),
    report: report.error
      ? "unavailable"
      : report.data === "available"
        ? "available"
        : report.data === "share_missing"
          ? "shareMissing"
          : "notAvailable",
    // Bestaetigt heisst: von allen AKTUELLEN Mitgliedern bestaetigt (das
    // Readmodel setzt currentConfirmedRevision sonst auf null und markiert
    // rosterConfirmationMissing).
    setup: !setup
      ? "unavailable"
      : setup.items.some((x) => x.currentConfirmedRevision)
        ? "confirmed"
        : setup.items.some((x) => x.rosterConfirmationMissing || x.pendingRevision || x.workStatus === "discussing")
          ? "clarifying"
          : "open",
  };
}

export function ventureHref(teamId: string, state: AssessmentState) {
  const venture = encodeURIComponent(teamId);
  return state === "present"
    ? `/founder-alignment/vorhaben/antworten?venture=${venture}`
    : `/founder-alignment/vorhaben?venture=${venture}`;
}

/** Kompakte Statuszeile: Name, Zustand als Text (nie nur Farbe), ein Link. */
export async function TeamJourneyStatus({ teamId, state }: { teamId: string; state: TeamJourneyState }) {
  const t = await getTranslations("teams.homebase.journey");
  const team = encodeURIComponent(teamId);
  const entries = [
    { key: "work", status: t(`assessment.${state.work}`), href: "/me/profile/workstyle" },
    { key: "venture", status: t(`assessment.${state.venture}`), href: ventureHref(teamId, state.venture) },
    { key: "report", status: t(`report.${state.report}`), href: `/teams/${team}/workstyle` },
    { key: "setup", status: t(`setup.${state.setup}`), href: `/teams/${team}/setup` },
  ] as const;
  return (
    <ul aria-label={t("label")} className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
      {entries.map((entry) => (
        <li key={entry.key} className="min-w-0">
          <Link
            href={entry.href}
            className="block rounded-lg py-1 text-sm font-medium text-slate-800 underline decoration-slate-300 underline-offset-4 hover:text-slate-950 hover:decoration-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2"
          >
            {t(`items.${entry.key}`)}
          </Link>
          <p className="text-xs leading-5 text-slate-500">{entry.status}</p>
        </li>
      ))}
    </ul>
  );
}
