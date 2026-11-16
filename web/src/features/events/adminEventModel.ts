/** Ein Adressname fuer eine Veranstaltung: nur Kleinbuchstaben, Ziffern und Bindestriche, 3 bis 60 Zeichen. Gleiche Regel wie in der Datenbank. */
export const EVENT_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function slugifyEventName(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("ä", "ae").replaceAll("ö", "oe").replaceAll("ü", "ue").replaceAll("ß", "ss")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

export function isValidEventSlug(value: string): boolean {
  return value.length >= 3 && value.length <= 60 && EVENT_SLUG_PATTERN.test(value);
}

/** Wohin die QR-Codes zeigen. */
export function eventSignupUrl(origin: string, slug: string): string {
  return `${origin}/hallo?event=${encodeURIComponent(slug)}`;
}
export function eventCheckUrl(origin: string, slug: string): string {
  return `${origin}/event/${encodeURIComponent(slug)}`;
}

export const EVENT_STATUSES = ["draft", "live", "closed"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];
