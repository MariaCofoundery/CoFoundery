import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Zu welchem Vorhaben gehören die Antworten dieser Person?
 *
 * ---------------------------------------------------------------------------
 * ES WIRD NICHTS ANGELEGT, WAS SCHON DA IST
 * ---------------------------------------------------------------------------
 *
 * Ein Vorhaben entsteht in dieser Anwendung ohnehin: Sobald eine Einladung
 * angenommen wird oder ein Vergleich über Discovery startet, legen zwei
 * Trigger einen `founder_teams`-Eintrag an und hängen ihn an die Beziehung.
 *
 * Maria am 29.09.2026: „Ein Team entsteht im Prinzip, wenn ich einen
 * Co-Founder einlade oder über Discovery mit jemandem in einen Vergleich gehen
 * will. Das gibt es ja schon.“ Stimmt - deshalb gibt es hier keine Seite
 * „Vorhaben anlegen“.
 *
 * ---------------------------------------------------------------------------
 * AUSSER FÜR DIE, DIE NOCH ALLEIN SIND
 * ---------------------------------------------------------------------------
 *
 * Wer noch niemanden eingeladen hat, hat kein Team - und könnte den
 * Venture-Bogen nicht ausfüllen. Gerade dort sind die Angaben zu Zeit, Geld
 * und Zielen aber oft die wichtigsten: Sie machen erst klar, wonach jemand
 * überhaupt sucht.
 *
 * Also wird eins angelegt. Es ist kein Platzhalter, sondern das Vorhaben - und
 * beim Annehmen der ersten Einladung wird es übernommen statt ersetzt
 * (Migration 20261076120000). Sonst hingen die Antworten an einem Vorhaben und
 * der Vergleich liefe auf einem anderen, ohne dass es jemand merkt.
 */

export type Venture = {
  id: string;
  name: string | null;
  teamContext: "pre_founder" | "existing_team";
  /** Ist diese Person hier noch allein? Dann fehlt der Vergleich, nicht die Antwort. */
  alone: boolean;
};

/**
 * Das Vorhaben dieser Person - oder null, wenn es mehrere gibt.
 *
 * MEHRERE SIND KEIN FEHLER, ABER AUCH KEINE ANTWORT. Wer in zwei Teams ist,
 * hat zwei Vorhaben, und welches gemeint ist, weiß nur er selbst. Dann muss
 * die Oberfläche fragen statt zu wählen.
 */
export async function findVentures(userId: string): Promise<Venture[]> {
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("founder_team_members")
    .select("team_id")
    .eq("user_id", userId);

  const ids = (memberships ?? []).map((row) => row.team_id as string);
  if (ids.length === 0) return [];

  const { data: teams } = await supabase
    .from("founder_teams")
    .select("id, name, team_context")
    .in("id", ids);

  const { data: others } = await supabase
    .from("founder_team_members")
    .select("team_id, user_id")
    .in("team_id", ids);

  return (teams ?? []).map((team) => ({
    id: team.id as string,
    name: (team.name as string | null) ?? null,
    teamContext: team.team_context as Venture["teamContext"],
    alone: !(others ?? []).some(
      (row) => row.team_id === team.id && row.user_id !== userId,
    ),
  }));
}

/**
 * Ein Vorhaben für jemanden, der noch keins hat.
 *
 * `pre_founder` als Kontext: Wer allein anfängt, ist per Definition noch nicht
 * in einem bestehenden Team. Beim Annehmen der ersten Einladung muss der
 * Kontext übereinstimmen, damit übernommen wird - eine falsche Voreinstellung
 * hier würde die Übernahme stillschweigend verhindern.
 */
export async function createVentureFor(userId: string): Promise<Venture | null> {
  const supabase = await createClient();

  const { data: team, error } = await supabase
    .from("founder_teams")
    .insert({ team_context: "pre_founder" })
    .select("id, name, team_context")
    .single();

  if (error || !team) return null;

  const { error: memberError } = await supabase
    .from("founder_team_members")
    .insert({ team_id: team.id, user_id: userId });

  // Ein Vorhaben ohne Mitglied waere ein Waisenkind: Niemand koennte es
  // spaeter finden, und die Uebernahme beim Einladen wuerde es nicht sehen.
  if (memberError) return null;

  return {
    id: team.id as string,
    name: (team.name as string | null) ?? null,
    teamContext: "pre_founder",
    alone: true,
  };
}

/**
 * Das Vorhaben, für das jetzt geantwortet wird.
 *
 * Genau eins → das. Keins → eins anlegen. Mehrere → null, und die Oberfläche
 * fragt. Raten wäre hier besonders teuer: Die Antworten landen dann an einem
 * Vorhaben, das die Person nie gemeint hat, und sie merkt es erst im Vergleich.
 */
export async function resolveVenture(
  userId: string,
  preferredId?: string,
): Promise<{ venture: Venture | null; choices: Venture[] }> {
  const ventures = await findVentures(userId);

  if (preferredId) {
    const gewaehlt = ventures.find((venture) => venture.id === preferredId) ?? null;
    return { venture: gewaehlt, choices: ventures };
  }
  if (ventures.length === 1) return { venture: ventures[0], choices: ventures };
  if (ventures.length === 0) {
    return { venture: await createVentureFor(userId), choices: [] };
  }
  return { venture: null, choices: ventures };
}
