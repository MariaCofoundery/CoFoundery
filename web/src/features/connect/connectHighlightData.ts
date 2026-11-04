import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ConnectListing, ConnectProfile, ConnectVenture, ConnectProblem } from "./connectTypes";

/**
 * Neutrale Discovery: je Objektgruppe höchstens 30 aktuell zulässige Kandidaten.
 * RLS, Mitgliedschaft, Status, Blockierung und Consent werden vor dem Limit geprüft.
 * Die Auswahl mischt Objektarten und zeigt höchstens eine Karte je Besitzer.
 * Das ist weder personalisiertes Ranking noch eine Auswahl aus dem Gesamtbestand.
 */

export const HIGHLIGHT_KINDS = ["seeking", "offering", "venture", "person", "problem"] as const;
export type HighlightKind = (typeof HIGHLIGHT_KINDS)[number];

/** Warum steht das hier? */
export const HIGHLIGHT_DISCLOSURES = ["none", "editorial", "sponsored"] as const;
export type HighlightDisclosure = (typeof HIGHLIGHT_DISCLOSURES)[number];

export type ConnectHighlight = {
  kind: HighlightKind;
  id: string;
  title: string;
  text: string;
  href: string;
  /** Der Mensch dahinter - bei einem Profil ist er der Eintrag selbst. */
  person: ConnectProfile | null;
  /**
   * Was dieser Mensch mitbringt - nur bei `kind: "person"` gefuellt.
   *
   * GEWUENSCHT AM 21.09.2026: "Wenn dann ein Mensch gehighlightet wird, dann
   * koennen da irgendwie auch die Unternehmen drinstehen oder ich suche, ich
   * biete." Eine Karte, die nur Name und Zeile zeigt, sagt nicht, warum man
   * klicken sollte.
   */
  has: { ventures: number; offering: number; seeking: number } | null;
  /**
   * Bin ich das selbst?
   *
   * GEWUENSCHT AM 21.09.2026: "Ich finde auch voellig okay, wenn man selber
   * gerade im Highlight ist, dass man sich selber auch sieht. Dann kann man
   * sich ein bisschen freuen." Also wird nichts mehr ausgeschlossen - aber die
   * Karte sagt es, sonst wundert man sich, warum da der eigene Name steht.
   */
  isOwn: boolean;
  /**
   * "none" heisst: aus dem Zufall gezogen - und auch das steht auf der Karte.
   * "editorial" und "sponsored" kommen aus einem Platz der Verwaltung.
   */
  disclosure: HighlightDisclosure;
  /** Warum wir es empfehlen - nur bei "editorial" und nur, wenn eingetragen. */
  note: string | null;
  /** Eine angepinnte Empfehlung steht immer vorn. Nur bei "editorial". */
  pinned?: boolean;
};

/** Aus wie vielen der neuesten Eintraege je Sorte gemischt wird. */
// The DB applies eligibility before its bounded 30-row window.

