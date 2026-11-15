import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { HelpType, ThanksOutcome } from "./thanksModel";

export type MyThanks = {
  id: string; conversationId: string; direction: "received" | "sent"; helpTypes: HelpType[]; outcome: ThanksOutcome | null; body: string | null;
  showOnProfile: boolean; hidden: boolean; otherName: string; createdAt: string;
};
export type ProfileThanks = { helpTypes: HelpType[]; outcome: ThanksOutcome | null; body: string; firstName: string };

export async function listMyThanks(client: SupabaseClient): Promise<MyThanks[]> {
  const { data } = await client.rpc("list_my_network_thanks");
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string, conversationId: row.conversation_id as string, direction: row.direction === "received" ? "received" : "sent",
    helpTypes: (row.help_types as HelpType[]) ?? [], outcome: (row.outcome as ThanksOutcome | null) ?? null, body: (row.body as string | null) ?? null,
    showOnProfile: row.show_on_profile === true, hidden: row.helper_hidden === true, otherName: (row.other_name as string) ?? "", createdAt: row.created_at as string,
  }));
}

/** Ja oder nein. Keine Zahl. */
export async function hasHeart(client: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await client.rpc("has_network_heart", { p_user_id: userId });
  return data === true;
}

export async function listProfileThanks(client: SupabaseClient, userId: string): Promise<ProfileThanks[]> {
  const { data } = await client.rpc("list_profile_thanks", { p_user_id: userId });
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    helpTypes: (row.help_types as HelpType[]) ?? [], outcome: (row.outcome as ThanksOutcome | null) ?? null,
    body: row.body as string, firstName: (row.thanker_first_name as string) ?? "",
  }));
}
