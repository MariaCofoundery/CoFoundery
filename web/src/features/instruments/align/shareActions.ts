"use server";

import { createClient } from "@/lib/supabase/server";
import { getItemV22, type AssessmentScope } from "@/features/instruments/align/registries";
import { shareProductWorkstyle } from "@/features/reporting/workstyle/actions";
import { INSTRUMENT_OF } from "@/features/instruments/align/reportData";

/**
 * Antworten freigeben - je Bogen und je Vorhaben.
 *
 * ---------------------------------------------------------------------------
 * ZWEI BOEGEN HEISST ZWEI ENTSCHEIDUNGEN
 * ---------------------------------------------------------------------------
 *
 * Das Arbeitsprofil jemandem zu zeigen ist etwas anderes, als ihm die eigenen
 * Zusagen zu einem Vorhaben zu zeigen. Wer sagt „so arbeite ich“, hat damit
 * nicht gesagt, wie viel Geld er höchstens einsetzen würde.
 *
 * Eine Freigabe, die beides auf einmal öffnet, wäre bequem und falsch: Sie
 * würde eine Entscheidung unterstellen, die niemand getroffen hat.
 *
 * ---------------------------------------------------------------------------
 * DIE VORSCHAU IST TEIL DER FREIGABE
 * ---------------------------------------------------------------------------
 *
 * Die auszublendenden Fragen kommen direkt mit. Es gibt keinen Weg, erst
 * freizugeben und danach zu entscheiden, was verborgen bleibt - in der
 * Zwischenzeit wäre alles sichtbar gewesen.
 */

type Result = { ok: true } | { ok: false; reason: string; detail?: string };

async function ownSubmitted(scope: AssessmentScope, ventureId: string | null) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) return { supabase, assessmentId: null, userId: null };

  const suche = supabase
    .from("assessments")
    .select("id")
    .eq("user_id", auth.user.id)
    .eq("instrument_id", INSTRUMENT_OF[scope])
    .not("submitted_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const { data } = ventureId
    ? await suche.eq("venture_id", ventureId).maybeSingle()
    : await suche.maybeSingle();

  return { supabase, assessmentId: data?.id ?? null, userId: auth.user.id };
}

export async function shareScope(
  scope: AssessmentScope | "workstyle",
  recipientUserId: string,
  hiddenItemIds: readonly string[] = [],
  ventureId: string | null = null,
): Promise<Result> {
  if (scope === "workstyle") { const result = await shareProductWorkstyle(recipientUserId, [...hiddenItemIds]); return result.ok ? {ok:true} : {ok:false,reason:"share_failed"}; }
  const unknown = hiddenItemIds.filter((itemId) => !getItemV22(itemId));
  if (unknown.length) return { ok: false, reason: "unknown_block", detail: unknown.join(", ") };

  const { supabase, assessmentId, userId } = await ownSubmitted(scope, ventureId);
  if (!userId) return { ok: false, reason: "not_authenticated" };
  // Nur abgegebene Boegen. Einen Entwurf zu teilen hiesse, dass die andere
  // Person beim Nachladen etwas anderes sieht als beim ersten Mal.
  if (!assessmentId) return { ok: false, reason: "not_submitted" };
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

  // Erst raeumen, dann setzen: Sonst bliebe eine Frage ausgeblendet, die
  // jemand beim zweiten Mal bewusst freigegeben hat.
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
      // Die Freigabe steht schon. Sie bestehen zu lassen hiesse, mehr zu
      // zeigen als gewollt - also zurueckziehen und ehrlich scheitern.
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
 * Oberfläche dabei. Ab dann sieht sie den Stand nicht mehr, und spätere
 * Änderungen erst recht nicht.
 */
export async function revokeScopeShare(
  scope: AssessmentScope | "workstyle",
  recipientUserId: string,
  ventureId: string | null = null,
): Promise<Result> {
  if (scope === "workstyle") { const result = await shareProductWorkstyle(recipientUserId, [], true); return result.ok ? {ok:true} : {ok:false,reason:"revoke_failed"}; }
  const { supabase, assessmentId, userId } = await ownSubmitted(scope, ventureId);
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
