const DAY = 86_400_000;

export type CronState = "ok" | "late" | "failed" | "never";
/** Die taeglichen Laeufe sind in Ordnung, wenn der letzte weniger als 36 Stunden her und fehlerfrei war. */
export function cronState(entry: { last_run_at: string; ok: boolean } | undefined, now = Date.now()): CronState {
  if (!entry) return "never";
  if (!entry.ok) return "failed";
  return now - new Date(entry.last_run_at).getTime() < 36 * 3_600_000 ? "ok" : "late";
}
export function daysSince(value: string | null, now = Date.now()) {
  return value ? Math.max(0, Math.floor((now - new Date(value).getTime()) / DAY)) : null;
}
