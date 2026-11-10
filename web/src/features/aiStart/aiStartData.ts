import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isAiItemKey, isAiToolMode, linksOf, stepsOf, type AiFlow, type AiItem, type AiTip, type AiTipLink, type AiTool } from "@/features/aiStart/aiStartModel";

/** Lesen: normaler Zugang, die Zeilensicherheit zeigt nur dem Team seine Angaben (20270412120000). */
export async function getTeamAiStart(client: SupabaseClient, teamId: string): Promise<{ items: AiItem[]; tools: AiTool[]; flows: AiFlow[] }> {
  const [items, tools, flows] = await Promise.all([
    client.from("team_ai_checklist_items").select("item_key, state, note").eq("team_id", teamId).limit(20),
    client.from("team_ai_tools").select("id, name, purpose, access_user_ids, mode, connected_to").eq("team_id", teamId).order("created_at").limit(60),
    client.from("team_ai_flows").select("id, name, steps").eq("team_id", teamId).order("created_at").limit(40),
  ]);
  return {
    items: ((items.data ?? []) as { item_key: string; state: string; note: string | null }[]).flatMap((row) =>
      isAiItemKey(row.item_key) && (row.state === "done" || row.state === "skip") ? [{ key: row.item_key, state: row.state, note: row.note } satisfies AiItem] : []
    ),
    tools: ((tools.data ?? []) as { id: string; name: string; purpose: string | null; access_user_ids: string[] | null; mode: string; connected_to: string | null }[]).map((row) => ({
      id: row.id,
      name: row.name,
      purpose: row.purpose,
      accessUserIds: row.access_user_ids ?? [],
      mode: isAiToolMode(row.mode) ? row.mode : "hand",
      connectedTo: row.connected_to,
    })),
    flows: ((flows.data ?? []) as { id: string; name: string; steps: unknown }[]).map((row) => ({ id: row.id, name: row.name, steps: stepsOf(row.steps) })),
  };
}

/** Die Tipps der Organisationen, in deren aktivem Programm das Team steht. */
export async function getMyProgramAiTips(client: SupabaseClient): Promise<AiTip[]> {
  const { data, error } = await client.rpc("get_my_program_ai_tips");
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    programId: row.program_id as string,
    teamId: row.team_id as string,
    orgName: row.org_name as string,
    note: (row.note as string | null) ?? null,
    links: linksOf(row.links),
  }));
}

/** Der Tipp einer Organisation - fuer die, die ihn pflegen. */
export async function getOrgAiTip(client: SupabaseClient, orgId: string): Promise<{ enabled: boolean; note: string | null; links: AiTipLink[] }> {
  const { data } = await client.from("advisor_org_ai_tip").select("enabled, note, links").eq("org_id", orgId).maybeSingle();
  const row = data as { enabled: boolean; note: string | null; links: unknown } | null;
  return { enabled: row?.enabled === true, note: row?.note ?? null, links: linksOf(row?.links) };
}
