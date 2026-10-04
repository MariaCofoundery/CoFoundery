import "server-only";

import type { AssessmentScope } from "@/features/instruments/align/registries";
import { INSTRUMENT_OF } from "@/features/instruments/align/reportData";
import type { ShareRecipient } from "@/features/instruments/align/ShareForm";
import { createClient } from "@/lib/supabase/server";

/**
 * Mit wem sich teilen lässt - und was davon schon freigegeben ist.
 *
 * ---------------------------------------------------------------------------
 * NUR MENSCHEN, MIT DENEN MAN ZU TUN HAT
 * ---------------------------------------------------------------------------
 *
 * Angenommene Einladungen in beide Richtungen, plus aktive Advisor. Keine
 * Suche über alle Konten: Eine Freigabe ist etwas zwischen Menschen, die
 * miteinander arbeiten - eine Liste aller Nutzer wäre eine Einladung, sie
 * durchzuprobieren.
 */

export type ShareState = {
  recipients: ShareRecipient[];
  hiddenByRecipient: Record<string, string[]>;
};

export async function getShareState(
  userId: string,
  scope: AssessmentScope | "workstyle",
  ventureId: string | null,
): Promise<ShareState> {
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

  // Zwei Schluessel, nicht einer: Eine aktive Begleitung macht die Person nur
  // waehlbar. Die Freigabe bleibt eine eigene Entscheidung - und sie endet
  // automatisch mit der Beziehung.
  const { data: grants } = await supabase
    .from("advisor_person_grants")
    .select("advisor_user_id")
    .eq("subject_user_id", userId)
    .eq("status", "active")
    .is("revoked_at", null);

  for (const grant of grants ?? []) {
    const id = grant.advisor_user_id as string;
    if (id && id !== userId && !partners.has(id)) partners.set(id, "Begleitung (Advisor)");
  }

  // Shared teams make recipients selectable; they do not grant any answer access.
  if (scope === "workstyle") {
    const { data: people } = await supabase.rpc("get_workstyle_share_recipients");
    for (const person of people ?? []) partners.set(person.user_id, person.display_name);
  }
  if (partners.size === 0) return { recipients: [], hiddenByRecipient: {} };

  const suche = supabase
    .from("assessments")
    .select("id")
    .eq("user_id", userId)
    .eq("instrument_id", scope === "workstyle" ? "founder-workstyle-pretest-8-5a-v3" : INSTRUMENT_OF[scope])
    .not("submitted_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const { data: assessment } = ventureId
    ? await suche.eq("venture_id", ventureId).maybeSingle()
    : await suche.maybeSingle();

  const { data: shares } = assessment
    ? await supabase
        .from("alignment_shares")
        .select("id, recipient_user_id, created_at")
        .eq("assessment_id", assessment.id)
        .is("revoked_at", null)
    : { data: [] };

  const { data: hiddenRows } = (shares ?? []).length
    ? await supabase
        .from("alignment_share_hidden_blocks")
        .select("share_id, block_id")
        .in("share_id", (shares ?? []).map((row) => row.id))
    : { data: [] };

  const hiddenByRecipient: Record<string, string[]> = {};
  for (const share of shares ?? []) {
    hiddenByRecipient[share.recipient_user_id] = (hiddenRows ?? [])
      .filter((row) => row.share_id === share.id)
      .map((row) => row.block_id);
  }

  return {
    recipients: [...partners.entries()].map(([id, label]) => ({
      userId: id,
      label,
      sharedAt:
        (shares ?? []).find((row) => row.recipient_user_id === id)?.created_at ?? null,
    })),
    hiddenByRecipient,
  };
}
