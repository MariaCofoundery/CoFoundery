import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Stärken und Antrieb im Team (eigene Freigabe).
 *
 * Gelesen wird ausschließlich über `get_team_strengths_overview`: Die Datenbank prüft die aktuelle Mitgliedschaft
 * und liefert nur, was Mitglieder freigegeben haben. Hier wird nichts zusammengesetzt, nichts gezählt und nichts
 * über Personen gesagt, die nicht geteilt haben.
 */
export type TeamStrengthsPerson = {
  personId: string;
  name: string;
  isViewer: boolean;
  strengths: { label: string | null; statement: string }[];
  direction: { facet: string; statement: string }[];
};

export type TeamStrengthsOverview = {
  ownShared: boolean;
  people: TeamStrengthsPerson[];
};

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

/** `null`: kein aktuelles Mitglied oder nicht lesbar - dann wird nichts über das Team verraten. */
export async function getTeamStrengthsOverview(client: SupabaseClient, teamId: string): Promise<TeamStrengthsOverview | null> {
  const { data, error } = await client.rpc("get_team_strengths_overview", { p_team_id: teamId });
  if (error || !data || typeof data !== "object") return null;
  const raw = data as { own_shared?: unknown; people?: unknown };
  const people = Array.isArray(raw.people) ? raw.people : [];
  return {
    ownShared: raw.own_shared === true,
    people: people.flatMap((entry): TeamStrengthsPerson[] => {
      if (!entry || typeof entry !== "object") return [];
      const person = entry as Record<string, unknown>;
      const strengths = Array.isArray(person.strengths) ? person.strengths : [];
      const direction = Array.isArray(person.direction) ? person.direction : [];
      return [
        {
          personId: text(person.person_id),
          name: text(person.name) || "Founder",
          isViewer: person.is_viewer === true,
          strengths: strengths.flatMap((item) => {
            const row = item as Record<string, unknown>;
            return text(row?.statement) ? [{ label: text(row.label) || null, statement: text(row.statement) }] : [];
          }),
          direction: direction.flatMap((item) => {
            const row = item as Record<string, unknown>;
            return text(row?.statement) ? [{ facet: text(row.facet), statement: text(row.statement) }] : [];
          }),
        },
      ];
    }),
  };
}
