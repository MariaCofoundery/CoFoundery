/**
 * Wer das LinkedIn-Profil sehen darf - und was als Adresse durchgeht.
 *
 * Reine Funktionen, absichtlich ohne Datenbankzugriff: Dieselbe Pruefung laeuft
 * im Formular und in der Serveraktion, und sie muss testbar sein, ohne dass
 * eine Supabase-Instanz laeuft. Die Datenbank hat dieselbe Regel noch einmal
 * als Constraint - was nicht durch das Formular kommt, wird trotzdem geprueft.
 */

export const LINKEDIN_VISIBILITIES = ["private", "contacts", "members", "public"] as const;

export type LinkedInVisibility = (typeof LINKEDIN_VISIBILITIES)[number];

export function isLinkedInVisibility(value: unknown): value is LinkedInVisibility {
  return typeof value === "string" && (LINKEDIN_VISIBILITIES as readonly string[]).includes(value);
}

/**
 * Bewusst eng: nur https, nur linkedin.com (und deren Landes-Subdomains wie
 * de.linkedin.com).
 *
 * Ein Profilfeld, in das jede Adresse passt, ist ein Weg, anderen Mitgliedern
 * beliebige Links auszuspielen. Danach wurde nicht gefragt - gefragt war nach
 * dem LinkedIn-Profil.
 *
 * `null` heisst: leer, und das ist erlaubt. Ein leerer String und eine
 * unbrauchbare Adresse sind zwei verschiedene Faelle, deshalb gibt es zwei
 * Rueckgaben.
 */
export function parseLinkedInUrl(value: unknown): { ok: true; url: string | null } | { ok: false } {
  const raw = String(value ?? "").trim();
  if (raw.length === 0) return { ok: true, url: null };
  if (raw.length > 300) return { ok: false };

  // Ohne Schema eingegeben ist der haeufigste Fall - "linkedin.com/in/…" aus
  // der Adresszeile kopiert. Das zurueckzuweisen waere Pedanterie.
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false };
  }

  if (parsed.protocol !== "https:") return { ok: false };

  const host = parsed.hostname.toLowerCase();
  if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) return { ok: false };
  if (parsed.pathname === "/" || parsed.pathname.length === 0) return { ok: false };

  // Tracking-Anhaengsel aus geteilten Links fliegen raus. Sie gehoeren nicht
  // ins Profil und wuerden anderen Mitgliedern angezeigt.
  parsed.search = "";
  parsed.hash = "";
  parsed.username = "";
  parsed.password = "";

  return { ok: true, url: parsed.toString() };
}

/**
 * Darf `viewer` die Adresse dieser Person sehen?
 *
 * Dieselbe Regel steht in `list_member_linkedin_urls`. Hier steht sie, damit
 * die Oberflaeche sie erklaeren und pruefen kann, ohne zu raten - die Datenbank
 * bleibt die durchsetzende Instanz.
 */
export function canSeeLinkedIn(params: {
  visibility: LinkedInVisibility;
  isSelf: boolean;
  isSignedIn: boolean;
  isAcceptedContact: boolean;
}) {
  if (params.isSelf) return true;
  switch (params.visibility) {
    case "public":
      return true;
    case "members":
      return params.isSignedIn;
    case "contacts":
      return params.isSignedIn && params.isAcceptedContact;
    case "private":
      return false;
  }
}
