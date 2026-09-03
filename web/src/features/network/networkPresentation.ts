export type TimeframeCopy = { from: string; until: string };

export function normalizeNetworkLocations(value: unknown) {
  return Array.isArray(value)
    ? value.filter((location): location is string => typeof location === "string")
    : [];
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatNetworkContentTimeframe(
  startsOn: string | null,
  endsOn: string | null,
  locale: string,
  copy: TimeframeCopy,
) {
  const month = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
  const monthYear = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" });
  if (startsOn && endsOn) {
    const start = parseDate(startsOn); const end = parseDate(endsOn);
    return start.getUTCFullYear() === end.getUTCFullYear()
      ? `${month.format(start)}–${monthYear.format(end)}`
      : `${monthYear.format(start)}–${monthYear.format(end)}`;
  }
  if (startsOn) return `${copy.from} ${monthYear.format(parseDate(startsOn))}`;
  if (endsOn) return `${copy.until} ${monthYear.format(parseDate(endsOn))}`;
  return null;
}
