"use server";

import { createClient } from "@/lib/supabase/server";
import { allBlockIds } from "@/features/instruments/v2/alignmentAnswersV2";

/**
 * Freigeben, ausblenden, zurückziehen.
 *
 * ---------------------------------------------------------------------------
 * DIE VORSCHAU IST TEIL DER FREIGABE, NICHT EIN EXTRA
 * ---------------------------------------------------------------------------
 *
 * Teil F7: „Vor dem Teilen sieht jede Person eine Vorschau ihrer Angaben."
 * Deshalb nimmt `shareAlignment` die auszublendenden Blöcke direkt entgegen -
 * es gibt keinen Weg, erst freizugeben und danach zu entscheiden, was verborgen
 * bleibt. In der Zwischenzeit wäre alles sichtbar gewesen.
 *
 * Und der Satz, der nicht in den Code passt, aber dazugehört: „Eine Freigabe
 * von Ergebnissen darf nicht als Einverständnis zu Investor-Screening oder
 * Auswahlentscheidungen umgedeutet werden."
 */

type Result = { ok: true; shareId?: string } | { ok: false; reason: string; detail?: string };

export async function shareAlignment(
  assessmentId: string,
  recipientUserId: string,
  hiddenBlockIds: readonly string[] = []
): Promise<Result> {
  const known = new Set(allBlockIds());
  const unknown = hiddenBlockIds.filter((blockId) => !known.has(blockId));
  if (unknown.length) return { ok: false, reason: "unknown_block", detail: unknown.join(", ") };

  const supabase = await createClient();

  const { data: share, error } = await supabase
    .from("alignment_shares")
    .upsert(
      { assessment_id: assessmentId, recipient_user_id: recipientUserId, revoked_at: null },
      { onConflict: "assessment_id,recipient_user_id" }
    )
    .select("id")
    .single();

  if (error || !share) return { ok: false, reason: "share_failed", detail: error?.message };

  // ERST DIE AUSBLENDUNGEN SETZEN, DANN IST DIE FREIGABE VOLLSTAENDIG. Die
  // Zeile existiert zwar schon vorher - deshalb wird sie mit revoked_at=null
  // erst hier aktiv gesetzt und die alten Ausblendungen davor geraeumt.
  await supabase.from("alignment_share_hidden_blocks").delete().eq("share_id", share.id);

  if (hiddenBlockIds.length) {
    const { error: hideError } = await supabase
      .from("alignment_share_hidden_blocks")
      .insert(hiddenBlockIds.map((blockId) => ({ share_id: share.id, block_id: blockId })));
    if (hideError) return { ok: false, reason: "hide_failed", detail: hideError.message };
  }

  return { ok: true, shareId: share.id };
}

export async function revokeAlignmentShare(shareId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("alignment_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", shareId)
    .is("revoked_at", null);
  if (error) return { ok: false, reason: "revoke_failed", detail: error.message };
  return { ok: true };
}
