"use server";

import { createClient } from "@/lib/supabase/server";
import {
  TRANSITION_V21,
  REMIND_AFTER_DAYS,
  isTransitionDecision,
  type TransitionDecision,
} from "@/features/instruments/v21/transitionV21";

type Result = { ok: true } | { ok: false; reason: string; detail?: string };

async function userId() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  return { supabase, userId: auth?.user?.id ?? null };
}

/**
 * Die Entscheidung festhalten.
 *
 * SIE IST NICHT ENDGUELTIG. Wer „bei der bisherigen bleiben“ gewählt hat,
 * kann die neue Fassung später trotzdem ausfüllen - dann ändert sich die
 * Zeile. Eine Entscheidung ist hier eine Auskunft darüber, was jemand gerade
 * will, und keine Tür, die zufällt.
 */
export async function decideTransitionV21(decision: TransitionDecision): Promise<Result> {
  if (!isTransitionDecision(decision) || decision === "pending") {
    return { ok: false, reason: "unknown_decision", detail: String(decision) };
  }

  const { supabase, userId: id } = await userId();
  if (!id) return { ok: false, reason: "not_authenticated" };

  const { error } = await supabase.from("instrument_transitions").upsert(
    {
      user_id: id,
      from_instrument_id: TRANSITION_V21.from,
      to_instrument_id: TRANSITION_V21.to,
      decision,
      decided_at: new Date().toISOString(),
      // Eine getroffene Entscheidung braucht keine Erinnerung mehr - und die
      // Datenbank laesst das Feld dort ohnehin nicht stehen.
      remind_after: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,from_instrument_id,to_instrument_id" },
  );

  if (error) return { ok: false, reason: "decide_failed", detail: error.message };
  return { ok: true };
}

/**
 * „Später entscheiden“.
 *
 * Der Hinweis ruht 30 Tage. Ein Hinweis, der bei jedem Seitenaufbau
 * wiederkommt, wird nach dem dritten Mal weggeklickt, ohne gelesen zu werden -
 * danach ist er wertlos, egal was drinsteht.
 */
export async function postponeTransitionV21(): Promise<Result> {
  const { supabase, userId: id } = await userId();
  if (!id) return { ok: false, reason: "not_authenticated" };

  const remindAfter = new Date();
  remindAfter.setDate(remindAfter.getDate() + REMIND_AFTER_DAYS);

  const { error } = await supabase.from("instrument_transitions").upsert(
    {
      user_id: id,
      from_instrument_id: TRANSITION_V21.from,
      to_instrument_id: TRANSITION_V21.to,
      decision: "pending",
      decided_at: null,
      remind_after: remindAfter.toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,from_instrument_id,to_instrument_id" },
  );

  if (error) return { ok: false, reason: "postpone_failed", detail: error.message };
  return { ok: true };
}
