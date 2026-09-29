import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Mit wem diese Person verbunden ist - mit einem Namen, den sie erkennt.
 *
 * ---------------------------------------------------------------------------
 * WARUM DAS AN EINER STELLE STEHT
 * ---------------------------------------------------------------------------
 *
 * Dieselbe Frage wird an mehreren Stellen gestellt: im Dashboard-Kasten zur
 * bisherigen Fassung und im Kasten zu den beiden neuen Bögen. Zwei Kopien
 * würden nach dem ersten Unterschied auseinanderlaufen - und zwar lautlos,
 * weil beide richtig aussehen. Dann hieße dieselbe Person an der einen Stelle
 * „Mitgründer:in“ und an der anderen bei ihrem Namen.
 *
 * Sie wirft nicht. Geht die Abfrage schief, ist die Liste leer - dann fehlt
 * ein Link, und das ist besser als eine Startseite, die nicht lädt.
 */
export type ConnectedPartner = { userId: string; label: string };

export async function connectedPartners(userId: string): Promise<ConnectedPartner[]> {
  try {
    const supabase = await createClient();

    const { data: invitations } = await supabase
      .from("invitations")
      .select("inviter_user_id, invitee_user_id, inviter_display_name, label")
      .eq("status", "accepted")
      .is("revoked_at", null)
      .or(`inviter_user_id.eq.${userId},invitee_user_id.eq.${userId}`);

    const partners = new Map<string, string>();
    for (const row of invitations ?? []) {
      const other = row.inviter_user_id === userId ? row.invitee_user_id : row.inviter_user_id;
      if (!other || other === userId) continue;
      const label =
        (row.inviter_user_id === userId ? row.label : row.inviter_display_name) ??
        row.label ??
        "Mitgründer:in";
      if (!partners.has(other)) partners.set(other, label);
    }

    return [...partners.entries()].map(([id, label]) => ({ userId: id, label }));
  } catch {
    return [];
  }
}
