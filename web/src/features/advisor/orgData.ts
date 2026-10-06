import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdvisorScope } from "@/features/advisor/personAccessData";

/**
 * Die Organisation, ihre Menschen - und die Menschen, die sie begleitet.
 *
 * WER WAS SIEHT, entscheidet die Zeilensicherheit und nicht dieser Leser: Die
 * Regeln stehen in der Migration 20261043120000, samt zweier
 * `security definer`-Helfer, die die Rekursion aufloesen. Hier steht nur, was
 * gelesen wird.
 */

export type AdvisorOrg = {
  id: string;
  name: string;
  personSeatLimit: number | null;
  role: "owner" | "advisor" | null;
  /** Phase 12C.1C: Eine ausgesetzte Organisation sagt das im Org-Abschnitt. */
  status: "active" | "suspended";
  /**
   * Das Profil - seit 26.09.2026. Es ist nicht Zierde: Genau diese Angaben
   * liest eine Person, die um Freigabe ihres Profils gebeten wird.
   */
  description: string | null;
  websiteUrl: string | null;
  focus: string[];
  locationRegion: string | null;
};

export type OrgMember = {
  userId: string;
  role: "owner" | "advisor";
  status: "active" | "revoked";
  /** Phase 12C.1C: Anzeigename - wer verwaltet, muss sehen, wen. */
  displayName: string | null;
  isSelf: boolean;
};

export type AccompaniedPerson = {
  subjectUserId: string;
  scopes: AdvisorScope[];
  /** Was noch offen ist - die Person hat noch nicht entschieden. */
  pendingScopes: AdvisorScope[];
};

export async function getMyAdvisorOrgs(client: SupabaseClient): Promise<AdvisorOrg[]> {
  // Phase 12C.1B: NUR DIE EIGENE MITGLIEDSCHAFT. Die Zeilensicherheit zeigt
  // Mitgliedern auch die Zeilen der anderen Mitglieder - ohne diesen Filter kam
  // die Rolle der ersten Zeile zurueck, und eine Advisorin sah die Knoepfe der
  // Inhaberin (die Datenbank lehnte sie ab, die Oberflaeche zeigte sie trotzdem).
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return [];
  const { data: memberships } = await client
    .from("advisor_org_members")
    .select("org_id, role, status")
    .eq("user_id", user.id)
    .eq("status", "active");

  const rows = (memberships ?? []) as { org_id: string; role: AdvisorOrg["role"]; status: string }[];
  if (rows.length === 0) return [];

  const { data: orgs } = await client
    .from("advisor_orgs")
    .select("id, name, status, person_seat_limit, description, website_url, focus, location_region")
    .in(
      "id",
      rows.map((row) => row.org_id)
    );

  return (
    (orgs ?? []) as {
      id: string;
      name: string;
      status: string;
      person_seat_limit: number | null;
      description: string | null;
      website_url: string | null;
      focus: string[] | null;
      location_region: string | null;
    }[]
  ).map((org) => ({
    id: org.id,
    name: org.name,
    status: org.status === "suspended" ? "suspended" : "active",
    personSeatLimit: org.person_seat_limit,
    role: rows.find((row) => row.org_id === org.id)?.role ?? null,
    description: org.description,
    websiteUrl: org.website_url,
    focus: org.focus ?? [],
    locationRegion: org.location_region,
  }));
}

/**
 * Die Mitglieder der Organisation - mit Namen (Phase 12C.1C).
 *
 * `person_core` ist nur fuer die eigene Person lesbar; der Name kommt deshalb
 * aus `get_advisor_org_member_list`. Die Funktion antwortet nur aktiven
 * Mitgliedern, gibt nur den Anzeigenamen heraus und zeigt beendete
 * Mitgliedschaften nur Inhaberinnen.
 */
