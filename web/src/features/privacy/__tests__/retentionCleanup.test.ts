import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  RESEARCH_RETENTION_DAYS,
  handlePrivacyRetentionCron,
  type RetentionRpcClient,
} from "@/features/privacy/retentionCleanup";

/**
 * Der tägliche Löschlauf über Vercel Cron.
 *
 * Geprüft wird das Verhalten mit einem Ersatz-Client: Welche Funktionen werden
 * wie oft aufgerufen, was passiert bei Fehlern, und was steht in der Antwort.
 * Ob Production tatsächlich löscht, beweist das nicht - dafür braucht es einen
 * nachvollziehbaren Lauf nach dem Deployment.
 */

const SECRET = "test-cron-secret";
const USER_ID = "7d3f9a52-0c1e-4b8a-9f00-1234567890ab";

type Call = { fn: string; args?: Record<string, unknown> };

function fakeClient(responses: Record<string, { data?: unknown; error?: { code?: string; message?: string } | null; throws?: boolean }>) {
  const calls: Call[] = [];
  const client: RetentionRpcClient = {
    rpc: async (fn, args) => {
      calls.push({ fn, args });
      const r = responses[fn] ?? {};
      if (r.throws) throw new Error(`network down for ${USER_ID}`);
      return { data: r.data ?? null, error: r.error ?? null };
    },
  };
  return { client, calls };
}

const OK_RESPONSES = {
  purge_stale_financing_notes: { data: { financingNoteDays: 365, deletedFinancingNotes: 2 } },
  purge_old_research_events: {
    data: { retentionDays: 30, cutoff: "2026-09-13T00:00:00Z", deletedResearchEvents: 4, deletedProductAnalyticsEvents: 2 },
  },
  cleanup_expired_event_data: { data: { closedEvents: 1, deletedAnswers: 12, deletedParticipants: 3 } },
  purge_stale_operational_rows: { data: { jobDays: 90, noticeDays: 180, deletedAiJobs: 5, deletedNotices: 7 } },
  purge_stale_personal_rows: { data: { feedbackDays: 60, invitationDays: 60, anonymizedFeedback: 3, deletedInvitations: 2 } },
  purge_stale_team_work_rows: {
    data: {
      deletedRetroAnswers: 1, deletedRetroInvites: 1, deletedCheckInTopics: 4, deletedCheckInSubmissions: 2,
      deletedTestProjectDrafts: 1, deletedTestProjects: 2, deletedReminderStamps: 3,
    },
  },
};

async function run(authorization: string | null, secret: string | undefined, responses: Parameters<typeof fakeClient>[0] = OK_RESPONSES) {
  const { client, calls } = fakeClient(responses);
  let created = 0;
  const outcome = await handlePrivacyRetentionCron({
    authorization,
    secret,
    createClient: () => {
      created += 1;
      return client;
    },
  });
  return { outcome, calls, created };
}

function silenceErrors() {
  const logged: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    logged.push(args);
  };
  return { logged, restore: () => (console.error = original) };
}

// ---------------------------------------------------------------------------
// A) Sicherheit: fail closed
// ---------------------------------------------------------------------------
test("ohne CRON_SECRET: 503, kein Client, kein Aufruf", async () => {
  for (const secret of [undefined, "", "   "]) {
    const { outcome, calls, created } = await run(`Bearer ${SECRET}`, secret);
    assert.equal(outcome.status, 503);
    assert.deepEqual(outcome.body, { ok: false, reason: "cron_secret_not_configured" });
    assert.equal(created, 0);
    assert.equal(calls.length, 0);
  }
});

test("falsches oder fehlendes Geheimnis: 401, kein Client, kein Aufruf", async () => {
  for (const header of [null, "", "Bearer falsch", `bearer ${SECRET}`, SECRET, `Bearer ${SECRET}x`, `Basic ${SECRET}`]) {
    const { outcome, calls, created } = await run(header, SECRET);
    assert.equal(outcome.status, 401, String(header));
    assert.deepEqual(outcome.body, { ok: false, reason: "unauthorized" });
    assert.equal(created, 0);
    assert.equal(calls.length, 0);
  }
});

