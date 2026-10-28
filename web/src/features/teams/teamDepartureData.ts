import type { SupabaseClient } from "@supabase/supabase-js";

export const TEAM_DEPARTURE_CHOICES = ["continue", "dissolve", "later"] as const;
export type TeamDepartureChoice = (typeof TEAM_DEPARTURE_CHOICES)[number];

export const isTeamDepartureChoice = (value: unknown): value is TeamDepartureChoice =>
  typeof value === "string" && (TEAM_DEPARTURE_CHOICES as readonly string[]).includes(value);

export type OpenTeamDeparture = {
  id: string;
  leftAt: string;
  choices: Array<{ userId: string; choice: TeamDepartureChoice }>;
};

/**
 * Offene Austritte eines Teams mit den Wahlen der aktuellen Mitglieder.
 *
 * Lesen darf nur, wer aktuell im Team ist (Zeilensicherheit). Fehlt die Tabelle noch oder
 * schlaegt die Abfrage fehl, gibt es keine Karte - die Team-Seite bleibt benutzbar.
 */
export async function getOpenTeamDepartures(teamId: string, client: SupabaseClient): Promise<OpenTeamDeparture[]> {
  const { data: departures, error } = await client
    .from("team_departures")
    .select("id, left_at")
    .eq("team_id", teamId)
    .eq("status", "open")
    .order("left_at", { ascending: false });
  if (error || !departures?.length) return [];
  const { data: choices, error: choiceError } = await client
    .from("team_departure_choices")
    .select("departure_id, user_id, choice")
    .in("departure_id", departures.map((row) => String(row.id)));
  if (choiceError) return [];
  return departures.map((row) => ({
    id: String(row.id),
    leftAt: String(row.left_at),
    choices: (choices ?? [])
      .filter((entry) => entry.departure_id === row.id && isTeamDepartureChoice(entry.choice))
      .map((entry) => ({ userId: String(entry.user_id), choice: entry.choice as TeamDepartureChoice })),
  }));
}
