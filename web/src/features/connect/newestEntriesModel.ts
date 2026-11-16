/** Tage seit der Veroeffentlichung (Berliner Kalendertage), mindestens 0. */
export function daysSince(iso: string | null, now = new Date()): number {
  if (!iso) return 0;
  const fmt = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const a = Date.parse(`${fmt(new Date(iso))}T00:00:00Z`);
  const b = Date.parse(`${fmt(now)}T00:00:00Z`);
  return Math.max(0, Math.round((b - a) / 86_400_000));
}
