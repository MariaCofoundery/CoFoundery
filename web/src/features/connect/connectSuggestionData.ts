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
  kind: "listing" | "venture" | "problem";
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
};

/** Legt neue an, soweit das Wochenbudget es zulaesst. Fehler sind stumm. */
export async function generateConnectSuggestions(client: SupabaseClient) {
  await client.rpc("generate_connect_suggestions", { p_limit: 3 });
}

export async function getOwnConnectSuggestions(
  client: SupabaseClient
): Promise<ConnectSuggestion[]> {
  const { data, error } = await client
    .from("connect_suggestions")
    .select(
      "id, listing_id, venture_id, problem_id, subject_owner_user_id, matched_terms," +
        " network_listings(id, title, summary)," +
        " network_ventures(id, name, what_it_does)," +
        " network_problems(id, title, description)"
    )
    .is("dismissed_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as unknown as Row[]).flatMap((row): ConnectSuggestion[] => {
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
        // Es gibt keine eigene Unternehmensseite - der Weg fuehrt zu dem
        // Menschen, und das ist ohnehin das Ziel.
        href: `/connect/people/${row.subject_owner_user_id}`,
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
