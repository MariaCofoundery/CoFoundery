import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * "Wer ist wer" (20270327120000): die Karten der Menschen einer Organisation. Mitglieder lesen alle Karten ihrer
 * Organisation (Zeilensicherheit); Startups lesen nur die sichtbaren ueber get_my_program_people.
 */
export type MemberCard = {
  userId: string;
  shown: boolean;
  selfHidden: boolean;
  headline: string | null;
  about: string | null;
  contact: string | null;
  /** Welche Programme (Startups) die Karte sehen. null = alle Programme der Organisation (20270408120000). */
  programIds: string[] | null;
};

export async function listOrgMemberCards(client: SupabaseClient, orgId: string): Promise<Map<string, MemberCard>> {
  const { data, error } = await client.from("advisor_org_member_cards").select("user_id, shown, self_hidden, headline, about, contact, audience_program_ids").eq("org_id", orgId).limit(200);
  const cards = new Map<string, MemberCard>();
  if (error || !Array.isArray(data)) return cards;
  for (const row of data as { user_id: string; shown: boolean; self_hidden: boolean; headline: string | null; about: string | null; contact: string | null; audience_program_ids: string[] | null }[]) {
    cards.set(row.user_id, { userId: row.user_id, shown: row.shown, selfHidden: row.self_hidden, headline: row.headline, about: row.about, contact: row.contact, programIds: row.audience_program_ids ?? null });
  }
  return cards;
}

export type ProgramPerson = {
  programId: string;
  orgId: string;
  orgName: string;
  userId: string;
  displayName: string;
  role: "owner" | "advisor";
  teamRole: string | null;
  headline: string | null;
  about: string | null;
  contact: string | null;
};

export async function getMyProgramPeople(client: SupabaseClient): Promise<ProgramPerson[]> {
  const { data, error } = await client.rpc("get_my_program_people");
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    programId: row.program_id as string,
    orgId: row.org_id as string,
    orgName: row.org_name as string,
    userId: row.user_id as string,
    displayName: (row.display_name as string) ?? "",
    role: row.role === "owner" ? "owner" : "advisor",
    teamRole: (row.team_role as string | null) ?? null,
    headline: (row.headline as string | null) ?? null,
    about: (row.about as string | null) ?? null,
    contact: (row.contact as string | null) ?? null,
  }));
}
