import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { AdvisorScope } from "@/features/advisor/personAccessData";
import { ACTIVE_ORG_COOKIE, activeFirst, parseActiveOrg } from "@/features/advisor/activeOrg";
import { type OrgRights, type OrgRole, isAdminRole, isLeadRole, orgRoleOf, parseOverrides, rightsOf, type OrgRightOverrides } from "@/features/advisor/orgRights";

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
  /** Eingeschaltete Bereiche (siehe orgFeatures.ts), einschliesslich "success". */
  features: string[];
  /** Neue Organisationen bestaetigen die Auswahl einmal; bestehende gelten als bestaetigt. */
  featuresSetupDone: boolean;
  name: string;
  personSeatLimit: number | null;
  /** Admin heisst technisch `owner`. Ein Gast steht nicht unter den Mitgliedern, sondern in `advisor_org_guests`. */
  role: OrgRole | null;
  /** Was diese Person in der Organisation darf: Voreinstellung der Rolle plus einzeln gesetzte Rechte (Anzeige - die Datenbank prueft es). */
  rights: OrgRights;
  /** Admin: Funktionen, Erfolge, Foerderauflagen, Rollen. */
  isAdmin: boolean;
  /** Admin oder Koordination: sieht alle Startups der Organisation. */
  isLead: boolean;
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
  /** Programmseite (`/p/<Kurzname>`), seit 31.10.2026. */
  programSlug: string | null;
  programPagePublished: boolean;
  programWelcome: string | null;
  hasProgramLogo: boolean;
  programAccent: string | null;
  programAccentB: string | null;
};

export type OrgMember = {
  userId: string;
  role: OrgRole;
  status: "active" | "revoked";
  /** Nur Admins sehen die einzeln gesetzten Rechte der anderen (sonst leer). */
  rightsOverrides?: OrgRightOverrides;
  rightsUpdatedAt?: string | null;
  rightsUpdatedByName?: string | null;
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
  const [{ data: memberships }, { data: guestRows }] = await Promise.all([
    client.from("advisor_org_members").select("org_id, role, status, rights").eq("user_id", user.id).eq("status", "active"),
    client.from("advisor_org_guests").select("org_id, status, rights").eq("user_id", user.id).eq("status", "active"),
  ]);

  const rows = [
    ...((memberships ?? []) as { org_id: string; role: string; rights: unknown }[]).map((row) => ({ org_id: row.org_id, role: orgRoleOf(row.role), rights: parseOverrides(row.rights) })),
    ...((guestRows ?? []) as { org_id: string; rights: unknown }[]).map((row) => ({ org_id: row.org_id, role: "guest" as OrgRole, rights: parseOverrides(row.rights) })),
  ];
  if (rows.length === 0) return [];

  const { data: orgs } = await client
    .from("advisor_orgs")
    .select("id, name, status, person_seat_limit, description, website_url, focus, location_region, program_slug, program_page_published, program_welcome, program_logo_path, program_accent, program_accent_b, features, features_setup_done, program_success_enabled")
    .in(
      "id",
      rows.map((row) => row.org_id)
    );

  const list = (
    (orgs ?? []) as {
      id: string;
      name: string;
      status: string;
      person_seat_limit: number | null;
      description: string | null;
      website_url: string | null;
      focus: string[] | null;
      location_region: string | null;
      program_slug: string | null;
      program_page_published: boolean | null;
      program_welcome: string | null;
      program_logo_path: string | null;
      program_accent: string | null;
      program_accent_b: string | null;
      features: string[] | null;
      features_setup_done: boolean | null;
      program_success_enabled: boolean | null;
    }[]
  ).map((org): AdvisorOrg => ({
    id: org.id,
    features: [...(org.features ?? []), ...(org.program_success_enabled ? ["success"] : [])],
    featuresSetupDone: org.features_setup_done !== false,
    name: org.name,
    status: org.status === "suspended" ? "suspended" : "active",
    personSeatLimit: org.person_seat_limit,
    role: rows.find((row) => row.org_id === org.id)?.role ?? null,
    rights: rightsOf(rows.find((row) => row.org_id === org.id)?.role ?? "advisor", rows.find((row) => row.org_id === org.id)?.rights),
    isAdmin: isAdminRole(rows.find((row) => row.org_id === org.id)?.role),
    isLead: isLeadRole(rows.find((row) => row.org_id === org.id)?.role),
    description: org.description,
    websiteUrl: org.website_url,
    focus: org.focus ?? [],
    locationRegion: org.location_region,
    programSlug: org.program_slug,
    programPagePublished: org.program_page_published === true,
    programWelcome: org.program_welcome,
    hasProgramLogo: Boolean(org.program_logo_path),
    programAccent: org.program_accent,
    programAccentB: org.program_accent_b,
  }))
    // Feste Reihenfolge nach Namen - die erste Organisation ist die vorausgewaehlte, das darf nicht vom Zufall der Abfrage abhaengen.
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
  // Das gewaehlte Programm (Cookie, 06.11.2026) steht vorn: Seiten ohne ?org= nehmen die erste.
  const activeId = parseActiveOrg((await cookies()).get(ACTIVE_ORG_COOKIE)?.value);
  return activeFirst(list, activeId);
}

