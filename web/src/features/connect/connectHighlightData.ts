import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ConnectListing, ConnectProfile, ConnectVenture } from "./connectTypes";

/**
 * Das Highlight-Feld: ein Blick auf etwas, das man nicht gesucht hat.
 *
 * Die Uebersicht zeigt Anzeigen nach Aktualitaet. Wer nicht taeglich
 * hereinschaut, sieht damit immer nur den oberen Rand - und nie das
 * Unternehmen, das vor drei Wochen dazukam, oder den Menschen, dessen Profil
 * gut passt, aber keine Anzeige hat.
 *
 * ZUFALL UND NICHT PASSUNG. Was hier erscheint, wird gemischt und nicht
 * bewertet. Eine Rangfolge waere genau das, was dieses Produkt an allen
 * anderen Stellen vermeidet - und sie waere hier besonders heikel, weil ein
 * Highlight wie eine Empfehlung DES HAUSES gelesen wird.
 *
 * DIE EHRLICHE GRENZE DES VERFAHRENS: Gemischt wird aus einem Fenster der
 * jeweils neuesten Eintraege, nicht aus dem gesamten Bestand. Wer seit einem
 * Jahr dabei ist und nichts geaendert hat, erscheint also nicht. Das ist der
 * Preis dafuer, ohne `order by random()` ueber die ganze Tabelle auszukommen -
 * und bei einem Netzwerk dieser Groesse noch kein Problem. Sobald das Fenster
 * kleiner ist als der Bestand, gehoert hier ein zufaelliger Versatz hin.
 *
 * WAS SPAETER DAZUKOMMT, und wofuer der Platz schon steht:
 *
 *   `disclosure` sagt, WARUM etwas hier steht. Heute immer "none": Zufall
 *   braucht keine Erklaerung. Fuer bezahlte Plaetze ist die Kennzeichnung
 *   nicht Geschmackssache, sondern Pflicht (§ 5a UWG) - deshalb steht das Feld
 *   von Anfang an im Typ und wird von Anfang an angezeigt. Ein Feld, das erst
 *   mit dem Geld dazukommt, wird beim Einbau vergessen.
 */

export const HIGHLIGHT_KINDS = ["seeking", "offering", "venture", "person"] as const;
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
  disclosure: HighlightDisclosure;
};

/** Aus wie vielen der neuesten Eintraege je Sorte gemischt wird. */
const WINDOW = 30;

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
  const [listingResult, ventureResult, personResult] = await Promise.all([
    client
      .from("network_listings")
      .select("*")
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(WINDOW),
    client
      .from("network_ventures")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(WINDOW),
    client
      .from("network_profiles")
      .select("*")
      .eq("status", "active")
      // Kein Ausschluss der eigenen Person mehr (21.09.2026): Sich selbst
      // im Highlight zu sehen ist eine kleine Freude, und die Karte sagt
      // dazu, dass es die eigene ist.
      .order("published_at", { ascending: false })
      .limit(WINDOW),
  ]);

  const listings = (listingResult.data ?? []) as ConnectListing[];
  const ventures = (ventureResult.data ?? []) as ConnectVenture[];
  const people = (personResult.data ?? []) as ConnectProfile[];

  const ownerIds = [...new Set([
    ...listings.map((listing) => listing.owner_user_id),
    ...ventures.map((venture) => venture.owner_user_id),
    ...people.map((person) => person.user_id),
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
  const chosen = pickAcrossKinds(candidates, limit);

  await attachWhatPeopleHave(client, chosen);
  return chosen;
}

/**
 * Reihum durch die Sorten, innerhalb jeder Sorte zufaellig.
 *
 * Die Sortenfolge selbst ist auch gemischt - sonst stuende immer ein Gesuch
 * vorn, und die Reihenfolge waere eine Rangfolge.
 *
 * Exportiert, damit der Test die Mischung wirklich ausfuehren kann und nicht
 * nur im Quelltext nachliest, dass sie da steht.
 */
export function pickAcrossKinds(candidates: ConnectHighlight[], limit: number) {
  const byKind = new Map<HighlightKind, ConnectHighlight[]>();
  for (const candidate of candidates) {
    byKind.set(candidate.kind, [...(byKind.get(candidate.kind) ?? []), candidate]);
  }

  const queues = shuffle([...byKind.keys()]).map((kind) => shuffle(byKind.get(kind) ?? []));
  const chosen: ConnectHighlight[] = [];

  while (chosen.length < limit && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      if (chosen.length >= limit) break;
      const next = queue.shift();
      if (next) chosen.push(next);
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
