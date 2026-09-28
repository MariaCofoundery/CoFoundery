"use server";

import { createClient } from "@/lib/supabase/server";
import {
  CURRENT_TRANSITION,
  isTransitionDecision,
  type TransitionDecision,
} from "@/features/instruments/v2/instrumentTransition";

type Result = { ok: true } | { ok: false; reason: string; detail?: string };

/**
 * Die Entscheidung der Person festhalten.
 *
 * `decided_at` wird nur gesetzt, wenn wirklich entschieden wurde - und beim
 * Zurueckgehen auf "noch offen" NICHT geloescht. Die Bedingung in der
 * Datenbank ist eine Implikation und keine Aequivalenz, damit genau das
 * moeglich bleibt.
 */
export async function decideInstrumentTransition(decision: TransitionDecision): Promise<Result> {
  if (!isTransitionDecision(decision)) return { ok: false, reason: "unknown_decision" };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) return { ok: false, reason: "not_authenticated" };

  const { error } = await supabase.from("instrument_transitions").upsert(
    {
      user_id: auth.user.id,
      from_instrument_id: CURRENT_TRANSITION.from,
      to_instrument_id: CURRENT_TRANSITION.to,
      decision,
      ...(decision === "pending" ? {} : { decided_at: new Date().toISOString() }),
    },
    { onConflict: "user_id,from_instrument_id,to_instrument_id" }
  );

  if (error) return { ok: false, reason: "save_failed", detail: error.message };
  return { ok: true };
}

/** Bekommt diese Person den Umstiegshinweis? */
export async function needsTransitionNotice(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("needs_instrument_transition_notice", {
    p_from: CURRENT_TRANSITION.from,
    p_to: CURRENT_TRANSITION.to,
  });
  return !error && data === true;
}