/**
 * Wie viele Menschen die Organisation gerade begleitet: verschiedene Personen
 * mit aktiver Freigabe. Nur eine Zahl, keine Namen. Die Zeilensicherheit zeigt
 * Mitgliedern die Freigaben ihrer Organisation (Migration 20261043120000).
 */
export async function countOrgSeatsUsed(client: SupabaseClient, orgId: string): Promise<number> {
  const { data } = await client
    .from("advisor_person_grants")
    .select("subject_user_id")
    .eq("org_id", orgId)
    .eq("status", "active")
    .limit(5000);
  return new Set(((data ?? []) as { subject_user_id: string }[]).map((row) => row.subject_user_id)).size;
}

/**
 * Die Mitglieder der Organisation - mit Namen (Phase 12C.1C).
 *
 * `person_core` ist nur fuer die eigene Person lesbar; der Name kommt deshalb
 * aus `get_advisor_org_member_list`. Die Funktion antwortet nur aktiven
 * Mitgliedern, gibt nur den Anzeigenamen heraus und zeigt beendete
 * Mitgliedschaften nur Inhaberinnen.
 */
export type OrgOpenInvite = { email: string; role: OrgRole; sentAt: string; expiresAt: string };

/** Einladungen, die noch nicht angenommen sind. Die Zeilensicherheit zeigt sie nur Mitgliedern der Organisation. */
export async function getOrgOpenInvites(client: SupabaseClient, orgId: string): Promise<OrgOpenInvite[]> {
  const { data } = await client
    .from("advisor_org_invites")
    .select("invitee_email, role, created_at, expires_at")
    .eq("org_id", orgId)
    .eq("status", "sent")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  return ((data ?? []) as { invitee_email: string; role: string; created_at: string; expires_at: string }[]).map((row) => ({
    email: row.invitee_email,
    role: orgRoleOf(row.role),
    sentAt: row.created_at,
    expiresAt: row.expires_at,
  }));
}

/** Gaeste sind keine Mitglieder: nur die Mitgliederverwaltung bittet ausdruecklich um sie (`withGuests`). */
export async function getOrgMembers(
  client: SupabaseClient,
  orgId: string,
  options: { withGuests?: boolean } = {}
): Promise<OrgMember[]> {
  const { data } = await client.rpc("get_advisor_org_member_list", { p_org_id: orgId });

  return (
    (data ?? []) as {
      user_id: string;
      role: string;
      status: OrgMember["status"];
      display_name: string | null;
      is_self: boolean;
      rights?: unknown;
      rights_updated_at?: string | null;
      rights_updated_by_name?: string | null;
    }[]
  ).map((row) => ({
    userId: row.user_id,
    role: orgRoleOf(row.role),
    status: row.status,
    displayName: row.display_name,
    isSelf: row.is_self,
    rightsOverrides: parseOverrides(row.rights),
    rightsUpdatedAt: row.rights_updated_at ?? null,
    rightsUpdatedByName: row.rights_updated_by_name ?? null,
  })).filter((member) => options.withGuests || member.role !== "guest");
}

export type OrgInviteSuggestion = {
  id: string;
  email: string;
  role: "advisor" | "guest";
  reason: string | null;
  status: "open" | "accepted" | "declined";
  decisionNote: string | null;
  createdAt: string;
  suggestedByName: string | null;
  mine: boolean;
};

/** Vorschlaege fuer Einladungen: Admin und Koordination sehen die offenen, wer vorgeschlagen hat, die eigenen (mit Antwort). */
export async function getOrgInviteSuggestions(client: SupabaseClient, orgId: string): Promise<OrgInviteSuggestion[]> {
  const { data } = await client.rpc("list_advisor_org_invite_suggestions", { p_org_id: orgId });
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    email: row.email as string,
    role: row.role === "guest" ? "guest" : "advisor",
    reason: (row.reason as string | null) ?? null,
    status: row.status === "accepted" ? "accepted" : row.status === "declined" ? "declined" : "open",
    decisionNote: (row.decision_note as string | null) ?? null,
    createdAt: row.created_at as string,
    suggestedByName: (row.suggested_by_name as string | null) ?? null,
    mine: row.mine === true,
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
  // Die Zeilensicherheit zeigt auch die Freigaben, die man selbst als Person
  // erteilt hat - wer Advisor und Founder ist, stand sonst in der eigenen
  // Begleitliste (gefunden 05.11.2026).
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return [];
  const { data } = await client
    .from("advisor_person_grants")
    .select("subject_user_id, scope, status")
    .in("status", ["active", "requested"])
    .neq("subject_user_id", user.id)
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
