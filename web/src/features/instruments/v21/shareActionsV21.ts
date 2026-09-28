"use server";

import { createClient } from "@/lib/supabase/server";
import { ALIGNMENT_V21_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { getItemV21 } from "@/features/instruments/v21/registryV21";

/**
 * Antworten freigeben, einzelne ausblenden, zurückziehen.
 *
 * ---------------------------------------------------------------------------
 * DIE VORSCHAU IST TEIL DER FREIGABE, NICHT EIN EXTRA
 * ---------------------------------------------------------------------------
 *
 * Deshalb nimmt `shareV21` die auszublendenden Fragen direkt entgegen: Es gibt
 * keinen Weg, erst freizugeben und danach zu entscheiden, was verborgen
 * bleibt. In der Zwischenzeit wäre alles sichtbar gewesen.
 *
 * In der Oberfläche heißt das: Freigegeben wird vom eigenen Bericht aus, wo
 * die Antworten ohnehin stehen. Wer nicht sieht, was er teilt, teilt nicht
 * wissentlich.
 *
 * ---------------------------------------------------------------------------
 * NUR ABGEGEBENE FRAGEBÖGEN
 * ---------------------------------------------------------------------------
 *
 * Einen Entwurf freizugeben hieße, dass die andere Person beim Nachladen etwas
 * anderes sieht als beim ersten Mal - und dass jemand seine Antwort ändert,
 * nachdem sie gelesen wurde. Beides ohne dass es jemand merkt.
 */

type Result = { ok: true } | { ok: false; reason: string; detail?: string };

async function ownSubmittedAssessment() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) return { supabase, assessmentId: null, userId: null };

  const { data } = await supabase
    .from("assessments")
    .select("id")
    .eq("user_id", auth.user.id)
    .eq("module", "base")
    .eq("instrument_id", ALIGNMENT_V21_INSTRUMENT_ID)
    .not("submitted_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { supabase, assessmentId: data?.id ?? null, userId: auth.user.id };
}

export async function shareV21(
  recipientUserId: string,
  hiddenItemIds: readonly string[] = [],
): Promise<Result> {
  const unknown = hiddenItemIds.filter((itemId) => !getItemV21(itemId));
  if (unknown.length) return { ok: false, reason: "unknown_block", detail: unknown.join(", ") };

  const { supabase, assessmentId, userId } = await ownSubmittedAssessment();
  if (!userId) return { ok: false, reason: "not_authenticated" };
  if (!assessmentId) return { ok: false, reason: "not_submitted" };
  // Sich selbst etwas freizugeben ist keine Freigabe, sondern ein Versehen -
  // und es wuerde in der Liste der Empfaenger als Person auftauchen.
  if (recipientUserId === userId) return { ok: false, reason: "cannot_share_with_self" };

  const { data: share, error } = await supabase
    .from("alignment_shares")
    .upsert(
      { assessment_id: assessmentId, recipient_user_id: recipientUserId, revoked_at: null },
      { onConflict: "assessment_id,recipient_user_id" },
    )
    .select("id")
    .single();

  if (error || !share) return { ok: false, reason: "share_failed", detail: error?.message };

  // ERST LÖSCHEN, DANN SETZEN. Sonst bliebe eine Frage ausgeblendet, die
  // jemand beim zweiten Mal bewusst freigegeben hat - und er saehe in der
  // Vorschau ein Haekchen, das nichts bewirkt.
  const { error: clearError } = await supabase
    .from("alignment_share_hidden_blocks")
    .delete()
    .eq("share_id", share.id);
  if (clearError) return { ok: false, reason: "share_failed", detail: clearError.message };

  if (hiddenItemIds.length > 0) {
    const { error: hideError } = await supabase
      .from("alignment_share_hidden_blocks")
      .insert(hiddenItemIds.map((blockId) => ({ share_id: share.id, block_id: blockId })));
    if (hideError) {
      // Die Freigabe steht schon. Sie jetzt bestehen zu lassen hiesse, mehr
      // zu zeigen als gewollt - also zurueckziehen und ehrlich scheitern.
      await supabase
        .from("alignment_shares")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", share.id);
      return { ok: false, reason: "hide_failed", detail: hideError.message };
    }
  }

  return { ok: true };
}

/**
 * Zurückziehen.
 *
 * Was die andere Person gelesen hat, holt das nicht zurück - das steht in der
 * Oberfläche dabei. Eine Freigabe zurückzuziehen ist trotzdem keine Geste:
 * Ab dann sieht sie den Stand nicht mehr, und spätere Änderungen erst recht
 * nicht.
 */
export async function revokeShareV21(recipientUserId: string): Promise<Result> {
  const { supabase, assessmentId, userId } = await ownSubmittedAssessment();
  if (!userId) return { ok: false, reason: "not_authenticated" };
  if (!assessmentId) return { ok: false, reason: "not_submitted" };

  const { error } = await supabase
    .from("alignment_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("assessment_id", assessmentId)
    .eq("recipient_user_id", recipientUserId)
    .is("revoked_at", null);

  if (error) return { ok: false, reason: "revoke_failed", detail: error.message };
  return { ok: true };
}
