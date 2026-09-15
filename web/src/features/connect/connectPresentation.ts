export type TimeframeCopy = { from: string; until: string };

export function getConnectAttentionCount(pendingIncomingContacts: number, unreadIncomingMessages: number) {
  return Math.max(0, pendingIncomingContacts) + Math.max(0, unreadIncomingMessages);
}

export function normalizeConnectLocations(value: unknown) {
  return Array.isArray(value)
    ? value.filter((location): location is string => typeof location === "string")
    : [];
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatConnectContentTimeframe(
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

/**
 * Wie viele Tage eine Anzeige noch laeuft.
 *
 * Der Ablauf nach spaetestens 60 Tagen ist bewusst gebaut - er verhindert ein
 * Netzwerk voller zwei Jahre alter Gesuche. Er funktioniert aber nur, wenn
 * man rechtzeitig verlaengern kann, und das ging bisher nicht: In der eigenen
 * Uebersicht stand nicht, wann eine aktive Anzeige ausläuft. Man erfuhr es,
 * wenn sie weg war.
 *
 * Angebrochene Tage zaehlen als ganzer Tag: Wer "noch 1 Tag" liest, hat noch
 * heute Zeit. Abrunden wuerde bei 23 Stunden "0" anzeigen und damit falsch
 * beruhigen beziehungsweise falsch alarmieren.
 */
export function getConnectListingDaysLeft(expiresAt: string | null | undefined, now = new Date()) {
  if (!expiresAt) return null;
  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return null;

  const millisecondsLeft = expiry.getTime() - now.getTime();
  if (millisecondsLeft <= 0) return 0;
  return Math.ceil(millisecondsLeft / (1000 * 60 * 60 * 24));
}

/** Ab wann der Hinweis dringlich wird. Eine Woche reicht, um zu reagieren. */
export const CONNECT_EXPIRY_WARNING_DAYS = 7;
