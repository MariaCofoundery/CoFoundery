import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type GuessTallyRound = {
  roundId: string;
  experienceKey: "read_my_mind" | "founder_in_the_wild";
  packKey: string;
  completedAt: string | null;
  promptCount: number;
  ownHits: number;
  partnerHits: number;
};

export type GuessTallySummary = {
  rounds: GuessTallyRound[];
  totalPrompts: number;
  ownHits: number;
  partnerHits: number;
};

/**
 * Wie oft sich zwei Founder richtig eingeschaetzt haben.
 *
 * Kommt aus einer Datenbankfunktion, nicht aus der Seite: Die Antworten der
 * anderen Person sind absichtlich nicht frei lesbar - sie kommen einzeln ueber
 * den Reveal heraus. Eine Bilanz hier zu rechnen haette bedeutet, sie alle in
 * die Seite zu holen. get_collaboration_guess_tally gibt nur Zahlen zurueck.
 *
 * Packs ohne Raten kommen gar nicht erst vor; eine Bilanz "0 von 5" waere dort
 * eine Aussage, die niemand gemacht hat.
 */
export async function getCollaborationGuessTally(
  client: SupabaseClient,
  founderTeamId: string
): Promise<GuessTallySummary> {
  const empty: GuessTallySummary = { rounds: [], totalPrompts: 0, ownHits: 0, partnerHits: 0 };

  try {
    const { data, error } = await client.rpc("get_collaboration_guess_tally", {
      p_founder_team_id: founderTeamId,
    });
    if (error || !Array.isArray(data)) return empty;

    const rounds = (data as Record<string, unknown>[]).flatMap((row) => {
      const experienceKey = row.experience_key as GuessTallyRound["experienceKey"];
      if (experienceKey !== "read_my_mind" && experienceKey !== "founder_in_the_wild") return [];
      return [{
        roundId: String(row.round_id),
        experienceKey,
        packKey: String(row.pack_key),
        completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
        promptCount: Number(row.prompt_count ?? 0),
        ownHits: Number(row.own_hits ?? 0),
        partnerHits: Number(row.partner_hits ?? 0),
      }];
    });

    return {
      rounds,
      totalPrompts: rounds.reduce((sum, round) => sum + round.promptCount, 0),
      ownHits: rounds.reduce((sum, round) => sum + round.ownHits, 0),
      partnerHits: rounds.reduce((sum, round) => sum + round.partnerHits, 0),
    };
  } catch {
    // Eine Bilanz ist eine Beigabe. Faellt sie aus, laeuft die Runde weiter.
    return empty;
  }
}

/** Die Bilanz genau einer Runde, falls sie schon zaehlbar ist. */
export function findGuessTallyForRound(summary: GuessTallySummary, roundId: string) {
  return summary.rounds.find((round) => round.roundId === roundId) ?? null;
}
