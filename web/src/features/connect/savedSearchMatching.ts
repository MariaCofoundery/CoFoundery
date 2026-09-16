/**
 * Ob ein neuer Eintrag zu einer gespeicherten Suche passt - und warum.
 *
 * Drei Regeln, die das Ergebnis vom "Match" unterscheiden, den dieses Produkt
 * nicht haben will:
 *
 *   Die Kriterien stammen von der suchenden Person. Das System prueft, ob sie
 *   erfuellt sind. Es bewertet niemanden.
 *
 *   Jedes gesetzte Kriterium muss zutreffen, nicht moeglichst viele. Es gibt
 *   keine Punktzahl, die man ueberschreiten kann, und nichts, das durch drei
 *   schwache Treffer zu einem starken wird.
 *
 *   Jeder Treffer traegt seine Gruende. Wer eine Meldung bekommt, soll sehen,
 *   welches seiner Kriterien zutraf - nicht nur, dass etwas zutraf.
 */

export type SavedSearchCriteria = {
  id: string;
  userId: string;
  query: string;
  topics: string[];
  industries: string[];
  locations: string[];
  geographicScope: string | null;
  remoteMode: string | null;
  capabilityAreaIds: string[];
  connectDirection: string | null;
  connectCategory: string | null;
  includeListings: boolean;
  includeProblems: boolean;
};

/** Was verglichen wird - Anzeige oder Problem, auf einen Nenner gebracht. */
export type SearchableConnectSubject = {
  kind: "listing" | "problem";
  id: string;
  ownerUserId: string;
  title: string;
  summary: string;
  topics: string[];
  industries: string[];
  locations: string[];
  geographicScope: string | null;
  remoteMode: string | null;
  direction: string | null;
  category: string | null;
  /**
   * Die Capability-Bereiche der einstellenden Person, soweit sie sie
   * freigegeben hat. Leer heisst: nicht freigegeben oder nicht eingetragen -
   * beides fuehrt dazu, dass ein Faehigkeiten-Kriterium nicht zutrifft. Wir
   * raten nicht aus dem Text.
   */
  capabilityAreaIds: string[];
};

export type SavedSearchMatch = {
  searchId: string;
  userId: string;
  /** Schluessel fuer die Anzeige, damit die Gruende uebersetzbar bleiben. */
  reasons: SavedSearchReason[];
};

export type SavedSearchReason =
  | { key: "query"; value: string }
  | { key: "topic"; value: string }
  | { key: "industry"; value: string }
  | { key: "location"; value: string }
  | { key: "scope"; value: string }
  | { key: "remote"; value: string }
  | { key: "capability"; value: string }
  | { key: "direction"; value: string }
  | { key: "category"; value: string };

const normalize = (value: string) => value.trim().toLowerCase();

function containsTerm(subject: SearchableConnectSubject, term: string) {
  const haystack = [
    subject.title,
    subject.summary,
    ...subject.topics,
    ...subject.industries,
    ...subject.locations,
  ]
    .join(" ")
    .toLocaleLowerCase("de-DE");
  return haystack.includes(term.toLocaleLowerCase("de-DE"));
}

function firstOverlap(wanted: string[], present: string[]) {
  const have = new Set(present.map(normalize));
  return wanted.find((value) => have.has(normalize(value))) ?? null;
}

/**
 * Prueft eine Suche gegen einen Eintrag.
 *
 * Gibt null zurueck, wenn ein gesetztes Kriterium nicht zutrifft - und nicht
 * etwa einen schwachen Treffer. Wer drei Kriterien setzt, will alle drei.
 */
export function matchSavedSearch(
  criteria: SavedSearchCriteria,
  subject: SearchableConnectSubject
): SavedSearchMatch | null {
  // Niemand wird ueber den eigenen Eintrag benachrichtigt.
  if (criteria.userId === subject.ownerUserId) return null;

  if (subject.kind === "listing" && !criteria.includeListings) return null;
  if (subject.kind === "problem" && !criteria.includeProblems) return null;

  const reasons: SavedSearchReason[] = [];

  const term = criteria.query.trim();
  if (term) {
    if (!containsTerm(subject, term)) return null;
    reasons.push({ key: "query", value: term });
  }

  if (criteria.topics.length) {
    const hit = firstOverlap(criteria.topics, subject.topics);
    if (!hit) return null;
    reasons.push({ key: "topic", value: hit });
  }

  if (criteria.industries.length) {
    const hit = firstOverlap(criteria.industries, subject.industries);
    if (!hit) return null;
    reasons.push({ key: "industry", value: hit });
  }

  if (criteria.locations.length) {
    const hit = firstOverlap(criteria.locations, subject.locations);
    if (!hit) return null;
    reasons.push({ key: "location", value: hit });
  }

  if (criteria.geographicScope) {
    if (subject.geographicScope !== criteria.geographicScope) return null;
    reasons.push({ key: "scope", value: criteria.geographicScope });
  }

  if (criteria.remoteMode) {
    // "flexible" auf der Anzeige passt zu jedem Wunsch - so ist es dort auch
    // gemeint: die einstellende Person legt sich nicht fest.
    if (subject.remoteMode !== criteria.remoteMode && subject.remoteMode !== "flexible") {
      return null;
    }
    reasons.push({ key: "remote", value: criteria.remoteMode });
  }

  if (criteria.connectDirection) {
    if (subject.direction !== criteria.connectDirection) return null;
    reasons.push({ key: "direction", value: criteria.connectDirection });
  }

  if (criteria.connectCategory) {
    if (subject.category !== criteria.connectCategory) return null;
    reasons.push({ key: "category", value: criteria.connectCategory });
  }

  if (criteria.capabilityAreaIds.length) {
    const hit = firstOverlap(criteria.capabilityAreaIds, subject.capabilityAreaIds);
    if (!hit) return null;
    reasons.push({ key: "capability", value: hit });
  }

  // Ohne Grund keine Meldung. Das kann hier nicht passieren - die Datenbank
  // laesst eine leere Suche gar nicht zu -, aber eine Meldung ohne Begruendung
  // waere das Schlimmste, was diese Funktion ausliefern koennte.
  if (!reasons.length) return null;

  return { searchId: criteria.id, userId: criteria.userId, reasons };
}

export function matchSavedSearches(
  searches: SavedSearchCriteria[],
  subject: SearchableConnectSubject
) {
  return searches
    .map((criteria) => matchSavedSearch(criteria, subject))
    .filter((match): match is SavedSearchMatch => match !== null);
}