function shuffle<T>(items: T[]) {
  // Fisher-Yates. Kein sort(() => Math.random() - 0.5): Das ist nicht
  // gleichverteilt und je nach Sortierverfahren sogar stabil.
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

export async function getConnectHighlights(
  client: SupabaseClient,
  currentUserId: string,
  limit = 3
): Promise<ConnectHighlight[]> {
  const [listingResult, ventureResult, personResult, problemResult, placementResult] = await Promise.all([
    client.rpc("list_connect_highlight_candidates", { p_kind: "listing" }),
    client.rpc("list_connect_highlight_candidates", { p_kind: "venture" }),
    client.rpc("list_connect_highlight_candidates", { p_kind: "person" }),
    client.rpc("list_connect_highlight_candidates", { p_kind: "problem" }),
    // Plaetze der Verwaltung. Fehlt die Antwort, bleibt es beim Zufall.
    client.rpc("list_connect_highlight_placements"),
  ]);
  const placements = ((placementResult.error ? [] : placementResult.data) ?? []) as HighlightPlacementRow[];
  const listings = (listingResult.data ?? []) as ConnectListing[];
  const ventures = (ventureResult.data ?? []) as ConnectVenture[];
  const people = (personResult.data ?? []) as ConnectProfile[];
  const problems = (problemResult.data ?? []) as ConnectProblem[];

  const ownerIds = [...new Set([
    ...listings.map((listing) => listing.owner_user_id),
    ...ventures.map((venture) => venture.owner_user_id),
    ...people.map((person) => person.user_id),
    ...problems.flatMap((problem) => problem.author_user_id ? [problem.author_user_id] : []),
    ...placements.flatMap(placementOwnerId),
  ])];
  if (!ownerIds.length) return [];
  const { data: owners, error: ownerError } = await client.rpc("get_connect_highlight_owners", { p_user_ids: ownerIds });
  // Missing consent, membership or block information must never allow a card.
  if (ownerError || !owners) return [];
  const profileByUserId = new Map((owners as ConnectProfile[]).map((person) => [person.user_id, person]));

  const candidates: ConnectHighlight[] = [];

  for (const listing of listings) {
    const kind: HighlightKind = listing.direction === "seeking" ? "seeking" : "offering";
    const owner = profileByUserId.get(listing.owner_user_id);
    if (!owner) continue;

    candidates.push({
      kind,
      id: listing.id,
      title: listing.title,
      text: listing.summary,
      href: `/connect/listings/${listing.id}`,
      person: owner,
      has: null,
      isOwn: listing.owner_user_id === currentUserId,
      disclosure: "none",
      note: null,
    });
  }

  for (const venture of ventures) {
    if (!profileByUserId.has(venture.owner_user_id)) continue;
    candidates.push({
      kind: "venture",
      id: venture.id,
      title: venture.name,
      text: venture.what_it_does,
      // GEAENDERT AM 21.09.2026: Vorher fuehrte der Klick auf den Menschen -
      // es gab keine Unternehmensseite. Jetzt gibt es sie, und wer auf ein
      // Unternehmen klickt, will das Unternehmen sehen. Der Mensch steht dort
      // unten und verlinkt.
      href: `/connect/ventures/${venture.id}`,
      person: profileByUserId.get(venture.owner_user_id) ?? null,
      has: null,
      isOwn: venture.owner_user_id === currentUserId,
      disclosure: "none",
      note: null,
    });
  }

  for (const person of people) {
    if (!profileByUserId.has(person.user_id)) continue;
    candidates.push({
      kind: "person",
      id: person.user_id,
      title: person.display_name,
      text: person.headline,
      href: `/connect/people/${person.user_id}`,
      person,
      // Wird nach dem Mischen nachgeladen - nur fuer die drei, die uebrig
      // bleiben. Fuer dreissig Profile zu zaehlen, um drei zu zeigen, waere
      // Arbeit fuer den Papierkorb.
      has: { ventures: 0, offering: 0, seeking: 0 },
      isOwn: person.user_id === currentUserId,
      disclosure: "none",
      note: null,
    });
  }

  // ERST JE SORTE, DANN AUFFUELLEN.
  //
  // GEMELDET AM 21.09.2026: "Ich glaube, dass die Highlights immer noch nur
  // Unternehmen anzeigen." Das war kein Datenproblem, sondern diese Stelle:
  // Vorher wurden ALLE Kandidaten in einen Topf geworfen und drei gezogen. Wer
  // zwanzig Unternehmen und zwei Anzeigen hat, bekommt damit fast immer drei
  // Unternehmen - der Zufall gibt die Mehrheit wieder, und die Mehrheit ist
  // nicht die Absicht.
  //
  // Jetzt reihum: aus jeder Sorte einer, in zufaelliger Sortenfolge, und erst
  // wenn eine Sorte leer ist, ruecken die anderen nach. Bei drei Plaetzen und
  // vier Sorten sieht man damit drei VERSCHIEDENE Dinge, sobald es sie gibt.
  for (const problem of problems) {
    const owner = problem.author_user_id ? profileByUserId.get(problem.author_user_id) : null;
    if (!owner) continue;
    candidates.push({ kind: "problem", id: problem.id, title: problem.title, text: problem.description,
      href: `/connect/problems/${problem.id}`, person: owner, has: null,
      isOwn: owner.user_id === currentUserId, disclosure: "none", note: null });
  }

  // FESTE PLAETZE, DANN ROTATION (Maria, 04.11.2026: "die Plaetze sollen
  // rotieren - es sei denn, das eine angepinnte, das soll immer dastehen").
  // Fest sind nur die angepinnte Empfehlung und hoechstens eine laufende
  // Anzeige. Alle anderen Plaetze werden bei jedem Aufruf neu gezogen - aus
  // den normalen Eintraegen UND den uebrigen Empfehlungen, die dabei ein
  // etwas hoeheres Gewicht haben. Jede Karte traegt ihre Kennzeichnung. Die
  // Besitzer der festen Plaetze werden aus der Ziehung genommen, damit
  // niemand zweimal in einer Reihe steht. Gemischt wird zum Schluss: Die
  // Reihenfolge ist keine Rangfolge, auch fuer eine Anzeige nicht.
  const placementHighlights = placements.flatMap((row) => {
    const highlight = placementToHighlight(row, profileByUserId, currentUserId);
    return highlight ? [highlight] : [];
  });
  const placed = pickPlacements(placementHighlights, limit);
  const placedOwners = new Set(placed.flatMap((highlight) => highlight.person ? [highlight.person.user_id] : []));
  const notPlaced = (highlight: ConnectHighlight) => !highlight.person || !placedOwners.has(highlight.person.user_id);
  const chosen = orderHighlights([
    ...placed,
    ...pickAcrossKinds(
      rotationPool(
        labelPlacedCandidates(candidates.filter(notPlaced), placementHighlights),
        placementHighlights.filter((highlight) => highlight.disclosure === "editorial" && !highlight.pinned).filter(notPlaced)
      ),
      limit - placed.length
    ),
  ]);

  await attachWhatPeopleHave(client, chosen);
  return chosen;
}

type HighlightPlacementRow = {
  placement_id: string;
  source: "editorial" | "sponsored";
  note: string | null;
  pinned?: boolean;
  kind: "listing" | "venture" | "person" | "problem";
  item: ConnectListing | ConnectVenture | ConnectProfile | ConnectProblem;
};

function placementOwnerId(row: HighlightPlacementRow): string[] {
  const item = row.item as unknown as Record<string, string | null>;
  const owner = row.kind === "person" ? item.user_id : row.kind === "problem" ? item.author_user_id : item.owner_user_id;
  return owner ? [owner] : [];
}

/** Ein Platz der Verwaltung als Karte - ohne den Besitzer (Freigabe) gibt es keine. */
function placementToHighlight(
  row: HighlightPlacementRow,
  profileByUserId: Map<string, ConnectProfile>,
  currentUserId: string
): ConnectHighlight | null {
  const [ownerId] = placementOwnerId(row);
  const owner = ownerId ? profileByUserId.get(ownerId) : null;
  if (!owner) return null;
  const base = {
    person: owner,
    isOwn: owner.user_id === currentUserId,
    disclosure: row.source,
    note: row.source === "editorial" ? row.note : null,
    pinned: row.source === "editorial" && row.pinned === true,
  } as const;
  if (row.kind === "listing") {
    const listing = row.item as ConnectListing;
    return { ...base, kind: listing.direction === "seeking" ? "seeking" : "offering", id: listing.id, title: listing.title,
      text: listing.summary, href: `/connect/listings/${listing.id}`, has: null };
  }
  if (row.kind === "venture") {
    const venture = row.item as ConnectVenture;
    return { ...base, kind: "venture", id: venture.id, title: venture.name, text: venture.what_it_does,
      href: `/connect/ventures/${venture.id}`, has: null };
  }
  if (row.kind === "problem") {
    const problem = row.item as ConnectProblem;
    return { ...base, kind: "problem", id: problem.id, title: problem.title, text: problem.description,
      href: `/connect/problems/${problem.id}`, has: null };
  }
  const person = row.item as ConnectProfile;
  return { ...base, kind: "person", id: person.user_id, title: person.display_name, text: person.headline,
    href: `/connect/people/${person.user_id}`, has: { ventures: 0, offering: 0, seeking: 0 } };
}

/**
 * Die festen Plaetze: eine angepinnte Empfehlung steht immer da, dazu hoechstens eine Anzeige - nie
 * zwei Karten desselben Menschen. Alles andere rotiert (`rotationPool`).
 *
 * Exportiert, damit der Test die Regel ausfuehren kann.
 */
export function pickPlacements(placed: ConnectHighlight[], limit: number) {
  const chosen: ConnectHighlight[] = [];
  const owners = new Set<string>();
  const take = (highlight: ConnectHighlight | undefined) => {
    if (!highlight?.person || owners.has(highlight.person.user_id) || chosen.length >= limit) return false;
    owners.add(highlight.person.user_id);
    chosen.push(highlight);
    return true;
  };
  // Hoechstens eine angepinnte Empfehlung (das Anpinnen ersetzt eine fruehere).
  take(placed.find((highlight) => highlight.disclosure === "editorial" && highlight.pinned));
  // Hoechstens eine Anzeige.
  for (const highlight of shuffle(placed.filter((entry) => entry.disclosure === "sponsored"))) {
    if (take(highlight)) break;
  }
  return chosen;
}

/** Wie viel haeufiger eine Empfehlung in der Rotation gezogen wird als ein normaler Eintrag. */
export const EDITORIAL_WEIGHT = 2;

/**
 * Der Topf fuer die rotierenden Plaetze: die normalen Kandidaten und die nicht angepinnten
 * Empfehlungen (die nicht schon als Kandidat drinstehen), jede mit ihrer Kennzeichnung. Die
 * Reihenfolge ist eine gewichtete Ziehung (Efraimidis-Spirakis): Empfehlungen liegen haeufiger vorn,
 * aber nie sicher.
 */
export function rotationPool(candidates: ConnectHighlight[], editorial: ConnectHighlight[], random: () => number = Math.random) {
  const seen = new Set(candidates.map((candidate) => `${candidate.kind}:${candidate.id}`));
  const pool = [...candidates, ...editorial.filter((highlight) => !seen.has(`${highlight.kind}:${highlight.id}`))];
  return pool
    .map((highlight) => ({ highlight, key: Math.pow(random(), 1 / (highlight.disclosure === "editorial" ? EDITORIAL_WEIGHT : 1)) }))
    .sort((a, b) => b.key - a.key)
    .map((entry) => entry.highlight);
}

/**
 * Ein Eintrag mit laufendem Platz traegt dessen Kennzeichnung auch dann, wenn ihn der Zufall zieht -
 * eine Empfehlung bleibt eine Empfehlung, und eine Anzeige ist nie "zufällig ausgewählt".
 */
export function labelPlacedCandidates(candidates: ConnectHighlight[], placements: ConnectHighlight[]) {
  const byItem = new Map(placements.map((placement) => [`${placement.kind}:${placement.id}`, placement]));
  return candidates.map((candidate) => {
    const placement = byItem.get(`${candidate.kind}:${candidate.id}`);
    return placement ? { ...candidate, disclosure: placement.disclosure, note: placement.note, pinned: placement.pinned } : candidate;
  });
}

/**
 * Die Reihenfolge der Karten: Gemischt, nur eine angepinnte Empfehlung steht
 * vorn. Sonst ist die Reihenfolge keine Rangfolge - auch fuer eine Anzeige nicht.
 */
export function orderHighlights(items: ConnectHighlight[]) {
  const mixed = shuffle(items);
  return [...mixed.filter((item) => item.pinned), ...mixed.filter((item) => !item.pinned)];
}

export function pickAcrossKinds(candidates: ConnectHighlight[], limit: number) {
  const byKind = new Map<HighlightKind, ConnectHighlight[]>();
  for (const candidate of candidates) {
    byKind.set(candidate.kind, [...(byKind.get(candidate.kind) ?? []), candidate]);
  }

  // Die Sorten in zufaelliger Folge; innerhalb einer Sorte gilt die Reihenfolge des Topfs
  // (`rotationPool` hat schon gewichtet gezogen).
  const queues = shuffle([...byKind.keys()]).map((kind) => [...(byKind.get(kind) ?? [])]);
  const chosen: ConnectHighlight[] = [];
  const owners = new Set<string>();

  while (chosen.length < limit && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      if (chosen.length >= limit) break;
      const next = queue.shift();
      if (next && next.person && !owners.has(next.person.user_id)) { owners.add(next.person.user_id); chosen.push(next); }
    }
  }

  return chosen;
}

