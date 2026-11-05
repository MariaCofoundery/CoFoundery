import "server-only";

import { createClient } from "@supabase/supabase-js";
import { parseIcs } from "@/features/events/icsParser";

/**
 * Der taegliche Lauf (aus der Zeitplanroute): jede eingeschaltete Quelle abrufen, ihre Kalenderdatei lesen und den
 * Stand ersetzen (import_ecosystem_events). Danach Altes loeschen. Nur eingeschaltete Quellen - und eingeschaltet
 * wird nur mit Lizenz und Erlaubnis-Nachweis (20270323120000).
 */

const MAX_BYTES = 2_000_000;
const TIMEOUT_MS = 10_000;

export type EventImportResult = { ok: true; sources: number; imported: number; failed: number; purged: number } | { ok: false; reason: "missing_service_role" | "list_failed" };

export async function runEcosystemEventImport(): Promise<EventImportResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, reason: "missing_service_role" };
  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client.from("ecosystem_event_sources").select("id, feed_kind, feed_url, homepage_url").eq("enabled", true);
  if (error || !Array.isArray(data)) return { ok: false, reason: "list_failed" };

  let imported = 0;
  let failed = 0;
  for (const source of data as { id: string; feed_kind: string; feed_url: string; homepage_url: string }[]) {
    try {
      const response = await fetch(source.feed_url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { accept: "text/calendar, text/plain;q=0.8", "user-agent": "MADE2FOUND event calendar (facts only, links back)" },
        redirect: "follow",
      });
      if (!response.ok) throw new Error(`http_${response.status}`);
      const body = await response.text();
      if (body.length > MAX_BYTES) throw new Error("too_large");
      // Ohne eigenen Link zum Termin fuehrt der Eintrag auf die Startseite der Quelle.
      const rows = source.feed_kind === "ics" ? parseIcs(body, source.homepage_url) : [];
      const { data: count, error: importError } = await client.rpc("import_ecosystem_events", { p_source_id: source.id, p_rows: rows, p_error: null });
      if (importError) throw new Error("import_failed");
      imported += typeof count === "number" ? count : 0;
    } catch (cause) {
      failed += 1;
      await client.rpc("import_ecosystem_events", { p_source_id: source.id, p_rows: [], p_error: cause instanceof Error ? cause.message.slice(0, 120) : "failed" });
    }
  }
  const { data: purged } = await client.rpc("purge_old_ecosystem_events");
  return { ok: true, sources: data.length, imported, failed, purged: typeof purged === "number" ? purged : 0 };
}
