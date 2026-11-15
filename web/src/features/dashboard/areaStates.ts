import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Wo steht die Person in Find und Connect? Nur der eigene Zeilenstand (Status), gelesen mit den Rechten der Person;
 * nichts, was andere sehen. Ein Lesefehler heisst "nichts bekannt" - die Karte zeigt dann "noch offen", keine Fehlermeldung.
 */
export async function getFindAndConnectStates(client: SupabaseClient, userId: string): Promise<{ find: "draft" | "active" | "paused" | null; connect: "draft" | "active" | null }> {
  const [find, connect] = await Promise.all([
    Promise.resolve(client.from("founder_discovery_profiles").select("status").eq("user_id", userId).maybeSingle()).catch(() => ({ data: null })),
    Promise.resolve(client.from("network_profiles").select("status").eq("user_id", userId).maybeSingle()).catch(() => ({ data: null })),
  ]);
  const findStatus = (find.data as { status?: string } | null)?.status;
  const connectStatus = (connect.data as { status?: string } | null)?.status;
  return {
    find: findStatus === "active" || findStatus === "paused" ? findStatus : findStatus ? "draft" : null,
    connect: connectStatus === "active" ? "active" : connectStatus ? "draft" : null,
  };
}