export async function getOrgMembers(
  client: SupabaseClient,
  orgId: string
): Promise<OrgMember[]> {
  const { data } = await client.rpc("get_advisor_org_member_list", { p_org_id: orgId });

  return (
    (data ?? []) as {
      user_id: string;
      role: OrgMember["role"];
      status: OrgMember["status"];
      display_name: string | null;
      is_self: boolean;
    }[]
  ).map((row) => ({
    userId: row.user_id,
    role: row.role,
    status: row.status,
    displayName: row.display_name,
    isSelf: row.is_self,
  }));
}

/**
 * Die begleiteten Menschen - der "gesammelte Bereich".
 *
 * GEWUENSCHT AM 23.09.2026: "Vielleicht auch in einem gesammelten Bereich, wo
 * die Leute drin sind, dass man mit denen weiterarbeiten kann."
 *
 * ES STEHEN NUR DIE HIER, DIE ZUGESTIMMT HABEN - und daneben, was noch offen
 * ist. Eine Liste, die Angefragte und Begleitete vermischt, laedt dazu ein,
 * eine Anfrage fuer eine Zusage zu halten.
 */
export async function getAccompaniedPeople(
  client: SupabaseClient
): Promise<AccompaniedPerson[]> {
  const { data } = await client
    .from("advisor_person_grants")
    .select("subject_user_id, scope, status")
    .in("status", ["active", "requested"])
    .limit(500);

  const byPerson = new Map<string, AccompaniedPerson>();
  for (const row of (data ?? []) as {
    subject_user_id: string;
    scope: AdvisorScope;
    status: string;
  }[]) {
    const entry = byPerson.get(row.subject_user_id) ?? {
      subjectUserId: row.subject_user_id,
      scopes: [],
      pendingScopes: [],
    };
    if (row.status === "active") entry.scopes.push(row.scope);
    else entry.pendingScopes.push(row.scope);
    byPerson.set(row.subject_user_id, entry);
  }

  // Wer zugestimmt hat, steht oben - dort ist etwas zu tun.
  return [...byPerson.values()].sort((a, b) => b.scopes.length - a.scopes.length);
}

/**
 * Dieselbe Liste - mit Namen, wo einer freigegeben ist.
 *
 * GEFUNDEN AM 26.09.2026 beim Bau der Gruppenansicht: Ein Accelerator sah
 * seine begleiteten Menschen als namenlose Zeilen ("3 Bereiche freigegeben").
 * Dasselbe Loch wie auf der Gegenseite, nur andersherum - und aus demselben
 * Grund: `person_core` ist owner-only, die Anwendung kommt an den Namen nicht
 * heran.
 *
 * DER NAME IST SELBST EINE FREIGABE. Er kommt aus `get_advisor_person_base`,
 * und die Funktion gibt ihn nur heraus, wenn der Umfang `base` zugestimmt
 * wurde. Wer nur seine Faehigkeiten freigegeben hat, bleibt namenlos - das
 * ist kein Fehler, sondern seine Entscheidung, und die Anzeige sagt das.
 *
 * Gefragt wird deshalb nur fuer die, bei denen `base` ueberhaupt gilt: Ein
 * Aufruf, von dem man weiss, dass er abgewiesen wird, ist kein Aufruf,
 * sondern Laerm im Protokoll.
 */
export type AccompaniedPersonNamed = AccompaniedPerson & { name: string | null };

export async function withAccompaniedNames(
  client: SupabaseClient,
  people: AccompaniedPerson[]
): Promise<AccompaniedPersonNamed[]> {
  return Promise.all(
    people.map(async (person) => {
      if (!person.scopes.includes("base")) return { ...person, name: null };

      const { data, error } = await client.rpc("get_advisor_person_base", {
        p_subject_user_id: person.subjectUserId,
      });
      if (error) return { ...person, name: null };

      const name = ((data ?? []) as { display_name: string | null }[])[0]?.display_name?.trim();
      return { ...person, name: name || null };
    })
  );
}
