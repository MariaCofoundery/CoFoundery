/**
 * Was ein Fehlerprotokoll über einen Fehler enthalten darf: stabile Codes, nie
 * Meldungstexte.
 *
 * WARUM: Meldungstexte tragen Daten. Eine Postgres-Meldung wie „Failing row
 * contains (...)“ enthält die ganze Zeile, eine Antwort von Resend kann die
 * Empfängeradresse wiederholen. Server-Protokolle landen bei Vercel und Supabase
 * und haben andere Zwecke als diese Inhalte (Privacy-Audit 14.10.2026).
 *
 * Übrig bleibt, was für die Diagnose reicht: technischer Fehlername, Fehlercode
 * und HTTP-Status - jeweils nur in einem engen, datenfreien Format.
 */
export type SafeErrorLog = {
  name: string | null;
  code: string | null;
  status: number | null;
};

const NAME = /^[A-Za-z][A-Za-z0-9]{0,63}$/;
const CODE = /^[A-Za-z0-9_.-]{1,64}$/;
/** Eigene Fehlerkennungen wie `resend_request_failed:500:<Antworttext>` - nur Code und Status. */
const STRING_CODE = /^([a-z][a-z0-9_]{0,63})(?::(\d{3}))?(?::|$)/;

function status(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599 ? value : null;
}

export function safeErrorLog(error: unknown): SafeErrorLog {
  if (typeof error === "string") {
    const match = STRING_CODE.exec(error);
    return { name: null, code: match ? match[1] : "unparsed_error", status: match?.[2] ? Number(match[2]) : null };
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const name = typeof record.name === "string" && NAME.test(record.name) ? record.name : null;
    const code = typeof record.code === "string" && CODE.test(record.code) ? record.code : null;
    return { name, code, status: status(record.status) ?? status(record.statusCode) };
  }
  return { name: null, code: null, status: null };
}