test("korrektes Geheimnis: 200 und beide Schritte ok", async () => {
  const { outcome, calls } = await run(`Bearer ${SECRET}`, SECRET);
  assert.equal(outcome.status, 200);
  assert.equal(outcome.body.ok, true);
  assert.equal(calls.length, 6);
});

test("ohne Service-Role-Schlüssel: 503, nichts wird aufgerufen", async () => {
  const outcome = await handlePrivacyRetentionCron({ authorization: `Bearer ${SECRET}`, secret: SECRET, createClient: () => null });
  assert.equal(outcome.status, 503);
  assert.deepEqual(outcome.body, { ok: false, reason: "missing_service_role" });
});

// ---------------------------------------------------------------------------
// B) Aufrufe: die SQL-Funktionen bleiben die Löschlogik
// ---------------------------------------------------------------------------
test("jede Funktion genau einmal, Forschung mit 30 Tagen", async () => {
  const { calls } = await run(`Bearer ${SECRET}`, SECRET);
  assert.deepEqual(calls, [
    { fn: "purge_old_research_events", args: { p_retention_days: 30 } },
    { fn: "cleanup_expired_event_data", args: undefined },
    { fn: "purge_stale_operational_rows", args: { p_job_days: 90, p_notice_days: 180 } },
    { fn: "purge_stale_personal_rows", args: { p_feedback_days: 60, p_invitation_days: 60 } },
    { fn: "purge_stale_team_work_rows", args: { p_answer_days: 365, p_retro_days: 180, p_draft_days: 90, p_stamp_days: 365 } },
    { fn: "purge_stale_financing_notes", args: { p_days: 365 } },
  ]);
  assert.equal(RESEARCH_RETENTION_DAYS, 30);
});

test("die Zählwerte der Funktionen gehen in die Antwort, sonst nichts", async () => {
  const { outcome } = await run(`Bearer ${SECRET}`, SECRET);
  assert.deepEqual(outcome.body, {
    ok: true,
    researchCleanup: "ok",
    eventCleanup: "ok",
    operationalCleanup: "ok",
    personalCleanup: "ok",
    teamWorkCleanup: "ok",
    financingNotesCleanup: "ok",
    counts: {
      research: { retentionDays: 30, deletedResearchEvents: 4, deletedProductAnalyticsEvents: 2 },
      events: { closedEvents: 1, deletedAnswers: 12, deletedParticipants: 3 },
      operational: { deletedAiJobs: 5, deletedNotices: 7 },
      personal: { anonymizedFeedback: 3, deletedInvitations: 2 },
      teamWork: {
        deletedRetroAnswers: 1, deletedRetroInvites: 1, deletedCheckInTopics: 4, deletedCheckInSubmissions: 2,
        deletedTestProjectDrafts: 1, deletedTestProjects: 2, deletedReminderStamps: 3,
      },
      financingNotes: { deletedFinancingNotes: 2 },
    },
  });
});

// ---------------------------------------------------------------------------
// C) Fehlerfälle: nie "alles gut", wenn ein Schritt scheitert
// ---------------------------------------------------------------------------
test("Forschungs-Löschung scheitert: 500, Event-Löschung läuft trotzdem", async () => {
  const log = silenceErrors();
  try {
    const { outcome, calls } = await run(`Bearer ${SECRET}`, SECRET, {
      ...OK_RESPONSES,
      purge_old_research_events: { error: { code: "42501", message: "permission denied" } },
    });
    assert.equal(outcome.status, 500);
    assert.equal(outcome.body.ok, false);
    assert.equal("researchCleanup" in outcome.body && outcome.body.researchCleanup, "failed");
    assert.equal("eventCleanup" in outcome.body && outcome.body.eventCleanup, "ok");
    assert.equal(calls.length, 6, "die weiteren Schritte hängen nicht am ersten");
  } finally {
    log.restore();
  }
});

