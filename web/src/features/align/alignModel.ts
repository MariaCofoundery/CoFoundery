import { CURRENT_WORKSTYLE_HREF } from "@/features/instruments/workstyle/current";

/**
 * Align hat drei Raeume: Ich, Wir, Unser Vorhaben (Entwurf vom 12.11.2026).
 *
 *   Ich               die eigenen Teile: Arbeitsweise, Koennen, Staerken, Richtung. Gehoert der Person.
 *   Wir               das Team: Vergleich der Arbeitsweise, Werte, Rollen, Staerken im Team, Uebungen
 *                     zu zweit, Programm.
 *   Unser Vorhaben    was das Team baut und festhaelt: Vorhaben, Founder Setup, Finanzierung,
 *                     Zielkonflikte, Testprojekt.
 *
 * Diese Datei ist rein: Sie kennt keine Datenbank und kein React. Alles, was sich pruefen laesst,
 * steht hier - die Seite und die Menueleiste benutzen es nur.
 */

export type AlignRoom = "ich" | "wir" | "vorhaben";
export type AlignPartKey = "work" | "can" | "strengths" | "direction";
export type AlignPartState = "done" | "started" | "open";

export const ALIGN_PART_KEYS: readonly AlignPartKey[] = ["work", "can", "strengths", "direction"];

/** Jeder Teil fuehrt direkt dorthin, wo man ihn ausfuellt. */
export const ALIGN_PART_HREF: Record<AlignPartKey, string> = {
  work: CURRENT_WORKSTYLE_HREF,
  can: "/profile?step=areas",
  strengths: "/profile/strengths-interview",
  direction: "/profile/direction",
};

/** Der erste noch offene Teil - in der Reihenfolge des Wegs. Ein angefangener zaehlt als offen. */
export function nextOwnPart(states: Record<AlignPartKey, AlignPartState>): AlignPartKey | null {
  return ALIGN_PART_KEYS.find((key) => states[key] !== "done") ?? null;
}

export function ownPartsDone(states: Record<AlignPartKey, AlignPartState>) {
  return ALIGN_PART_KEYS.filter((key) => states[key] === "done").length;
}

/** Aus der Zahl eigener Eintraege wird "fertig" oder "offen" - mehr weiss die Datenbank nicht. */
export function stateFromCount(count: number): AlignPartState {
  return count > 0 ? "done" : "open";
}

export function stateFromWorkProfile(state: string): AlignPartState {
  if (state === "completed") return "done";
  if (state === "started") return "started";
  return "open";
}

// ---------------------------------------------------------------------------
// Wo gehoert eine Adresse hin? Das entscheidet, welcher Reiter in der zweiten Reihe leuchtet.
// ---------------------------------------------------------------------------

const VENTURE_TEAM_PAGES = ["setup", "vorhaben-beta", "finanzierung", "zielkonflikte", "test-project"];

function startsWithSegment(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * "overview" fuer /align selbst, sonst der Raum, in dem die Seite liegt. `null`, wenn sie nicht zu
 * Align gehoert. Das Vorhaben hat Vorrang: /founder-alignment/vorhaben ist zwar die eigene Sicht
 * einer Person, handelt aber vom Vorhaben und nicht vom eigenen Profil.
 */
export function alignRoomOfPath(pathname: string): AlignRoom | "overview" | null {
  if (pathname === "/align") return "overview";

  const teamPage = /^\/teams\/[^/]+\/([^/]+)/.exec(pathname);
  // Das Gesamtbild gehoert zu allen drei Raeumen und liegt deshalb unter der Uebersicht.
  if (teamPage?.[1] === "gesamtbild") return "overview";
  if (teamPage && VENTURE_TEAM_PAGES.includes(teamPage[1])) return "vorhaben";
  if (startsWithSegment(pathname, "/founder-alignment/vorhaben")) return "vorhaben";

  if (
    pathname.startsWith("/me/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/fragebogen" ||
    pathname.startsWith("/fragebogen/") ||
    pathname.startsWith("/research/workstyle-pretest") ||
    startsWithSegment(pathname, "/founder-alignment/profil") ||
    startsWithSegment(pathname, "/founder-alignment/pilot") ||
    startsWithSegment(pathname, "/founder-alignment/versionen")
  ) {
    return "ich";
  }

  if (
    pathname === "/connections" ||
    pathname.startsWith("/teams/") ||
    pathname === "/invite/new" ||
    pathname.startsWith("/report/") ||
    startsWithSegment(pathname, "/founder-alignment") ||
    startsWithSegment(pathname, "/founder-library") ||
    startsWithSegment(pathname, "/programm")
  ) {
    return "wir";
  }

  return null;
}

// ---------------------------------------------------------------------------
// Das Team, zu dem "Wir" und "Unser Vorhaben" im Menue fuehren: das zuletzt benutzte.
// ---------------------------------------------------------------------------

const TEAM_ID = /^\/teams\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:[/?#]|$)/i;

/** Die Team-Id aus einer gemerkten Adresse (`/teams/<uuid>/...`), sonst null. */
export function teamIdFromPath(value: string | null | undefined): string | null {
  if (!value) return null;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  return TEAM_ID.exec(decoded)?.[1]?.toLowerCase() ?? null;
}

export function alignRoomHref(room: AlignRoom, teamId: string | null): string {
  if (room === "ich") return "/me/profile";
  if (!teamId) return "/connections";
  const base = `/teams/${encodeURIComponent(teamId)}`;
  return room === "wir" ? base : `${base}/setup`;
}

// ---------------------------------------------------------------------------
// Teamkarte: aus dem Befund der Faehigkeiten wird "da" oder "frei" - und sonst nichts.
// ---------------------------------------------------------------------------

export type TeamMapTile =
  | { kind: "held"; familyId: string; holders: string[] }
  | { kind: "free"; familyId: string };

/**
 * `covered` und `contested` haben jemanden, der das Feld verantworten will. `open` und `gap` haben
 * niemanden. `unspoken` ist KEINE Luecke, sondern ein Feld, ueber das nicht gesprochen wurde - es
 * erscheint hier gar nicht, sonst stuende dort eine Behauptung, die niemand getroffen hat.
 */
export function teamMapTiles(
  families: { familyId: string; state: "covered" | "contested" | "open" | "gap" | "unspoken"; claimants: string[] }[],
): TeamMapTile[] {
  const tiles: TeamMapTile[] = [];
  for (const family of families) {
    if ((family.state === "covered" || family.state === "contested") && family.claimants.length > 0) {
      tiles.push({ kind: "held", familyId: family.familyId, holders: family.claimants });
    } else if (family.state === "open" || family.state === "gap") {
      tiles.push({ kind: "free", familyId: family.familyId });
    }
  }
  return tiles;
}

export function initialOf(name: string | null | undefined) {
  const trimmed = (name ?? "").trim();
  return trimmed ? Array.from(trimmed)[0].toUpperCase() : "?";
}
