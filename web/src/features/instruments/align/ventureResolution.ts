import "server-only";

import { connectedPartners } from "@/features/instruments/connectedPartners";
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
 * OHNE BENUTZERKENNUNG, UND DAS IST DER UNTERSCHIED. Angelegt wird für die
 * aufrufende Person, nicht für eine beliebige - die Funktion in der Datenbank
 * nimmt `auth.uid()` und lässt sich nicht auf jemand anderen richten. Eine
 * Kennung als Parameter würde das Gegenteil versprechen.
 *
 * `pre_founder` als Kontext setzt die Datenbankfunktion: Wer allein anfängt,
 * ist per Definition noch nicht in einem bestehenden Team. Beim Annehmen der
 * ersten Einladung muss der Kontext übereinstimmen, damit übernommen wird -
 * ein falscher Wert würde die Übernahme stillschweigend verhindern.
 */
export async function createVentureFor(): Promise<Venture | null> {
  const supabase = await createClient();

  // UEBER EINE FUNKTION UND NICHT DIREKT. Auf `founder_teams` und
  // `founder_team_members` liegen ausschliesslich SELECT-Policies - Teams
  // entstehen sonst nur durch Trigger beim Annehmen einer Einladung oder beim
  // Start eines Vergleichs. Ein direktes Insert von hier aus wurde von der
  // Zeilensicherheit abgewiesen, still: Der Aufruf gab `null` zurueck, die
  // Seite fragte "Fuer welches Vorhaben?" und bot nichts an.
  const { data: id, error } = await supabase.rpc("create_solo_venture");
  if (error || !id) return null;

  const { data: team } = await supabase
    .from("founder_teams")
    .select("id, name, team_context")
    .eq("id", id)
    .maybeSingle();

  if (!team) return null;

  return {
    id: team.id as string,
    name: (team.name as string | null) ?? null,
    teamContext: team.team_context as Venture["teamContext"],
    // Die Funktion gibt nur ein Vorhaben zurueck, in dem diese Person allein
    // steht - sonst legt sie ein neues an.
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
    return { venture: await createVentureFor(), choices: [] };
  }
  return { venture: null, choices: ventures };
}

/**
 * Wer im Vorhaben sonst noch dabei ist - wenn es genau eine Person ist.
 *
 * ---------------------------------------------------------------------------
 * NUR BEI GENAU EINER, UND DAS IST DER PUNKT
 * ---------------------------------------------------------------------------
 *
 * R02 fragt: „Wie viele Stunden erwartest Du von [Name]?“ Bei zwei
 * Mitgründenden ist nicht bestimmt, wer gemeint ist - eine Zahl, die einmal
 * die Erwartung an eine Person und einmal die Summe für zwei meint, ist
 * unbrauchbar, und geraten wäre sie schlimmer als offen.
 *
 * ---------------------------------------------------------------------------
 * DER NAME KOMMT AUS DER EINLADUNG, NICHT AUS DEM PROFIL
 * ---------------------------------------------------------------------------
 *
 * Erster Versuch war `person_core.display_name`. Die Zeilensicherheit gibt
 * ihn Mitgründenden nicht heraus - die Abfrage kam leer zurück, und die
 * Ersetzung wäre totes Bedienelement gewesen: sieht aus wie eine Funktion,
 * feuert nie.
 *
 * Lesbar ist die Beschriftung aus der Einladung. Genau die steht auch im
 * Dashboard neben „mit X vergleichen“, also heißt dieselbe Person an beiden
 * Stellen gleich.
 *
 * Ist sie nicht zu haben, bleibt „der anderen Person“ stehen. Das ist ungenau
 * und ehrlich; ein Name wäre genau und vielleicht falsch.
 */
export async function solePartnerName(
  ventureId: string,
  selfUserId: string,
): Promise<string | null> {
  try {
    const supabase = await createClient();

    const { data: members } = await supabase
      .from("founder_team_members")
      .select("user_id")
      .eq("team_id", ventureId)
      .neq("user_id", selfUserId);

    if (!members || members.length !== 1) return null;

    const partners = await connectedPartners(selfUserId);
    const treffer = partners.find((partner) => partner.userId === members[0].user_id);

    return treffer?.label.trim() || null;
  } catch {
    return null;
  }
}