test("Event-Löschung scheitert: 500, Forschung bleibt ok", async () => {
  const log = silenceErrors();
  try {
    const { outcome } = await run(`Bearer ${SECRET}`, SECRET, {
      ...OK_RESPONSES,
      cleanup_expired_event_data: { error: { code: "P0001" } },
    });
    assert.equal(outcome.status, 500);
    assert.deepEqual(
      outcome.body.ok === false && "researchCleanup" in outcome.body ? [outcome.body.researchCleanup, outcome.body.eventCleanup] : null,
      ["ok", "failed"],
    );
  } finally {
    log.restore();
  }
});

test("alle scheitern, auch per Ausnahme: 500, alle failed, keine Zählwerte", async () => {
  const log = silenceErrors();
  try {
    const { outcome } = await run(`Bearer ${SECRET}`, SECRET, {
      purge_old_research_events: { throws: true },
      cleanup_expired_event_data: { error: { code: "XX000" } },
      purge_stale_operational_rows: { throws: true },
      purge_stale_personal_rows: { throws: true },
      purge_stale_team_work_rows: { throws: true },
      purge_stale_financing_notes: { throws: true },
    });
    assert.equal(outcome.status, 500);
    assert.deepEqual(outcome.body, {
      ok: false,
      researchCleanup: "failed",
      eventCleanup: "failed",
      operationalCleanup: "failed",
      personalCleanup: "failed",
      teamWorkCleanup: "failed",
      financingNotesCleanup: "failed",
      counts: { research: null, events: null, operational: null, personal: null, teamWork: null, financingNotes: null },
    });
  } finally {
    log.restore();
  }
});

// ---------------------------------------------------------------------------
// D) Datenschutz
// ---------------------------------------------------------------------------
test("Antwort enthält keine IDs, Inhalte oder unerwarteten Felder - auch wenn die Funktion mehr liefert", async () => {
  const { outcome } = await run(`Bearer ${SECRET}`, SECRET, {
    purge_old_research_events: {
      data: { retentionDays: 30, deletedResearchEvents: 1, deletedProductAnalyticsEvents: 0, userId: USER_ID, email: "a@b.de" },
    },
    cleanup_expired_event_data: { data: { closedEvents: 0, deletedAnswers: 0, deletedParticipants: 1, participants: [{ email: "x@y.de" }] } },
  });
  const json = JSON.stringify(outcome.body);
  assert.doesNotMatch(json, new RegExp(USER_ID));
  assert.doesNotMatch(json, /@|email|participants|userId|cutoff/);
});

test("Protokoll nennt bei Fehlern nur Funktion und Fehlercode, nie die Meldung", async () => {
  const log = silenceErrors();
  try {
    await run(`Bearer ${SECRET}`, SECRET, {
      purge_old_research_events: { error: { code: "23503", message: `Key (user_id)=(${USER_ID}) is still referenced` } },
      cleanup_expired_event_data: { throws: true },
    });
  } finally {
    log.restore();
  }
  const text = JSON.stringify(log.logged);
  assert.equal(log.logged.length, 2);
  assert.doesNotMatch(text, new RegExp(USER_ID));
  assert.match(text, /purge_old_research_events failed/);
  assert.match(text, /23503/);
});

const WEB = path.join(import.meta.dirname, "..", "..", "..", "..");
const read = (relative: string) => readFileSync(path.join(WEB, relative), "utf8");

