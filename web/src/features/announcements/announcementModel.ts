/**
 * Mitteilungen der Plattform: was der Admin-Bereich annimmt.
 *
 * Reine Funktionen. Die Datenbank prueft dieselben Grenzen noch einmal
 * (`platform_announcements`); hier steht, was schon vor dem Absenden abgewiesen
 * wird, damit eine Eingabe nicht an einer technischen Meldung scheitert.
 */

export const ANNOUNCEMENT_LIMITS = { title: 120, body: 1500, cta: 40, href: 300 } as const;

/** card: Mitte, die Seite pausiert. banner: oben, die Seite bleibt bedienbar. toast: unten rechts, ebenso. */
export const ANNOUNCEMENT_DISPLAYS = ["card", "banner", "toast"] as const;
export type AnnouncementDisplay = (typeof ANNOUNCEMENT_DISPLAYS)[number];

export function displayOf(value: unknown): AnnouncementDisplay {
  return ANNOUNCEMENT_DISPLAYS.find((entry) => entry === value) ?? "card";
}

/** Der erste Satz des ersten Absatzes - das, was das Band zeigt, solange es zu ist. */
export function announcementTeaser(body: string): { teaser: string; hasMore: boolean } {
  const first = body.split(/\n{2,}/)[0]?.replace(/\s+/g, " ").trim() ?? "";
  const match = first.match(/^.+?[.!?](?=\s|$)/);
  const teaser = (match ? match[0] : first).trim();
  return { teaser, hasMore: body.replace(/\s+/g, " ").trim().length > teaser.length };
}

export type AnnouncementInput = {
  titleDe: string;
  bodyDe: string;
  titleEn: string | null;
  bodyEn: string | null;
  ctaLabelDe: string | null;
  ctaLabelEn: string | null;
  ctaHref: string | null;
  showOnce: boolean;
  display: AnnouncementDisplay;
  startsAt: string | null;
  endsAt: string | null;
};

/** Ein Pfad in der App ("/connect") oder eine https-Adresse. Nichts anderes: kein javascript:, kein "//fremd". */
export function isSafeCtaHref(value: string): boolean {
  if (value.length === 0 || value.length > ANNOUNCEMENT_LIMITS.href) return false;
  if (/[\s\\]/.test(value)) return false;
  if (value === "/") return true;
  if (value.startsWith("/")) return !value.startsWith("//");
  return /^https:\/\/[^\s/]+/.test(value);
}

function text(value: FormDataEntryValue | null, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function dayStart(value: FormDataEntryValue | null): string | null | "invalid" {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(Date.parse(raw)) ? `${raw}T00:00:00.000Z` : "invalid";
}

function dayEnd(value: FormDataEntryValue | null): string | null | "invalid" {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(Date.parse(raw)) ? `${raw}T23:59:59.000Z` : "invalid";
}

export function parseAnnouncementForm(formData: FormData): { ok: true; value: AnnouncementInput } | { ok: false } {
  const titleDe = text(formData.get("title_de"), ANNOUNCEMENT_LIMITS.title);
  const bodyDe = text(formData.get("body_de"), ANNOUNCEMENT_LIMITS.body);
  const titleEn = text(formData.get("title_en"), ANNOUNCEMENT_LIMITS.title);
  const bodyEn = text(formData.get("body_en"), ANNOUNCEMENT_LIMITS.body);
  const ctaLabelDe = text(formData.get("cta_label_de"), ANNOUNCEMENT_LIMITS.cta);
  const ctaLabelEn = text(formData.get("cta_label_en"), ANNOUNCEMENT_LIMITS.cta);
  const ctaHref = text(formData.get("cta_href"), ANNOUNCEMENT_LIMITS.href);
  const startsAt = dayStart(formData.get("starts_on"));
  const endsAt = dayEnd(formData.get("ends_on"));

  if (!titleDe || !bodyDe) return { ok: false };
  // Englisch nur zusammen: ein halber englischer Text waere schlimmer als keiner.
  if (Boolean(titleEn) !== Boolean(bodyEn)) return { ok: false };
  // Ein Knopf braucht Beschriftung UND Ziel; das Ziel muss sicher sein.
  if (Boolean(ctaHref) !== Boolean(ctaLabelDe)) return { ok: false };
  if (ctaHref && !isSafeCtaHref(ctaHref)) return { ok: false };
  if (ctaLabelEn && !ctaHref) return { ok: false };
  if (startsAt === "invalid" || endsAt === "invalid") return { ok: false };
  if (startsAt && endsAt && endsAt <= startsAt) return { ok: false };

  return {
    ok: true,
    value: {
      titleDe,
      bodyDe,
      titleEn: titleEn || null,
      bodyEn: bodyEn || null,
      ctaLabelDe: ctaLabelDe || null,
      ctaLabelEn: ctaLabelEn || null,
      ctaHref: ctaHref || null,
      showOnce: formData.get("show_once") === "yes",
      display: displayOf(formData.get("display")),
      startsAt,
      endsAt,
    },
  };
}