/**
 * Zaehlt fuer die ausgewaehlten Menschen, was sie eingestellt haben.
 *
 * ERST NACH DEM MISCHEN: Es sind hoechstens drei Personen, also zwei kleine
 * Abfragen. Vorher zu zaehlen hiesse, fuer dreissig Profile zu rechnen, um
 * drei zu zeigen.
 *
 * Gezaehlt wird nur Veroeffentlichtes - ein Entwurf ist fuer niemanden
 * sichtbar, also auch nicht als Zahl.
 */
async function attachWhatPeopleHave(client: SupabaseClient, highlights: ConnectHighlight[]) {
  const personIds = highlights
    .filter((highlight) => highlight.kind === "person")
    .map((highlight) => highlight.id);
  if (personIds.length === 0) return;

  const [ventureResult, listingResult] = await Promise.all([
    client
      .from("network_ventures")
      .select("owner_user_id")
      .in("owner_user_id", personIds)
      .eq("status", "active"),
    client
      .from("network_listings")
      .select("owner_user_id, direction")
      .in("owner_user_id", personIds)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString()),
  ]);

  for (const highlight of highlights) {
    if (highlight.kind !== "person" || !highlight.has) continue;
    const ventures = (ventureResult.data ?? []) as { owner_user_id: string }[];
    const listings = (listingResult.data ?? []) as { owner_user_id: string; direction: string }[];

    highlight.has = {
      ventures: ventures.filter((row) => row.owner_user_id === highlight.id).length,
      offering: listings.filter(
        (row) => row.owner_user_id === highlight.id && row.direction === "offering"
      ).length,
      seeking: listings.filter(
        (row) => row.owner_user_id === highlight.id && row.direction === "seeking"
      ).length,
    };
  }
}