test("Service-Role bleibt auf dem Server: server-only, kein NEXT_PUBLIC-Schlüssel, kein Client-Import", () => {
  const retentionSource = read("src/features/privacy/retentionCleanup.ts");
  assert.match(retentionSource, /^import "server-only";/);
  assert.match(retentionSource, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(retentionSource, /NEXT_PUBLIC_SUPABASE_SERVICE|NEXT_PUBLIC_[A-Z_]*SERVICE_ROLE/);

  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(tsx?|jsx?)$/.test(name)) {
        const src = readFileSync(full, "utf8");
        if (/^\s*["']use client["']/m.test(src) && /features\/privacy\/retentionCleanup/.test(src)) offenders.push(full);
      }
    }
  };
  walk(path.join(WEB, "src"));
  assert.deepEqual(offenders, [], "eine Client-Komponente importiert den Löschlauf");
});

// ---------------------------------------------------------------------------
// E) Regression und Vertrag mit der Datenbank
// ---------------------------------------------------------------------------
test("vercel.json: Region bleibt, connect-suggestions bleibt, Löschlauf ist täglich", () => {
  const config = JSON.parse(read("vercel.json")) as { regions?: string[]; crons?: { path: string; schedule: string }[] };
  assert.deepEqual(config.regions, ["lhr1"]);
  assert.deepEqual(config.crons?.find((c) => c.path === "/api/cron/connect-suggestions"), {
    path: "/api/cron/connect-suggestions",
    schedule: "0 7 * * *",
  });
  const retention = config.crons?.find((c) => c.path === "/api/cron/privacy-retention");
  assert.ok(retention, "der Löschlauf fehlt im Zeitplan");
  // Täglich, nicht öfter: Im Hobby-Tarif scheitert sonst das ganze Deployment.
  assert.match(retention.schedule, /^\d+ \d+ \* \* \*$/);
});

test("die Route nutzt das bestehende Cron-Muster und keine eigene Löschlogik", () => {
  const route = read("src/app/api/cron/privacy-retention/route.ts");
  assert.match(route, /process\.env\.CRON_SECRET/);
  assert.match(route, /handlePrivacyRetentionCron/);
  assert.doesNotMatch(route, /\.from\(|\.rpc\(|SERVICE_ROLE_KEY/, "Datenbankzugriff gehört nicht in die Route");
});

test("die aufgerufenen SQL-Funktionen existieren so und sind nur für service_role ausführbar", () => {
  const migrations = path.join(WEB, "..", "supabase", "migrations");
  const files = readdirSync(migrations).sort();
  const definitions = (name: string) =>
    files.filter((f) => new RegExp(`create or replace function public\\.${name}\\(`).test(readFileSync(path.join(migrations, f), "utf8")));
  const sqlCode = (f: string) => readFileSync(path.join(migrations, f), "utf8").replace(/^\s*--.*$/gm, "");

  // Die jüngste Definition gilt.
  const purgeFile = definitions("purge_old_research_events").at(-1) as string;
  assert.equal(purgeFile, "20261124120000_research_retention_received_at.sql");
  const purge = sqlCode(purgeFile);
  assert.match(purge, /create or replace function public\.purge_old_research_events\(p_retention_days integer default 30\)/);
  assert.match(purge, /security definer\s+set search_path = public/);
  // Die Frist hängt nur am Serverzeitpunkt - nie am Client-Zeitstempel.
  const body = purge.slice(purge.indexOf("as $$"), purge.indexOf("$$;"));
  assert.equal((body.match(/where received_at < v_cutoff;/g) ?? []).length, 2);
  assert.doesNotMatch(body, /client_occurred_at/);
  assert.match(purge, /revoke all on function public\.purge_old_research_events\(integer\) from public, anon, authenticated;/);
  assert.match(purge, /grant execute on function public\.purge_old_research_events\(integer\) to service_role;/);

  const cleanupFile = definitions("cleanup_expired_event_data").at(-1) as string;
  assert.equal(cleanupFile, "20260525113000_cleanup_expired_event_data.sql");
  const cleanup = sqlCode(cleanupFile);
  for (const role of ["public", "anon", "authenticated"]) {
    assert.match(cleanup, new RegExp(`revoke execute on function public\\.cleanup_expired_event_data\\(\\) from ${role};`));
  }
});
