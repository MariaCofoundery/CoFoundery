import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Der regelmäßige Löschlauf für zeitlich begrenzte Daten.
 *
 * WARUM ES DIESEN LAUF GIBT: Die Löschung selbst steht seit Langem in SQL -
 * `purge_old_research_events` und `cleanup_expired_event_data`. Angestoßen
 * werden sollten beide über pg_cron (`schedule_phase1_analytics_jobs`,
 * `schedule_event_data_cleanup_job`). In Production ist pg_cron aber nicht
 * installiert; beide Planer antworten dort nur `pg_cron_not_installed`, und
 * gelöscht wurde nichts. Dieser Lauf ruft die Funktionen über Vercel Cron auf.
 *
 * DIE LÖSCHLOGIK BLEIBT IN SQL. Hier steht keine Zeitbedingung und keine
 * Tabelle - nur der Aufruf. Eine zweite Fassung der Regel in TypeScript wäre
 * ein zweiter Ort, an dem sie auseinanderlaufen kann.
 *
 * DIE ANTWORT NENNT NUR ZAHLEN. Keine IDs, keine Inhalte, keine Namen. Auch im
 * Protokoll steht bei einem Fehler nur der Fehlercode: Eine Datenbankmeldung
 * kann Werte aus der Zeile enthalten.
 *
 * Beide Schritte laufen unabhängig: Scheitert der erste, läuft der zweite
 * trotzdem - und die Antwort sagt für jeden einzeln, ob er gelungen ist.
 */

/** Die Aufbewahrung, mit der `purge_old_research_events` aufgerufen wird. */
export const RESEARCH_RETENTION_DAYS = 30;
/** Abgeschlossene KI-Aufgaben und alte Hinweise in der Anwendung (`purge_stale_operational_rows`). */
export const AI_JOB_RETENTION_DAYS = 90;
export const NOTICE_RETENTION_DAYS = 180;
/** Feedback verliert nach 60 Tagen den Personenbezug; nie angenommene, abgelaufene Einladungen werden nach 60 Tagen geloescht (`purge_stale_personal_rows`). */
export const FEEDBACK_ANONYMIZE_DAYS = 60;
export const INVITATION_RETENTION_DAYS = 60;

type RpcError = { code?: string | null } | null;
type RpcResult = { data: unknown; error: RpcError };

/** Was der Lauf von einem Supabase-Client braucht - und mehr nicht. */
export type RetentionRpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<RpcResult>;
};

export type StepStatus = "ok" | "failed";

export type PrivacyRetentionResult = {
  ok: boolean;
  researchCleanup: StepStatus;
  eventCleanup: StepStatus;
  operationalCleanup: StepStatus;
  personalCleanup: StepStatus;
  /** Nur Zählwerte, die die SQL-Funktionen selbst zurückgeben. */
  counts: {
    research: { retentionDays: number; deletedResearchEvents: number; deletedProductAnalyticsEvents: number } | null;
    events: { closedEvents: number; deletedAnswers: number; deletedParticipants: number } | null;
    operational: { deletedAiJobs: number; deletedNotices: number } | null;
    personal: { anonymizedFeedback: number; deletedInvitations: number } | null;
  };
};

export type PrivacyRetentionCronOutcome = {
  status: number;
  body: PrivacyRetentionResult | { ok: false; reason: "cron_secret_not_configured" | "unauthorized" | "missing_service_role" };
};

/** Übernimmt nur ausdrücklich bekannte, ganzzahlige Zählfelder. */
function pickCounts<K extends string>(data: unknown, keys: readonly K[]): Record<K, number> | null {
  if (!data || typeof data !== "object") return null;
  const source = data as Record<string, unknown>;
  const out = {} as Record<K, number>;
  for (const key of keys) {
    const value = source[key];
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return null;
    out[key] = value;
  }
  return out;
}

async function runStep(client: RetentionRpcClient, fn: string, args?: Record<string, unknown>): Promise<{ ok: boolean; data: unknown }> {
  try {
    const { data, error } = await client.rpc(fn, args);
    if (error) {
      console.error(`[privacy-retention] ${fn} failed`, { code: error.code ?? "unknown" });
      return { ok: false, data: null };
    }
    return { ok: true, data };
  } catch {
    console.error(`[privacy-retention] ${fn} failed`, { code: "exception" });
    return { ok: false, data: null };
  }
}

export async function runPrivacyRetention(client: RetentionRpcClient): Promise<PrivacyRetentionResult> {
  const research = await runStep(client, "purge_old_research_events", { p_retention_days: RESEARCH_RETENTION_DAYS });
  const events = await runStep(client, "cleanup_expired_event_data");
  const operational = await runStep(client, "purge_stale_operational_rows", {
    p_job_days: AI_JOB_RETENTION_DAYS,
    p_notice_days: NOTICE_RETENTION_DAYS,
  });
  const personal = await runStep(client, "purge_stale_personal_rows", {
    p_feedback_days: FEEDBACK_ANONYMIZE_DAYS,
    p_invitation_days: INVITATION_RETENTION_DAYS,
  });
  return {
    ok: research.ok && events.ok && operational.ok && personal.ok,
    researchCleanup: research.ok ? "ok" : "failed",
    eventCleanup: events.ok ? "ok" : "failed",
    operationalCleanup: operational.ok ? "ok" : "failed",
    personalCleanup: personal.ok ? "ok" : "failed",
    counts: {
      research: research.ok
        ? pickCounts(research.data, ["retentionDays", "deletedResearchEvents", "deletedProductAnalyticsEvents"] as const)
        : null,
      events: events.ok ? pickCounts(events.data, ["closedEvents", "deletedAnswers", "deletedParticipants"] as const) : null,
      operational: operational.ok ? pickCounts(operational.data, ["deletedAiJobs", "deletedNotices"] as const) : null,
      personal: personal.ok ? pickCounts(personal.data, ["anonymizedFeedback", "deletedInvitations"] as const) : null,
    },
  };
}

/**
 * Die Entscheidung der Zeitplanroute, ohne Next.js - damit sie sich testen
 * lässt. Fail closed: ohne Geheimnis, mit falschem Geheimnis oder ohne
 * Service-Role-Schlüssel wird nichts aufgerufen.
 */
export async function handlePrivacyRetentionCron(params: {
  authorization: string | null;
  secret: string | undefined;
  createClient: () => RetentionRpcClient | null;
}): Promise<PrivacyRetentionCronOutcome> {
  const secret = params.secret?.trim() ?? "";
  if (!secret) return { status: 503, body: { ok: false, reason: "cron_secret_not_configured" } };
  if ((params.authorization?.trim() ?? "") !== `Bearer ${secret}`) {
    return { status: 401, body: { ok: false, reason: "unauthorized" } };
  }
  const client = params.createClient();
  if (!client) return { status: 503, body: { ok: false, reason: "missing_service_role" } };
  const result = await runPrivacyRetention(client);
  return { status: result.ok ? 200 : 500, body: result };
}

/** Service-Role-Client, ausschließlich serverseitig. null, solange nicht eingerichtet. */
export function privilegedRetentionClient(): RetentionRpcClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as unknown as RetentionRpcClient;
}
