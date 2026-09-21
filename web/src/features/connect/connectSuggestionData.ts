import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ConnectProfile } from "./connectTypes";

/**
 * Die Vorschlaege an mich.
 *
 * ERZEUGT WERDEN SIE BEIM HINSEHEN. Es gibt in diesem Projekt keinen Cron, und
 * eine Handvoll Mengenschnitte braucht keinen: `generate_connect_suggestions`
 * laeuft, wenn jemand die Seite oeffnet, und legt hoechstens drei je Woche an.
 * Wer nicht hinsieht, bekommt auch keine - genau das heisst "nur in der
 * Plattform".
 *
 * Nichts davon geht per Mail hinaus. Dafuer gibt es (noch) keinen Weg, und das
 * ist Absicht: Ein Vorschlag geht nicht von einem Menschen aus, der sich
 * gemeldet hat - "an, bis man es abbestellt" waere hier die falsche
 * Voreinstellung. Der Schalter kommt zusammen mit dem Mailweg.
 */

export type ConnectSuggestion = {
  id: string;
  kind: "listing" | "venture" | "problem" | "person";
  subjectId: string;
  title: string;
  text: string;
  href: string;
  /** Die Woerter, die zum Treffer gefuehrt haben. Der Grund, als Daten. */
  matchedTerms: string[];
  owner: ConnectProfile | null;
};

type Row = {
  id: string;
  listing_id: string | null;
  venture_id: string | null;
  problem_id: string | null;
  subject_owner_user_id: string;
  matched_terms: string[];
  network_listings: { id: string; title: string; summary: string } | null;
  network_ventures: { id: string; name: string; what_it_does: string } | null;
  network_problems: { id: string; title: string; description: string } | null;
  person_user_id: string | null;
};

/** Legt neue an, soweit das Wochenbudget es zulaesst. Fehler sind stumm. */
export async function generateConnectSuggestions(client: SupabaseClient) {
  await client.rpc("generate_connect_suggestions", { p_limit: 3 });
}

/**
 * Wie viele offene Vorschlaege liegen.
 *
 * WOZU: Die Vorschlagsseite gab es seit dem 21.09.2026, und der Weg dorthin
 * stand in "Meine Sachen" - aber nichts sagte, dass dort etwas liegt. Ein Link
 * ohne Zahl beantwortet die Frage "wo sehe ich, wer mir vorgeschlagen wird?"
 * nur fuer den, der ohnehin nachsieht.
 *
 * Gezaehlt wird mit `head`, also ohne die Zeilen zu holen: Die Zahl steht in
 * einer Navigation, die auf mehreren Seiten gerendert wird.
 */
export async function countOpenConnectSuggestions(client: SupabaseClient) {
  const { count, error } = await client
    .from("connect_suggestions")
    .select("id", { count: "exact", head: true })
    .is("dismissed_at", null);

  // Bei einem Fehler null, und die Navigation zeigt dann keine Zahl: Ein Link
  // ohne Zahl ist harmlos, eine falsche Zahl an einem Link nicht.
  return error ? 0 : (count ?? 0);
}

export async function getOwnConnectSuggestions(
  client: SupabaseClient
): Promise<ConnectSuggestion[]> {
  const { data, error } = await client
    .from("connect_suggestions")
    .select(
      "id, listing_id, venture_id, problem_id, person_user_id, subject_owner_user_id, matched_terms," +
        " network_listings(id, title, summary)," +
        " network_ventures(id, name, what_it_does)," +
        " network_problems(id, title, description)"
    )
    .is("dismissed_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  const rows = data as unknown as Row[];

  // Die Profile in einer zweiten Abfrage und NICHT als Beziehung im select:
  // Der Fremdschluessel von person_user_id zeigt auf auth.users, nicht auf
  // network_profiles - PostgREST kann darueber nichts mitladen. Dasselbe
  // Muster wie im Unternehmensverzeichnis.
  const personIds = [...new Set(rows.map((row) => row.person_user_id).filter((id): id is string => Boolean(id)))];
  const personById = new Map<string, { user_id: string; display_name: string; headline: string }>();
  if (personIds.length > 0) {
    const { data: profiles } = await client
      .from("network_profiles")
      .select("user_id, display_name, headline")
      .in("user_id", personIds)
      .eq("status", "active");
    for (const profile of (profiles ?? []) as { user_id: string; display_name: string; headline: string }[]) {
      personById.set(profile.user_id, profile);
    }
  }

  return rows.flatMap((row): ConnectSuggestion[] => {
    const base = {
      id: row.id,
      matchedTerms: row.matched_terms,
      owner: null as ConnectProfile | null,
    };

    if (row.listing_id && row.network_listings) {
      return [{
        ...base,
        kind: "listing" as const,
        subjectId: row.network_listings.id,
        title: row.network_listings.title,
        text: row.network_listings.summary,
        href: `/connect/listings/${row.network_listings.id}`,
      }];
    }
    if (row.venture_id && row.network_ventures) {
      return [{
        ...base,
        kind: "venture" as const,
        subjectId: row.network_ventures.id,
        title: row.network_ventures.name,
        text: row.network_ventures.what_it_does,
        href: `/connect/ventures/${row.network_ventures.id}`,
      }];
    }
    if (row.person_user_id) {
      const person = personById.get(row.person_user_id);
      // Kein aktives Profil mehr: Der Vorschlag bleibt liegen, wird aber nicht
      // gezeigt - wie bei einem zurueckgezogenen Eintrag.
      if (!person) return [];
      return [{
        ...base,
        kind: "person" as const,
        subjectId: person.user_id,
        title: person.display_name,
        text: person.headline,
        href: `/connect/people/${person.user_id}`,
      }];
    }
    if (row.problem_id && row.network_problems) {
      return [{
        ...base,
        kind: "problem" as const,
        subjectId: row.network_problems.id,
        title: row.network_problems.title,
        text: row.network_problems.description,
        href: `/connect/problems/${row.network_problems.id}`,
      }];
    }
    // Zurueckgezogen, waehrend der Vorschlag lag. Die Zeile verschwindet per
    // Fremdschluessel; bis dahin wird sie nicht gezeigt.
    return [];
  });
}
