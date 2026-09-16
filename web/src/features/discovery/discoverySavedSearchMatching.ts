/**
 * Ob ein neues Suchprofil zu einer gespeicherten Suche passt.
 *
 * Dieselben Regeln wie in Connect: Die Kriterien setzt die Person, jedes
 * gesetzte muss zutreffen, und jeder Treffer traegt seine Gruende. Keine
 * Punktzahl, keine Rangfolge.
 *
 * WARUM DIE ALIGNMENT-DIMENSIONEN HIER NICHT VORKOMMEN:
 *
 * Sie sind Teil einer gespeicherten Suche, wirken aber erst beim Ansehen, und
 * das hat einen technischen Grund, den man nicht wegwuenschen kann: Die
 * Tendenz einer Person entsteht aus ihren Fragebogenantworten, berechnet von
 * der Scoring-Logik in TypeScript. Der Abgleich hier laeuft aber im Moment des
 * Veroeffentlichens - in der Sitzung der NEUEN Person, die die Antworten der
 * Suchenden nicht lesen darf und auch nicht lesen koennen soll.
 *
 * Die Alternativen waeren gewesen, die Scoring-Logik in SQL nachzubauen (zwei
 * Wahrheiten ueber dasselbe Modell) oder die Tendenzen vorab zu speichern
 * (abgeleitete Daten, die bei jeder Modelaenderung veralten). Beides waere
 * teurer als der Nutzen.
 *
 * Deshalb: Die Meldung nennt die strukturellen Treffer. Die Alignment-Tendenz
 * erscheint, wenn die suchende Person hinsieht - dort, wo ihre eigenen
 * Antworten verfuegbar sind, und mit derselben Zurueckhaltung wie bisher:
 * gleiche Tendenz, andere Tendenz, zu wenig Daten.
 */

export type DiscoverySavedSearchCriteria = {
  id: string;
  userId: string;
  query: string;
  topics: string[];
  industries: string[];
  locations: string[];
  remoteMode: string | null;
  capabilityAreaIds: string[];
  alignmentDimensions: string[];
};

export type SearchableDiscoveryProfile = {
  userId: string;
  displayName: string;
  headline: string;
  ownRoles: string[];
  expertise: string[];
  industries: string[];
  locationLabel: string | null;
  remoteMode: string | null;
  /** Freigegebene Capability-Bereiche; leer heisst nicht freigegeben. */
  capabilityAreaIds: string[];
};

export type DiscoverySavedSearchReason =
  | { key: "query"; value: string }
  | { key: "role"; value: string }
  | { key: "expertise"; value: string }
  | { key: "industry"; value: string }
  | { key: "location"; value: string }
  | { key: "remote"; value: string }
  | { key: "capability"; value: string };

export type DiscoverySavedSearchMatch = {
  searchId: string;
  userId: string;
  reasons: DiscoverySavedSearchReason[];
  /**
   * Ob diese Suche zusaetzlich einen Alignment-Filter traegt. Die Meldung sagt
   * das dazu, damit niemand ueberrascht ist, wenn die Liste beim Ansehen
   * kuerzer ist als die Zahl in der Mail.
   */
  hasAlignmentFilter: boolean;
};

const normalize = (value: string) => value.trim().toLowerCase();

function firstOverlap(wanted: string[], present: string[]) {
  const have = new Set(present.map(normalize));
  return wanted.find((value) => have.has(normalize(value))) ?? null;
}

function containsTerm(profile: SearchableDiscoveryProfile, term: string) {
  const haystack = [
    profile.headline,
    ...profile.expertise,
    ...profile.industries,
    ...profile.ownRoles,
    profile.locationLabel ?? "",
  ]
    .join(" ")
    .toLocaleLowerCase("de-DE");
  return haystack.includes(term.toLocaleLowerCase("de-DE"));
}

export function matchDiscoverySavedSearch(
  criteria: DiscoverySavedSearchCriteria,
  profile: SearchableDiscoveryProfile
): DiscoverySavedSearchMatch | null {
  if (criteria.userId === profile.userId) return null;

  const reasons: DiscoverySavedSearchReason[] = [];

  const term = criteria.query.trim();
  if (term) {
    if (!containsTerm(profile, term)) return null;
    reasons.push({ key: "query", value: term });
  }

  // "topics" traegt in Discovery die gesuchte Expertise - dasselbe Feld, ein
  // anderer Gegenstand.
  if (criteria.topics.length) {
    const hit = firstOverlap(criteria.topics, [...profile.expertise, ...profile.ownRoles]);
    if (!hit) return null;
    reasons.push({ key: "expertise", value: hit });
  }

  if (criteria.industries.length) {
    const hit = firstOverlap(criteria.industries, profile.industries);
    if (!hit) return null;
    reasons.push({ key: "industry", value: hit });
  }

  if (criteria.locations.length) {
    const label = profile.locationLabel ?? "";
    const hit = criteria.locations.find((location) =>
      label.toLocaleLowerCase("de-DE").includes(normalize(location))
    );
    if (!hit) return null;
    reasons.push({ key: "location", value: hit });
  }

  if (criteria.remoteMode) {
    if (profile.remoteMode !== criteria.remoteMode && profile.remoteMode !== "flexible") {
      return null;
    }
    reasons.push({ key: "remote", value: criteria.remoteMode });
  }

  if (criteria.capabilityAreaIds.length) {
    const hit = firstOverlap(criteria.capabilityAreaIds, profile.capabilityAreaIds);
    if (!hit) return null;
    reasons.push({ key: "capability", value: hit });
  }

  if (!reasons.length) return null;

  return {
    searchId: criteria.id,
    userId: criteria.userId,
    reasons,
    hasAlignmentFilter: criteria.alignmentDimensions.length > 0,
  };
}

export function matchDiscoverySavedSearches(
  searches: DiscoverySavedSearchCriteria[],
  profile: SearchableDiscoveryProfile
) {
  return searches
    .map((criteria) => matchDiscoverySavedSearch(criteria, profile))
    .filter((match): match is DiscoverySavedSearchMatch => match !== null);
}
